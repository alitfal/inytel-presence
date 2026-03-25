<script setup>
/**
 * @component SessionWarning
 * @description Toast flotante que avisa al usuario cuando su sesión está
 *              próxima a expirar. Se muestra automáticamente cuando el
 *              composable `useAuth` detecta que quedan menos de 5 minutos
 *              de sesión activa, y desaparece al renovarla o al cerrar sesión.
 *
 * No recibe props ni emite eventos: su visibilidad depende exclusivamente
 * del estado reactivo de `useAuth`.
 */
import { useAuth } from "../composables/useAuth";

// sesionPorExpirar — Boolean: true cuando quedan menos de 5 min de sesión
// minutosRestantes — Number: minutos restantes hasta el cierre automático
const { sesionPorExpirar, minutosRestantes } = useAuth();
</script>

<template>
  <!-- Transición de entrada/salida: el toast sube desde abajo al aparecer -->
  <Transition name="slide-up">
    <!-- Toast visible solo cuando sesionPorExpirar es true -->
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
/* Animación slide-up: el toast aparece subiendo desde abajo y desaparece bajando */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

/* Estado inicial (entrada) y final (salida): desplazado 1.5rem hacia abajo y transparente */
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translate(-50%, 1.5rem);
}
</style>
