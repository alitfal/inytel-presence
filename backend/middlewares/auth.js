// Middlewares de autenticación y autorización
// Se ejecutan antes de los endpoints para verificar permisos
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "inytel_secret_key_2024";

// Verifica que la petición incluye un token JWT válido.
// Si es válido, añade los datos del usuario a req.usuario
// para que los endpoints siguientes puedan usarlos.
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

// Verifica que el usuario autenticado tiene rol de administrador.
// Debe usarse siempre después de authMiddleware.
function soloAdmin(req, res, next) {
  if (req.usuario.rol !== "admin")
    return res.status(403).json({ error: "Acceso denegado" });
  next();
}

module.exports = { authMiddleware, soloAdmin, JWT_SECRET };
