# Panel de Cobros Automáticos

Panel para gestionar sistemas vendidos como SaaS. Cada cliente corre su propio sistema en **Coolify** (VPS Linux) como app Docker con dominio propio. El panel cobra suscripciones mensuales y **suspende/reactiva** automáticamente el servicio según el estado de pago.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Prisma 7** + **PostgreSQL** (con driver adapter `@prisma/adapter-pg`)
- **Tailwind 4**
- Pagos: **MercadoPago** (suscripción automática + pago único) y transferencia manual
- PDF de comprobantes con **pdf-lib**
- Auth: JWT en cookie httpOnly, con roles `admin` y `cliente` (magic link)

## Dos áreas

| Área | Ruta | Quién | Qué hace |
|------|------|-------|----------|
| **Panel admin** | `/` | Tú | Gestiona clientes, pagos, suspensión/reactivación, anuncios |
| **Portal cliente** | `/portal` | Tus clientes | Ven su estado, acceden a su sistema, pagan, descargan facturas |

## Cómo correr en local

```bash
# 1. Levantar la base de datos local (Postgres de Prisma)
npx prisma dev --name panel        # déjalo corriendo en una terminal

# 2. Crear las tablas y datos de prueba
npx prisma db push   # crea/sincroniza las tablas
npm run db:seed      # carga 4 clínicas dentales de prueba + anuncios

# 3. Levantar la app
npm run dev          # http://localhost:3000
```

> Si `prisma dev` queda en mal estado ("Server has closed the connection" / "Lock file is already being held"):
> 1. Mata el proceso del puerto 51214.
> 2. Borra el lock: `C:\Users\<usuario>\AppData\Local\prisma-dev-nodejs\Data\durable-streams\panel\server.lock.lock`
> 3. Relanza `npx prisma dev --name panel`. Los datos persisten en disco.

## Modo desarrollo vs producción (IMPORTANTE)

En `.env`, las credenciales de **SMTP** y **MercadoPago** deben estar **vacías** en local:

- **Vacías → modo dev**: los emails se imprimen en consola, los magic links se muestran en pantalla, y los pagos se **simulan** (crean un pago real CONFIRMADO y reactivan al cliente). Permite probar todo el flujo sin credenciales.
- **Con valores reales → producción**: se activan los envíos de email y los pagos reales de MercadoPago automáticamente.

⚠️ No dejes valores *placeholder* (como `tu@email.com`): el código los toma como configurados e intenta llamadas reales que fallan con 500/502.

## Entorno de prueba (datos del seed)

**Admin:** `admin@panel.cl` / `admin123`

**4 clínicas dentales** (login al portal por magic link con su correo — el enlace aparece en pantalla en modo dev):

| Clínica | Correo | Estado | Cobro |
|---------|--------|--------|-------|
| Clínica Dental Sonrisa Perfecta | `contacto@sonrisaperfecta.cl` | Al día | Automático (tarjeta •••• 4242) |
| OdontoSalud Las Condes | `admin@odontosalud.cl` | Vence en 3 días | Manual |
| Clínica Dental Andes | `gerencia@dentalandes.cl` | Recién pagado | Automático |
| Dental Spa Vitacura | `info@dentalspa.cl` | **Suspendida** | Manual |

**Anuncios** (2 globales + 3 por cliente) visibles en el portal del cliente y en tu panel admin.

### Qué probar
- Entra al admin y revisa el resumen, clientes, pagos y anuncios.
- Suspende/reactiva un cliente manualmente desde su ficha.
- Entra al portal de `info@dentalspa.cl` (suspendida) y prueba **"Reactivar ahora"** → paga (simulado) → se reactiva.
- Crea un anuncio nuevo desde `/anuncios` (global o para un cliente) y velo aparecer en el portal del cliente.
- Descarga el PDF de una factura desde el portal.

## Scripts útiles

```bash
npm run dev          # servidor de desarrollo
npm run build        # build de producción (lo que corre Coolify)
npm run db:seed      # recargar datos de prueba
npm run admin -- correo@x.cl PASSWORD "Nombre"   # crear un admin
npx prisma studio    # explorar la BD en el navegador
```

## Despliegue en Coolify

1. Sube el repo y crea la app en Coolify (usa el `Dockerfile` incluido).
2. Configura las variables de entorno (ver `.env.example`) con credenciales **reales**.
3. En el servidor: `npx prisma migrate deploy` y `npm run admin -- tu@email.com TUPASS "Tu Nombre"`.
4. Configura un cron diario que llame `POST /api/cron` con header `x-cron-secret`.
5. Webhook de MercadoPago → `https://panel.tudominio.com/api/webhooks/mercadopago`.

## Pendiente
- Transbank Webpay Plus (enum listo, falta webhook).
- Webhook de MercadoPago para renovación recurrente del cobro automático (preapproval).
- Boleta tributaria (el PDF actual es comprobante simple).
