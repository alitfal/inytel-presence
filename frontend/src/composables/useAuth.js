/**
 * useAuth.js — Composable de autenticación
 *
 * Gestiona el estado global de la sesión del usuario:
 * login, logout, persistencia en localStorage y control
 * de expiración del token JWT (duración: 8 horas).
 *
 * El estado es compartido entre todos los componentes
 * que usen este composable gracias a las refs definidas
 * fuera de la función exportada.
 */

import { ref, computed } from "vue";
import axios from "axios";

// Duración de la sesión y tiempo de aviso antes de expirar
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 horas en ms
const WARN_BEFORE      = 5 * 60 * 1000;       // avisar 5 min antes

// ── Estado global de sesión ──────────────────────────────────────
// Se inicializa desde localStorage para persistir entre recargas de página
const usuario          = ref(JSON.parse(localStorage.getItem("usuario")) || null);
const token            = ref(localStorage.getItem("token") || null);
const loginAt          = ref(Number(localStorage.getItem("loginAt")) || null);
const sesionPorExpirar = ref(false);

// Si hay token almacenado, lo inyecta en todas las peticiones de axios
if (token.value) {
  axios.defaults.headers.common["Authorization"] = `Bearer ${token.value}`;
}

// ── Funciones auxiliares de sesión ───────────────────────────────

/**
 * Calcula los milisegundos restantes hasta que expire la sesión.
 * @returns {number} Milisegundos restantes (0 si ya expiró)
 */
function msRestantes() {
  if (!loginAt.value) return 0;
  return loginAt.value + SESSION_DURATION - Date.now();
}

/**
 * Comprueba si la sesión ha expirado comparando
 * el tiempo de login con la duración máxima de sesión.
 * @returns {boolean} true si la sesión ha expirado
 */
function sesionExpirada() {
  return !!loginAt.value && msRestantes() <= 0;
}

/**
 * Evalúa el estado actual de la sesión.
 * @returns {"ok" | "warning" | "expired"}
 * - "ok": sesión activa y con tiempo suficiente
 * - "warning": sesión activa pero próxima a expirar (< 5 min)
 * - "expired": sesión caducada o inexistente
 */
function checkSession() {
  if (!token.value || !loginAt.value) return "expired";
  const ms = msRestantes();
  if (ms <= 0)           return "expired";
  if (ms <= WARN_BEFORE) return "warning";
  return "ok";
}

// ── Composable exportado ─────────────────────────────────────────
export function useAuth() {

  /**
   * Autentica al usuario contra la API.
   * En caso de éxito, almacena el token y los datos del usuario
   * en localStorage y configura axios para enviar el token
   * automáticamente en todas las peticiones posteriores.
   *
   * @param {string} email - Email del usuario
   * @param {string} password - Contraseña del usuario
   * @throws Error si las credenciales son incorrectas
   */
  async function login(email, password) {
    const { data } = await axios.post("/api/auth/login", { email, password });
    usuario.value = data.usuario;
    token.value   = data.token;
    loginAt.value = Date.now();

    localStorage.setItem("usuario", JSON.stringify(data.usuario));
    localStorage.setItem("token",   data.token);
    localStorage.setItem("loginAt", loginAt.value);

    axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
    sesionPorExpirar.value = false;
  }

  /**
   * Cierra la sesión del usuario.
   * Limpia el estado en memoria, elimina los datos de localStorage
   * y elimina el header de autorización de axios.
   */
  function logout() {
    usuario.value          = null;
    token.value            = null;
    loginAt.value          = null;
    sesionPorExpirar.value = false;

    localStorage.removeItem("usuario");
    localStorage.removeItem("token");
    localStorage.removeItem("loginAt");

    delete axios.defaults.headers.common["Authorization"];
  }

  /**
   * Computed que devuelve los minutos restantes de sesión.
   * Se actualiza reactivamente cuando cambia loginAt.
   */
  const minutosRestantes = computed(() => {
    const ms = msRestantes();
    return Math.max(0, Math.ceil(ms / 60000));
  });

  return {
    usuario,
    token,
    sesionPorExpirar,
    minutosRestantes,
    login,
    logout,
    checkSession,
    sesionExpirada,
  };
}