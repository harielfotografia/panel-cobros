@AGENTS.md

# Panel de Cobros SaaS — Panel Maestro

## Stack
- Next.js 16.2 (App Router, Turbopack), React 19, TypeScript, Tailwind 4
- Prisma 7 + PostgreSQL (driver adapter: `@prisma/adapter-pg`)
- Auth: JWT en httpOnly cookies (`src/lib/auth.ts`)
- Pagos: MercadoPago (`src/lib/mercadopago.ts`)

## Arquitectura maestro ↔ clínica
Cada clínica es una instalación WordPress + plugin `dental-ora/v1`. El maestro gestiona N clínicas.

**Dos flujos de pago separados:**
1. Paciente → Clínica (MP de la clínica, el maestro NO lo toca)
2. Clínica → Dueño SaaS (MP del maestro, cobro de suscripción)

**Comunicación maestro → clínica** via `src/lib/clinic-api.ts`:
- `PUT {apiUrl}/servicio/plan` — push del plan (header `X-Dora-Service-Key`)
- `PUT {apiUrl}/servicio/estado` — suspender/reactivar (no Coolify stop)
- `GET {apiUrl}/servicio/uso` — métricas de la clínica

**Endpoints del maestro para las clínicas:**
- `GET /api/suscripcion/estado` — plan vigente, estado (auth: serviceKey)
- `POST /api/suscripcion/checkout` — preference_id MP para widget embebido (auth: serviceKey)

## Modelos clave (Prisma)
- `Plan` — clave (BASICO/PRO/PREMIUM), precio, maxProfesionales, modulos
- `Cliente` — serviceKey (unique), apiUrl, planId, coolifyAppId (opcional)
- `Suscripcion` — planId, fechaVencimiento, tipoCobro (AUTOMATICO/MANUAL)
- `Pago`, `Admin`, `MagicLink`, `Anuncio`, `LogSuspension`

## Auth
- Admin: email + password → JWT con `rol: "admin"`
- Cliente (portal): magic link → JWT con `rol: "cliente"`
- Clínica (API): header `X-Dora-Service-Key` → `requireServiceKey()` en auth.ts
- Cookie `secure` controlada por env `COOKIE_SECURE=true` (NO por NODE_ENV, para funcionar en HTTP de prueba)

## Lógica de cobros centralizada
`src/lib/cobros.ts` → `registrarPagoConfirmado()`:
- Crea pago, extiende 30 días, reactiva si suspendido (vía clinicApi, no Coolify)
- Push del plan a la clínica tras pago
- Usado por: webhook MP, pagos manuales admin, portal

## Suspensión
- Decisión siempre del maestro (nunca la clínica)
- Vía `clinicApi.setEstado("suspendida")` — la clínica muestra pantalla de no-pago
- Cron (`/api/cron`) suspende automáticamente tras vencimiento + días de gracia
- NO se usa Coolify stop/start para suspensión

## Deploy
- GitHub: `harielfotografia/panel-cobros` (público)
- Coolify en VM Ubuntu 24.04 (`192.168.1.125:8000`)
- App en Docker vía Dockerfile (node:22-alpine, standalone)
- PostgreSQL en contenedor Docker de Coolify (nombre: `jijikcw82ognfk1cf7r35sob`)
- Para deployar cambios: `git push` → Coolify → Redeploy

## Flujo de deploy
```
1. Editar código en PC (Claude Code)
2. PowerShell: git add . && git commit -m "msg" && git push
3. Coolify (http://192.168.1.125:8000): click Redeploy
```

## Modo dev (local Windows)
- BD local: `npx prisma dev` (Postgres experimental, puerto 51214)
- `.env` con `MP_ACCESS_TOKEN=""`, `SMTP_HOST=""` → modo dev (pagos simulados, emails a consola)
- Login admin: `admin@panel.cl` / `admin123`
- `npx prisma db push` (no migrate dev, falla con shadow DB)

## Gotchas
- Prisma 7 exige driver adapter en `src/lib/prisma.ts`
- `prisma.config.ts` necesario para Prisma 7 (incluido en Dockerfile)
- Next 16: middleware se llama `proxy.ts` (función `proxy`), corre en Edge — no usar jsonwebtoken ahí
- `src/app/page.tsx` no debe existir (choca con `(dashboard)/page.tsx`)
- Standalone build necesita copiar `public/` y `.next/static/` manualmente si se usa `node server.js`

## Archivos clave
- `src/lib/clinic-api.ts` — cliente HTTP para WordPress
- `src/lib/cobros.ts` — lógica centralizada de pagos
- `src/lib/auth.ts` — JWT + requireServiceKey()
- `src/lib/mercadopago.ts` — integración MP
- `src/app/api/suscripcion/` — endpoints para clínicas
- `src/app/api/cron/route.ts` — suspensión automática
- `src/app/(dashboard)/planes/page.tsx` — admin de planes
- `scripts/seed.ts` — datos de prueba (3 planes, 4 clínicas)

## Por implementar
- Endpoints WordPress plugin (`PUT /servicio/plan`, `PUT /servicio/estado`, `GET /servicio/uso`)
- Retry con backoff en clinic-api.ts + flag syncPending
- Transbank Webpay Plus
- Webhook MP para preapproval recurrente
- Dominio real + HTTPS (agregar `COOKIE_SECURE=true`)
