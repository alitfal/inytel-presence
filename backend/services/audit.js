/**
 * Servicio de logs de auditoría
 * Registra en base de datos las acciones críticas del sistema.
 * Si falla el registro, no interrumpe el flujo principal.
 */
const pool = require("../config/db");

async function registrarAudit({ usuario_id, email, accion, entidad, entidad_id, detalle, ip }) {
  try {
    await pool.execute(
      `INSERT INTO audit_logs 
        (usuario_id, email, accion, entidad, entidad_id, detalle, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        usuario_id ?? null,
        email ?? null,
        accion,
        entidad ?? null,
        entidad_id ?? null,
        detalle ? JSON.stringify(detalle) : null,
        ip ?? null,
      ]
    );
  } catch (err) {
    console.error("Error al registrar audit log:", err.message);
  }
}

module.exports = { registrarAudit };