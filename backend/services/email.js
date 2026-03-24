// Servicio de envío de emails mediante la API de Resend.
// Centraliza todas las notificaciones por correo de la aplicación.
const { Resend } = require("resend");
const crypto = require("crypto");
const db = require("../config/db");

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.APP_URL || "https://inytel-presence.up.railway.app";
const FROM = "INYTEL Presence <no-reply@inytel.com>";

/**
 * Función base para enviar emails.
 * Gestiona los errores internamente para que un fallo
 * en el envío no interrumpa el flujo principal de la aplicación.
 *
 * @param {string} to - Email destinatario
 * @param {string} subject - Asunto del email
 * @param {string} html - Contenido HTML del email
 */
async function enviarEmail({ to, subject, html }) {
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    console.error("❌ Error enviando email:", err.message);
  }
}

/**
 * Genera la cabecera HTML común para todos los emails.
 * Mantiene consistencia visual con la identidad de la aplicación.
 */
function emailHeader() {
  return `
    <div style="background:#4f46e5;border-radius:16px;padding:24px;text-align:center;margin-bottom:24px;">
      <h1 style="color:white;font-size:24px;margin:0;font-style:italic;">INYTEL | Presence</h1>
    </div>
  `;
}

/**
 * Envía un email de bienvenida al crear un nuevo empleado,
 * incluyendo sus credenciales de acceso temporales.
 *
 * @param {string} nombre - Nombre del empleado
 * @param {string} email - Email del empleado
 * @param {string} password_temporal - Contraseña temporal (su DNI)
 */
async function notificarNuevoEmpleado({ nombre, email, password_temporal }) {
  await enviarEmail({
    to: email,
    subject: "Bienvenido a INYTEL Presence — Tus credenciales de acceso",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        ${emailHeader()}
        <h2 style="color:#1e293b;">Bienvenido, ${nombre}</h2>
        <p style="color:#64748b;">Tu cuenta ha sido creada. Aquí tienes tus credenciales:</p>
        <div style="background:#f8fafc;border-radius:12px;padding:20px;margin:16px 0;">
          <p style="margin:0 0 8px 0;"><span style="color:#94a3b8;">Email:</span> <strong style="color:#1e293b;">${email}</strong></p>
          <p style="margin:0;"><span style="color:#94a3b8;">Contraseña temporal:</span> <strong style="color:#1e293b;">${password_temporal}</strong></p>
        </div>
        <p style="color:#94a3b8;font-size:13px;">Por seguridad, te recomendamos cambiar tu contraseña en el primer acceso.</p>
        <a href="${APP_URL}" style="display:inline-block;background:#4f46e5;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:bold;margin:16px 0;">
          Acceder a INYTEL Presence
        </a>
      </div>
    `,
  });
}

/**
 * Envía una notificación cuando un administrador restablece
 * la contraseña de un empleado, incluyendo la nueva contraseña.
 *
 * @param {string} nombre - Nombre del empleado
 * @param {string} email - Email del empleado
 * @param {string} password_nueva - Nueva contraseña asignada
 */
async function notificarResetPassword({ nombre, email, password_nueva }) {
  await enviarEmail({
    to: email,
    subject: "Tu contraseña ha sido restablecida — INYTEL Presence",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        ${emailHeader()}
        <h2 style="color:#1e293b;">Contraseña restablecida</h2>
        <p style="color:#64748b;">Hola ${nombre}, un administrador ha restablecido tu contraseña.</p>
        <div style="background:#f8fafc;border-radius:12px;padding:20px;margin:16px 0;">
          <p style="margin:0 0 8px 0;"><span style="color:#94a3b8;">Email:</span> <strong style="color:#1e293b;">${email}</strong></p>
          <p style="margin:0;"><span style="color:#94a3b8;">Nueva contraseña:</span> <strong style="color:#1e293b;">${password_nueva}</strong></p>
        </div>
        <p style="color:#94a3b8;font-size:13px;">Por seguridad, te recomendamos cambiar tu contraseña tras el acceso.</p>
      </div>
    `,
  });
}

/**
 * Genera un token único de recuperación de contraseña,
 * lo almacena en la base de datos con una expiración de 1 hora
 * y envía el enlace de recuperación al email del usuario.
 *
 * @param {string} email - Email del usuario que solicita la recuperación
 */
async function enviarRecuperacionPassword(email) {
  const [rows] = await db.execute("SELECT * FROM usuarios WHERE email = ?", [
    email,
  ]);
  if (rows.length === 0) return;

  const usuario = rows[0];
  const token = crypto.randomBytes(32).toString("hex");
  const expira = new Date(Date.now() + 60 * 60 * 1000);

  await db.execute(
    "UPDATE password_reset_tokens SET usado = 1 WHERE usuario_id = ?",
    [usuario.id],
  );
  await db.execute(
    "INSERT INTO password_reset_tokens (usuario_id, token, expira_en) VALUES (?, ?, ?)",
    [usuario.id, token, expira.toISOString().slice(0, 19).replace("T", " ")],
  );

  const enlace = `${APP_URL}/reset-password?token=${token}`;

  await enviarEmail({
    to: email,
    subject: "Recuperación de contraseña — INYTEL Presence",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        ${emailHeader()}
        <h2 style="color:#1e293b;">Recuperación de contraseña</h2>
        <p style="color:#64748b;">Has solicitado restablecer tu contraseña. Haz clic en el botón para crear una nueva:</p>
        <a href="${enlace}" style="display:inline-block;background:#4f46e5;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:bold;margin:16px 0;">
          Restablecer contraseña
        </a>
        <p style="color:#94a3b8;font-size:13px;">Este enlace expira en 1 hora. Si no solicitaste este cambio, ignora este email.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
        <p style="color:#cbd5e1;font-size:12px;text-align:center;">INYTEL Presence — Sistema de control de presencia</p>
      </div>
    `,
  });
}

/**
 * Envía una confirmación al usuario cuando su contraseña
 * ha sido actualizada correctamente.
 *
 * @param {string} nombre - Nombre del usuario
 * @param {string} email - Email del usuario
 */
async function notificarPasswordActualizada({ nombre, email }) {
  await enviarEmail({
    to: email,
    subject: "Contraseña actualizada — INYTEL Presence",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        ${emailHeader()}
        <h2 style="color:#1e293b;">Contraseña actualizada</h2>
        <p style="color:#64748b;">Hola ${nombre}, tu contraseña ha sido actualizada correctamente.</p>
        <p style="color:#94a3b8;font-size:13px;">Si no fuiste tú, contacta con tu administrador inmediatamente.</p>
      </div>
    `,
  });
}

module.exports = {
  enviarEmail,
  notificarNuevoEmpleado,
  notificarResetPassword,
  enviarRecuperacionPassword,
  notificarPasswordActualizada,
};
