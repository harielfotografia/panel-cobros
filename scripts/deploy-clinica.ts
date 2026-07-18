// Deploy fan-out (Fase SaaS-1): copia dental-ora-plugin/ desde el checkout de git en el VPS
// hacia cada instalación WordPress de clínica, vía SSH + rsync.
//
// Decisiones de diseño (ver plan): un solo VPS para todas las clínicas (Decisión 1); la ruta de
// cada clínica se deriva de Cliente.dominio, sin campo nuevo (Decisión 2); el destino del rsync
// es SIEMPRE exactamente la carpeta del plugin, nunca la raíz de WordPress.
//
// Uso:
//   npx tsx scripts/deploy-clinica.ts --version=v2.5 --todas [--dry-run]
//   npx tsx scripts/deploy-clinica.ts --version=v2.5 --staging
//   npx tsx scripts/deploy-clinica.ts --version=v2.5 --cliente=<id1>,<id2> [--dry-run]
//
// Variables de entorno requeridas:
//   DEPLOY_SSH_HOST           - host/IP del VPS de clínicas
//   DEPLOY_SSH_USER           - usuario SSH
//   DEPLOY_SSH_KEY_PATH       - ruta a la llave privada SSH
//   DEPLOY_GIT_CHECKOUT       - ruta absoluta al checkout de git YA actualizado en el VPS
//   DEPLOY_STAGING_CLIENTE_ID - clienteId de la clínica de staging (solo si se usa --staging)
//
// Prerrequisitos en el VPS (no verificables desde este entorno sin un VPS real — ver Paso 0
// del plan, migración pendiente):
//   - rsync y WP-CLI instalados y en PATH
//   - El checkout de git en DEPLOY_GIT_CHECKOUT ya está en la versión objetivo (git checkout/pull
//     previo a correr este script — este script solo DISTRIBUYE lo que ya está en ese checkout,
//     no hace el checkout por sí mismo)

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { execFileSync } from "node:child_process";

// Prisma 7 exige el driver adapter explícito (mismo patrón que scripts/seed.ts y
// src/lib/prisma.ts) — instanciar PrismaClient() sin adapter falla en el constructor.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type Targets = "todas" | "staging" | string[];

interface Args {
  version: string;
  dryRun: boolean;
  targets: Targets;
  confirmarTodas: boolean;
}

function parseArgs(argv: string[]): Args {
  const get = (nombre: string) => argv.find((a) => a.startsWith(`--${nombre}=`))?.split("=")[1];
  const has = (nombre: string) => argv.includes(`--${nombre}`);

  const version = get("version");
  if (!version) throw new Error("Falta --version=<tag-o-commit>");

  const clienteArg = get("cliente");
  let targets: Targets;
  if (has("todas")) targets = "todas";
  else if (has("staging")) targets = "staging";
  else if (clienteArg) targets = clienteArg.split(",");
  else throw new Error("Debes indicar --todas, --staging, o --cliente=<id1,id2,...>");

  const dryRun = has("dry-run");
  const confirmarTodas = has("confirmar");
  // Salvaguarda extra: --todas sin --dry-run es el mayor radio de impacto posible (TODAS las
  // clínicas de una vez) — exige --confirmar explícito además, para que no sea un solo flag el
  // que dispare eso por error de tipeo. En --dry-run no hace falta (no toca nada real).
  if (targets === "todas" && !dryRun && !confirmarTodas) {
    throw new Error(
      "--todas sin --dry-run requiere además --confirmar (para evitar un fan-out accidental a " +
        "TODAS las clínicas). Probá primero con --dry-run, y --staging antes que --todas."
    );
  }

  return { version, dryRun, targets, confirmarTodas };
}

// Deriva la ruta absoluta del WordPress de una clínica a partir de su dominio (Decisión 2).
function rutaWordpress(dominio: string): string {
  return `/var/www/${dominio}`;
}

function rutaPlugin(dominio: string): string {
  return `${rutaWordpress(dominio)}/wp-content/plugins/dental-ora-plugin`;
}

// Guardia dura: nunca aceptar un destino que no termine exactamente en /dental-ora-plugin.
// Evita el bug de "rsyncié la raíz de WP por error" si la convención de ruta cambia algún día
// o esta función se llama con un valor manipulado.
function validarRutaDestino(ruta: string): void {
  const normalizada = ruta.replace(/\/+$/, "");
  if (!normalizada.endsWith("/dental-ora-plugin")) {
    throw new Error(
      `Ruta de destino inválida, aborto por seguridad: "${ruta}" no termina en /dental-ora-plugin`
    );
  }
}

const SSH_HOST = process.env.DEPLOY_SSH_HOST;
const SSH_USER = process.env.DEPLOY_SSH_USER;
const SSH_KEY = process.env.DEPLOY_SSH_KEY_PATH;
const GIT_CHECKOUT = process.env.DEPLOY_GIT_CHECKOUT;

function requireEnv(): void {
  const faltantes = [
    "DEPLOY_SSH_HOST",
    "DEPLOY_SSH_USER",
    "DEPLOY_SSH_KEY_PATH",
    "DEPLOY_GIT_CHECKOUT",
  ].filter((k) => !process.env[k]);
  if (faltantes.length) {
    throw new Error(`Faltan variables de entorno: ${faltantes.join(", ")}`);
  }
}

