import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const dia = 24 * 60 * 60 * 1000;
const ahora = Date.now();

function genKey() { return randomBytes(32).toString("hex"); }

async function main() {
  // Admin por defecto
  const hash = await bcrypt.hash("admin123", 12);
  await prisma.admin.upsert({
    where: { email: "admin@panel.cl" },
    update: {},
    create: { email: "admin@panel.cl", password: hash, nombre: "Administrador" },
  });

  // Limpiar datos previos
  await prisma.anuncio.deleteMany();
  await prisma.pago.deleteMany();
  await prisma.suscripcion.deleteMany();
  await prisma.magicLink.deleteMany();
  await prisma.logSuspension.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.plan.deleteMany();

  // Planes
  const basico = await prisma.plan.create({
    data: { clave: "BASICO", nombre: "Básico", precio: 29990, maxProfesionales: 2 },
  });
  const pro = await prisma.plan.create({
    data: { clave: "PRO", nombre: "Profesional", precio: 39990, maxProfesionales: 5 },
  });
  const premium = await prisma.plan.create({
    data: { clave: "PREMIUM", nombre: "Premium", precio: 59990, maxProfesionales: 0, modulos: ["whatsapp", "reportes-avanzados"] },
  });

  // 1. Al día, cobro automático
  const sonrisa = await prisma.cliente.create({
    data: {
      nombre: "Clínica Dental Sonrisa Perfecta",
      email: "contacto@sonrisaperfecta.cl",
      telefono: "+56 2 2345 6789",
      dominio: "sonrisaperfecta.dentalcloud.cl",
      coolifyAppId: "app-sonrisa-001",
      serviceKey: genKey(),
      apiUrl: "https://sonrisaperfecta.dentalcloud.cl/wp-json/dental-ora/v1",
      planId: pro.id,
      estado: "ACTIVO",
      notas: "Clínica en Providencia, 3 sillones. Cliente desde marzo.",
      suscripciones: {
        create: {
          monto: 34990,
          planId: pro.id,
          metodoPago: "MERCADOPAGO",
          tipoCobro: "AUTOMATICO",
          tarjetaUlt4: "4242",
          fechaInicio: new Date(ahora - 65 * dia),
          fechaVencimiento: new Date(ahora + 25 * dia),
          pagos: {
            create: [
              {
                monto: 34990,
                estado: "CONFIRMADO",
                metodoPago: "MERCADOPAGO",
                referencia: "MP-8842301",
                fechaPago: new Date(ahora - 35 * dia),
              },
              {
                monto: 34990,
                estado: "CONFIRMADO",
                metodoPago: "MERCADOPAGO",
                referencia: "MP-8901442",
                fechaPago: new Date(ahora - 5 * dia),
              },
            ],
          },
        },
      },
    },
  });

  // 2. Por vencer (3 días), cobro manual
  const odonto = await prisma.cliente.create({
    data: {
      nombre: "OdontoSalud Las Condes",
      email: "admin@odontosalud.cl",
      telefono: "+56 9 8123 4567",
      dominio: "odontosalud.dentalcloud.cl",
      coolifyAppId: "app-odonto-002",
      serviceKey: genKey(),
      apiUrl: "https://odontosalud.dentalcloud.cl/wp-json/dental-ora/v1",
      planId: basico.id,
      estado: "ACTIVO",
      notas: "Paga por transferencia. Recordar activar cobro automático.",
      suscripciones: {
        create: {
          monto: 29990,
          planId: basico.id,
          metodoPago: "TRANSFERENCIA",
          tipoCobro: "MANUAL",
          fechaInicio: new Date(ahora - 27 * dia),
          fechaVencimiento: new Date(ahora + 3 * dia),
          pagos: {
            create: {
              monto: 29990,
              estado: "CONFIRMADO",
              metodoPago: "TRANSFERENCIA",
              referencia: "TRF-114520",
              fechaPago: new Date(ahora - 27 * dia),
            },
          },
        },
      },
    },
  });

  // 3. Recién pagado, cobro automático
  const andes = await prisma.cliente.create({
    data: {
      nombre: "Clínica Dental Andes",
      email: "gerencia@dentalandes.cl",
      telefono: "+56 2 2987 6543",
      dominio: "dentalandes.dentalcloud.cl",
      coolifyAppId: "app-andes-003",
      serviceKey: genKey(),
      apiUrl: "https://dentalandes.dentalcloud.cl/wp-json/dental-ora/v1",
      planId: premium.id,
      estado: "ACTIVO",
      notas: "Sucursal Maipú. Plan grande, 5 profesionales.",
      suscripciones: {
        create: {
          monto: 39990,
          planId: premium.id,
          metodoPago: "TRANSBANK",
          tipoCobro: "AUTOMATICO",
          tarjetaUlt4: "1881",
          fechaInicio: new Date(ahora - 90 * dia),
          fechaVencimiento: new Date(ahora + 28 * dia),
          pagos: {
            create: {
              monto: 39990,
              estado: "CONFIRMADO",
              metodoPago: "TRANSBANK",
              referencia: "TBK-552093",
              fechaPago: new Date(ahora - 2 * dia),
            },
          },
        },
      },
    },
  });

  // 4. Suspendida por no pago, cobro manual
  const spa = await prisma.cliente.create({
    data: {
      nombre: "Dental Spa Vitacura",
      email: "info@dentalspa.cl",
      telefono: "+56 9 7456 1230",
      dominio: "dentalspa.dentalcloud.cl",
      coolifyAppId: "app-dentalspa-004",
      serviceKey: genKey(),
      apiUrl: "https://dentalspa.dentalcloud.cl/wp-json/dental-ora/v1",
      planId: premium.id,
      estado: "SUSPENDIDO",
      notas: "Suspendida por falta de pago. Contactar para regularizar.",
      suscripciones: {
        create: {
          monto: 44990,
          planId: premium.id,
          metodoPago: "TRANSFERENCIA",
          tipoCobro: "MANUAL",
          fechaInicio: new Date(ahora - 39 * dia),
          fechaVencimiento: new Date(ahora - 9 * dia),
          pagos: {
            create: {
              monto: 44990,
              estado: "CONFIRMADO",
              metodoPago: "TRANSFERENCIA",
              referencia: "TRF-098871",
              fechaPago: new Date(ahora - 39 * dia),
            },
          },
        },
      },
    },
  });

  // Registro de la suspensión (historial)
  await prisma.logSuspension.create({
    data: {
      clienteId: spa.id,
      accion: "SUSPENDIDO",
      motivo: "Vencimiento automático por falta de pago",
      realizadoPor: "sistema-cron",
    },
  });

  // === Anuncios ===
  await prisma.anuncio.createMany({
    data: [
      // Globales (todos los clientes + admin)
      {
        titulo: "Nueva función: recordatorios por WhatsApp",
        mensaje:
          "Ahora el sistema envía recordatorios automáticos de citas a tus pacientes por WhatsApp. Actívalo en Configuración → Recordatorios.",
        tipo: "EXITO",
        clienteId: null,
      },
      {
        titulo: "Mantenimiento programado",
        mensaje:
          "El domingo 28/06 entre las 03:00 y 05:00 AM realizaremos mantenimiento. El sistema podría no estar disponible por ~2 horas.",
        tipo: "MANTENIMIENTO",
        clienteId: null,
        fechaFin: new Date(ahora + 6 * dia),
      },
      // Por cliente
      {
        titulo: "¡Felicitaciones por tu crecimiento!",
        mensaje: "Tu clínica superó las 500 fichas de pacientes este mes. Excelente gestión.",
        tipo: "EXITO",
        clienteId: andes.id,
      },
      {
        titulo: "Tu plan vence pronto",
        mensaje:
          "Tu suscripción vence en 3 días. Activa el cobro automático desde tu portal para no interrumpir el servicio.",
        tipo: "ADVERTENCIA",
        clienteId: odonto.id,
      },
      {
        titulo: "Servicio pausado por falta de pago",
        mensaje:
          "Tu agenda y fichas están pausadas. Ingresa a tu portal y regulariza el pago para reactivar el servicio de inmediato.",
        tipo: "ADVERTENCIA",
        clienteId: spa.id,
      },
    ],
  });

  // === Documentos de prueba ===
  await prisma.documentoContador.deleteMany();
  await prisma.boleta.deleteMany();
  await prisma.factura.deleteMany();
  await prisma.cotizacion.deleteMany();

  // Cotización aprobada (lista para convertir)
  const cot1 = await prisma.cotizacion.create({
    data: {
      numero: "COT-000001",
      clienteId: andes.id,
      clienteNombre: "Clínica Dental Andes",
      clienteRut: "76.543.210-K",
      fecha: new Date(ahora - 10 * dia),
      vigencia: "30 días",
      formaPago: "Crédito 30 días",
      atte: "Gerencia",
      comentarios: "Incluye implementación, capacitación y soporte el primer mes.",
      estado: "APROBADA",
      items: [
        { descripcion: "Plan Premium mensual — Sistema de Gestión Dental", cantidad: 1, precioUnitario: 39990, descuento: 0, total: 39990 },
        { descripcion: "Módulo WhatsApp — recordatorios automáticos", cantidad: 1, precioUnitario: 9990, descuento: 10, total: 8991 },
      ],
      subtotal: 48981,
      iva: Math.round(48981 * 0.19),
      total: 48981 + Math.round(48981 * 0.19),
    },
  });

  // Cotización en borrador
  await prisma.cotizacion.create({
    data: {
      numero: "COT-000002",
      clienteId: odonto.id,
      clienteNombre: "OdontoSalud Las Condes",
      clienteRut: "77.123.456-3",
      fecha: new Date(ahora - 3 * dia),
      vigencia: "15 días",
      formaPago: "Transferencia",
      atte: "Administración",
      comentarios: "",
      estado: "BORRADOR",
      items: [{ descripcion: "Plan Básico mensual — Sistema de Gestión Dental", cantidad: 1, precioUnitario: 29990, descuento: 0, total: 29990 }],
      subtotal: 29990,
      iva: Math.round(29990 * 0.19),
      total: 29990 + Math.round(29990 * 0.19),
    },
  });

  // Factura (generada desde la cotización 1)
  await prisma.factura.create({
    data: {
      numero: "FAC-000001",
      numeroSii: "000045",
      clienteId: andes.id,
      clienteNombre: "Clínica Dental Andes",
      clienteRut: "76.543.210-K",
      cotizacionId: cot1.id,
      fechaEmision: new Date(ahora - 8 * dia),
      fechaVencimiento: new Date(ahora + 22 * dia),
      plazoPago: "30",
      estado: "PENDIENTE",
      montoNeto: cot1.subtotal,
      iva: cot1.iva,
      total: cot1.total,
      items: cot1.items as never,
      notas: "Primer mes de suscripción — Plan Premium.",
    },
  });

  // Inicializar contadores desde donde quedamos
  await prisma.documentoContador.createMany({
    data: [
      { id: "cotizacion", contador: 3 },
      { id: "factura", contador: 2 },
      { id: "boleta", contador: 1 },
    ],
  });

  console.log("Seed completado: 4 clínicas dentales + anuncios + documentos de prueba.");
  console.log("");
  console.log("Admin:  admin@panel.cl / admin123");
  console.log("Portales de cliente (login por magic link con estos correos):");
  console.log("  - contacto@sonrisaperfecta.cl  (al día, cobro automático)");
  console.log("  - admin@odontosalud.cl         (vence en 3 días, manual)");
  console.log("  - gerencia@dentalandes.cl      (recién pagado, automático)");
  console.log("  - info@dentalspa.cl            (SUSPENDIDA, para probar reactivación)");
}

main().finally(() => prisma.$disconnect());
