// Rutas de gestión de fichajes
// Registro de entradas/salidas, historial e incidencias
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authMiddleware, soloAdmin } = require("../middlewares/auth");

/**
 * Devuelve la fecha y hora actuales en la zona horaria local del servidor.
 *
 * Se usa `getTimezoneOffset()` para calcular el desplazamiento respecto a UTC
 * y se aplica sobre el timestamp Unix, de forma que `toISOString()` produzca
 * la representación local en lugar de UTC.
 *
 * Con `TZ=Europe/Madrid` configurado en Railway, este helper devuelve siempre
 * la hora de España (UTC+1 en invierno, UTC+2 en verano — DST automático).
 *
 * @returns {{ fecha: string, hora: string }}
 *   - fecha: "YYYY-MM-DD" en hora local
 *   - hora:  "HH:MM:SS"   en hora local
 */
function ahoraLocal() {
  const ahora = new Date();
  const offset = ahora.getTimezoneOffset(); // minutos de diferencia respecto a UTC
  const local = new Date(ahora.getTime() - offset * 60000);
  return {
    fecha: local.toISOString().slice(0, 10),
    hora: local.toISOString().slice(11, 19),
  };
}

/**
 * POST /api/fichajes/entrada
 * Registra la entrada de un empleado.
 * Valida que el empleado esté activo, que sea un día laborable
 * y que no haya una entrada abierta ya registrada hoy.
 */
