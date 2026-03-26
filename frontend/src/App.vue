<script setup>
/**
 * App.vue — Componente raíz de la aplicación
 *
 * Actúa como contenedor principal del enrutador y gestiona
 * el ciclo de vida de la sesión de forma global mediante un
 * intervalo periódico que comprueba el estado del token JWT.
 *
 * Responsabilidades:
 * - Renderizar la vista activa mediante <RouterView />.
 * - Mostrar el toast de aviso de sesión próxima a expirar.
 * - Detectar sesiones caducadas y redirigir al login automáticamente.
 */
import { onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "./composables/useAuth";
import SessionWarning from "./components/SessionWarning.vue";

const router = useRouter();
const { token, checkSession, sesionPorExpirar, logout } = useAuth();

/** Referencia al intervalo de comprobación para poder limpiarlo al desmontar. */
let intervalo = null;

/**
 * Comprueba el estado actual de la sesión y actúa según el resultado.
 * - Si no hay token: no hace nada (usuario no autenticado).
 * - Si la sesión ha expirado: limpia el intervalo, cierra sesión y redirige a /login.
 * - Si queda menos de 5 minutos: activa el toast de aviso (sesionPorExpirar).
 * - Si la sesión es válida: desactiva el toast si estaba activo.
 */
function tick() {
  // Sin token activo no hay sesión que vigilar
  if (!token.value) return;

  const estado = checkSession();

  if (estado === "expired") {
    clearInterval(intervalo);
    sesionPorExpirar.value = false;
    logout();
    router.push("/login");
    return;
  }

  // Activa o desactiva el toast de aviso según proximidad de expiración
  sesionPorExpirar.value = estado === "warning";
}

// ── Ciclo de vida ─────────────────────────────────────────────────────────────
onMounted(() => {
  tick(); // comprobación inmediata al montar
  intervalo = setInterval(tick, 30_000); // re-comprueba cada 30 segundos
});

onUnmounted(() => clearInterval(intervalo)); // evitar memory leak al desmontar
</script>

<template>
  <!-- Vista activa según la ruta actual -->
  <RouterView />

  <!-- Toast global de aviso de sesión próxima a expirar -->
  <SessionWarning />
</template>
