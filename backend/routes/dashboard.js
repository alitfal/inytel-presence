// Rutas del panel de administración (Dashboard)
// Estadísticas, calendario, ranking y alertas de presencia
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authMiddleware, soloAdmin } = require("../middlewares/auth");
const { getEstadoEmpleado } = require("../helpers/empleados");

/**
 * GET /api/stats
 * Devuelve las estadísticas generales de presencia:
 * - Total de empleados activos
 * - Empleados dentro/fuera en tiempo real
 * - Fichajes registrados hoy
 * - Distribución de fichajes por hora (hoy)
 * - Fichajes por día (últimos 7 días o rango personalizado)
 *
 * Acepta los parámetros opcionales ?desde y ?hasta para filtrar por fechas.
 */
router.get("/stats", authMiddleware, async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const [[{ total }]] = await db.execute(
      "SELECT COUNT(*) as total FROM empleados WHERE activo=1",
    );

    // Calcular empleados dentro en tiempo real
    const [empleados] = await db.execute(
      "SELECT id FROM empleados WHERE activo=1",
    );
    let dentro = 0;
    for (const e of empleados) {
      const estado = await getEstadoEmpleado(e.id);
      if (estado === "DENTRO") dentro++;
    }

    const [[{ fichajes_hoy }]] = await db.execute(
      "SELECT COUNT(*) as fichajes_hoy FROM fichajes WHERE fecha_entrada = CURDATE()",
    );

    const [por_horas] = await db.execute(`
      SELECT HOUR(hora_entrada) as hora, COUNT(*) as total
      FROM fichajes WHERE fecha_entrada = CURDATE()
      GROUP BY HOUR(hora_entrada) ORDER BY hora
    `);

    const filtro =
      desde && hasta
        ? `fecha_entrada BETWEEN '${desde}' AND '${hasta}'`
        : `fecha_entrada >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`;

    const [por_dias] = await db.execute(`
      SELECT fecha_entrada as dia, COUNT(*) as total
      FROM fichajes WHERE ${filtro}
      GROUP BY fecha_entrada ORDER BY fecha_entrada
    `);

    res.json({
      total,
      dentro,
      fuera: total - dentro,
      fichajes_hoy,
      por_horas,
      por_dias,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/dashboard/calendario
 * Devuelve los empleados que ficharon en una fecha concreta.
 * Incluye primera entrada, última salida y total de fichajes del día.
 * Acepta el parámetro ?fecha=YYYY-MM-DD (por defecto hoy).
 * Solo accesible por administradores.
 */
router.get("/calendario", authMiddleware, soloAdmin, async (req, res) => {
  try {
    const fecha = req.query.fecha || new Date().toISOString().slice(0, 10);
    const [rows] = await db.execute(
      `SELECT e.id, e.nombre, e.cargo, e.departamento,
       MIN(f.hora_entrada) as primera_entrada,
       MAX(f.hora_salida) as ultima_salida,
       COUNT(f.id) as total_fichajes
       FROM fichajes f JOIN empleados e ON f.empleado_id = e.id
       WHERE f.fecha_entrada = ?
       GROUP BY e.id, e.nombre, e.cargo, e.departamento`,
      [fecha],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/dashboard/sin-fichar
 * Devuelve empleados activos que llevan X días sin registrar actividad.
 * Útil para detectar ausencias no justificadas.
 * Acepta el parámetro ?dias=N (por defecto 3).
 * Solo accesible por administradores.
 */
router.get("/sin-fichar", authMiddleware, soloAdmin, async (req, res) => {
  try {
    const dias = parseInt(req.query.dias) || 3;
    const [rows] = await db.execute(
      `SELECT e.id, e.nombre, e.cargo, e.departamento,
       MAX(f.fecha_entrada) as ultimo_fichaje,
       DATEDIFF(CURDATE(), MAX(f.fecha_entrada)) as dias_sin_fichar
       FROM empleados e LEFT JOIN fichajes f ON e.id = f.empleado_id
       WHERE e.activo = 1
       GROUP BY e.id, e.nombre, e.cargo, e.departamento
       HAVING ultimo_fichaje IS NULL OR DATEDIFF(CURDATE(), MAX(f.fecha_entrada)) >= ?
       ORDER BY dias_sin_fichar DESC`,
      [dias],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/dashboard/ranking
 * Devuelve el ranking de horas trabajadas en la semana actual.
 * Calcula la diferencia entre horas trabajadas y horas esperadas
 * según la jornada configurada de cada empleado.
 * Solo accesible por administradores.
 */
router.get("/ranking", authMiddleware, soloAdmin, async (req, res) => {
  try {
    const hoy = new Date();
    const dia = hoy.getDay();
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - (dia === 0 ? 6 : dia - 1));
    const inicioSemana = lunes.toISOString().slice(0, 10);

    const [jornadas] = await db.execute(
      `SELECT empleado_id, hora_entrada, hora_salida
       FROM fichajes WHERE fecha_entrada >= ? AND hora_salida IS NOT NULL
       ORDER BY empleado_id`,
      [inicioSemana],
    );

    const [empleados] = await db.execute(
      "SELECT id, nombre, cargo, horas_semanales FROM empleados WHERE activo = 1",
    );

    // Acumular minutos trabajados por empleado
    const minutosPorEmpleado = {};
    for (const j of jornadas) {
      const [he, mi_e] = j.hora_entrada.split(":").map(Number);
      const [hs, mi_s] = j.hora_salida.split(":").map(Number);
      const mins = hs * 60 + mi_s - (he * 60 + mi_e);
      minutosPorEmpleado[j.empleado_id] =
        (minutosPorEmpleado[j.empleado_id] || 0) + mins;
    }

    const ranking = empleados
      .map((e) => ({
        id: e.id,
        nombre: e.nombre,
        cargo: e.cargo,
        horas_trabajadas:
          Math.round(((minutosPorEmpleado[e.id] || 0) / 60) * 100) / 100,
        horas_esperadas: e.horas_semanales || 40,
        diferencia:
          Math.round(
            ((minutosPorEmpleado[e.id] || 0) / 60 - (e.horas_semanales || 40)) *
              100,
          ) / 100,
      }))
      .sort((a, b) => b.horas_trabajadas - a.horas_trabajadas);

    res.json(ranking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
