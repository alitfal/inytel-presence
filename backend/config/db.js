// Configuración y conexión al pool de base de datos MySQL
// Se usa mysql2/promise para soporte de async/await
const mysql = require("mysql2/promise");

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3307,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "root_password",
  database: process.env.DB_NAME || "inytel_db",
  waitForConnections: true, // Espera si no hay conexiones disponibles
  connectionLimit: 10, // Máximo de conexiones simultáneas
  queueLimit: 0, // Sin límite de peticiones en cola
  enableKeepAlive: true, // Mantiene conexiones activas
  keepAliveInitialDelay: 0,
});

// Verificar conexión al arrancar
db.getConnection()
  .then((conn) => {
    console.log("✅ Conectado a MySQL Inytel Presence (V3)");
    conn.release();
  })
  .catch((err) => console.error("❌ Error DB inicial:", err.message));

module.exports = db;
