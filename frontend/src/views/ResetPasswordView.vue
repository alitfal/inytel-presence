<script setup>
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import axios from "axios";

const router = useRouter();
const route = useRoute();

const token = ref("");
const passwordNueva = ref("");
const passwordConfirm = ref("");
const error = ref("");
const exito = ref(false);
const loading = ref(false);
const tokenInvalido = ref(false);

onMounted(() => {
  token.value = route.query.token || "";
  if (!token.value) tokenInvalido.value = true;
});

async function handleReset() {
  error.value = "";
  if (!passwordNueva.value || passwordNueva.value.length < 6) {
    error.value = "La contraseña debe tener al menos 6 caracteres";
    return;
  }
  if (passwordNueva.value !== passwordConfirm.value) {
    error.value = "Las contraseñas no coinciden";
    return;
  }
  try {
    loading.value = true;
    await axios.post("/api/auth/reset-password", {
      token: token.value,
      password_nueva: passwordNueva.value,
    });
    exito.value = true;
    setTimeout(() => router.push("/login"), 3000);
  } catch (err) {
    error.value = err.response?.data?.error || "El enlace no es válido o ha expirado";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl p-10 w-full max-w-sm shadow-xl">

      <!-- Logo -->
      <div class="mb-8 flex flex-col items-center">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-200 shadow-lg">
            <span class="text-white font-black text-xl italic">I</span>
          </div>
          <h1 class="text-xl font-extrabold tracking-tighter">
            INYTEL <span class="text-indigo-600 font-light ml-1">| Presence</span>
          </h1>
        </div>
        <p class="text-slate-400 text-sm">Nueva contraseña</p>
      </div>

      <!-- Token inválido -->
      <div v-if="tokenInvalido" class="text-center space-y-4">
        <div class="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto">
          <span class="text-rose-500 text-xl">✕</span>
        </div>
        <p class="text-slate-700 font-bold">Enlace no válido</p>
        <p class="text-slate-400 text-sm">Este enlace de recuperación no es válido o ha expirado.</p>
        <button
          @click="router.push('/login')"
          class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-colors cursor-pointer"
        >
          Volver al login
        </button>
      </div>

      <!-- Éxito -->
      <div v-else-if="exito" class="text-center space-y-4">
        <div class="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
          <span class="text-emerald-500 text-xl font-bold">✓</span>
        </div>
        <p class="text-slate-700 font-bold">Contraseña actualizada</p>
        <p class="text-slate-400 text-sm">Tu contraseña ha sido cambiada correctamente. Serás redirigido al login en unos segundos.</p>
      </div>

      <!-- Formulario -->
      <div v-else class="space-y-4">
        <div>
          <label class="text-slate-400 text-sm font-medium block mb-1">Nueva contraseña</label>
          <input
            v-model="passwordNueva"
            type="password"
            placeholder="Mínimo 6 caracteres"
            class="w-full border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-indigo-400 transition-colors text-sm"
          />
        </div>
        <div>
          <label class="text-slate-400 text-sm font-medium block mb-1">Confirmar contraseña</label>
          <input
            v-model="passwordConfirm"
            type="password"
            placeholder="Repite la contraseña"
            class="w-full border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-indigo-400 transition-colors text-sm"
            @keyup.enter="handleReset"
          />
        </div>

        <p v-if="error" class="text-rose-500 text-xs font-medium">{{ error }}</p>

        <button
          @click="handleReset"
          :disabled="loading"
          class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-colors cursor-pointer"
        >
          {{ loading ? 'Guardando...' : 'Guardar contraseña' }}
        </button>

        <button
          @click="router.push('/login')"
          class="w-full text-center text-slate-400 hover:text-indigo-600 text-sm font-medium transition-colors cursor-pointer"
        >
          ← Volver al login
        </button>
      </div>

    </div>
  </div>
</template>