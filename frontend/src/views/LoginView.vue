<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "../composables/useAuth";
import axios from "axios";

const router = useRouter();
const { login } = useAuth();

const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

// Recuperación de contraseña
const mostrarRecuperar = ref(false);
const emailRecuperar = ref("");
const loadingRecuperar = ref(false);
const mensajeRecuperar = ref("");
const errorRecuperar = ref("");

async function handleLogin() {
  try {
    error.value = "";
    loading.value = true;
    await login(email.value, password.value);
    const { usuario } = useAuth();
    router.push(usuario.value.rol === "admin" ? "/equipo" : "/perfil");
  } catch (err) {
    error.value = "Email o contraseña incorrectos";
  } finally {
    loading.value = false;
  }
}

async function handleRecuperar() {
  errorRecuperar.value = "";
  mensajeRecuperar.value = "";
  if (!emailRecuperar.value) {
    errorRecuperar.value = "Introduce tu email";
    return;
  }
  try {
    loadingRecuperar.value = true;
    await axios.post("/api/auth/recuperar", { email: emailRecuperar.value });
    mensajeRecuperar.value = "Si el email existe recibirás un correo con instrucciones.";
    emailRecuperar.value = "";
  } catch (err) {
    errorRecuperar.value = "Error al enviar el correo. Inténtalo de nuevo.";
  } finally {
    loadingRecuperar.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl p-10 w-full max-w-sm shadow-xl">

      <!-- Logo / título -->
      <div class="mb-8 flex flex-col items-center">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-200 shadow-lg">
            <span class="text-white font-black text-xl italic">I</span>
          </div>
          <h1 class="text-xl font-extrabold tracking-tighter">
            INYTEL <span class="text-indigo-600 font-light ml-1">| Presence</span>
          </h1>
        </div>
        <p class="text-slate-400 text-sm">{{ mostrarRecuperar ? 'Recuperar contraseña' : 'Accede a tu cuenta' }}</p>
      </div>

      <!-- Formulario login -->
      <div v-if="!mostrarRecuperar" class="space-y-4">
        <div>
          <label class="text-slate-400 text-sm font-medium block mb-1">Email</label>
          <input
            v-model="email"
            type="email"
            placeholder="alan.touring@example.com"
            class="w-full border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-indigo-400 transition-colors text-sm"
            @keyup.enter="handleLogin"
          />
        </div>
        <div>
          <label class="text-slate-400 text-sm font-medium block mb-1">Contraseña</label>
          <input
            v-model="password"
            type="password"
            placeholder="••••••••"
            class="w-full border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-indigo-400 transition-colors text-sm"
            @keyup.enter="handleLogin"
          />
        </div>

        <p v-if="error" class="text-rose-500 text-xs font-medium">{{ error }}</p>

        <button
          @click="handleLogin"
          :disabled="loading"
          class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-colors mt-2 cursor-pointer"
        >
          {{ loading ? 'Accediendo...' : 'Entrar' }}
        </button>

        <button
          @click="mostrarRecuperar = true"
          class="w-full text-center text-slate-400 hover:text-indigo-600 text-sm font-medium transition-colors cursor-pointer"
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>

      <!-- Formulario recuperar contraseña -->
      <div v-else class="space-y-4">
        <p class="text-slate-400 text-sm">Introduce tu email y te enviaremos un enlace para restablecer tu contraseña.</p>

        <div>
          <label class="text-slate-400 text-sm font-medium block mb-1">Email</label>
          <input
            v-model="emailRecuperar"
            type="email"
            placeholder="tu@email.com"
            class="w-full border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-indigo-400 transition-colors text-sm"
            @keyup.enter="handleRecuperar"
          />
        </div>

        <p v-if="errorRecuperar" class="text-rose-500 text-xs font-medium">{{ errorRecuperar }}</p>
        <p v-if="mensajeRecuperar" class="text-emerald-500 text-xs font-medium">{{ mensajeRecuperar }}</p>

        <button
          @click="handleRecuperar"
          :disabled="loadingRecuperar"
          class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-colors cursor-pointer"
        >
          {{ loadingRecuperar ? 'Enviando...' : 'Enviar enlace' }}
        </button>

        <button
          @click="mostrarRecuperar = false; mensajeRecuperar = ''; errorRecuperar = ''"
          class="w-full text-center text-slate-400 hover:text-indigo-600 text-sm font-medium transition-colors cursor-pointer"
        >
          ← Volver al login
        </button>
      </div>

    </div>
  </div>
</template>