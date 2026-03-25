<script setup>
/**
 * SessionWarning.vue — Aviso flotante de expiración de sesión
 *
 * Componente de interfaz de usuario (UI) que muestra una alerta visual
 * cuando el sistema detecta que la sesión del usuario está próxima a caducar.
 * * Contexto de uso:
 * Se suele renderizar en el Layout principal (App.vue) para que sea visible
 * independientemente de la sección en la que se encuentre el usuario.
 *
 * Dependencias:
 * - useAuth: Composable que gestiona el estado de autenticación y timers de sesión.
 */

import { useAuth } from "../composables/useAuth";

/**
 * Desestructuración del estado de autenticación:
 * @var {Boolean} sesionPorExpirar - Flag que activa la visibilidad del aviso.
 * @var {Number} minutosRestantes - Tiempo restante antes del logout automático.
 */
const { sesionPorExpirar, minutosRestantes } = useAuth();
</script>

<template>
  <Transition name="slide-up">
    <div
      v-if="sesionPorExpirar"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-3rem)] max-w-md bg-amber-500 text-white rounded-2xl px-5 py-4 shadow-xl flex items-center gap-3"
    >
      <span class="text-2xl">⏱</span>

      <div class="flex-1">
        <p class="font-bold text-sm">Sesión por expirar</p>
        <p class="text-xs opacity-90">
          Tu sesión cerrará en
          <strong>{{ minutosRestantes }} min</strong>. Guarda tu trabajo.
        </p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/** * Animaciones de la transición slide-up.
 * El aviso sube desde el borde inferior mientras gana opacidad.
 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translate(-50%, 1.5rem);
}
</style>
