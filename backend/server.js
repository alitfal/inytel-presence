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

// Límite general para toda la API
const limiterGeneral = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,                  // máximo 100 peticiones por IP
  message: { error: "Demasiadas peticiones. Inténtalo de nuevo más tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Límite estricto solo para login y recuperación de contraseña
const limiterAuth = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,                   // máximo 10 intentos por IP
  message: { error: "Demasiados intentos. Inténtalo de nuevo en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", limiterGeneral);
app.use("/api/auth/login", limiterAuth);
app.use("/api/auth/recuperar", limiterAuth);

// Servir el frontend compilado de Vue.js
app.use(express.static(path.join(__dirname, "../frontend/dist")));

// ─── RUTAS API ────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use("/api/empleados", require("./routes/empleados"));
app.use("/api/fichajes", require("./routes/fichajes"));
app.use("/api/dashboard", require("./routes/dashboard"));

// Redirige cualquier ruta desconocida al frontend (SPA)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist", "index.html"));
});

app.listen(3001, () => console.log("🚀 API lista en puerto 3001"));