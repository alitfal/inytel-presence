<script setup>
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuth } from "../composables/useAuth";
import TheNavbar from "./TheNavbar.vue";
import {
  LayoutDashboard, Users, LogOut, UserPlus, Shield,
} from "lucide-vue-next";

const props = defineProps({
  searchQuery: { type: String, default: "" },
});

const emit = defineEmits(["update:searchQuery", "abrir-nuevo", "cambiar-password"]);

const router = useRouter();
const route = useRoute();
const { usuario, logout } = useAuth();
const sidebarAbierto = ref(false);

function handleLogout() {
  logout();
  router.push("/login");
}

function navegar(to) {
  sidebarAbierto.value = false;
  router.push(to);
}

const navItems = [
  { label: "Equipo", icon: Users, to: "/equipo" },
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
];
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col">

    <!-- Navbar superior -->
    <TheNavbar
      :model-value="searchQuery"
      @update:model-value="emit('update:searchQuery', $event)"
      @toggle-sidebar="sidebarAbierto = !sidebarAbierto"
    />

    <div class="flex flex-1 relative">

      <!-- Sidebar — solo visible en lg+ -->
      <aside
        :class="[
          'bg-white border-r border-slate-100 flex flex-col sticky top-20 h-[calc(100vh-5rem)] shrink-0 transition-all duration-300 z-30',
          'hidden lg:flex',
          'lg:w-16 xl:w-64',
        ]"
      >
        <!-- Logo -->
        <div class="px-3 xl:px-6 py-6 border-b border-slate-100">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
              <Shield class="w-4 h-4 text-white" />
            </div>
            <div class="hidden xl:block">
              <p class="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">Panel</p>
              <p class="text-sm font-extrabold text-slate-900 leading-none">Administración</p>
            </div>
          </div>
        </div>

        <!-- Nav items -->
        <nav class="flex-1 px-2 xl:px-3 py-4 space-y-1">
          <button
            v-for="item in navItems"
            :key="item.to"
            @click="navegar(item.to)"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer"
            :class="route.path === item.to
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'"
            :title="item.label"
          >
            <component :is="item.icon" class="w-4 h-4 shrink-0" />
            <span class="hidden xl:inline">{{ item.label }}</span>
          </button>

          <hr class="my-3 border-slate-100" />

          <button
            @click="emit('abrir-nuevo')"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer"
            title="Nuevo empleado"
          >
            <UserPlus class="w-4 h-4 shrink-0" />
            <span class="hidden xl:inline">Nuevo empleado</span>
          </button>
        </nav>

        <!-- Footer usuario + logout -->
        <div class="px-2 xl:px-3 py-4 border-t border-slate-100">
          <div class="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-50 mb-2">
            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-0.5 shrink-0">
              <div class="w-full h-full rounded-full border-2 border-white overflow-hidden bg-slate-200">
                <img src="https://ui-avatars.com/api/?name=Admin&background=random" alt="Admin" />
              </div>
            </div>
            <div class="flex-1 min-w-0 hidden xl:block">
              <p class="text-xs font-bold text-slate-900 truncate">{{ usuario?.nombre || "Admin" }}</p>
              <p class="text-[10px] text-slate-400 uppercase tracking-widest">{{ usuario?.rol }}</p>
            </div>
          </div>
          <button
            @click="handleLogout"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer"
            title="Cerrar sesión"
          >
            <LogOut class="w-4 h-4 shrink-0" />
            <span class="hidden xl:inline">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <!-- Contenido principal -->
      <main class="flex-1 min-w-0 pb-20 lg:pb-0">
        <slot />
      </main>
    </div>

    <!-- Barra inferior — solo móvil/tablet (oculta en lg+) -->
    <nav class="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div class="flex items-center justify-around px-2 py-2">

        <!-- Equipo -->
        <button
          @click="navegar('/equipo')"
          class="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all cursor-pointer"
          :class="route.path === '/equipo' ? 'text-indigo-600' : 'text-slate-400'"
        >
          <Users class="w-5 h-5" />
          <span class="text-[10px] font-semibold">Equipo</span>
        </button>

        <!-- Dashboard -->
        <button
          @click="navegar('/dashboard')"
          class="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all cursor-pointer"
          :class="route.path === '/dashboard' ? 'text-indigo-600' : 'text-slate-400'"
        >
          <LayoutDashboard class="w-5 h-5" />
          <span class="text-[10px] font-semibold">Dashboard</span>
        </button>

        <!-- Nuevo empleado -->
        <button
          @click="emit('abrir-nuevo')"
          class="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all cursor-pointer text-slate-400"
        >
          <UserPlus class="w-5 h-5" />
          <span class="text-[10px] font-semibold">Nuevo</span>
        </button>

        <!-- Cerrar sesión -->
        <button
          @click="handleLogout"
          class="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all cursor-pointer text-slate-400 hover:text-rose-500"
        >
          <LogOut class="w-5 h-5" />
          <span class="text-[10px] font-semibold">Salir</span>
        </button>

      </div>
    </nav>

  </div>
</template>