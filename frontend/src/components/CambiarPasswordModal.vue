<script setup>
import { ref } from "vue";
import axios from "axios";

const API = "/api";
const emit = defineEmits(["cerrar"]);

const passwordActual = ref("");
const passwordNueva = ref("");
const passwordConfirm = ref("");
const error = ref("");
const exito = ref(false);
const loading = ref(false);

async function cambiarPassword() {
  error.value = "";
  exito.value = false;

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
      password_nueva: passwordNueva.value
    });
    exito.value = true;
    passwordActual.value = "";
    passwordNueva.value = "";
    passwordConfirm.value = "";
    setTimeout(() => emit("cerrar"), 1500);
  } catch (err) {
    error.value = err.response?.data?.error || "Error al cambiar la contraseña";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click.self="emit('cerrar')">
    <div class="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">

      <h2 class="text-xl font-bold text-slate-900 mb-6">Cambiar contraseña</h2>

      <div class="space-y-4 text-sm">
        <div>
          <label class="text-slate-400 font-medium block mb-1">Contraseña actual</label>
          <input v-model="passwordActual" type="password" placeholder="••••••••"
            class="w-full border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-indigo-400 transition-colors" />
        </div>
        <div>
          <label class="text-slate-400 font-medium block mb-1">Nueva contraseña</label>
          <input v-model="passwordNueva" type="password" placeholder="••••••••"
            class="w-full border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-indigo-400 transition-colors" />
        </div>
        <div>
          <label class="text-slate-400 font-medium block mb-1">Confirmar nueva contraseña</label>
          <input v-model="passwordConfirm" type="password" placeholder="••••••••"
            class="w-full border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-indigo-400 transition-colors"
            @keyup.enter="cambiarPassword" />
        </div>

        <p v-if="error" class="text-rose-500 text-xs font-medium">{{ error }}</p>
        <p v-if="exito" class="text-emerald-500 text-xs font-medium">✓ Contraseña actualizada correctamente</p>
      </div>

      <div class="mt-6 flex gap-3">
        <button @click="emit('cerrar')" class="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-colors cursor-pointer">
          Cancelar
        </button>
        <button @click="cambiarPassword" :disabled="loading"
          class="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-colors cursor-pointer">
          {{ loading ? 'Guardando...' : 'Guardar' }}
        </button>
      </div>

    </div>
  </div>
</template>