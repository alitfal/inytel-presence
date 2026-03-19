<script setup>
import { onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "./composables/useAuth";
import SessionWarning from "./components/SessionWarning.vue";

const router = useRouter();
const { token, checkSession, sesionPorExpirar, logout } = useAuth();

let intervalo = null;

function tick() {
  // Si no hay token activo, no hay nada que vigilar
  if (!token.value) return;

  const estado = checkSession();

  if (estado === "expired") {
    clearInterval(intervalo);
    sesionPorExpirar.value = false;
    logout();
    router.push("/login");
    return;
  }

  sesionPorExpirar.value = estado === "warning";
}

onMounted(() => {
  tick();                              // comprobación inmediata al montar
  intervalo = setInterval(tick, 30_000); // cada 30 segundos
});

onUnmounted(() => clearInterval(intervalo));
</script>

<template>
  <RouterView />
  <SessionWarning />
</template>

<!-- App.vue original solo tenía <RouterView />.
     Se añadió el script de sesión y SessionWarning. -->