router.post("/entrada", authMiddleware, async (req, res) => {
  try {
    const { empleado_id } = req.body;
    const [[empleado]] = await db.execute(
      "SELECT activo, dias_laborables FROM empleados WHERE id = ?",
      [empleado_id],
    );

    if (!empleado.activo)
      return res.status(403).json({
        error: "Tu cuenta está desactivada. Contacta con tu administrador.",
      });

    // Validar día laborable según configuración del empleado.
    // Se usa new Date() directamente para obtener el día de la semana —
    // con TZ=Europe/Madrid, getDay() devuelve el día correcto en hora española.
    const hoy = new Date();
    const diaSemana = hoy.getDay() === 0 ? 7 : hoy.getDay();
    const diasPermitidos = (empleado.dias_laborables || "1,2,3,4,5")
      .split(",")
      .map(Number);
    if (!diasPermitidos.includes(diaSemana)) {
      const nombres = [
        "",
        "lunes",
        "martes",
        "miércoles",
        "jueves",
        "viernes",
        "sábado",
        "domingo",
      ];
      return res.status(403).json({
        error: `Hoy es ${nombres[diaSemana]} y no es un día laborable para ti.`,
      });
    }

    // Evitar doble entrada en el mismo día.
    // CURDATE() en MySQL usa la TZ del servidor MySQL (UTC por defecto en Railway).
    // La comparación es segura porque fecha_entrada se almacena con ahoraLocal(),
    // que ya devuelve la fecha en hora española.
    const [abierta] = await db.execute(
      "SELECT id FROM fichajes WHERE empleado_id = ? AND fecha_entrada = CURDATE() AND hora_salida IS NULL",
      [empleado_id],
    );
    if (abierta.length > 0)
      return res
        .status(400)
        .json({ error: "Ya tienes una entrada registrada hoy sin salida." });

    // Obtener fecha y hora locales (hora española) para el registro.
    const { fecha, hora } = ahoraLocal();
    await db.execute(
      "INSERT INTO fichajes (empleado_id, fecha_entrada, hora_entrada) VALUES (?, ?, ?)",
      [empleado_id, fecha, hora],
    );
    res.json({ mensaje: "Entrada registrada correctamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/fichajes/salida
 * Registra la salida de un empleado.
 * Busca la jornada abierta más reciente y la cierra con la hora actual.
 */
router.post("/salida", authMiddleware, async (req, res) => {
  try {
    const { empleado_id } = req.body;
    const [rows] = await db.execute(
      `SELECT id FROM fichajes
       WHERE empleado_id = ? AND hora_salida IS NULL
       ORDER BY fecha_entrada DESC, hora_entrada DESC
       LIMIT 1`,
      [empleado_id],
    );
    if (rows.length === 0)
      return res
        .status(400)
        .json({ error: "No tienes ninguna entrada registrada sin salida." });

    // Obtener fecha y hora locales (hora española) para el registro.
    const { fecha, hora } = ahoraLocal();
    await db.execute(
      "UPDATE fichajes SET fecha_salida = ?, hora_salida = ? WHERE id = ?",
      [fecha, hora, rows[0].id],
    );
    res.json({ mensaje: "Salida registrada correctamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/fichajes/pendiente/:empleado_id
 * Detecta si un empleado tiene una jornada sin cerrar de días anteriores.
 * Se usa al iniciar sesión para mostrar el modal de incidencia.
 */
router.get("/pendiente/:empleado_id", authMiddleware, async (req, res) => {
  try {
    const { empleado_id } = req.params;
    const [rows] = await db.execute(
      `SELECT id, fecha_entrada, hora_entrada
       FROM fichajes
       WHERE empleado_id = ?
         AND fecha_entrada < CURDATE()
         AND hora_salida IS NULL
         AND motivo_incidencia IS NULL
       ORDER BY fecha_entrada DESC, hora_entrada DESC
       LIMIT 1`,
      [empleado_id],
    );
    if (rows.length === 0) return res.json({ pendiente: false });
    res.json({
      pendiente: true,
      fichaje_id: rows[0].id,
      fecha_entrada: rows[0].fecha_entrada,
      hora_entrada: rows[0].hora_entrada,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/fichajes/:empleado_id
 * Devuelve el historial de fichajes de un empleado filtrado por periodo.
 * Acepta los parámetros:
 * - periodo: "hoy" | "semana" | "mes"
 * - fecha: fecha base para la navegación temporal (YYYY-MM-DD)
 *
 * Nota sobre el parseo de fechas:
 * Las cadenas YYYY-MM-DD recibidas como parámetro se parsean añadiendo
 * "T12:00:00" para forzar mediodía local. Sin esto, new Date("2025-03-31")
 * se interpreta como UTC medianoche, lo que con TZ=Europe/Madrid puede
 * desplazar el resultado al día anterior.
 */
router.get("/:empleado_id", authMiddleware, async (req, res) => {
  try {
    const { empleado_id } = req.params;
    const { periodo, fecha } = req.query;
    let condicion;

    if (periodo === "hoy") {
      // Si no se recibe fecha explícita, calcular el día actual en hora local.
      const { fecha: hoyLocal } = ahoraLocal();
      const dia = fecha || hoyLocal;
      condicion = `fecha_entrada = '${dia}'`;

    } else if (periodo === "mes") {
      // Parsear a mediodía local para evitar desfases al cruzar medianoche UTC.
      const base = fecha ? new Date(fecha + "T12:00:00") : new Date();
      const inicio = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-01`;
      const fin = new Date(base.getFullYear(), base.getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10);
      condicion = `fecha_entrada BETWEEN '${inicio}' AND '${fin}'`;

    } else {
      // Por defecto: semana.
      // Parsear a mediodía local para evitar desfases al cruzar medianoche UTC.
      const base = fecha ? new Date(fecha + "T12:00:00") : new Date();
      const diaSemana = base.getDay() || 7; // 1=lunes … 7=domingo
      const lunes = new Date(base);
      lunes.setDate(base.getDate() - diaSemana + 1);
      const domingo = new Date(lunes);
      domingo.setDate(lunes.getDate() + 6);
      condicion = `fecha_entrada BETWEEN '${lunes.toISOString().slice(0, 10)}' AND '${domingo.toISOString().slice(0, 10)}'`;
    }

    const [rows] = await db.execute(
      `SELECT * FROM fichajes WHERE empleado_id = ? AND ${condicion} ORDER BY fecha_entrada DESC, hora_entrada DESC`,
      [empleado_id],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/fichajes
 * Devuelve todos los fichajes del día actual con datos del empleado.
 * Solo accesible por administradores.
 */
router.get("/", authMiddleware, soloAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT f.*, e.nombre, e.cargo
      FROM fichajes f
      JOIN empleados e ON f.empleado_id = e.id
      WHERE f.fecha_entrada = CURDATE()
      ORDER BY f.hora_entrada DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/fichajes/:id/incidencia
 * Registra una incidencia en un fichaje sin salida.
 * Requiere motivo y hora de salida real.
 * Se usa cuando un empleado olvida fichar la salida.
 */
router.put("/:id/incidencia", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo_incidencia, hora_salida_real, observaciones } = req.body;

    if (!motivo_incidencia || !hora_salida_real)
      return res
        .status(400)
        .json({ error: "Motivo y hora de salida son obligatorios" });

    await db.execute(
      `UPDATE fichajes
       SET hora_salida_real = ?,
           motivo_incidencia = ?,
           observaciones = ?,
           fecha_incidencia = NOW(),
           fecha_salida = fecha_entrada,
           hora_salida = ?
       WHERE id = ?`,
      [
        hora_salida_real,
        motivo_incidencia,
        observaciones || null,
        hora_salida_real,
        id,
      ],
    );
    res.json({ mensaje: "Incidencia registrada correctamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;