import nodemailer from "nodemailer";

const SMTP_CONFIGURADO = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

const transporter = SMTP_CONFIGURADO
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

// Envía un email. Si no hay SMTP configurado (desarrollo), lo registra en consola.
async function enviar(to: string, subject: string, html: string) {
  if (!transporter) {
    console.log("\n========= EMAIL (modo dev, SMTP no configurado) =========");
    console.log(`Para: ${to}`);
    console.log(`Asunto: ${subject}`);
    console.log(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    console.log("=========================================================\n");
    return;
  }
  await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
}

export async function enviarMagicLink(email: string, nombre: string, url: string) {
  await enviar(
    email,
    "Tu acceso al portal",
    `<h2>Hola ${nombre},</h2>
     <p>Haz clic en el siguiente botón para entrar a tu portal. El enlace expira en 15 minutos.</p>
     <p><a href="${url}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Entrar al portal</a></p>
     <p>O copia este enlace: ${url}</p>
     <p>Si no solicitaste esto, ignora el mensaje.</p>`
  );
}

export async function enviarAvisoVencimiento(cliente: {
  nombre: string;
  email: string;
  dominio: string;
  diasRestantes: number;
}) {
  await enviar(
    cliente.email,
    `Tu suscripción vence en ${cliente.diasRestantes} día(s)`,
    `<h2>Hola ${cliente.nombre},</h2>
     <p>Tu suscripción para <strong>${cliente.dominio}</strong> vence en <strong>${cliente.diasRestantes} día(s)</strong>.</p>
     <p>Por favor realiza el pago para evitar la suspensión del servicio.</p>
     <p>Si ya realizaste el pago, ignora este mensaje.</p>`
  );
}

export async function enviarAvisoSuspension(cliente: {
  nombre: string;
  email: string;
  dominio: string;
}) {
  await enviar(
    cliente.email,
    "Tu servicio ha sido suspendido por falta de pago",
    `<h2>Hola ${cliente.nombre},</h2>
     <p>Tu servicio en <strong>${cliente.dominio}</strong> ha sido <strong>suspendido</strong> por falta de pago.</p>
     <p>Para reactivarlo, ingresa a tu portal y realiza tu pago pendiente.</p>`
  );
}

export async function enviarAlertaCronErrores(errores: string[]) {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL;
  if (!adminEmail) return;
  await enviar(
    adminEmail,
    `[Panel Cobros] Cron encontró ${errores.length} error(es)`,
    `<h2>Errores en el cron de suspensión automática</h2>
     <p>Se produjeron los siguientes errores al procesar vencimientos:</p>
     <ul>${errores.map((e) => `<li>${e}</li>`).join("")}</ul>
     <p>Revisa el panel para verificar el estado de los clientes afectados.</p>`
  );
}

export async function enviarAvisoReactivacion(cliente: {
  nombre: string;
  email: string;
  dominio: string;
}) {
  await enviar(
    cliente.email,
    "Tu servicio ha sido reactivado",
    `<h2>Hola ${cliente.nombre},</h2>
     <p>Tu servicio en <strong>${cliente.dominio}</strong> ha sido <strong>reactivado</strong> exitosamente.</p>
     <p>¡Gracias por tu pago!</p>`
  );
}
