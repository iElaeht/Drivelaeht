import nodemailer from "nodemailer";

interface SendMailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE = process.env.SMTP_SECURE
  ? process.env.SMTP_SECURE === "true"
  : SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const MAIL_FROM =
  process.env.MAIL_FROM || (SMTP_USER ? `Drivelaeht <${SMTP_USER}>` : "Drivelaeht <noreply@drivelaeht.local>");

function isSmtpConfigured(): boolean {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

const transporter = isSmtpConfigured()
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  : null;

function buildEmailLayout(title: string, subtitle: string, bodyHtml: string): string {
  return `
    <div style="background-color:#11111b;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#cdd6f4;">
      <div style="max-width:480px;margin:0 auto;background-color:#1e1e2e;border:1px solid #313244;border-radius:16px;padding:28px;">
        <div style="text-align:center;margin-bottom:20px;">
          <span style="display:inline-block;padding:4px 12px;border-radius:999px;background-color:#313244;color:#cba6f7;font-size:12px;font-weight:600;letter-spacing:0.5px;">
            DRIVELAEHT SECURITY
          </span>
          <h1 style="margin:14px 0 6px;font-size:22px;color:#cdd6f4;">${title}</h1>
          <p style="margin:0;font-size:13px;color:#a6adc8;">${subtitle}</p>
        </div>
        ${bodyHtml}
        <hr style="border:none;border-top:1px solid #313244;margin:24px 0 16px;" />
        <p style="margin:0;font-size:11px;color:#6c7086;text-align:center;">
          Si no solicitaste esta operación, puedes ignorar este mensaje con seguridad.
        </p>
      </div>
    </div>
  `;
}

async function deliverEmail(payload: SendMailPayload): Promise<void> {
  if (!transporter) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[MAILER_DEV_FALLBACK]", {
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
      });
      return;
    }
    throw new Error("SMTP service is not configured");
  }

  await transporter.sendMail({
    from: MAIL_FROM,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });
}

export async function sendRegistrationCodeEmail(
  email: string,
  code: string
): Promise<void> {
  const html = buildEmailLayout(
    "Verifica tu cuenta",
    "Usa el siguiente código de 6 dígitos para activar tu espacio en Drivelaeht.",
    `
      <div style="background-color:#11111b;border:1px solid #45475a;border-radius:12px;padding:18px;text-align:center;margin:20px 0;">
        <span style="font-size:30px;font-weight:700;letter-spacing:8px;color:#cba6f7;font-family:monospace;">
          ${code}
        </span>
      </div>
      <p style="margin:0;font-size:12px;color:#a6adc8;text-align:center;">
        Este código expira en <strong>10 minutos</strong>. No lo compartas con nadie.
      </p>
    `
  );

  await deliverEmail({
    to: email,
    subject: "Código de verificación - Drivelaeht",
    html,
    text: `Tu código de verificación de Drivelaeht es: ${code}. Expira en 10 minutos.`,
  });
}

export async function sendPasswordResetCodeEmail(
  email: string,
  username: string,
  code: string
): Promise<void> {
  const html = buildEmailLayout(
    "Recuperación de acceso",
    `Hola <strong>${username}</strong>, ingresa este código de 6 dígitos para restablecer tu contraseña o actualizar tu usuario.`,
    `
      <div style="background-color:#11111b;border:1px solid #45475a;border-radius:12px;padding:18px;text-align:center;margin:20px 0;">
        <span style="font-size:30px;font-weight:700;letter-spacing:8px;color:#cba6f7;font-family:monospace;">
          ${code}
        </span>
      </div>
      <p style="margin:0;font-size:12px;color:#a6adc8;text-align:center;">
        Vigencia de <strong>10 minutos</strong>. Si no pediste recuperar tu cuenta, revisa tu seguridad.
      </p>
    `
  );

  await deliverEmail({
    to: email,
    subject: "Código de recuperación de cuenta - Drivelaeht",
    html,
    text: `Hola ${username}, tu código de recuperación de Drivelaeht es: ${code}. Expira en 10 minutos.`,
  });
}

export async function sendAccountReminderEmail(
  email: string,
  username: string
): Promise<void> {
  const html = buildEmailLayout(
    "Recordatorio de credenciales",
    "Recibimos una solicitud para recordar los datos asociados a tu cuenta en Drivelaeht.",
    `
      <div style="background-color:#11111b;border:1px solid #45475a;border-radius:12px;padding:16px;margin:20px 0;font-size:13px;color:#cdd6f4;">
        <p style="margin:0 0 8px;"><strong>Usuario:</strong> ${username}</p>
        <p style="margin:0;"><strong>Correo asociado:</strong> ${email}</p>
      </div>
      <p style="margin:0;font-size:12px;color:#a6adc8;text-align:center;">
        Ya puedes iniciar sesión o solicitar un código de recuperación de contraseña con estos datos.
      </p>
    `
  );

  await deliverEmail({
    to: email,
    subject: "Recordatorio de cuenta - Drivelaeht",
    html,
    text: `Recordatorio de cuenta en Drivelaeht — Usuario: ${username} | Correo: ${email}`,
  });
}