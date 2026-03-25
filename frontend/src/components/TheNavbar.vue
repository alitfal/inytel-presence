<script setup>
/**
 * TheNavbar.vue — Barra de navegación superior
 *
 * Componente de navegación global presente en todas las vistas
 * del panel de administración. Contiene:
 * - Logo e identidad de la aplicación
 * - Buscador de empleados (solo visible en tablet/desktop)
 * - Reloj en tiempo real con fecha y hora actuales
 *
 * El buscador usa v-model mediante defineModel() para sincronizar
 * el texto de búsqueda con el componente padre (AdminLayout).
 * El reloj se actualiza cada segundo mediante setInterval
 * y se limpia al desmontar el componente para evitar memory leaks.
 */

import { ref, onMounted, onUnmounted } from "vue";
import { Search } from "lucide-vue-next";

// Estado reactivo del reloj
const currentTime = ref("--:--:--");
const currentDate = ref("Cargando...");

/**
 * Actualiza las refs de fecha y hora con el instante actual.
 * Se llama al montar el componente y cada segundo mediante setInterval.
 */
const updateClock = () => {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString("es-ES", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const dateStr = now.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });
  // Capitaliza la primera letra y elimina el punto del mes abreviado
  currentDate.value =
    dateStr.charAt(0).toUpperCase() + dateStr.slice(1).replace(".", "");
};

// Referencia al intervalo para poder limpiarlo al desmontar
let timer;

onMounted(() => {
  updateClock();
  timer = setInterval(updateClock, 1000);
});

// Limpia el intervalo al desmontar para evitar memory leaks
onUnmounted(() => clearInterval(timer));

// v-model del buscador — sincronizado con el componente padre
const model = defineModel();
</script>

<template>
  <nav
    class="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50"
  >
    <div class="px-4 md:px-6 h-20 flex items-center justify-between gap-3">
      <!-- Logo e identidad de la aplicación -->
      <div class="flex items-center gap-3 shrink-0">
        <div
          class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-200 shadow-lg"
        >
          <span class="text-white font-black text-xl italic">I</span>
        </div>
        <h1 class="text-xl font-extrabold tracking-tighter hidden sm:block">
          INYTEL <span class="text-indigo-600 font-light ml-1">| Presence</span>
        </h1>
      </div>

      <!-- Buscador de empleados — oculto en móvil, visible en md+ -->
      <div class="flex-1 max-w-md mx-4 hidden md:block">
        <div class="relative group">
          <input
            v-model="model"
            type="text"
            placeholder="Buscar ..."
            class="w-full bg-slate-100 border-transparent rounded-2xl py-2.5 pl-11 pr-4 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
          />
          <!-- Icono de búsqueda posicionado dentro del input -->
          <span
            class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
          >
            <Search class="w-4 h-4" stroke-width="2.5" />
          </span>
        </div>
      </div>

      <!-- Reloj en tiempo real — oculto en móvil, visible en sm+ -->
      <div class="text-right shrink-0 hidden sm:block">
        <p
          class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none mb-1"
        >
          {{ currentDate }}
        </p>
        <!-- tabular-nums garantiza que los dígitos no se desplacen al cambiar -->
        <p
          class="text-xl font-mono font-bold text-indigo-600 tabular-nums leading-none"
        >
          {{ currentTime }}
        </p>
      </div>
    </div>
  </nav>
</template>
