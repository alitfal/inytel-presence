<script setup>
/**
 * CambiarPasswordModal.vue — Componente modal para la actualización de credenciales
 *
 * Proporciona una interfaz segura para que el usuario actualice su contraseña.
 * Características principales:
 * - Validación en cliente (campos vacíos, longitud mínima y coincidencia).
 * - Gestión de estados de carga (loading) y feedback visual (éxito/error).
 * - Cierre automático tras completar la acción con éxito.
 * * Se comunica con el endpoint PUT `/api/auth/password`.
 */

import { ref } from "vue";
import axios from "axios";

// --- CONFIGURACIÓN Y EMITS ---
const API = "/api";
const emit = defineEmits(["cerrar"]); // Evento para que el padre desmonte el modal

// --- ESTADO REACTIVO ---

// Inputs del formulario
const passwordActual = ref("");
const passwordNueva = ref("");
const passwordConfirm = ref("");

// Estados de feedback y control de flujo
const error = ref(""); // Mensaje de error para la validación o respuesta del server
const exito = ref(false); // Flag para mostrar el mensaje de confirmación verde
const loading = ref(false); // Bloquea el botón mientras dura la petición

// --- ACCIONES ---

/**
 * Gestiona el proceso completo de cambio de contraseña.
 * Ejecuta validaciones locales antes de realizar la petición al servidor.
 */
async function cambiarPassword() {
  // Reiniciamos estados de feedback
  error.value = "";
  exito.value = false;

  // 1. Validaciones de presencia
  if (!passwordActual.value || !passwordNueva.value || !passwordConfirm.value) {
    error.value = "Todos los campos son obligatorios";
    return;
  }

  // 2. Validación de seguridad mínima
  if (passwordNueva.value.length < 6) {
    error.value = "La nueva contraseña debe tener al menos 6 caracteres";
    return;
  }

  // 3. Validación de integridad (Coincidencia)
  if (passwordNueva.value !== passwordConfirm.value) {
    error.value = "Las contraseñas no coinciden";
    return;
  }

  try {
    loading.value = true;

    // Petición PUT al endpoint de autenticación
    await axios.put(`${API}/auth/password`, {
      password_actual: passwordActual.value,
      password_nueva: passwordNueva.value,
    });

    // Operación exitosa:
    exito.value = true;

    // Limpieza de campos por seguridad
    passwordActual.value = "";
    passwordNueva.value = "";
    passwordConfirm.value = "";

    // Esperamos 1.5s para que el usuario vea el mensaje de éxito antes de cerrar
    setTimeout(() => emit("cerrar"), 1500);
  } catch (err) {
    // Captura de error del backend (ej: "Contraseña actual incorrecta")
    error.value = err.response?.data?.error || "Error al cambiar la contraseña";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div
    class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    @click.self="emit('cerrar')"
  >
    <div class="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
      <h2 class="text-xl font-bold text-slate-900 mb-6">Cambiar contraseña</h2>

      <div class="space-y-4 text-sm">
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

        <p v-if="error" class="text-rose-500 text-xs font-medium">
          {{ error }}
        </p>
        <p v-if="exito" class="text-emerald-500 text-xs font-medium">
          ✓ Contraseña actualizada correctamente
        </p>
      </div>

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
