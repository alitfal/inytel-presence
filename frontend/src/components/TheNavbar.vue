<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { Search, Menu, X } from "lucide-vue-next";

const currentTime = ref("--:--:--");
const currentDate = ref("Cargando...");

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
  currentDate.value =
    dateStr.charAt(0).toUpperCase() + dateStr.slice(1).replace(".", "");
};

let timer;
onMounted(() => {
  updateClock();
  timer = setInterval(updateClock, 1000);
});
onUnmounted(() => clearInterval(timer));

const model = defineModel();
const emit = defineEmits(["toggle-sidebar"]);
</script>

<template>
  <nav
    class="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50"
  >
    <div class="px-4 md:px-6 h-20 flex items-center justify-between gap-3">
      <!-- Hamburguesa (solo móvil/tablet) -->
      <button
        @click="emit('toggle-sidebar')"
        class="lg:hidden p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer shrink-0"
      >
        <Menu class="w-5 h-5" />
      </button>

      <!-- Logo -->
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

      <!-- Buscador -->
      <div class="flex-1 max-w-md mx-4 hidden md:block">
        <div class="relative group">
          <input
            v-model="model"
            type="text"
            placeholder="Buscar ..."
            class="w-full bg-slate-100 border-transparent rounded-2xl py-2.5 pl-11 pr-4 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
          />
          <span
            class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
          >
            <Search class="w-4 h-4" stroke-width="2.5" />
          </span>
        </div>
      </div>

      <!-- Fecha y hora -->
      <div class="text-right shrink-0 hidden sm:block">
        <p
          class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none mb-1"
        >
          {{ currentDate }}
        </p>
        <p
          class="text-xl font-mono font-bold text-indigo-600 tabular-nums leading-none"
        >
          {{ currentTime }}
        </p>
      </div>
    </div>
  </nav>
</template>
