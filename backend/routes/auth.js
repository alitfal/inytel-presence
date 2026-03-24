// Rutas de autenticación y gestión de contraseñas
// Maneja login, registro, cambio y recuperación de contraseña
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const {
  authMiddleware,
  soloAdmin,
  JWT_SECRET,
} = require("../middlewares/auth");
const {
  notificarNuevoEmpleado,
  notificarResetPassword,
  notificarPasswordActualizada,
  enviarRecuperacionPassword,
} = require("../services/email");

/**
 * POST /api/auth/register
 * Crea un nuevo usuario en el sistema.
 * Solo para uso interno/administrativo.
 */
router.post("/register", async (req, res) => {
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

/**
 * POST /api/auth/login
 * Autentica al usuario y devuelve un token JWT con duración de 8 horas.
 * Verifica también que el empleado asociado esté activo.
 */
router.post("/login", async (req, res) => {
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

/**
 * PUT /api/auth/password
 * Permite al usuario autenticado cambiar su propia contraseña.
 * Requiere verificar la contraseña actual antes de actualizar.
 */
router.put("/password", authMiddleware, async (req, res) => {
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
    await notificarPasswordActualizada({
      nombre: usuario.nombre,
      email: usuario.email,
    });
    res.json({ mensaje: "Contraseña actualizada correctamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/auth/reset/:usuario_id
 * Permite a un administrador restablecer la contraseña de cualquier empleado.
 * Envía notificación por email con la nueva contraseña.
 */
router.put(
  "/reset/:usuario_id",
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

/**
 * POST /api/auth/recuperar
 * Inicia el proceso de recuperación de contraseña.
 * Genera un token único y envía el enlace por email.
 * Siempre responde OK para no revelar si el email existe.
 */
router.post("/recuperar", async (req, res) => {
  try {
    await enviarRecuperacionPassword(req.body.email);
    res.json({ mensaje: "Si el email existe recibirás un correo" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/reset-password
 * Verifica el token de recuperación y actualiza la contraseña.
 * El token expira en 1 hora y solo puede usarse una vez.
 */
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password_nueva } = req.body;
    if (!password_nueva || password_nueva.length < 6)
      return res
        .status(400)
        .json({ error: "La contraseña debe tener al menos 6 caracteres" });

    const [rows] = await db.execute(
      "SELECT * FROM password_reset_tokens WHERE token = ? AND usado = 0 AND expira_en > NOW()",
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

    const [[usuario]] = await db.execute(
      "SELECT email, nombre FROM usuarios WHERE id = ?",
      [resetToken.usuario_id],
    );
    await notificarPasswordActualizada({
      nombre: usuario.nombre,
      email: usuario.email,
    });
    res.json({ mensaje: "Contraseña actualizada correctamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
