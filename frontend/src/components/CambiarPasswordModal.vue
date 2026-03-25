<script setup>
/**
 * CambiarPasswordModal.vue — Modal de cambio de contraseña
 *
 * Permite al usuario autenticado cambiar su propia contraseña
 * desde su perfil. Requiere introducir la contraseña actual
 * como medida de seguridad antes de establecer la nueva.
 *
 * Validaciones aplicadas:
 * - Todos los campos son obligatorios
 * - La nueva contraseña debe tener mínimo 6 caracteres
 * - La confirmación debe coincidir con la nueva contraseña
 *
 * Al guardar correctamente muestra un mensaje de éxito
 * y cierra el modal automáticamente tras 1.5 segundos.
 * El backend envía además una notificación por email al usuario.
 *
 * Eventos emitidos:
 * @emits cerrar - Solicita al padre que oculte el modal
 */

import { ref } from "vue";
import axios from "axios";

const API = "/api";
const emit = defineEmits(["cerrar"]);

// Campos del formulario
const passwordActual = ref("");
const passwordNueva = ref("");
const passwordConfirm = ref("");

// Estados de UI
const error = ref("");
const exito = ref(false);
const loading = ref(false);

/**
 * Valida los campos y envía la petición de cambio de contraseña.
 * Si la operación es exitosa limpia el formulario y cierra el modal.
 */
async function cambiarPassword() {
  error.value = "";
  exito.value = false;

  // Validaciones en orden de prioridad
  if (!passwordActual.value || !passwordNueva.value || !passwordConfirm.value) {
    error.value = "Todos los campos son obligatorios";
    return;
  }
  if (passwordNueva.value.length < 6) {
    error.value = "La nueva contraseña debe tener al menos 6 caracteres";
    return;
  }
  if (passwordNueva.value !== passwordConfirm.value) {
    error.value = "Las contraseñas no coinciden";
    return;
  }

  try {
    loading.value = true;
    await axios.put(`${API}/auth/password`, {
      password_actual: passwordActual.value,
      password_nueva: passwordNueva.value,
    });
    exito.value = true;
    // Limpiar campos tras éxito
    passwordActual.value = "";
    passwordNueva.value = "";
    passwordConfirm.value = "";
    // Cierra el modal automáticamente tras mostrar el mensaje de éxito
    setTimeout(() => emit("cerrar"), 1500);
  } catch (err) {
    error.value = err.response?.data?.error || "Error al cambiar la contraseña";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <!-- Overlay — se puede cerrar haciendo clic fuera del modal -->
  <div
    class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    @click.self="emit('cerrar')"
  >
    <div class="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
      <h2 class="text-xl font-bold text-slate-900 mb-6">Cambiar contraseña</h2>

      <div class="space-y-4 text-sm">
        <!-- Contraseña actual — necesaria para verificar identidad -->
        <div>
          <label class="text-slate-400 font-medium block mb-1"
            >Contraseña actual</label
          >
          <input
            v-model="passwordActual"
            type="password"
            placeholder="••••••••"
            class="w-full border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-indigo-400 transition-colors"
          />
        </div>

        <!-- Nueva contraseña -->
        <div>
          <label class="text-slate-400 font-medium block mb-1"
            >Nueva contraseña</label
          >
          <input
            v-model="passwordNueva"
            type="password"
            placeholder="••••••••"
            class="w-full border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-indigo-400 transition-colors"
          />
        </div>

        <!-- Confirmación — debe coincidir con la nueva contraseña -->
        <div>
          <label class="text-slate-400 font-medium block mb-1"
            >Confirmar nueva contraseña</label
          >
          <input
            v-model="passwordConfirm"
            type="password"
            placeholder="••••••••"
            class="w-full border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-indigo-400 transition-colors"
            @keyup.enter="cambiarPassword"
          />
        </div>

        <!-- Mensajes de error y éxito -->
        <p v-if="error" class="text-rose-500 text-xs font-medium">
          {{ error }}
        </p>
        <p v-if="exito" class="text-emerald-500 text-xs font-medium">
          ✓ Contraseña actualizada correctamente
        </p>
      </div>

      <!-- Acciones del modal -->
      <div class="mt-6 flex gap-3">
        <button
          @click="emit('cerrar')"
          class="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          @click="cambiarPassword"
          :disabled="loading"
          class="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-colors cursor-pointer"
        >
          {{ loading ? "Guardando..." : "Guardar" }}
        </button>
      </div>
    </div>
  </div>
</template>
