// Funciones auxiliares relacionadas con empleados
const db = require("../config/db");

/**
 * Determina el estado actual de un empleado (DENTRO/FUERA)
 * consultando su último fichaje en la base de datos.
 *
 * Un empleado está DENTRO si su último fichaje no tiene hora de salida.
 * Un empleado está FUERA si su último fichaje tiene hora de salida,
 * o si no tiene ningún fichaje registrado.
 *
 * @param {number} empleado_id - ID del empleado a consultar
 * @returns {Promise<string>} "DENTRO" o "FUERA"
 */
async function getEstadoEmpleado(empleado_id) {
  const [rows] = await db.execute(
    `SELECT hora_salida FROM fichajes
     WHERE empleado_id = ?
     ORDER BY fecha_entrada DESC, hora_entrada DESC
     LIMIT 1`,
    [empleado_id],
  );
  if (rows.length === 0) return "FUERA";
  return rows[0].hora_salida === null ? "DENTRO" : "FUERA";
}

module.exports = { getEstadoEmpleado };
