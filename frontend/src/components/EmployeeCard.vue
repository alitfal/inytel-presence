<script setup>
import { ref } from "vue";
import {
  MoreHorizontal,
  ArrowUpRight,
  KeyRound,
  UserCheck,
  UserX,
} from "lucide-vue-next";
import axios from "axios";

const props = defineProps({ employee: { type: Object, required: true } });
const emit = defineEmits(["ver-ficha", "actualizar"]);

const menuAbierto = ref(false);
const menuBtn = ref(null);
const menuALaIzquierda = ref(false);
const mostrandoReset = ref(false);
const passwordNueva = ref("");
const passwordConfirm = ref("");
const errorReset = ref("");
const exitoReset = ref(false);
const loadingReset = ref(false);
const loadingActivo = ref(false);

function toggleMenu() {
  if (!menuAbierto.value && menuBtn.value) {
    const rect = menuBtn.value.getBoundingClientRect();
    menuALaIzquierda.value = rect.left < window.innerWidth / 2;
  }
  menuAbierto.value = !menuAbierto.value;
  errorReset.value = "";
  exitoReset.value = false;
  passwordNueva.value = "";
  passwordConfirm.value = "";
  mostrandoReset.value = false;
}

async function resetPassword() {
  errorReset.value = "";
  if (!passwordNueva.value || passwordNueva.value.length < 6) {
    errorReset.value = "Mínimo 6 caracteres";
    return;
  }
  if (passwordNueva.value !== passwordConfirm.value) {
    errorReset.value = "Las contraseñas no coinciden";
    return;
  }
  try {
    loadingReset.value = true;
    await axios.put(`/api/auth/reset/${props.employee.id}`, {
      password_nueva: passwordNueva.value,
    });
    exitoReset.value = true;
    setTimeout(() => {
      menuAbierto.value = false;
      mostrandoReset.value = false;
      exitoReset.value = false;
      passwordNueva.value = "";
      passwordConfirm.value = "";
    }, 1500);
  } catch (err) {
    errorReset.value = err.response?.data?.error || "Error al resetear";
  } finally {
    loadingReset.value = false;
  }
}

async function toggleActivo() {
  try {
    loadingActivo.value = true;
    await axios.put(`/api/empleados/${props.employee.id}/activo`, {
      activo: props.employee.activo ? 0 : 1,
    });
    emit("actualizar");
    menuAbierto.value = false;
  } catch (err) {
    console.error("Error al cambiar estado:", err);
  } finally {
    loadingActivo.value = false;
  }
}
</script>

<template>
  <div
    class="bg-white border border-slate-100 rounded-3xl p-4 sm:p-5 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 group relative"
  >
    <div class="flex justify-between items-start mb-3">
      <div
        class="w-10 h-10 sm:w-14 sm:h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-base sm:text-xl font-bold text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300"
        :class="!employee.activo ? 'opacity-40' : ''"
      >
        {{ employee.nombre.charAt(0) }}
      </div>

      <div class="relative">
        <button
          ref="menuBtn"
          @click="toggleMenu"
          class="text-slate-300 hover:text-slate-600 p-1 cursor-pointer"
        >
          <MoreHorizontal class="w-5 h-5" />
        </button>
        <div
          v-if="menuAbierto"
          :class="menuALaIzquierda ? 'left-0' : 'right-0'"
          class="absolute top-8 bg-white border border-slate-100 rounded-2xl shadow-xl z-10 w-52 p-2"
        >
          <div v-if="!mostrandoReset">
            <button
              @click="mostrandoReset = true"
              class="w-full text-left px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
            >
              <KeyRound class="w-4 h-4" /> Resetear contraseña
            </button>
            <button
              @click="toggleActivo"
              :disabled="loadingActivo"
              :class="
                employee.activo
                  ? 'text-rose-500 hover:bg-rose-50'
                  : 'text-emerald-600 hover:bg-emerald-50'
              "
              class="w-full text-left px-3 py-2 text-sm font-medium rounded-xl transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <UserX v-if="employee.activo" class="w-4 h-4" />
              <UserCheck v-else class="w-4 h-4" />
              {{ employee.activo ? "Desactivar" : "Activar" }}
            </button>
            <hr class="my-1 border-slate-100" />
            <button
              @click="menuAbierto = false"
              class="w-full text-left px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>
          <div v-else class="px-1 py-1">
            <p class="text-xs font-bold text-slate-500 mb-2 px-2">
              Nueva contraseña
            </p>
            <input
              v-model="passwordNueva"
              type="password"
              placeholder="Mínimo 6 caracteres"
              class="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 transition-colors mb-2"
            />
            <input
              v-model="passwordConfirm"
              type="password"
              placeholder="Confirmar contraseña"
              class="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 transition-colors mb-2"
              @keyup.enter="resetPassword"
            />
            <p v-if="errorReset" class="text-rose-500 text-xs mb-2 px-1">
              {{ errorReset }}
            </p>
            <p v-if="exitoReset" class="text-emerald-500 text-xs mb-2 px-1">
              ✓ Actualizada
            </p>
            <div class="flex gap-2">
              <button
                @click="mostrandoReset = false"
                class="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl cursor-pointer"
              >
                Atrás
              </button>
              <button
                @click="resetPassword"
                :disabled="loadingReset"
                class="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                {{ loadingReset ? "..." : "Guardar" }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      class="space-y-0.5 transition-opacity"
      :class="!employee.activo ? 'opacity-40' : ''"
    >
      <h3
        class="font-bold text-slate-900 text-base sm:text-lg leading-tight truncate"
      >
        {{ employee.nombre }}
      </h3>
      <p
        class="text-slate-400 text-xs font-medium uppercase tracking-wider truncate"
      >
        {{ employee.cargo }}
      </p>
    </div>

    <div
      class="mt-4 flex items-center justify-between transition-opacity"
      :class="!employee.activo ? 'opacity-40' : ''"
    >
      <div class="flex items-center gap-1.5">
        <span
          :class="[
            'w-2 h-2 rounded-full animate-pulse',
            employee.estado === 'DENTRO' ? 'bg-emerald-500' : 'bg-slate-300',
          ]"
        ></span>
        <span class="text-xs font-bold text-slate-500 uppercase">{{
          employee.estado
        }}</span>
      </div>
      <button
        @click="emit('ver-ficha', employee)"
        class="flex items-center gap-1 text-indigo-600 font-bold text-xs sm:text-sm hover:translate-x-1 transition-transform cursor-pointer"
      >
        Ficha <ArrowUpRight class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>
    </div>

    <div
      v-if="menuAbierto"
      class="fixed inset-0 z-0"
      @click="menuAbierto = false"
    ></div>
  </div>
</template>
