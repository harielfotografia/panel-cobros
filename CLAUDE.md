@AGENTS.md

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
4. **Dos puntos de uso, dos respuestas distintas:**
   - `class-auth.php → require_auth()`: si suspendida → **HTTP 402** `{ "error": "Suscripción suspendida", "codigo": "SUSPENSION", "url": "https://panel-maestro/pagar" }` — bloquea admin y profesionales
   - `class-publico.php → reservar()` (`POST /wp-json/dental-ora/v1/publico/reservar`): si suspendida → **HTTP 503** `{ "error": "La agenda online no está disponible temporalmente", "codigo": "AGENDA_SUSPENDIDA" }` — bloquea nuevas citas de pacientes
5. Panel React (`auth.store.ts` + interceptor Axios): case 402 → pantalla de bloqueo con botón de pago al portal del maestro
6. **GET de horarios/disponibilidad SÍ funciona suspendido** — el paciente puede ver horarios pero no confirmar reserva
7. `/paciente/login` sigue público — los pacientes pueden ver sus citas existentes
8. La suspensión es **instantánea y síncrona** — no hay caché ni cola de reservas pendientes. El próximo POST después del PUSH ya devuelve 503.

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
- **URL:** https://portal.dabstudio.cl (DNS configurado, pendiente SSL activarse)
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
- Plugin WordPress (endpoints `PUT /servicio/estado`, `PUT /servicio/plan`, `GET /servicio/uso`)
- Restricción de rutas para rol CONTADOR en proxy.ts
- HTTPS activo en portal.dabstudio.cl (`COOKIE_SECURE=true` en Coolify)
- Webhook MP preapproval recurrente para renovaciones automáticas (parcialmente implementado)
- Portal vendedoras (actualmente sin login propio)
- Paginación real en tablas (Pagos, Clientes)
- Configurar MP_ACCESS_TOKEN real en Coolify
