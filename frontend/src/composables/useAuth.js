import { ref, computed } from "vue";
import axios from "axios";

const SESSION_DURATION = 8 * 60 * 60 * 1000;   // 8 horas en ms
const WARN_BEFORE      = 5 * 60 * 1000;         // avisar 5 min antes

// ── Estado global ────────────────────────────────────────────────
const usuario  = ref(JSON.parse(localStorage.getItem("usuario")) || null);
const token    = ref(localStorage.getItem("token") || null);
const loginAt  = ref(Number(localStorage.getItem("loginAt")) || null);

const sesionPorExpirar = ref(false);

if (token.value) {
  axios.defaults.headers.common["Authorization"] = `Bearer ${token.value}`;
}

// ── Helpers ──────────────────────────────────────────────────────
function msRestantes() {
  if (!loginAt.value) return 0;
  return loginAt.value + SESSION_DURATION - Date.now();
}

function sesionExpirada() {
  return !!loginAt.value && msRestantes() <= 0;
}

function checkSession() {
  if (!token.value || !loginAt.value) return "expired";
  const ms = msRestantes();
  if (ms <= 0)           return "expired";
  if (ms <= WARN_BEFORE) return "warning";
  return "ok";
}

// ── Composable ───────────────────────────────────────────────────
export function useAuth() {
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

  function logout() {
    usuario.value  = null;
    token.value    = null;
    loginAt.value  = null;
    sesionPorExpirar.value = false;

    localStorage.removeItem("usuario");
    localStorage.removeItem("token");
    localStorage.removeItem("loginAt");

    delete axios.defaults.headers.common["Authorization"];
  }

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