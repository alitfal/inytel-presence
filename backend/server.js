/**
 * INYTEL Presence — Servidor principal
 *
 * API REST desarrollada con Node.js y Express.
 * Sirve también el frontend Vue.js compilado desde /frontend/dist.
 *
 * Estructura de módulos:
 * - config/db.js         → Conexión a MySQL
 * - middlewares/auth.js  → Autenticación JWT y control de roles
 * - helpers/empleados.js → Funciones auxiliares
 * - services/email.js    → Notificaciones por email (Resend)
 * - routes/auth.js       → Autenticación y gestión de contraseñas
 * - routes/empleados.js  → CRUD de empleados y cálculo de horas
 * - routes/fichajes.js   → Registro de entradas/salidas e incidencias
 * - routes/dashboard.js  → Estadísticas y panel de administración
 */

require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
app.use(require("cors")());
app.use(express.json());

// ─── RATE LIMITING ────────────────────────────
const rateLimit = require("express-rate-limit");

const limiterGeneral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Demasiadas peticiones. Inténtalo de nuevo más tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

const limiterLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX) : 10,
  message: { error: "Demasiados intentos. Inténtalo de nuevo en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false }
});

const limiterRecuperar = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 10,
  message: { error: "Demasiados intentos. Inténtalo de nuevo en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", limiterGeneral);
app.use("/api/auth/login", limiterLogin);
app.use("/api/auth/recuperar", limiterRecuperar);

// Servir el frontend compilado de Vue.js
app.use(express.static(path.join(__dirname, "../frontend/dist")));

// ─── RUTAS API ────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use("/api/empleados", require("./routes/empleados"));
app.use("/api/fichajes", require("./routes/fichajes"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/exportacion", require("./routes/exportacion"));

// Redirige cualquier ruta desconocida al frontend (SPA)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist", "index.html"));
});

const PORT = process.env.PORT || 3001;
if (require.main === module) {
  app.listen(PORT, () => console.log(`🚀 API lista en puerto ${PORT}`));
}

module.exports = app;