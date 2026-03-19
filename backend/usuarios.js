// seed-usuarios.js
// Ejecutar con: node seed-usuarios.js
// Requiere: npm install bcryptjs mysql2

const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

const empleados = [
  { id: 1,  nombre: "Fran García",           email: "fgarcia@inytel.es",          dni: "14744558E" },
  { id: 4,  nombre: "Carlos Lopez",           email: "carlos.lopez@inytel.es",     dni: "12345678A" },
  { id: 5,  nombre: "María García",           email: "maria.garcia@inytel.es",     dni: "23456789B" },
  { id: 6,  nombre: "Alejandro Ruiz",         email: "alejandro.ruiz@inytel.es",   dni: "34567890C" },
  { id: 7,  nombre: "Laura Martínez",         email: "laura.martinez@inytel.es",   dni: "45678901D" },
  { id: 10, nombre: "Jose Antonio Bas Frances", email: "jfrances@inytel.es",       dni: "17478741B" },
  { id: 11, nombre: "Angel Luis Litago Falces", email: "alitago@inytel.es",        dni: "78655432Q" },
  { id: 12, nombre: "Maria Bas Silvestre",    email: "mbas@inytel.es",             dni: "98877656B" },
];

async function main() {
  const db = await mysql.createConnection({
    host: "localhost",
    port: 3307,
    user: "root",
    password: "root_password",
    database: "inytel_db",
  });

  console.log("✅ Conectado a la BD\n");

  for (const emp of empleados) {
    try {
      // Verificar si ya existe
      const [existe] = await db.execute(
        "SELECT id FROM usuarios WHERE empleado_id = ? OR email = ?",
        [emp.id, emp.email]
      );

      if (existe.length > 0) {
        console.log(`⚠️  Ya existe usuario para ${emp.nombre} — omitido`);
        continue;
      }

      const hash = await bcrypt.hash(emp.dni, 10);
      await db.execute(
        "INSERT INTO usuarios (nombre, email, password, rol, empleado_id) VALUES (?, ?, ?, 'empleado', ?)",
        [emp.nombre, emp.email, hash, emp.id]
      );

      console.log(`✅ Creado: ${emp.nombre} | ${emp.email} | pass: ${emp.dni}`);
    } catch (err) {
      console.error(`❌ Error con ${emp.nombre}:`, err.message);
    }
  }

  // Corrección encoding
  await db.execute("UPDATE empleados SET nombre = 'María García'   WHERE id = 5");
  await db.execute("UPDATE empleados SET nombre = 'Laura Martínez' WHERE id = 7");
  console.log("\n✅ Encoding corregido en empleados 5 y 7");

  await db.end();
  console.log("\n🎉 Proceso completado");
}

main().catch(console.error);