require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

const path = require("path");
app.use(express.static(path.join(__dirname, "../frontend/dist")));

const JWT_SECRET = "inytel_secret_key_2024";

// ─── DB ───────────────────────────────────────
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3307,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "root_password",
  database: process.env.DB_NAME || "inytel_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

db.getConnection()
  .then((conn) => {
    console.log("✅ Conectado a MySQL Inytel Presence (V3)");
    conn.release();
  })
  .catch((err) => console.error("❌ Error DB inicial:", err.message));

// ─── MIDDLEWARES ──────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token requerido" });
  try {
    req.usuario = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
}

function soloAdmin(req, res, next) {
  if (req.usuario.rol !== "admin")
    return res.status(403).json({ error: "Acceso denegado" });
  next();
}

// ─── HELPER: estado dinámico empleado ─────────
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

// ─── AUTH ─────────────────────────────────────
app.post("/api/auth/register", async (req, res) => {
  try {
    const { nombre, email, password, rol, empleado_id } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      "INSERT INTO usuarios (nombre, email, password, rol, empleado_id) VALUES (?, ?, ?, ?, ?)",
      [nombre, email, hash, rol || "empleado", empleado_id || null],
    );
    res.json({ id: result.insertId, mensaje: "Usuario creado correctamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await db.execute("SELECT * FROM usuarios WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0)
      return res.status(401).json({ error: "Credenciales incorrectas" });

    const usuario = rows[0];
    const valido = await bcrypt.compare(password, usuario.password);
    if (!valido)
      return res.status(401).json({ error: "Credenciales incorrectas" });

    if (usuario.empleado_id) {
      const [[empleado]] = await db.execute(
        "SELECT activo FROM empleados WHERE id = ?",
        [usuario.empleado_id],
      );
      if (!empleado.activo)
        return res.status(403).json({
          error: "Cuenta desactivada. Contacta con tu administrador.",
        });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
        empleado_id: usuario.empleado_id,
      },
      JWT_SECRET,
      { expiresIn: "8h" },
    );
    res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        empleado_id: usuario.empleado_id,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/auth/password", authMiddleware, async (req, res) => {
  try {
    const { password_actual, password_nueva } = req.body;
    const [rows] = await db.execute("SELECT * FROM usuarios WHERE id = ?", [
      req.usuario.id,
    ]);
    const usuario = rows[0];
    const valido = await bcrypt.compare(password_actual, usuario.password);
    if (!valido)
      return res.status(401).json({ error: "Contraseña actual incorrecta" });
    const hash = await bcrypt.hash(password_nueva, 10);
    await db.execute("UPDATE usuarios SET password = ? WHERE id = ?", [
      hash,
      req.usuario.id,
    ]);
    await enviarEmail({
      to: usuario.email,
      subject: "Contraseña actualizada — INYTEL Presence",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <div style="background: #4f46e5; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <h1 style="color: white; font-size: 24px; margin: 0; font-style: italic;">INYTEL | Presence</h1>
          </div>
          <h2 style="color: #1e293b;">Contraseña actualizada</h2>
          <p style="color: #64748b;">Hola ${usuario.nombre}, tu contraseña ha sido actualizada correctamente desde tu perfil.</p>
          <p style="color: #94a3b8; font-size: 13px;">Si no fuiste tú, contacta con tu administrador inmediatamente.</p>
        </div>
      `,
    });
    res.json({ mensaje: "Contraseña actualizada correctamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put(
  "/api/auth/reset/:usuario_id",
  authMiddleware,
  soloAdmin,
  async (req, res) => {
    try {
      const { password_nueva } = req.body;
      if (!password_nueva || password_nueva.length < 6)
        return res
          .status(400)
          .json({ error: "La contraseña debe tener al menos 6 caracteres" });
      const hash = await bcrypt.hash(password_nueva, 10);
      await db.execute(
        "UPDATE usuarios SET password = ? WHERE empleado_id = ?",
        [hash, req.params.usuario_id],
      );

      const [[usuario]] = await db.execute(
        "SELECT nombre, email FROM usuarios WHERE empleado_id = ?",
        [req.params.usuario_id],
      );
      await notificarResetPassword({
        nombre: usuario.nombre,
        email: usuario.email,
        password_nueva,
      });

      res.json({ mensaje: "Contraseña reseteada correctamente" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// ─── EMPLEADOS ────────────────────────────────
app.get("/api/empleados", async (req, res) => {
  try {
    if (!db) return res.status(503).send("Base de datos cargando...");
    const [rows] = await db.execute("SELECT * FROM empleados");
    // Calcular estado dinámico para cada empleado
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

app.get("/api/empleados/:id", async (req, res) => {
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

app.post("/api/empleados", authMiddleware, soloAdmin, async (req, res) => {
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

app.put("/api/empleados/:id", authMiddleware, soloAdmin, async (req, res) => {
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

app.delete(
  "/api/empleados/:id",
  authMiddleware,
  soloAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      await db.execute("DELETE FROM fichajes WHERE empleado_id = ?", [id]);
      await db.execute("DELETE FROM usuarios WHERE empleado_id = ?", [id]);
      await db.execute("DELETE FROM empleados WHERE id = ?", [id]);
      res.json({ mensaje: "Empleado eliminado correctamente" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

app.put(
  "/api/empleados/:id/activo",
  authMiddleware,
  soloAdmin,
  async (req, res) => {
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
  },
);

// ─── FICHAJES ─────────────────────────────────

// FICHAR ENTRADA
app.post("/api/fichajes/entrada", authMiddleware, async (req, res) => {
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

    // Verificar que no hay ya una entrada abierta hoy
    const [abierta] = await db.execute(
      "SELECT id FROM fichajes WHERE empleado_id = ? AND fecha_entrada = CURDATE() AND hora_salida IS NULL",
      [empleado_id],
    );
    if (abierta.length > 0)
      return res
        .status(400)
        .json({ error: "Ya tienes una entrada registrada hoy sin salida." });

    const fecha = hoy.toISOString().slice(0, 10);
    const hora = hoy.toTimeString().slice(0, 8);

    await db.execute(
      "INSERT INTO fichajes (empleado_id, fecha_entrada, hora_entrada) VALUES (?, ?, ?)",
      [empleado_id, fecha, hora],
    );

    res.json({ mensaje: "Entrada registrada correctamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// FICHAR SALIDA
app.post("/api/fichajes/salida", authMiddleware, async (req, res) => {
  try {
    const { empleado_id } = req.body;

    // Buscar la jornada abierta más reciente
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

    const hoy = new Date();
    const fecha = hoy.toISOString().slice(0, 10);
    const hora = hoy.toTimeString().slice(0, 8);

    await db.execute(
      "UPDATE fichajes SET fecha_salida = ?, hora_salida = ? WHERE id = ?",
      [fecha, hora, rows[0].id],
    );

    res.json({ mensaje: "Salida registrada correctamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// HISTORIAL DE FICHAJES DE UN EMPLEADO
app.get("/api/fichajes/:empleado_id", authMiddleware, async (req, res) => {
  try {
    const { empleado_id } = req.params;
    const { periodo, fecha } = req.query;
    let condicion;

    if (periodo === "hoy") {
      const dia = fecha || new Date().toISOString().slice(0, 10);
      condicion = `fecha_entrada = '${dia}'`;
    } else if (periodo === "mes") {
      const base = fecha ? new Date(fecha) : new Date();
      const inicio = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-01`;
      const fin = new Date(base.getFullYear(), base.getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10);
      condicion = `fecha_entrada BETWEEN '${inicio}' AND '${fin}'`;
    } else {
      const base = fecha ? new Date(fecha) : new Date();
      const dia = base.getDay() || 7;
      const lunes = new Date(base);
      lunes.setDate(base.getDate() - dia + 1);
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

// TODOS LOS FICHAJES DEL DÍA (admin)
app.get("/api/fichajes", authMiddleware, soloAdmin, async (req, res) => {
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

// DETECTAR JORNADA SIN CERRAR DE DÍA ANTERIOR
app.get(
  "/api/fichajes/pendiente/:empleado_id",
  authMiddleware,
  async (req, res) => {
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
  },
);

// REGISTRAR INCIDENCIA
app.put("/api/fichajes/:id/incidencia", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo_incidencia, hora_salida_real, observaciones } = req.body;

    if (!motivo_incidencia || !hora_salida_real)
      return res
        .status(400)
        .json({ error: "Motivo y hora de salida son obligatorios" });

    const [[fichaje]] = await db.execute(
      "SELECT fecha_entrada FROM fichajes WHERE id = ?",
      [id],
    );

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

// ─── HORAS POR EMPLEADO ───────────────────────
app.get("/api/empleados/:id/horas", authMiddleware, async (req, res) => {
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

    // Obtener jornadas completas de la semana
    const [jornadas] = await db.execute(
      `SELECT fecha_entrada, hora_entrada, hora_salida
       FROM fichajes
       WHERE empleado_id = ? AND fecha_entrada BETWEEN ? AND ?
       ORDER BY fecha_entrada ASC`,
      [id, inicioSemana, finSemana],
    );

    // Calcular minutos por día
    const minutosPorDia = {};
    for (const j of jornadas) {
      if (!j.hora_salida) continue;
      const fecha =
        j.fecha_entrada instanceof Date
          ? j.fecha_entrada.toISOString().slice(0, 10)
          : String(j.fecha_entrada).slice(0, 10);
      const [he, mi_e, se] = j.hora_entrada.split(":").map(Number);
      const [hs, mi_s, ss] = j.hora_salida.split(":").map(Number);
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

// ─── DASHBOARD ────────────────────────────────
app.get("/api/stats", authMiddleware, async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const [[{ total }]] = await db.execute(
      "SELECT COUNT(*) as total FROM empleados WHERE activo=1",
    );

    // Dentro = última jornada sin hora_salida
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

app.get(
  "/api/dashboard/calendario",
  authMiddleware,
  soloAdmin,
  async (req, res) => {
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
  },
);

app.get(
  "/api/dashboard/sin-fichar",
  authMiddleware,
  soloAdmin,
  async (req, res) => {
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
  },
);

app.get(
  "/api/dashboard/ranking",
  authMiddleware,
  soloAdmin,
  async (req, res) => {
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
              ((minutosPorEmpleado[e.id] || 0) / 60 -
                (e.horas_semanales || 40)) *
                100,
            ) / 100,
        }))
        .sort((a, b) => b.horas_trabajadas - a.horas_trabajadas);

      res.json(ranking);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// ─── RESEND ───────────────────────────────────
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);
const crypto = require("crypto");

// Helper para enviar emails
async function enviarEmail({ to, subject, html }) {
  try {
    await resend.emails.send({
      from: "INYTEL Presence <no-reply@inytel.com>",
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("❌ Error enviando email:", err.message);
  }
}

// ─── SOLICITAR RECUPERACIÓN DE CONTRASEÑA ─────
app.post("/api/auth/recuperar", async (req, res) => {
  try {
    const { email } = req.body;
    const [rows] = await db.execute("SELECT * FROM usuarios WHERE email = ?", [
      email,
    ]);

    // Siempre responder OK para no revelar si el email existe
    if (rows.length === 0)
      return res.json({ mensaje: "Si el email existe recibirás un correo" });

    const usuario = rows[0];
    const token = crypto.randomBytes(32).toString("hex");
    const expira = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Invalidar tokens anteriores del usuario
    await db.execute(
      "UPDATE password_reset_tokens SET usado = 1 WHERE usuario_id = ?",
      [usuario.id],
    );

    // Guardar nuevo token
    await db.execute(
      "INSERT INTO password_reset_tokens (usuario_id, token, expira_en) VALUES (?, ?, ?)",
      [usuario.id, token, expira.toISOString().slice(0, 19).replace("T", " ")],
    );

    const enlace = `${process.env.APP_URL || "https://inytel-presence.up.railway.app"}/reset-password?token=${token}`;

    await enviarEmail({
      to: email,
      subject: "Recuperación de contraseña — INYTEL Presence",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <div style="background: #4f46e5; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <h1 style="color: white; font-size: 24px; margin: 0; font-style: italic;">INYTEL | Presence</h1>
          </div>
          <h2 style="color: #1e293b;">Recuperación de contraseña</h2>
          <p style="color: #64748b;">Has solicitado restablecer tu contraseña. Haz clic en el botón para crear una nueva:</p>
          <a href="${enlace}" style="display: inline-block; background: #4f46e5; color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; margin: 16px 0;">
            Restablecer contraseña
          </a>
          <p style="color: #94a3b8; font-size: 13px;">Este enlace expira en 1 hora. Si no solicitaste este cambio, ignora este email.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="color: #cbd5e1; font-size: 12px; text-align: center;">INYTEL Presence — Sistema de control de presencia</p>
        </div>
      `,
    });

    res.json({ mensaje: "Si el email existe recibirás un correo" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── VERIFICAR TOKEN Y CAMBIAR CONTRASEÑA ─────
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { token, password_nueva } = req.body;

    if (!password_nueva || password_nueva.length < 6)
      return res
        .status(400)
        .json({ error: "La contraseña debe tener al menos 6 caracteres" });

    const [rows] = await db.execute(
      `SELECT * FROM password_reset_tokens
       WHERE token = ? AND usado = 0 AND expira_en > NOW()`,
      [token],
    );

    if (rows.length === 0)
      return res
        .status(400)
        .json({ error: "El enlace no es válido o ha expirado" });

    const resetToken = rows[0];
    const hash = await bcrypt.hash(password_nueva, 10);

    await db.execute("UPDATE usuarios SET password = ? WHERE id = ?", [
      hash,
      resetToken.usuario_id,
    ]);
    await db.execute(
      "UPDATE password_reset_tokens SET usado = 1 WHERE id = ?",
      [resetToken.id],
    );

    // Obtener email del usuario para notificación
    const [[usuario]] = await db.execute(
      "SELECT email, nombre FROM usuarios WHERE id = ?",
      [resetToken.usuario_id],
    );

    await enviarEmail({
      to: usuario.email,
      subject: "Contraseña actualizada — INYTEL Presence",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <div style="background: #4f46e5; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <h1 style="color: white; font-size: 24px; margin: 0; font-style: italic;">INYTEL | Presence</h1>
          </div>
          <h2 style="color: #1e293b;">Contraseña actualizada</h2>
          <p style="color: #64748b;">Hola ${usuario.nombre}, tu contraseña ha sido actualizada correctamente.</p>
          <p style="color: #94a3b8; font-size: 13px;">Si no fuiste tú, contacta con tu administrador inmediatamente.</p>
        </div>
      `,
    });

    res.json({ mensaje: "Contraseña actualizada correctamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── NOTIFICACIÓN NUEVO EMPLEADO ──────────────
async function notificarNuevoEmpleado({ nombre, email, password_temporal }) {
  await enviarEmail({
    to: email,
    subject: "Bienvenido a INYTEL Presence — Tus credenciales de acceso",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <div style="background: #4f46e5; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <h1 style="color: white; font-size: 24px; margin: 0; font-style: italic;">INYTEL | Presence</h1>
        </div>
        <h2 style="color: #1e293b;">Bienvenido, ${nombre}</h2>
        <p style="color: #64748b;">Tu cuenta en INYTEL Presence ha sido creada. Aquí tienes tus credenciales de acceso:</p>
        <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0;"><span style="color: #94a3b8;">Email:</span> <strong style="color: #1e293b;">${email}</strong></p>
          <p style="margin: 0;"><span style="color: #94a3b8;">Contraseña temporal:</span> <strong style="color: #1e293b;">${password_temporal}</strong></p>
        </div>
        <p style="color: #94a3b8; font-size: 13px;">Por seguridad, te recomendamos cambiar tu contraseña en el primer acceso.</p>
        <a href="${process.env.APP_URL || "https://inytel-presence.up.railway.app"}" style="display: inline-block; background: #4f46e5; color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; margin: 16px 0;">
          Acceder a INYTEL Presence
        </a>
      </div>
    `,
  });
}

// ─── NOTIFICACIÓN RESET CONTRASEÑA (admin) ────
async function notificarResetPassword({ nombre, email, password_nueva }) {
  await enviarEmail({
    to: email,
    subject: "Tu contraseña ha sido restablecida — INYTEL Presence",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <div style="background: #4f46e5; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <h1 style="color: white; font-size: 24px; margin: 0; font-style: italic;">INYTEL | Presence</h1>
        </div>
        <h2 style="color: #1e293b;">Contraseña restablecida</h2>
        <p style="color: #64748b;">Hola ${nombre}, un administrador ha restablecido tu contraseña de acceso.</p>
        <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0;"><span style="color: #94a3b8;">Email:</span> <strong style="color: #1e293b;">${email}</strong></p>
          <p style="margin: 0;"><span style="color: #94a3b8;">Nueva contraseña:</span> <strong style="color: #1e293b;">${password_nueva}</strong></p>
        </div>
        <p style="color: #94a3b8; font-size: 13px;">Por seguridad, te recomendamos cambiar tu contraseña tras el acceso.</p>
      </div>
    `,
  });
}

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist", "index.html"));
});
app.listen(3001, () => console.log("🚀 API lista en puerto 3001"));
