@AGENTS.md

## 📋 Plan vivo — Segunda ronda: pruebas reales por navegador + "procesos secundarios" (2026-07-16, EN CURSO)

> Continuación de la ronda anterior (ver bloque de abajo, "Auditoría de flujos reales + fixes de
> seguridad"), que probó casi todo por API directa (`curl`). Esta ronda usa el **navegador real**
> (clics reales, no solo requests) para las pantallas que antes solo se verificaron por API, y audita
> explícitamente los "procesos secundarios" del panel — cron, retry de `syncPending`, webhooks, envío
> de emails — buscando bugs que no aparecen en el camino feliz de un solo usuario haciendo clic.
> Checklist con el mismo criterio del resto del archivo: marcar `[x]` con nota de una línea al
> verificar/corregir cada ítem.

### Fase A — UI real no cubierta la ronda anterior (todo vía navegador, no `curl`)
- [ ] `/clientes/nuevo` — no se llegó a probar el formulario de alta vía UI en esta ronda (queda para
  la próxima; el POST ya está verificado por API en la ronda anterior).
- [x] `/clientes/[id]` — tab Facturación probada de punta a punta: **bug real encontrado y corregido**
  (ver "🔴 Bug — 'Generar factura manual' perdía el cliente" más abajo). El resto de las tabs
  (Resumen, Suscripción, Pagos, Usuarios, API y Conexión, Configuración) se navegaron sin errores de
  consola con un cliente real, sin hallazgos adicionales.
- [ ] `/planes` — sigue sin probarse el CRUD vía formulario (solo verificado por `curl` en la ronda
  anterior).
- [ ] `/pagos` — sigue sin probarse la UI (solo verificado por API en la ronda anterior).
- [~] `/reportes` — se confirmó que la página carga sin errores; no se llegó a cruzar cada número
  contra una consulta directa a la BD (queda pendiente para una próxima ronda).
- [x] `/facturas-admin` — ciclo cotización → convertir a boleta ejercitado con datos reales (COT-000005
  → BOL-000001) sin hallazgos; además se probó "Nueva factura" llegando **desde** la ficha del cliente
  (ver bug de abajo) y se confirmó que el PDF (`/api/documentos/pdf/[tipo]/[id]`) sigue accesible para
  CONTADOR tras el fix de roles de la ronda anterior.
- [x] `/anuncios` — creado y luego desactivado/eliminado un anuncio real de prueba vía UI, sin
  hallazgos.
- [ ] `/usuarios` — no se llegó a probar el alta de admin/vendedora vía formulario en esta ronda.
- [x] `/configuracion` — las tabs recorridas (Empresa, Automatizar) guardan y reflejan cambios reales
  sin errores; sin hallazgos nuevos más allá de lo ya cubierto por el fix de roles CONTADOR de la
  ronda anterior.
- [x] Portal cliente — **`/portal/pagar` tenía un bug crítico: la página quedaba colgada en
  "Cargando..." para siempre** (ver detalle completo más abajo, es el hallazgo más grave de esta
  ronda). `/portal/facturas`, `/portal/notificaciones`, `/portal/cuenta` se navegaron sin errores.
- [x] `/vendedora` — verificados los montos de comisión de un pago real contra `comisionPct` real de
  la vendedora asignada (`monto_pago × comisionPct / 100`), coincide exacto con lo mostrado en el
  panel de la vendedora; export CSV revisado por código (mismo patrón BOM+Blob ya usado en el resto
  del panel, sin hallazgos).

### 🔴 Bug — "Generar factura manual" perdía por completo el contexto del cliente (encontrado en Fase A)
- [x] **Corregido y verificado.** El botón de acción rápida "Generar factura manual" en
  `/clientes/[id]` navegaba a `/facturas-admin/facturas/nueva` **sin ningún parámetro** — el
  formulario abría en blanco, obligando a re-buscar al mismo cliente desde cero (el propósito del
  atajo, dar de alta una factura para ESE cliente puntual, se perdía por completo). **Fix:** el botón
  ahora navega con `?clienteId=<id>` (`src/app/(dashboard)/clientes/[id]/page.tsx`); la página nueva
  lee ese parámetro en un `useEffect` y trae el cliente real (`GET /api/clientes/{id}`) para
  precargar nombre/RUT en el formulario (`src/app/(dashboard)/facturas-admin/facturas/nueva/page.tsx`).
  Se leyó `window.location.search` directo en vez de `useSearchParams()` — decisión tomada a
  propósito por el mismo motivo del bug de `/portal/pagar` de abajo (ver esa sección para el porqué
  completo).
- [x] **Bug secundario encontrado al verificar el fix anterior — `ClienteSelectorDoc.tsx` mostraba el
  tab equivocado pese a tener el dato correcto.** El selector decide qué tab mostrar ("Cliente del
  sistema" vs. "Nombre libre") con un `useState` inicializado una sola vez al montar
  (`value.clienteId ? "sistema" : "libre"`) — pero el cliente real llega **después** del montaje (vía
  el fetch async del fix de arriba), así que ese `useState` ya había quedado fijo en "libre" para
  siempre. El campo terminaba con el dato correcto (nombre/RUT del cliente real), pero visualmente se
  mostraba en el tab "Nombre libre" en vez de "Cliente del sistema" — confuso para quien está
  llenando el formulario. **Fix:** se ajusta el `modo` durante el render (patrón "adjusting state
  when a prop changes" de React: compara `value.clienteId` contra un `clienteIdVisto` guardado en
  estado, y si cambió, llama `setModo` en el cuerpo del componente, no dentro de un efecto) — evita
  tanto el bug original como el parpadeo de un efecto post-render. **Verificado en vivo:** clic real
  en "Generar factura manual" desde la ficha de un cliente real → el formulario de "Nueva factura"
  abre con el tab "Cliente del sistema" ya seleccionado y el nombre/RUT correctos precargados.

### 🔴 Bug crítico — `/portal/pagar` quedaba colgado en "Cargando..." para siempre
- [x] **El hallazgo más grave de esta ronda — corregido y verificado en producción real (no solo en
  dev).** La página de pago del cliente (`/portal/pagar` — el flujo de autoservicio más importante
  del portal: activar cobro automático MercadoPago, pagar una vez, o pagar con Webpay/Transbank)
  usaba `useSearchParams()` para leer un posible `?error=` de un pago fallido, envuelta en su propio
  `<Suspense fallback={<p>Cargando...</p>}>`. Ese `<Suspense>` anidado dentro del layout async del
  portal (`portal/(panel)/layout.tsx`, que ya hace `getSession()`/`cookies()` y por eso fuerza toda la
  ruta a dinámica) dejaba el HTML real —con las 3 tarjetas de pago— **streameado correctamente por el
  servidor pero atrapado dentro de un `<div hidden id="S:0">`** que el script de resolución de
  Suspense de React (`$RC("B:0","S:0")`, ya presente en el HTML) nunca terminaba de intercambiar con
  el `<template id="B:0">` del fallback "Cargando...". **Reproducido de forma consistente con
  recargas completas de página reales**, no solo con HMR de dev — confirmado también contra un build
  de producción real (`output: "standalone"`, corrido con `node .next/standalone/server.js`, exacto
  al `CMD` del `Dockerfile`, no `next start`, que ni siquiera arranca con esa config). **Fix:** se
  eliminó `useSearchParams()` y el `<Suspense>` que lo envolvía; ahora se lee
  `window.location.search` dentro de un `useEffect` con un `eslint-disable` puntual y comentado (leer
  `window` recién en el efecto, no en un lazy-initializer de `useState`, es intencional: durante SSR/
  hidratación inicial el HTML no puede saber el query string, así que el valor debe llegar después del
  montaje para no producir un mismatch de hidratación). **Verificado en producción real, 2 veces:**
  primero al momento del fix (reproducción + reparación en el mismo ciclo), y de nuevo al cerrar esta
  ronda con una prueba limpia (impersonando a un cliente real ya existente vía `/api/clientes/{id}/
  impersonar`, sin crear datos de prueba) — **4 recargas completas seguidas de `/portal/pagar`, las 4
  mostrando el contenido real** (título, banner de error si aplica, y las 3 tarjetas: "Cobro
  automático mensual", "Pagar con Webpay (Transbank)", "Pagar solo este mes") — 0 de 4 quedó
  colgada en "Cargando...". Se aplicó preventivamente el mismo criterio (evitar `useSearchParams()` +
  `Suspense` propio anidado bajo un layout async) en `/facturas-admin/facturas/nueva` del bug de
  arriba, aunque ese caso nunca mostró el síntoma en vivo — mismo patrón de riesgo, se evitó por
  completo en vez de esperar a que fallara. **`portal/login/page.tsx` se dejó sin tocar** — usa el
  mismo hook pero con una estructura distinta (no anidado bajo el mismo layout con la misma forma), y
  ya se había verificado funcionando correctamente en la ronda anterior.

### Fase B — Procesos secundarios (lo que corre sin que nadie lo esté mirando)
- [x] **Cron completo — `node-cron` es una dependencia muerta, no hay ningún cron interno.**
  Confirmado por grep en todo `src/`: la librería `node-cron` está en `package.json` pero no se
  importa en ningún archivo. El disparador real es **externo** — un cron del hosting (documentado en
  el propio README y en la tab "Automatizar" de Configuración) que hace
  `POST /api/cron` con el header `x-cron-secret`. No hay ningún `setInterval`/scheduler en proceso
  que pueda fallar en silencio; el diseño depende enteramente de que el cron externo (ej. el de
  Coolify) esté configurado y corriendo, algo a verificar en el hosting real, no en el código.
- [x] **`enviarAlertaCronErrores` — revisado por código; los otros 2 emails restantes SÍ se dispararon
  en vivo con datos reales.** Se forzó `POST /api/cron` real con el secreto correcto sobre un cliente
  de prueba con vencimiento a 3 días — confirmado en el log del servidor real: el email de
  `enviarAvisoVencimiento` se armó correctamente ("Tu suscripción para ui-test-real.cl vence en 3
  día(s)... Por favor realiza el pago..."). También se disparó `enviarAvisoReactivacion` real vía
  `POST /api/clientes/{id}/activar` ("Tu servicio en ui-test-real.cl ha sido reactivado
  exitosamente. ¡Gracias por tu pago!"), y `enviarAvisoSuspension` ya se había verificado en la
  reproducción del bug de `/portal/pagar` ("Tu servicio... ha sido suspendido por falta de pago...").
  Los 3 interpolan los datos reales del cliente correctamente. `enviarAlertaCronErrores` (el único de
  los 5 sin disparar en vivo) se revisó por código: mismo patrón exacto que los otros 3 (misma función
  `enviar()`, mismo armado de HTML), solo se ejecuta si `resultados.errores` no quedó vacío tras el
  cron — forzar ese caso exige provocar una excepción real de DB/lógica dentro del `try` del cron
  (más invasivo que los otros 3 casos), así que se dejó como revisión de código en vez de disparo en
  vivo. También se confirmó por código que `enviarAlertaCronErrores` respeta correctamente
  `ADMIN_ALERT_EMAIL` sin configurar (no envía nada, no rompe el cron).
- [x] **Webhook de MercadoPago — sin hallazgos nuevos** (ya cubierto en la ronda anterior con los
  casos límite de firma ausente/corrupta, `type` desconocido y `data.id` faltante — no se repitió la
  prueba en esta ronda, solo se re-confirmó por lectura de código que el fix de dedupe por
  `mp_payment_id` sigue intacto).
- [x] **Emails transaccionales — los 5 tipos confirmados.** Magic link (ronda anterior),
  vencimiento/suspensión/reactivación (esta ronda, con datos reales, ver arriba), y
  `enviarAlertaCronErrores` (revisado por código, ver arriba). Los 5 comparten el mismo wrapper
  `enviar()` (`src/lib/email.ts`) que cae a un log de consola legible cuando no hay SMTP configurado
  — comportamiento correcto para desarrollo, confirmado que en producción (con `SMTP_HOST` seteado)
  usaría `nodemailer` real sin cambios de código.
- [x] **No hay otro proceso en segundo plano más allá del cron externo.** Sin `setInterval`/
  `setTimeout` recurrente en el código de servidor, sin nada en `next.config.ts`, sin
  `instrumentation.ts` en el proyecto. El único "proceso secundario" real es el retry de
  `syncPending` (`clinicApi.retrySyncPending()`), que corre dentro del mismo `POST /api/cron` — no es
  un proceso aparte, se re-verificó su comportamiento (reintenta cada cliente marcado
  `syncPending=true`, limpia la marca si el push a la clínica ahora sí responde 2xx) sin hallazgos.
  - **Investigado y descartado como bug — error `P1017 ConnectionClosed` de Prisma.** Durante una de
    las pruebas de email (la de suspensión, contra el build standalone real) apareció una sola vez
    `PrismaClientKnownRequestError` con `code: 'P1017'` ("Server has closed the connection") al
    consultar `prisma.pago.findMany()`. Se investigó `src/lib/prisma.ts`: singleton estándar con el
    adapter `@prisma/adapter-pg`, sin configuración faltante evidente. Un request inmediatamente
    posterior (`GET /api/clientes`) respondió con normalidad — la conexión se auto-reparó sola. Dado
    que (a) el propio banner de arranque de `npx prisma dev` advierte explícitamente que su proxy
    local necesita "el menor idle timeout positivo soportado" para conexiones de larga duración, (b)
    este proceso llevaba horas corriendo con múltiples reinicios durante toda la sesión de pruebas, y
    (c) el error no volvió a reproducirse en ninguna de las pruebas posteriores (incluida una tanda
    completa de verificación final con un `prisma dev` recién levantado) — se concluye que es un
    artefacto del proxy Postgres efímero de desarrollo local, no un bug de la aplicación. En
    producción (Postgres real, no el proxy `prisma dev`) este escenario no debería darse igual; no se
    tocó código por este hallazgo.

### Fase C — Cierre
- [x] `tsc --noEmit`, `eslint .` y `next build` (con `output: "standalone"`) limpios tras todos los
  fixes de esta ronda, incluidos los 2 nuevos hallazgos de arriba. El lint marcó inicialmente
  `react-hooks/set-state-in-effect` en el `useEffect` nuevo de `ClienteSelectorDoc.tsx` — corregido
  moviendo el ajuste de estado al cuerpo del render (ver detalle en el bug de arriba); en
  `/portal/pagar` el mismo error se resolvió con un `eslint-disable` puntual y comentado (leer
  `window.location` recién en el efecto es intencional, no un descuido — ver el bug crítico de
  arriba). También se limpió un `eslint-disable-next-line react-hooks/exhaustive-deps` que había
  quedado sin uso en `facturas/nueva/page.tsx` tras un ajuste anterior.
- [x] **Entorno apagado, datos de prueba revertidos.** Cliente "UI Test Clinica Real" (con su
  suscripción, 2 pagos, 1 factura, 1 cotización, 1 boleta) eliminado por completo de la base; anuncio
  de prueba "Anuncio prueba UI real" eliminado; password temporal de la vendedora Ana Torres
  (asignada solo para poder loguearse y probar `/vendedora` en esta ronda) revertida a `NULL`; 2
  scripts de scratch (`scripts/_check_vend.mjs`, `scripts/seed-20-clientes.ts`) usados para generar/
  inspeccionar datos de prueba, eliminados del repo (no aportan valor fuera de esta sesión). Servidor
  standalone de verificación y la base Postgres local (`npx prisma dev`) detenidos; `git status`
  confirmado limpio (solo los archivos de código realmente modificados, sin artefactos de prueba
  sueltos).

## 🏁 Resumen de esta ronda (2026-07-16, segunda parte)

- **1 bug crítico nuevo, el más grave de las dos rondas de esta sesión:** `/portal/pagar` —la página
  de pago del cliente, el corazón del autoservicio de cobranza— quedaba permanentemente colgada en
  "Cargando..." por una combinación de `useSearchParams()` + `Suspense` anidado dentro de un layout
  async, reproducida en un build de producción real (no solo un artefacto de dev). Corregida
  reemplazando el hook por lectura directa de `window.location` en un efecto.
- **2 bugs medianos nuevos, encontrados en cadena a partir de un mismo flujo real:** el atajo
  "Generar factura manual" de la ficha de un cliente perdía todo el contexto (no pasaba el
  `clienteId`), y el componente compartido `ClienteSelectorDoc` mostraba el tab equivocado por un
  `useState` que no se resincronizaba cuando el dato llegaba después del montaje.
- **Procesos secundarios auditados sin hallazgos de bug:** no hay cron interno (el diseño depende de
  un cron externo, correcto y documentado), los 5 tipos de email arman HTML correcto con datos reales
  (4 disparados en vivo, 1 revisado por código), el webhook de MercadoPago y el retry de
  `syncPending` siguen sin regresiones. Un error puntual de conexión de Prisma se investigó y se
  descartó como artefacto del Postgres efímero de desarrollo local, no como bug de la app.
- **Cierre:** `tsc`/`eslint`/`next build` limpios, todos los datos de prueba de ambas rondas
  eliminados, entorno de verificación apagado.

---

## 📋 Plan vivo — Auditoría de flujos reales + fixes de seguridad (2026-07-16, EN CURSO)

> Originado en una verificación externa del panel maestro (misma auditoría que revisó la arquitectura
> SaaS multi-clínica del sistema "clinica dental"). Se levantó el entorno real (Prisma dev Postgres +
> `next dev`), se probó login/dashboard/suspender/reactivar con los 25 clientes de prueba ya sembrados,
> y se comparó el contrato HTTP contra el `class-servicio.php` real del plugin WordPress. Resultado: el
> núcleo (auth, dashboard, suspender/activar) funciona correctamente, pero se encontró **1 vulnerabilidad
> crítica reproducida en vivo** (bypass de autenticación en el portal de clientes) + varios bugs reales.
> Este bloque es la fuente de verdad de avance — marcar `[x]` a medida que se completa y verifica cada
> ítem, con una nota de una línea de lo encontrado/corregido, mismo patrón que el resto de este archivo.

### Fase 0 — Hallazgos ya confirmados antes de este plan — TODOS CORREGIDOS Y VERIFICADOS
- [x] 🔴 **Crítico — CORREGIDO Y VERIFICADO EN VIVO.** `POST /api/portal/buscar-cliente` otorgaba una
  cookie de sesión válida como cualquier cliente cuyo dominio/nombre coincidiera parcialmente (o RUT/
  email exacto), **sin contraseña ni verificación de identidad**. Reproducido en vivo antes del fix:
  buscar solo "Sonrisa" (palabra que matchea 2 clínicas distintas) dejó logueado como una de ellas, con
  acceso a plan, método de pago enmascarado, historial de pagos y facturas. **Fix:** la búsqueda por
  dominio/RUT/nombre ya NO otorga sesión — solo confirma que existe la cuenta y envía un enlace de
  acceso al correo YA registrado (mismo mecanismo que `/api/portal/magic-link`: token aleatorio de 32
  bytes, expira en 15 min, un solo uso), mostrando el email enmascarado (`co***@dominio.cl`) en pantalla.
  De paso se implementó el modo "Ingresar con tu email" (`?modo=email`), que antes era un link muerto.
  **Verificado en vivo (navegador real, tras limpiar cookies de sesiones previas):** buscar "Sonrisa" →
  ya NO deja ninguna cookie de sesión (confirmado navegando directo a `/portal`, que redirige a login) →
  clic en el link de "modo desarrollo" (dev, sin SMTP) → entra correctamente al portal de esa clínica →
  reintentar el mismo token → "El enlace expiró" (un solo uso, correcto) → modo email con
  `contacto@sonrisaperfecta.cl` real → envía link real → con `noexiste@nada.cl` → mismo mensaje
  neutro, sin `devLink` (sin enumeración de cuentas).
- [x] 🟠 **Alto — CORREGIDO.** `Dockerfile`: las variables `NEXT_PUBLIC_*` estaban declaradas como
  `ARG`/`ENV` solo en el stage `runner`, pero `next build` corre en el stage `builder` **anterior**, sin
  ninguna variable disponible — Next.js hornea `NEXT_PUBLIC_*` en el bundle al momento de compilar.
  **Fix:** agregados los mismos `ARG`/`ENV` (`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_EMPRESA_NOMBRE`,
  `NEXT_PUBLIC_SOPORTE_EMAIL`, `NEXT_PUBLIC_SOPORTE_WHATSAPP`) al stage `builder`, antes de
  `RUN npm run build` — quedan declarados en AMBOS stages (builder para hornear el bundle, runner para
  cualquier lectura server-side genuina en runtime), patrón recomendado para Next.js + Docker
  standalone. También se agregó `MP_WEBHOOK_SECRET` al runner (documentación explícita, ya que hoy
  Coolify podría estar inyectándolo solo como env var de runtime sin que el Dockerfile lo reflejara).
  **Pendiente real de verificar (no se puede desde este entorno de desarrollo):** que la configuración
  de build de Coolify efectivamente pase estas 4 `NEXT_PUBLIC_*` como **Build Variables** (no solo
  runtime), o el fix del Dockerfile no tendría efecto — revisar el panel de Coolify al desplegar.
- [x] 🟡 **Medio — CORREGIDO.** `GET /servicio/uso`: `src/lib/clinic-api.ts` esperaba el campo
  `citas_mes` (snake_case) pero el plugin real (`class-servicio.php::get_uso()`) devuelve `citasMes`
  (camelCase). **Fix:** renombrado en `UsoResponse` para que el panel (no el plugin ya desplegado) siga
  el contrato real. Sin verificación en vivo posible (no hay WordPress real en este entorno y
  `clinicApi.getUso()` no se llama desde ninguna pantalla todavía) — cambio de tipos puro, confirmado
  con `tsc --noEmit` limpio.
- [x] 🟡 **Medio — CORREGIDO Y VERIFICADO EN VIVO.** Dashboard "Actividad reciente" mostraba el `id`
  crudo del cliente en vez de su nombre para eventos de suspensión/reactivación, porque
  `LogSuspension.clienteId` no tenía relación Prisma hacia `Cliente`. **Fix:** agregada la relación
  (`LogSuspension.cliente Cliente @relation(..., onDelete: Cascade)` + `Cliente.logsSuspension[]`),
  verificado antes que no hubiera filas huérfanas (`0` de `5` logs), `prisma db push` + `generate`
  aplicados sin pérdida de datos, y el query del dashboard ahora hace `include: { cliente: { select:
  { nombre: true } } }`. **Verificado en vivo:** tras suspender/reactivar un cliente real de prueba, el
  dashboard mostró "Servicio reactivado — Dental Excellence Group — Puerto Montt" (antes mostraba el
  cuid crudo).
- [x] 🟢 **Menor — sin acción de código, es higiene de datos.** "Cl�nica Dental Ora" es un registro
  creado manualmente en una sesión anterior (no viene de ningún seed script) — no se tocó, no es un bug
  reproducible.
- [x] 🟢 **Menor — CORREGIDO junto con el fix crítico** (mismo archivo). El link "¿Tienes enlace de
  acceso? Ingresar con email" ahora sí implementa un modo real de login por email (ver arriba).

### 🔴 Hallazgo nuevo, encontrado DURANTE el testeo real de esta fase (no estaba en el Fase 0 original)
- [x] **Crítico — CORREGIDO Y VERIFICADO EN VIVO: el rol CONTADOR nunca funcionó, era admin completo
  en la práctica, Y activarlo correctamente producía un loop infinito de redirects.** Dos bugs
  apilados, encontrados al probar con una cuenta CONTADOR real (no solo leyendo el código):
  1. `POST /api/auth/login` (`src/app/api/auth/login/route.ts`) firmaba el JWT con `rol: "admin"`
     **hardcodeado**, sin importar el `rol` real del registro en `Admin` (`ADMIN`/`CONTADOR`) — es
     decir, la restricción de rutas para CONTADOR que el `proxy.ts` ya implementaba (commit más
     reciente del repo) **nunca se disparaba en la práctica**, porque ningún token emitido por login
     tenía jamás `rol:"contador"`. Cualquier cuenta CONTADOR tenía en los hechos privilegios de
     administrador completos en todos los endpoints (`requireAdmin()` los aceptaba a todos por igual).
  2. Al corregir el punto 1 (firmar el rol real), apareció un **segundo bug independiente que estaba
     dormido detrás del primero**: `src/app/(dashboard)/layout.tsx` redirigía a `/portal` cualquier
     sesión con `rol !== "admin"` — incluida una CONTADOR ahora válida — pero `proxy.ts` bloquea a
     CONTADOR de `/portal` (no está en `CONTADOR_ALLOWED`) devolviéndolo a `/`, que el layout vuelve a
     mandar a `/portal`… **loop infinito, reproducido en vivo con `net::ERR_TOO_MANY_REDIRECTS`** tanto
     en el navegador real como con `curl` directo (fuera del navegador, para descartar que fuera un
     artefacto de cookies acumuladas).
  3. Además, `requireAdmin()` (estrictamente `rol === "admin"`) protegía TODOS los endpoints que
     `CONTADOR_ALLOWED` sí permite navegar (`/api/clientes`, `/api/pagos`, `/api/documentos/*`,
     `/api/configuracion`) — con el rol ya corregido, un CONTADOR real habría visto las páginas
     permitidas pero con **cada llamada a la API respondiendo 401** (página en blanco/rota). Se agregó
     `requireAdminOrContador()` en `src/lib/auth.ts` y se aplicó a los endpoints de solo-contabilidad:
     `GET /api/clientes` y `GET /api/clientes/[id]` (lectura), `POST /api/pagos` (registrar pago
     manual), `GET /api/configuracion` (lectura de datos de empresa, no el `PUT` de edición), y **todo**
     `/api/documentos/*` (cotizaciones/facturas/boletas + convertir + pdf, ya que "Facturación" es
     exactamente el trabajo de un contador). Las acciones administrativas dentro de esas mismas áreas
     (crear/editar/eliminar cliente, suspender/activar, impersonar, `/api/usuarios`, `/api/planes`,
     `/api/anuncios`, `/api/vendedoras`) siguen exigiendo `requireAdmin()` estricto.
  **Verificado en vivo con una cuenta CONTADOR de prueba real** (`contador-test@panel.cl`, creada y
  eliminada solo para esta verificación) — con `curl` directo (cookie jar limpio, sin caché de
  navegador de por medio) tras los 3 fixes: `/usuarios` → 307 a `/` (bloqueado, correcto); `/` → **200**
  (antes se colgaba en el loop); `/clientes` → 200; `/facturas-admin` → 200; `/planes` → 307 a `/`
  (bloqueado, correcto); `GET /api/clientes` → 200 con datos reales; `GET /api/documentos/facturas` →
  200; `GET /api/configuracion` → 200; `GET /api/usuarios` y `GET /api/planes` → bloqueados (307,
  mismo mecanismo de proxy que las páginas — no HTTP 401 JSON limpio, un matiz menor de diseño
  preexistente, no introducido por este fix).

### 🔴 Segundo hallazgo nuevo — mismo patrón, esta vez rompía el login de VENDEDORA por completo
- [x] **Crítico — CORREGIDO Y VERIFICADO EN VIVO: una sesión "vendedora" quedaba atrapada en un loop
  de redirects infinito apenas tocaba `/` o `/portal`.** Al corregir el loop de CONTADOR (arriba) se
  sospechó el mismo patrón para "vendedora" y se confirmó de inmediato, con una cuenta vendedora de
  prueba real: `(dashboard)/layout.tsx` mandaba cualquier rol no-admin a `/portal` (la home del
  CLIENTE) sin importar cuál fuera; `portal/(panel)/layout.tsx` mandaba cualquier rol no-cliente de
  vuelta a `/` — para "vendedora" (que no pertenece a ninguno de los dos) esto es un ping-pong sin
  salida. **Reproducido con `curl -L --max-redirs 6`: `FINAL_STATUS:307 REDIRECTS:6` (curl aborta con
  "too many redirects"; en un navegador real es un colgado total de la pestaña, `net::
  ERR_TOO_MANY_REDIRECTS`, sin ninguna forma de navegar fuera salvo borrando cookies a mano).**
  **Fix (mismo criterio en ambos layouts):** cada rol ajeno al layout se manda a SU PROPIA home, nunca
  a un destino fijo compartido — `(dashboard)/layout.tsx`: cliente→`/portal`, vendedora→`/vendedora`,
  cualquier otro→`/login`; `portal/(panel)/layout.tsx`: vendedora→`/vendedora`,
  admin/contador→`/`, cualquier otro→`/portal/login`. `/vendedora/page.tsx` en sí no participaba del
  loop (es un client component que solo redirige a `/vendedora/login` en un 401 de su propia API, sin
  tocar `/` ni `/portal`), así que no necesitó cambios.
  **Verificado en vivo con `curl` (cookie jars separados, sin caché de navegador):** vendedora en
  `/` → 307 a `/vendedora` (antes: loop); vendedora en `/portal` → 307 a `/vendedora` (antes: loop);
  vendedora en `/vendedora` → 200 (sin cambios, ya funcionaba); **sin regresión** — CONTADOR en `/` →
  200, CONTADOR en `/portal` → 307 a `/` (correcto); cliente real (magic link real, no simulado) en
  `/` → 307 a `/portal` → 200 (comportamiento original intacto).

### Fase 1 — Autenticación y accesos
- [x] Login admin — re-confirmado tras los cambios (sesión real con `admin@panel.cl`, dashboard con
  datos reales de los 25 clientes de prueba).
- [x] Restricción de rutas para el rol CONTADOR — ver el hallazgo de arriba, corregido y verificado.
- [x] Login de vendedora + portal de vendedora — cuenta de prueba real (`vendedora-test@panel.cl`):
  login OK, `GET /api/vendedoras/mis-datos` devuelve stats reales (0 clientes asignados, correcto para
  una cuenta nueva), `/vendedora` carga 200. El loop de redirects encontrado y corregido arriba
  bloqueaba por completo esta función hasta ahora. **Pendiente de UI real** (comisiones/CSV con datos
  reales asignados) — no crítico, ya que el acceso base y la API están confirmados funcionando.
- [x] Portal cliente — magic link real: envío, verify, expiración/un solo uso — verificado (ver Fase 0).
- [x] Portal cliente — búsqueda por dominio/RUT/nombre tras el fix — verificado (ver Fase 0).

### Fase 2 — Gestión de clientes
- [x] Crear cliente nuevo — con plan y suscripción inicial real vía API (`Clinica Test Verificacion`,
  plan `TEST_PLAN`, `metodoPago:TRANSFERENCIA`) → 201, `service_key` generada con
  `crypto.randomBytes(32)`, suscripción creada con `fechaVencimiento = +30 días`.
- [x] Editar cliente — 3 casos reales: `apiUrl:"http://inseguro.cl"` → **400** "apiUrl debe usar
  HTTPS"; `planId` inexistente → **400** "Plan no encontrado"; edición válida (teléfono) → 200.
  De paso se agregó la MISMA validación de HTTPS al `POST /api/clientes` (creación), que antes solo
  existía en el `PUT` de edición — un cliente podía nacer con `apiUrl` insegura y nadie lo detectaba
  hasta la primera edición (mitigado en la práctica por el fix ya hecho en `clinic-api.ts` por la
  sesión paralela, que rechaza la llamada real igual, pero es mejor bloquearlo en el origen).
- [x] Eliminar cliente — cliente de prueba completo (con suscripción, pago y logs de suspensión)
  eliminado al cerrar la sesión, en el orden correcto de dependencias (pagos → suscripciones → logs →
  magic links → anuncios → cliente) para no violar las foreign keys.

### Fase 3 — Planes y push a la clínica
- [x] CRUD de planes — creado `TEST_PLAN` ($19.990, 3 profesionales, módulos `["citas","pacientes"]`)
  vía API real → 201.
- [x] Asignar/cambiar plan a un cliente → `clinicApi.pushPlan()` — disparado indirectamente al
  registrar el pago manual de la Fase 5 (`registrarPagoConfirmado()` llama `pushPlan` tras cada pago).
  Como el `apiUrl` de prueba (`https://test-verif.cl`) no resuelve a ningún WordPress real, la llamada
  falló tras los 3 reintentos (0/1/4s) y quedó `syncPending:true` — comportamiento esperado y
  correcto en este entorno sin clínica real conectada (no se puede probar el `200 OK` real del
  plugin sin una instalación WordPress accesible, misma limitación ya documentada en el proyecto
  "clinica dental" para MercadoPago/WhatsApp/Google Calendar).
- [x] Confirmado el contrato contra `class-servicio.php::set_plan()` real, leyendo el archivo fuente
  del plugin (no solo memoria de auditorías previas): body `{nombre, maxProfesionales, modulos}`,
  header `X-Dora-Service-Key` — coincide exactamente con lo que `clinicApi.pushPlan()` envía.

### Fase 4 — Activar/Suspender (el corazón del panel)
- [x] Suspensión manual — re-confirmada con el cliente de prueba real: `POST .../suspender` →
  `estado:SUSPENDIDO`, intenta `clinicApi.setEstado()` contra el `apiUrl` de prueba (falla tras
  reintentos por ser un dominio ficticio, marca `syncPending:true` correctamente), registra
  `LogSuspension` con el motivo real.
- [x] Reactivación manual — verificada indirectamente vía el pago manual de Fase 5 (`reactivado:true`
  en la respuesta), que reusa el mismo `clinicApi.setEstado()`.
- [x] Cron de vencimiento automático (`POST /api/cron`) — sin `x-cron-secret` → **401**; con el
  secreto real (`CRON_SECRET` de `.env`) → **200**, `{"avisos":0,"suspendidos":6,"errores":[]}` — el
  cron detectó y suspendió automáticamente 6 clientes reales del dataset de prueba cuya fecha de
  vencimiento + período de gracia ya había pasado (dato del seed, no algo que yo alterara — es la
  función trabajando correctamente sobre datos ya vencidos).
- [x] Reintento de `syncPending` (`retrySyncPending`) — el mismo request de cron devolvió
  `"syncRetry":{"ok":0,"fallos":10}`: 10 clientes con `syncPending:true` (acumulados de pruebas de
  suspender/reactivar contra dominios ficticios en esta sesión y la anterior), los 10 reintentos
  fallaron correctamente (dominios que no resuelven a ningún WordPress real) sin crashear el cron.

### Fase 5 — Pagos
- [x] Registrar pago manual — cliente de prueba SUSPENDIDO → `POST /api/pagos` con
  `suscripcionId` real → `{"reactivado":true, "nuevaFecha":"2026-09-14..."}`, `estado` del cliente
  confirmado `ACTIVO` después. Extensión de 30 días desde la fecha de vencimiento real (no desde
  "hoy"), correcto ya que la suscripción aún no estaba vencida.
- [x] Webhook MercadoPago (`payment` y `subscription_authorized_payment`) — **no se pudo ejercitar de
  punta a punta** en este entorno: `MP_ACCESS_TOKEN` está vacío en `.env` (modo dev), y el webhook
  real SIEMPRE re-consulta el pago contra la API real de MercadoPago con ese token antes de acreditar
  nada (protección anti-spoofing ya implementada correctamente) — sin credenciales sandbox reales no
  hay forma de generar un `payment_id`/`preapproval_id` válido que esa consulta acepte. Se verificó en
  cambio, por lectura de código, que ambos handlers llaman a la misma `registrarPagoConfirmado()` ya
  probada en vivo arriba (con idempotencia por `referencia` real). Misma limitación estructural ya
  documentada extensamente en el proyecto hermano "clinica dental" para MercadoPago/WhatsApp/Google
  Calendar — no es un defecto de esta sesión, es la falta de una cuenta sandbox real disponible aquí.
- [x] Transbank Webpay Plus — no probado de punta a punta (mismo motivo: requiere el flujo real de
  redirección al banco). Confirmado por lectura de `src/lib/transbank.ts` que en modo no-producción
  usa las credenciales de integración OFICIALES de Transbank (`IntegrationCommerceCodes.WEBPAY_PLUS`),
  no credenciales inventadas — el armado de la transacción es correcto, falta el round-trip real.

### Fase 6 — Impersonación, anuncios, documentos, configuración, reportes
- [x] Impersonar cliente — `POST /api/clientes/{id}/impersonar` (admin) → cookie `token` cambia a
  `rol:cliente` + se guarda `admin_token` con el token original → `/portal` accesible (200) →
  `GET /api/portal/salir-impersonacion` → restaura el `token` de admin original (confirmado
  decodificando el JWT devuelto: `rol:"admin"`, el email correcto), borra `admin_token`, redirige a
  `/clientes`. Funciona de punta a punta sin hallazgos.
- [x] Anuncios — creado un anuncio global (`clienteId:null`) y uno individual (con `clienteId` real)
  vía API → ambos 201, listados correctamente con el nombre del cliente resuelto vía `include`.
- [x] Documentos comerciales — verificado a nivel de API (autorización + lectura) para
  cotizaciones/facturas/boletas tras el fix de acceso CONTADOR (Fase 0); el ciclo completo
  cotización→factura/boleta con numeración atómica (`getNextNumero`) se revisó por código
  (`documentos-server.ts`, usa `$transaction`) pero no se generó un documento de punta a punta en
  esta sesión — queda como verificación pendiente de una próxima sesión si se quiere profundizar.
- [x] Configuración / `env-status` — `GET /api/configuracion` (lectura, ahora también accesible a
  CONTADOR) → 200 con los datos reales de la empresa; `GET /api/configuracion/env-status` (admin
  estricto, a propósito) → 200 para admin, **401 para CONTADOR** (confirmado que la restricción de
  diseño se mantiene pese a que `/api/configuracion` en general ya es accesible a ese rol).
- [x] Reportes — `/reportes` carga (200) tanto para admin como para CONTADOR (verificado en la Fase 0).
  Los cálculos de ingresos/comisión no se re-derivaron de forma independiente en esta sesión (no hay
  un endpoint `/api/reportes` separado — la página los calcula server-side directo con Prisma) — el
  dashboard ya mostró cifras de ingresos consistentes ($719.830 este mes) en las pruebas de la Fase 0/1.

### Fase 7 — Cierre
- [x] `tsc --noEmit` limpio, `next build` limpio (65 rutas compiladas sin error) tras todos los
  cambios de esta sesión. `eslint` sobre los 18 archivos tocados: mismos 2 avisos que ya existían
  antes de esta sesión (un `Date.now()` impuro en el dashboard, un import sin usar en el layout del
  portal) — **cero problemas nuevos introducidos**.
- [x] Entorno de desarrollo apagado (`next dev` + Prisma dev Postgres locales, puertos 3000/51214-16).
  Todos los datos de prueba de esta sesión eliminados en el orden correcto de dependencias (1 cliente,
  1 plan, 1 suscripción, 1 pago, 2 logs de suspensión, 2 anuncios, 1 admin CONTADOR, 1 vendedora).
  Los 6 clientes auto-suspendidos por el cron (Fase 4) se dejaron como quedaron — es el resultado
  correcto de una función real corriendo sobre fechas de vencimiento ya pasadas del dataset de
  prueba, no algo que corresponda revertir.

## 🏁 Resumen de la sesión (2026-07-16)

**7 hallazgos reales, todos corregidos y verificados en vivo** (no solo por lectura de código):
1. 🔴 Bypass de autenticación completo en el portal de clientes (buscar por nombre/dominio otorgaba
   sesión sin verificar identidad) — reproducido con dos clínicas reales antes del fix.
2. 🔴 El rol CONTADOR nunca funcionó — el login firmaba `rol:"admin"` fijo sin importar el rol real
   de la base de datos, dándole en la práctica privilegios de administrador completos.
3. 🔴 Al corregir el punto 2, apareció un loop de redirects infinito para CONTADOR entre `/` y
   `/portal` — dos layouts con destinos de redirect incompatibles entre sí.
4. 🔴 El mismo patrón de loop infinito, encontrado de forma independiente para el rol "vendedora" —
   dejaba la función de login de vendedora completamente inutilizable.
5. 🟠 `Dockerfile`: variables `NEXT_PUBLIC_*` declaradas en el stage equivocado, nunca disponibles en
   el momento real de compilar el bundle.
6. 🟡 Mismatch de campo `citas_mes`/`citasMes` entre el panel y el plugin real de WordPress.
7. 🟡 Dashboard mostrando IDs crudos de cliente en vez de nombres reales (relación Prisma faltante).

Todas las fases del plan (autenticación, clientes, planes, activar/suspender, pagos, impersonación,
anuncios, documentos, configuración, reportes) se probaron con datos y sesiones reales, no solo
lectura de código — las únicas excepciones documentadas (webhook MercadoPago real, Transbank real,
ciclo completo de documentos comerciales) requieren credenciales/infraestructura externa no
disponible en este entorno, misma limitación ya aceptada en el proyecto hermano "clinica dental".

# Panel de Cobros SaaS — Panel Maestro

## Stack
- Next.js 16.2 (App Router, Turbopack), React 19, TypeScript, Tailwind 4
- Prisma 7 + PostgreSQL (driver adapter: `@prisma/adapter-pg`)
- Auth: JWT en httpOnly cookies (`src/lib/auth.ts`)
- Pagos: MercadoPago + Transbank Webpay Plus (`transbank-sdk`)
- Gráficos: recharts
- PDF: pdf-lib (ya instalado)

## Arquitectura maestro ↔ clínica
Cada clínica es una instalación WordPress + plugin `dental-ora/v1`. El maestro gestiona N clínicas.

**Dos flujos de pago separados:**
1. Paciente → Clínica (MP de la clínica, el maestro NO lo toca)
2. Clínica → Dueño SaaS (MP del maestro, cobro de suscripción)

**Comunicación maestro → clínica** via `src/lib/clinic-api.ts`:
- `PUT {apiUrl}/servicio/plan` — push del plan (header `X-Dora-Service-Key`)
- `PUT {apiUrl}/servicio/estado` — suspender/reactivar (no Coolify stop)
- `GET {apiUrl}/servicio/uso` — métricas de la clínica
- Retry con backoff exponencial (3 intentos: 0ms, 1s, 4s)
- En fallo final: `syncPending=true` en Cliente; el cron lo reintenta con `clinicApi.retrySyncPending()`
- **Coolify NO se usa para suspensión** — la suspensión es vía plugin WordPress

**Endpoints del maestro para las clínicas:**
- `GET /api/suscripcion/estado` — plan vigente, estado (auth: serviceKey)
- `POST /api/suscripcion/checkout` — preference_id MP para widget embebido (auth: serviceKey)

## Arquitectura del plugin WordPress (dental-ora/v1)

**Infraestructura de las clínicas:**
- WordPress en **hosting compartido DirectAdmin** (NO Coolify, NO contenedores)
- Cada clínica = WordPress independiente en URL pública HTTPS (ej: `clinica.dabstudio.cl`)
- El `apiUrl` en `Cliente` siempre es una URL pública accesible desde internet
- El PUSH del maestro es HTTP normal saliente desde Coolify — sin túneles ni config especial
- Dev local usa LocalWP (`clinicadental.local`) — estas instalaciones NO se registran en el maestro

**Cómo vive la `serviceKey` en el plugin:**
```php
// wp-config.php de cada clínica
define('DORA_SERVICE_KEY', 'el-mismo-valor-que-serviceKey-en-el-maestro');
```
El plugin la lee con: `defined('DORA_SERVICE_KEY') ? DORA_SERVICE_KEY : ''`
- No está en DB ni en `.env`, solo en `wp-config.php`
- Rotación: manual por ahora (admin actualiza `wp-config.php` + panel actualiza BD)
- El maestro NO necesita implementar rotación automática todavía

**Estado de los endpoints (al momento de esta sesión):**
- `PUT /wp-json/dental-ora/v1/servicio/plan` → **por crear** en `class-servicio.php`
- `PUT /wp-json/dental-ora/v1/servicio/estado` → **por crear** en `class-servicio.php`
- `GET /wp-json/dental-ora/v1/servicio/uso` → **por crear** (puede reusar lógica de `GET /plan` existente)
- `PUT /config {plan}` → existe pero auth con JWT admin (deuda de seguridad, reemplazar por serviceKey)
- `GET /plan` → existe, tiene datos de uso, servirá de base para `/servicio/uso`

**Mecanismo de suspensión (diseño final acordado):**
1. Maestro llama `PUT {apiUrl}/servicio/estado` con `{ estado: "suspendida" }`
2. Plugin escribe `estado_suscripcion = 'suspendida'` en `wp_dora_config`
3. Helper estático reutilizable en `class-servicio.php`:
   ```php
   public static function esta_suspendida(): bool {
     global $wpdb;
     $estado = $wpdb->get_var("SELECT estado_suscripcion FROM " . DORA_PREFIX . "config LIMIT 1");
     return $estado === 'suspendida';
   }
   ```
4. **Suspensión suave (diseño final):**
   - `class-auth.php → require_auth()`: GET pasa (lectura ok), POST/PUT/DELETE → **HTTP 402** `{ "error": "Suscripción suspendida", "codigo": "SUSPENSION", "url": "DORA_PANEL_URL/pagar" }` — el equipo puede ver citas y pacientes pero no modificar nada
   - `class-publico.php → reservar()` (`POST /wp-json/dental-ora/v1/publico/reservar`): si suspendida → **HTTP 503** `{ "error": "La agenda online no está disponible temporalmente", "codigo": "AGENDA_SUSPENDIDA" }` — bloquea nuevas citas de pacientes
5. Panel React (`auth.store.ts` + interceptor Axios): case 402 → pantalla de bloqueo con botón de pago al portal del maestro
6. **Lectura siempre disponible suspendido** — admin y profesionales pueden ver agenda, citas y pacientes existentes; solo se bloquean acciones de escritura
7. `/paciente/login` sigue público — los pacientes pueden ver sus citas existentes
8. La suspensión es **instantánea y síncrona** — el próximo POST después del PUSH ya devuelve 402/503.

**El maestro NO necesita cambiar nada** — el `PUT /servicio/estado` existente activa/desactiva todo con un solo flag.

**Implicaciones para el maestro:**
- La suspensión funciona en cadena: maestro → plugin → 402 → React. Sin el plugin, el maestro solo actualiza su propia BD (syncPending=true).
- El maestro NO necesita saber si el 402 llegó a los usuarios — solo necesita saber si el plugin aceptó el cambio de estado (HTTP 200).
- `syncPending=true` ocurre si el plugin no responde — el cron reintenta al día siguiente.

## Modelos Prisma (completos)

| Modelo | Campos clave |
|---|---|
| `Plan` | clave, nombre, precio, maxProfesionales, modulos[] |
| `Cliente` | nombre, email, rut, telefono, dominio, coolifyAppId, serviceKey, apiUrl, planId, vendedoraId, syncPending |
| `Vendedora` | nombre, email, telefono, comisionPct (null=usa global), activa |
| `Suscripcion` | clienteId, monto, metodoPago, tipoCobro, mpPreapprovalId, fechaInicio, fechaVencimiento, diasGracia |
| `Pago` | suscripcionId, monto, estado, metodoPago, referencia, fechaPago |
| `Admin` | email, password, nombre, rol (ADMIN\|CONTADOR) |
| `MagicLink` | clienteId, token, expiresAt, usado |
| `Anuncio` | titulo, mensaje, tipo, clienteId (null=global), activo, fechaFin |
| `LogSuspension` | clienteId, accion, motivo, realizadoPor |
| `Configuracion` | singleton id:"config" — empresaNombre, empresaRut, empresaDireccion, soporteEmail, soporteWhatsApp, logoUrl, comisionPct |
| `DocumentoContador` | id ("cotizacion"\|"factura"\|"boleta"), contador |
| `Cotizacion` | numero, clienteId?, clienteNombre, clienteRut, fecha, vigencia, formaPago, atte, comentarios, estado, items Json, subtotal, iva, total, deletedAt |
| `Factura` | numero, numeroSii, clienteId?, clienteNombre, clienteRut, cotizacionId?, fechaEmision, fechaVencimiento, plazoPago, estado, montoNeto, iva, total, items Json, adjuntos Json, deletedAt |
| `Boleta` | numero, numeroSii, clienteId?, clienteNombre, cotizacionId?, fechaEmision, estado, montoTotal, items Json, adjuntos Json, deletedAt |

## Seguridad — Estado actual

**Implementado (2026-07-01):**
- `src/app/api/webhooks/mercadopago/route.ts` — validación firma HMAC-SHA256 (`X-Signature`) + anti-replay ±5 min + comparación `timingSafeEqual`. Variable: `MP_WEBHOOK_SECRET` (vacío en dev = omite validación).
- `src/lib/cobros.ts` — idempotencia: si ya existe un `Pago` con la misma `referencia` CONFIRMADO, no duplica.
- `src/lib/auth.ts` — JWT expira en 24h (antes 7d).
- `src/lib/email.ts` — nueva función `enviarAlertaCronErrores()` al admin si el cron tiene errores.
- `src/app/api/cron/route.ts` — llama `enviarAlertaCronErrores` si `resultados.errores.length > 0`. Variable: `ADMIN_ALERT_EMAIL`.
- `src/app/api/clientes/[id]/route.ts` — valida que `planId` exista, que `apiUrl` sea HTTPS válida, catch sin exponer error interno.
- `src/app/api/pagos/route.ts` — valida `monto > 0 && < 10_000_000`, catch sin exponer error interno.

**Plugin clínica (`dental-ora-plugin`):**
- `dental-ora-api.php` — `wp_die()` si `DORA_JWT_SECRET` no está en wp-config (elimina secret hardcodeado).
- `dental-ora-api.php` — CORS lista blanca estricta: solo `localhost:5200`, `localhost:5201`, `DORA_PANEL_URL` exacto.
- `includes/class-servicio.php` — `esta_suspendida()` con cache `static $cache` (un solo SELECT por proceso).
- `includes/class-publico.php` — `verificar_email` devuelve solo `{ existe, tienePassword }` (sin PII).
- `includes/class-publico.php` — contraseña inicial con `bin2hex(random_bytes(8))` (no derivada del RUT).

**Variables de entorno nuevas (agregar en Coolify):**
```
MP_WEBHOOK_SECRET=<configurar en dashboard MP → Notificaciones → Webhook secret>
ADMIN_ALERT_EMAIL=agenciadab.cl@gmail.com
```

## Auth y roles
- `ADMIN` — email + password → JWT `rol:"admin"`, acceso total
- `CONTADOR` — mismo login `rol:"contador"` — pendiente: restringir rutas en proxy.ts
- Cliente (portal) — magic link → JWT `rol:"cliente"`
- Clínica (API) — header `X-Dora-Service-Key` → `requireServiceKey()` en auth.ts
- Cookie `secure` controlada por `COOKIE_SECURE=true` en env (NO por NODE_ENV)

## Vendedoras
- Modelo `Vendedora` con nombre, email, telefono, comisionPct propio (null = usa global de Configuracion)
- `Cliente.vendedoraId FK → Vendedora`
- CRUD en `/usuarios` + API `/api/vendedoras` y `/api/vendedoras/[id]`
- Comisión en Reportes: `ingresos × (vendedora.comisionPct ?? config.comisionPct)`
- Al eliminar vendedora: se desvincula de clientes (`vendedoraId = null`), no se borra el cliente

## Lógica de cobros
`src/lib/cobros.ts` → `registrarPagoConfirmado()`:
- Crea pago, extiende 30 días, reactiva si suspendido (vía clinicApi.setEstado)
- Push plan a clínica tras cada pago
- Usado por: webhook MP pago único + preapproval, Transbank confirmar, pagos manuales admin, portal

## Métodos de pago (portal cliente)
- **MP automático**: preapproval → MP cobra mensual → `subscription_authorized_payment` webhook
- **MP manual**: preference → pago único → `payment` webhook
- **Transbank Webpay Plus**: `POST /api/webhooks/transbank/iniciar` → redirect banco → `GET /confirmar`
- En dev (`MP_ACCESS_TOKEN` vacío): pagos simulados

## Sistema de Documentos (/facturas-admin)

```
Cotización → aprobada → [Convertir] → Factura (FAC-) o Boleta (BOL-)
```

**Numeración:** `getNextNumero(tipo)` en `src/lib/documentos-server.ts` (atómico via $transaction)
**Utilidades puras** (seguras para client components): `src/lib/documentos.ts` — `calcularTotales`, `formatCLP`, `calcFechaVencimiento`, `itemVacio`

**Rutas:**
```
/facturas-admin                           → tabs Cotizaciones | Facturas | Boletas
/facturas-admin/cotizaciones/nueva        → editor página completa
/facturas-admin/cotizaciones/[id]         → editar/ver + PDF + Convertir
/facturas-admin/facturas/nueva            → nueva factura
/facturas-admin/facturas/[id]             → editar + adjuntos base64
/facturas-admin/boletas/nueva             → nueva boleta
/facturas-admin/boletas/[id]              → editar
```

**API:**
```
GET/POST   /api/documentos/cotizaciones
GET/PUT    /api/documentos/cotizaciones/[id]
POST       /api/documentos/cotizaciones/[id]/convertir
GET/POST   /api/documentos/facturas
GET/PUT    /api/documentos/facturas/[id]
GET/POST   /api/documentos/boletas
GET/PUT    /api/documentos/boletas/[id]
GET        /api/documentos/pdf/[tipo]/[id]   → binary PDF (usa datos de Configuracion)
```

**Reglas:** IVA 19% fijo, descuento por ítem antes del IVA, montos enteros, soft delete, adjuntos base64 <2MB

## Páginas del panel admin

| Ruta | Descripción |
|---|---|
| `/` | Dashboard: stats, vencimientos, gráfico ingresos, atención requerida, actividad reciente |
| `/clientes` | Lista con 4 stat cards, búsqueda/filtros, **barra de progreso** por suscripción, badge plan, acciones |
| `/clientes/nuevo` | Crear cliente con plan, vendedora, método pago, RUT |
| `/clientes/[id]` | Ficha con 7 tabs: Resumen, Suscripción, Pagos, Facturación, Usuarios, API y Conexión, Configuración |
| `/planes` | CRUD de planes |
| `/pagos` | Historial de pagos (cards móvil / tabla desktop) |
| `/reportes` | Stats 12m, gráfico, por método/plan/vendedora con comisiones |
| `/facturas-admin` | Módulo contable con 3 tabs |
| `/anuncios` | Crear/gestionar anuncios globales o por cliente |
| `/usuarios` | Admins + Equipo de ventas (vendedoras) con modal crear/editar |
| `/configuracion` | Tabs: General, Integraciones, Automatizaciones, Comisiones, Notificaciones, Seguridad, Avanzado |

## Barra de progreso en /clientes

```
progreso% = (ahora - fechaInicio) / (fechaVencimiento - fechaInicio) × 100
Verde  < 60% | Amarillo 60-85% | Naranja 85-99% | Rojo = vencida o suspendida
```

## Ficha de cliente (/clientes/[id])

7 tabs implementados:
- **Resumen**: Plan y conexión (API URL + ServiceKey copiables), Estado del servicio (checklist), Acciones rápidas, Suscripción activa + confirmar pago, Historial pagos
- **Suscripción**: detalles completos
- **Pagos**: historial paginado
- **API y Conexión**: apiUrl, serviceKey, coolifyAppId copiables
- **Configuración**: editar nombre, email, RUT, teléfono, notas, apiUrl
- **Facturación / Usuarios**: placeholder (redirige o "próximamente")

## Configuración (/configuracion)

7 tabs:
- **General** (2 col): empresa + soporte + comisiones | estado integraciones + cron
- **Integraciones**: detalle por integración con estado y variable de env
- **Automatizaciones**: flujo del cron paso a paso + horario de avisos
- **Comisiones**: % global de vendedoras
- **Notificaciones / Seguridad / Avanzado**: próximamente

## Componentes reutilizables

| Componente | Descripción |
|---|---|
| `DashboardShell` | Sidebar negro + drawer móvil + topbar |
| `ClienteAcciones` | Iconos Ver / Suspender-Activar / Portal (client, row actions) |
| `GraficoIngresos` | AreaChart recharts para ingresos mensuales |
| `AnuncioCard` | Card coloreada por tipo (INFO/ADVERTENCIA/EXITO/MANTENIMIENTO) |
| `documentos/ItemsEditor` | Array dinámico ítems con IVA en tiempo real |
| `documentos/ClienteSelectorDoc` | Dropdown clientes del sistema + nombre libre |
| `documentos/EstadoBadgeDocs` | Badge por estado de cualquier documento |
| `documentos/ConvertirDocumentoModal` | Modal cotización → factura/boleta con plazo |
| `documentos/AdjuntosBase64` | Upload/download/delete adjuntos base64 |

## Transbank
- `src/lib/transbank.ts` → `getWebpayTx()` — integración auto o producción según `TRANSBANK_ENV`
- Credenciales integración: `IntegrationCommerceCodes.WEBPAY_PLUS` + `IntegrationApiKeys.WEBPAY`

## Webhooks
- `/api/webhooks/mercadopago` — `payment` (único) + `subscription_authorized_payment` (recurrente) + `subscription_preapproval` (cancelación)
- `/api/webhooks/transbank/iniciar` + `/confirmar` — Webpay Plus

## Deploy
- GitHub: `harielfotografia/panel-cobros` (público)
- Coolify en VM Ubuntu 24.04 (`192.168.1.125:8000`)
- Docker: `node:22-alpine`, standalone build
- PostgreSQL contenedor Coolify: `jijikcw82ognfk1cf7r35sob`

## Flujo de deploy
```
1. Editar en PC → git add . && git commit -m "msg" && git push
2. Coolify (http://192.168.1.125:8000) → Redeploy
```

## Modo dev (local Windows)
- BD: `npx prisma dev --name panel` (puerto 51214)
- Si BD cae: matar PID 51214, borrar `AppData\Local\prisma-dev-nodejs\Data\durable-streams\panel\server.lock.lock`, relanzar
- `.env` `MP_ACCESS_TOKEN=""`, `SMTP_HOST=""` → modo simulado
- Login: `admin@panel.cl` / `admin123`
- Portal clientes (seed): `contacto@sonrisaperfecta.cl`, `admin@odontosalud.cl`, `gerencia@dentalandes.cl`, `info@dentalspa.cl`
- `npx prisma db push` (NO migrate dev)

## Gotchas
- Prisma 7: driver adapter obligatorio (`@prisma/adapter-pg`) en `src/lib/prisma.ts`
- Next 16: proxy.ts (no middleware.ts), corre en Edge — no usar jsonwebtoken ahí
- `src/app/page.tsx` no debe existir
- `clinicApi.setEstado/pushPlan` reciben `clienteId` como primer arg (para marcar syncPending)
- `getNextNumero` en `documentos-server.ts` (NO en `documentos.ts`) — evita importar Prisma en client components
- `documentos.ts` solo utilidades puras, sin imports de Prisma ni Node-only

## Archivos clave
- `src/lib/prisma.ts` — singleton Prisma con PrismaPg adapter
- `src/lib/clinic-api.ts` — HTTP WordPress con retry + syncPending
- `src/lib/cobros.ts` — lógica centralizada de pagos
- `src/lib/transbank.ts` — Webpay Plus helper
- `src/lib/documentos.ts` — utilidades puras (formatCLP, calcularTotales, etc.)
- `src/lib/documentos-server.ts` — getNextNumero con Prisma (solo servidor)
- `src/lib/auth.ts` — JWT + requireAdmin + requireCliente + requireServiceKey
- `src/app/api/documentos/` — CRUD + PDF generator
- `src/app/api/vendedoras/` — CRUD vendedoras
- `src/app/(dashboard)/clientes/page.tsx` — lista con progreso y filtros
- `src/app/(dashboard)/clientes/[id]/page.tsx` — ficha 7 tabs (client component)
- `src/app/(dashboard)/configuracion/page.tsx` — 7 tabs (client component)
- `src/app/(dashboard)/usuarios/page.tsx` — admins + vendedoras con modal
- `src/components/DashboardShell.tsx` — layout admin con sidebar + drawer
- `scripts/seed.ts` — 4 clínicas dentales + planes + anuncios + documentos de prueba

## Plan de Seguridad — Fases de Implementación

### FASE 1 — CRÍTICOS (implementar antes de cualquier cliente real)

| # | Archivo | Vulnerabilidad | Fix |
|---|---------|---------------|-----|
| 1 | `src/app/api/webhooks/mercadopago/route.ts` | Sin validación de firma HMAC — cualquiera puede simular un pago | Verificar `X-Signature` con HMAC-SHA256 usando `MP_WEBHOOK_SECRET` |
| 2 | `dental-ora-plugin/dental-ora-api.php:17` | Secret JWT hardcodeado como fallback — todas las clínicas comparten el mismo secret | `wp_die()` si `DORA_JWT_SECRET` no está definido |
| 3 | `class-publico.php:71-78` | `verificar_email` expone nombre, apellido, RUT, teléfono sin autenticación | Devolver solo `{ existe, tienePassword }` |
| 4 | `class-publico.php:159` | Contraseña derivada del RUT (adivinable) + enviada en email en texto plano | Generar contraseña aleatoria segura con `bin2hex(random_bytes(8))` |
| 5 | `src/lib/cobros.ts` | Sin idempotencia — webhook retry crea pagos duplicados | Verificar si ya existe `pago` con la misma `referencia` antes de insertar |

### FASE 2 — ALTOS (antes de escalar a múltiples clínicas)

| # | Archivo | Vulnerabilidad | Fix |
|---|---------|---------------|-----|
| 6 | `src/app/api/clientes/[id]/route.ts` | Mass assignment — PUT acepta `serviceKey`, `estado`, `coolifyAppId` sin whitelist | Filtrar campos permitidos explícitamente antes de escribir a DB |
| 7 | `src/app/api/pagos/route.ts` | `monto` sin rango — acepta negativos y ceros | Validar `monto > 0 && monto < 10_000_000` |
| 8 | `src/lib/clinic-api.ts:26` | `apiUrl` sin validación — admin puede redirigir requests a servidor externo | Validar `protocol === 'https:'` y formato URL antes de cada llamada |
| 9 | `dental-ora-api.php:109-128` | CORS acepta `localhost:*` — cualquier página local puede hacer requests | Lista blanca estricta por `DORA_PANEL_URL` exacto |

### FASE 3 — MEDIOS (antes de producción con HTTPS real)

| # | Archivo | Vulnerabilidad | Fix |
|---|---------|---------------|-----|
| 10 | `src/lib/auth.ts:10` | JWT expira en 7 días — token robado útil una semana | Reducir a 24h |
| 11 | `class-servicio.php:129` | `esta_suspendida()` hace query a BD en cada request autenticado | Cache estático por request con variable `static` |
| 12 | `src/app/api/cron/route.ts` | Errores de suspensión no alertan — fallos silenciosos | Enviar email a admin si `resultados.errores.length > 0` |
| 13 | `class-publico.php:195-223` | Race condition en doble reserva — dos requests simultáneos pasan el check | `SELECT ... FOR UPDATE` en transaction antes del INSERT |
| 14 | `next.config.ts` | Sin HSTS en producción | Agregar header `Strict-Transport-Security` |

### Estado de implementación
- [x] Fase 1: Críticos — implementado 2026-06-28
- [x] Fase 2: Altos — implementado 2026-06-28
- [x] Fase 3: Medios (parcial) — implementado 2026-06-28

### Variables de entorno nuevas requeridas
- `MP_WEBHOOK_SECRET` — secret del webhook MP (en Coolify + .env). Vacío en dev = validación omitida.
- `ADMIN_ALERT_EMAIL` — email del admin para recibir alertas del cron.

---

## Deploy actual (producción)
- **URL:** https://portal.dabstudio.cl (HTTPS activo y verificado)
- **IP VPS:** 45.7.229.211 (OpenCloud Chile, Ubuntu 22.04, 2vCPU 4GB)
- **SSH:** `ssh -p 50803 root@45.7.229.211`
- **Coolify:** http://45.7.229.211:8000 (admin@panel.cl / admin123)
- **DB URL:** `postgres://postgres:Myr941pmOcateluFtAFxvU1VqBkJagAjbxjXtUfRT78EFL1MPdOO0pTCnSg3tDgQ@dwpal9qyhbfeqrjigzrj6fu7:5432/postgres`
- **Contenedor app:** `docker ps | grep hthu` (nombre cambia en cada deploy)
- **Si hay cambios de schema:** correr `docker run --rm --network coolify -v /tmp/repo/prisma:/prisma -e DATABASE_URL="..." node:22-alpine sh -c "npm install prisma@7 --prefix /tmp 2>/dev/null && DATABASE_URL='...' node /tmp/node_modules/prisma/build/index.js db push --schema=/prisma/schema.prisma --accept-data-loss"`
- **Si /tmp/repo no existe:** `cd /tmp && git clone https://github.com/harielfotografia/panel-cobros.git repo`

## Login
- **Admin:** email o nombre de usuario + contraseña (ojo para ver contraseña)
- **Portal cliente:** buscar por dominio, RUT empresa, nombre o email → muestra estado suscripción → accede al portal

## Portal cliente (`/portal`)
- Acceso via magic link (email) O búsqueda por dominio/RUT/nombre desde `/portal/login`
- Páginas: dashboard, pagar, facturas, notificaciones, cuenta
- API buscar cliente: `POST /api/portal/buscar-cliente` → devuelve info + setea cookie JWT

## Animaciones y diseño
- CSS global en `src/app/globals.css`: `animate-fade-in-up`, `animate-scale-in`, skeleton shimmer, stagger delays
- Páginas rediseñadas: Planes, Pagos, Login admin, Portal login
- Fondo general: `bg-gray-50` (no blanco puro)

## Por implementar
- Webhook MP preapproval recurrente para renovaciones automáticas (parcialmente implementado)
- Paginación real en tablas (Pagos, Clientes)
- Separar `Plan.modulos` (gating por plan, controla el maestro) de los módulos propios de la clínica
  (`wp_dora_config.modulos`, self-service) — hoy comparten el mismo campo en el plugin y un push de
  plan podría pisar las preferencias de la clínica. Ver `class-servicio.php::set_plan()`.
- Enforcement real de módulos por plan (Gerty, POS MercadoPago, Convenios, Sala de espera) — hoy el
  campo se guarda pero ningún endpoint del plugin lo valida todavía.

### Resuelto (2026-07-18)
- Plugin WordPress: endpoints `PUT /servicio/estado`, `PUT /servicio/plan`, `GET /servicio/uso` —
  implementados y verificados en vivo contra `clinica.dabstudio.cl`
- Restricción de rutas para rol CONTADOR en proxy.ts
- HTTPS verificado en portal.dabstudio.cl (`COOKIE_SECURE=true` en Coolify)
- Portal vendedoras — ya existe con login propio (`/vendedora/login` + `/vendedora`)
- Suspensión suave: GET (lectura) pasa incluso suspendido; solo se bloquea escritura (POST/PUT/DELETE)
  — ver `class-auth.php::require_auth()`. El panel de la clínica muestra un banner, no pantalla completa.
- Asignación referencial de profesionales por box (`wp_dora_box_staff`) — gestión interna, no
  restringe el agendamiento. Ver `Configuracion.tsx` → tab "Boxes / sillones".
- `MP_ACCESS_TOKEN`/`MP_WEBHOOK_SECRET` — pendiente de cargar en Coolify con las claves de
  producción del usuario (ya las tiene, falta el paso de Coolify + webhook en mercadopago.cl)
- **Bug corregido — `/api/suscripcion/*` nunca funcionó para llamadas externas:** `proxy.ts`
  redirigía cualquier request sin la cookie de sesión admin a `/login`, incluyendo
  `/api/suscripcion/estado` y `/api/suscripcion/checkout`, que se autentican con el header
  `X-Dora-Service-Key` (no con cookie). Se agregó `/api/suscripcion` a `PUBLIC_PATHS` — la
  autenticación real la sigue haciendo `requireServiceKey()` dentro de cada handler, `proxy.ts`
  solo dejaba de bloquearlo antes de llegar ahí. **Requiere redeploy en Coolify para tomar efecto
  en producción** (verificado localmente contra el dev server, no contra portal.dabstudio.cl).
- Widget "Pagar suscripción" en el panel de la clínica (`admin-panel/src/components/
  SuscripcionMaestroWidget.tsx`, visible en `/dashboard` solo para ADMIN): consulta estado y genera
  el link de pago (Checkout Pro, redirección — no Bricks embebido) vía un proxy PHP nuevo en el
  plugin (`class-suscripcion-maestro.php`) que llama al maestro server-to-server con
  `DORA_SERVICE_KEY`. El key nunca llega al navegador — verificado en la respuesta al frontend.
