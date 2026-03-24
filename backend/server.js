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

// Servir el frontend compilado de Vue.js
app.use(express.static(path.join(__dirname, "../frontend/dist")));

// ─── RUTAS API ────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use("/api/empleados", require("./routes/empleados"));
app.use("/api/fichajes", require("./routes/fichajes"));
app.use("/api", require("./routes/dashboard"));

// Redirige cualquier ruta desconocida al frontend (SPA)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist", "index.html"));
});

app.listen(3001, () => console.log("🚀 API lista en puerto 3001"));
