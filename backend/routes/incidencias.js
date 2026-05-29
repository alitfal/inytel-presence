/**
 * Rutas de gestión de incidencias laborales
 * Gestiona ausencias, retrasos, permisos y otras incidencias.
 * Flujo: empleado solicita → admin aprueba/rechaza.
 */
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authMiddleware, soloAdmin } = require("../middlewares/auth");
const { registrarAudit } = require("../services/audit");

/**
 * GET /api/incidencias
 * Admin: devuelve todas las incidencias.
 * Empleado: devuelve solo las suyas.
 */
router.get("/", authMiddleware, async (req, res) => {
    try {
        let rows;
        if (req.usuario.rol === "admin") {
            [rows] = await db.execute(`
        SELECT i.*, 
          e.nombre as empleado_nombre, e.cargo as empleado_cargo,
          u.nombre as aprobado_por_nombre
        FROM incidencias_laborales i
        JOIN empleados e ON i.empleado_id = e.id
        LEFT JOIN usuarios u ON i.aprobado_por = u.id
        ORDER BY i.creado_en DESC
      `);
        } else {
            [rows] = await db.execute(`
        SELECT i.*,
          u.nombre as aprobado_por_nombre
        FROM incidencias_laborales i
        LEFT JOIN usuarios u ON i.aprobado_por = u.id
        WHERE i.empleado_id = ?
        ORDER BY i.creado_en DESC
      `, [req.usuario.empleado_id]);
        }
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/incidencias/pendientes
 * Solo admin. Devuelve incidencias pendientes de revisión.
 */
router.get("/pendientes", authMiddleware, soloAdmin, async (req, res) => {
    try {
        const [rows] = await db.execute(`
      SELECT i.*,
        e.nombre as empleado_nombre, e.cargo as empleado_cargo
      FROM incidencias_laborales i
      JOIN empleados e ON i.empleado_id = e.id
      WHERE i.estado = 'pendiente'
      ORDER BY i.creado_en ASC
    `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/incidencias
 * Crea una nueva incidencia laboral.
 * Puede ser creada por el empleado o por el admin en su nombre.
 */
router.post("/", authMiddleware, async (req, res) => {
    try {
        const {
            empleado_id,
            tipo,
            fecha_inicio,
            fecha_fin,
            hora_inicio,
            hora_fin,
            descripcion,
        } = req.body;

        // Si es empleado solo puede crear para sí mismo
        const emp_id = req.usuario.rol === "admin"
            ? empleado_id
            : req.usuario.empleado_id;

        if (!emp_id) return res.status(400).json({ error: "empleado_id requerido" });

        const [result] = await db.execute(`
      INSERT INTO incidencias_laborales 
        (empleado_id, creado_por, tipo, fecha_inicio, fecha_fin, hora_inicio, hora_fin, descripcion)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [emp_id, req.usuario.id, tipo, fecha_inicio, fecha_fin || null, hora_inicio || null, hora_fin || null, descripcion || null]);

        await registrarAudit({
            usuario_id: req.usuario.id,
            email: req.usuario.email,
            accion: "INCIDENCIA_CREADA",
            entidad: "incidencias_laborales",
            entidad_id: result.insertId,
            ip: req.ip,
        });

        res.json({ id: result.insertId, mensaje: "Incidencia creada correctamente" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * PUT /api/incidencias/:id/estado
 * Solo admin. Aprueba o rechaza una incidencia.
 */
router.put("/:id/estado", authMiddleware, soloAdmin, async (req, res) => {
    try {
        const { estado, comentario_admin } = req.body;

        if (!["aprobada", "rechazada"].includes(estado))
            return res.status(400).json({ error: "Estado inválido" });

        await db.execute(`
      UPDATE incidencias_laborales
      SET estado = ?, aprobado_por = ?, aprobado_en = NOW(), comentario_admin = ?
      WHERE id = ?
    `, [estado, req.usuario.id, comentario_admin || null, req.params.id]);

        await registrarAudit({
            usuario_id: req.usuario.id,
            email: req.usuario.email,
            accion: `INCIDENCIA_${estado.toUpperCase()}`,
            entidad: "incidencias_laborales",
            entidad_id: parseInt(req.params.id),
            ip: req.ip,
        });

        res.json({ mensaje: `Incidencia ${estado} correctamente` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * PUT /api/incidencias/:id/cancelar
 * El empleado puede cancelar su propia incidencia si está pendiente.
 */
router.put("/:id/cancelar", authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.execute(
            "SELECT * FROM incidencias_laborales WHERE id = ?",
            [req.params.id]
        );

        if (rows.length === 0)
            return res.status(404).json({ error: "Incidencia no encontrada" });

        const incidencia = rows[0];

        if (req.usuario.rol !== "admin" && incidencia.empleado_id !== req.usuario.empleado_id)
            return res.status(403).json({ error: "Acceso denegado" });

        if (incidencia.estado !== "pendiente")
            return res.status(400).json({ error: "Solo se pueden cancelar incidencias pendientes" });

        await db.execute(
            "UPDATE incidencias_laborales SET estado = 'cancelada' WHERE id = ?",
            [req.params.id]
        );

        res.json({ mensaje: "Incidencia cancelada correctamente" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * DELETE /api/incidencias/:id
 * Solo admin. Elimina una incidencia.
 */
router.delete("/:id", authMiddleware, soloAdmin, async (req, res) => {
    try {
        await db.execute("DELETE FROM incidencias_laborales WHERE id = ?", [req.params.id]);
        res.json({ mensaje: "Incidencia eliminada correctamente" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;