function rsyncClinica(dominio: string, dryRun: boolean): { ok: boolean; log: string } {
  const origen = `${GIT_CHECKOUT}/dental-ora-plugin/`;
  const destinoRemoto = rutaPlugin(dominio);
  validarRutaDestino(destinoRemoto);

  const rsyncArgs = [
    "-avz",
    "--delete",
    // Cinturón y tirantes: el destino ya es exactamente la carpeta del plugin (wp-config.php y
    // uploads/ viven fuera de ella, --delete no puede alcanzarlos), pero se excluyen igual por
    // si la convención de ruta cambiara en el futuro.
    "--exclude=wp-config.php",
    "--exclude=uploads/",
    "--exclude=seed-demo.sql", // data de desarrollo, no debe viajar a producción
  ];
  if (dryRun) rsyncArgs.push("--dry-run");
  rsyncArgs.push(
    "-e",
    `ssh -i ${SSH_KEY} -o StrictHostKeyChecking=yes`,
    origen,
    `${SSH_USER}@${SSH_HOST}:${destinoRemoto}/`
  );

  try {
    const salida = execFileSync("rsync", rsyncArgs, { encoding: "utf-8" });
    return { ok: true, log: salida };
  } catch (e) {
    return { ok: false, log: (e as Error).message };
  }
}

// Fuerza el recheck de migración de esquema del plugin tras el rsync (Dora_Activator::
// maybe_update() está gateado por un transient de 20 min). NO se puede hacer con SQL directo
// — el panel maestro no tiene credenciales de la BD MySQL de cada clínica, solo de su propia
// Postgres. Se usa WP-CLI sobre el mismo canal SSH ya usado para el rsync.
function forzarRecheckMigracion(dominio: string): { ok: boolean; log: string } {
  try {
    const salida = execFileSync(
      "ssh",
      [
        "-i",
        SSH_KEY!,
        "-o",
        "StrictHostKeyChecking=yes",
        `${SSH_USER}@${SSH_HOST}`,
        `wp --path=${rutaWordpress(dominio)} transient delete dora_schema_checked --allow-root`,
      ],
      { encoding: "utf-8" }
    );
    return { ok: true, log: salida };
  } catch (e) {
    // No detiene el deploy si esto falla — el peor caso es que la migración tarde hasta 20 min
    // más (mismo comportamiento que sin este paso), no una corrupción de datos.
    return { ok: false, log: (e as Error).message };
  }
}

async function resolverClientesObjetivo(targets: Targets) {
  if (targets === "todas") {
    return prisma.cliente.findMany({ where: { estado: { not: "CANCELADO" } } });
  }
  if (targets === "staging") {
    const stagingId = process.env.DEPLOY_STAGING_CLIENTE_ID;
    if (!stagingId) throw new Error("Falta DEPLOY_STAGING_CLIENTE_ID para usar --staging");
    const cliente = await prisma.cliente.findUnique({ where: { id: stagingId } });
    if (!cliente) throw new Error(`Cliente de staging no encontrado: ${stagingId}`);
    return [cliente];
  }

  const clientes = await prisma.cliente.findMany({ where: { id: { in: targets } } });
  // Guardia: si alguno de los ids pedidos no existe, avisar explícitamente en vez de deployar
  // en silencio solo a los que sí se encontraron — sin esto, un typo en un id se traduce en
  // "esa clínica se quedó sin actualizar" sin ningún indicio de que pasó algo.
  const encontrados = new Set(clientes.map((c) => c.id));
  const noEncontrados = targets.filter((id) => !encontrados.has(id));
  if (noEncontrados.length > 0) {
    throw new Error(`Cliente(s) no encontrado(s), abortando: ${noEncontrados.join(", ")}`);
  }
  return clientes;
}

async function main() {
  requireEnv();
  const args = parseArgs(process.argv.slice(2));
  const clientes = await resolverClientesObjetivo(args.targets);

  if (clientes.length === 0) {
    console.log("Sin clínicas objetivo. Nada que hacer.");
    return;
  }

  console.log(
    `Deploy ${args.dryRun ? "(DRY-RUN, no se toca nada) " : ""}→ versión ${args.version} → ${clientes.length} clínica(s)`
  );

  const resultados = { ok: [] as string[], fallos: [] as { dominio: string; error: string }[] };

  for (const cliente of clientes) {
    process.stdout.write(`  -> ${cliente.dominio} ... `);
    const rsyncRes = rsyncClinica(cliente.dominio, args.dryRun);

    if (!rsyncRes.ok) {
      console.log("FALLO (rsync)");
      resultados.fallos.push({ dominio: cliente.dominio, error: rsyncRes.log });
      continue; // no bloquea el resto del fan-out
    }

    if (args.dryRun) {
      console.log("OK (dry-run, sin cambios reales)");
      resultados.ok.push(cliente.dominio);
      continue; // en dry-run no se dispara migración ni se actualiza version
    }

    const migRes = forzarRecheckMigracion(cliente.dominio);
    console.log(
      migRes.ok
        ? "OK"
        : "OK (rsync) — aviso: no se pudo forzar el recheck de migración (se aplicará solo en <=20 min)"
    );

    // Solo se actualiza Cliente.version si el rsync tuvo éxito — nunca si falló, para que el
    // campo siga reflejando la versión real desplegada, no la que se intentó.
    await prisma.cliente.update({ where: { id: cliente.id }, data: { version: args.version } });
    resultados.ok.push(cliente.dominio);
  }

  console.log(`\nResumen: ${resultados.ok.length} OK, ${resultados.fallos.length} fallo(s).`);
  if (resultados.fallos.length) {
    console.log("Fallos:");
    for (const f of resultados.fallos) console.log(`  - ${f.dominio}: ${f.error}`);
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error("Error fatal:", e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
