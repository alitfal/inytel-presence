// Rutas de gestión de empleados
// CRUD completo + activación/desactivación
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const db = require("../config/db");
const { authMiddleware, soloAdmin } = require("../middlewares/auth");
const { getEstadoEmpleado } = require("../helpers/empleados");
const { notificarNuevoEmpleado } = require("../services/email");

/**
 * GET /api/empleados
 * Devuelve todos los empleados con su estado dinámico (DENTRO/FUERA).
 * El estado se calcula en tiempo real consultando el último fichaje.
 */
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM empleados");
    const empleados = await Promise.all(
      rows.map(async (e) => ({
        ...e,
        estado: await getEstadoEmpleado(e.id),
      })),
    );
    res.json(empleados);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/empleados/:id
 * Devuelve un empleado por su ID con estado dinámico.
 */
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM empleados WHERE id = ?", [
      req.params.id,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ error: "Empleado no encontrado" });
    const empleado = rows[0];
    empleado.estado = await getEstadoEmpleado(empleado.id);
    res.json(empleado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/empleados
 * Crea un nuevo empleado y su usuario de acceso asociado.
 * La contraseña temporal es el DNI del empleado.
 * Envía email de bienvenida con las credenciales.
 * Solo accesible por administradores.
 */
router.post("/", authMiddleware, soloAdmin, async (req, res) => {
  try {
    const {
      nombre,
      cargo,
      email,
      telefono,
      departamento,
      fecha_alta,
      dni,
      horas_semanales,
      dias_laborables,
    } = req.body;
    const [result] = await db.execute(
      `INSERT INTO empleados (nombre, cargo, email, telefono, departamento, fecha_alta, dni, activo, horas_semanales, dias_laborables)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        nombre,
        cargo,
        email,
        telefono,
        departamento,
        fecha_alta,
        dni,
        horas_semanales ?? 40,
        dias_laborables ?? "1,2,3,4,5",
      ],
    );
    const hash = await bcrypt.hash(dni, 10);
    await db.execute(
      "INSERT INTO usuarios (nombre, email, password, rol, empleado_id) VALUES (?, ?, ?, 'empleado', ?)",
      [nombre, email, hash, result.insertId],
    );
    await notificarNuevoEmpleado({ nombre, email, password_temporal: dni });
    res.json({
      id: result.insertId,
      mensaje: "Empleado creado correctamente",
      password_temporal: dni,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/empleados/:id
 * Actualiza los datos de un empleado existente.
 * Solo accesible por administradores.
 */
router.put("/:id", authMiddleware, soloAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      cargo,
      email,
      telefono,
      departamento,
      fecha_alta,
      dni,
      horas_semanales,
      dias_laborables,
    } = req.body;
    await db.execute(
      `UPDATE empleados SET nombre=?, cargo=?, email=?, telefono=?, departamento=?, fecha_alta=?, dni=?, horas_semanales=?, dias_laborables=?
       WHERE id=?`,
      [
        nombre,
        cargo,
        email,
        telefono,
        departamento,
        fecha_alta,
        dni,
        horas_semanales ?? 40,
        dias_laborables ?? "1,2,3,4,5",
        id,
      ],
    );
    res.json({ mensaje: "Empleado actualizado correctamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/empleados/:id
 * Elimina un empleado y todos sus datos asociados (fichajes y usuario).
 * La eliminación es en cascada para mantener integridad referencial.
 * Solo accesible por administradores.
 */
router.delete("/:id", authMiddleware, soloAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute("DELETE FROM fichajes WHERE empleado_id = ?", [id]);
    await db.execute("DELETE FROM usuarios WHERE empleado_id = ?", [id]);
    await db.execute("DELETE FROM empleados WHERE id = ?", [id]);
    res.json({ mensaje: "Empleado eliminado correctamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/empleados/:id/activo
 * Activa o desactiva el acceso de un empleado a la aplicación.
 * Un empleado desactivado no puede hacer login ni fichar.
 * Solo accesible por administradores.
 */
router.put("/:id/activo", authMiddleware, soloAdmin, async (req, res) => {
  try {
    const { activo } = req.body;
    await db.execute("UPDATE empleados SET activo = ? WHERE id = ?", [
      activo,
      req.params.id,
    ]);
    res.json({
      mensaje: `Empleado ${activo ? "activado" : "desactivado"} correctamente`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/empleados/:id/horas
 * Calcula el resumen de horas trabajadas vs esperadas para una semana.
 * Acepta el parámetro ?semana=YYYY-Www para consultar semanas anteriores.
 * Devuelve desglose diario y totales semanales.
 */
router.get("/:id/horas", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const semanaParam = req.query.semana;
    let inicioSemana, finSemana;

    if (semanaParam) {
      const [anio, semStr] = semanaParam.split("-W");
      const sem = parseInt(semStr);
      const d = new Date(anio, 0, 1 + (sem - 1) * 7);
      const dia = d.getDay();
      const lunes = new Date(d);
      lunes.setDate(d.getDate() - (dia === 0 ? 6 : dia - 1));
      inicioSemana = lunes.toISOString().slice(0, 10);
      const domingo = new Date(lunes);
      domingo.setDate(lunes.getDate() + 6);
      finSemana = domingo.toISOString().slice(0, 10);
    } else {
      const hoy = new Date();
      const dia = hoy.getDay();
      const lunes = new Date(hoy);
      lunes.setDate(hoy.getDate() - (dia === 0 ? 6 : dia - 1));
      inicioSemana = lunes.toISOString().slice(0, 10);
      const domingo = new Date(lunes);
      domingo.setDate(lunes.getDate() + 6);
      finSemana = domingo.toISOString().slice(0, 10);
    }

    const [[empleado]] = await db.execute(
      "SELECT horas_semanales, dias_laborables FROM empleados WHERE id = ?",
      [id],
    );

    const [jornadas] = await db.execute(
      `SELECT fecha_entrada, hora_entrada, hora_salida
       FROM fichajes
       WHERE empleado_id = ? AND fecha_entrada BETWEEN ? AND ?
       ORDER BY fecha_entrada ASC`,
      [id, inicioSemana, finSemana],
    );

    // Acumular minutos trabajados por día
    const minutosPorDia = {};
    for (const j of jornadas) {
      if (!j.hora_salida) continue;
      const fecha =
        j.fecha_entrada instanceof Date
          ? j.fecha_entrada.toISOString().slice(0, 10)
          : String(j.fecha_entrada).slice(0, 10);
      const [he, mi_e] = j.hora_entrada.split(":").map(Number);
      const [hs, mi_s] = j.hora_salida.split(":").map(Number);
      const mins = hs * 60 + mi_s - (he * 60 + mi_e);
      minutosPorDia[fecha] = (minutosPorDia[fecha] || 0) + mins;
    }

    const diasConfig = (empleado.dias_laborables || "1,2,3,4,5")
      .split(",")
      .map(Number);
    const diasEnSemana = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(inicioSemana);
      d.setDate(d.getDate() + i);
      const diaSemana = d.getDay() === 0 ? 7 : d.getDay();
      if (diasConfig.includes(diaSemana))
        diasEnSemana.push(d.toISOString().slice(0, 10));
    }

    const horasSemanales = empleado.horas_semanales || 40;
    const horasPorDia = horasSemanales / diasEnSemana.length;

    const resumenDias = diasEnSemana.map((fecha) => {
      const mins = minutosPorDia[fecha] || 0;
      const horasTrabajadas = mins / 60;
      return {
        fecha,
        horas_trabajadas: Math.round(horasTrabajadas * 100) / 100,
        horas_esperadas: Math.round(horasPorDia * 100) / 100,
        diferencia: Math.round((horasTrabajadas - horasPorDia) * 100) / 100,
      };
    });

    const totalTrabajadas = resumenDias.reduce(
      (s, d) => s + d.horas_trabajadas,
      0,
    );

    res.json({
      semana: { inicio: inicioSemana, fin: finSemana },
      horas_semanales: horasSemanales,
      dias_laborables: empleado.dias_laborables,
      total_trabajadas: Math.round(totalTrabajadas * 100) / 100,
      total_esperadas: horasSemanales,
      diferencia_total:
        Math.round((totalTrabajadas - horasSemanales) * 100) / 100,
      dias: resumenDias,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
