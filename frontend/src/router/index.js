/**
 * router/index.js — Configuración del enrutador de la aplicación
 *
 * Define las rutas de INYTEL Presence y gestiona la navegación
 * mediante un guard global que controla el acceso según el rol
 * del usuario y el estado de la sesión.
 *
 * Rutas disponibles:
 * - /login          → Pantalla de autenticación (pública)
 * - /equipo         → Gestión del equipo (solo admin)
 * - /dashboard      → Panel de estadísticas (solo admin)
 * - /perfil         → Perfil y fichaje del empleado (autenticado)
 * - /reset-password → Recuperación de contraseña (pública)
 *
 * Metadatos de ruta:
 * - publica:      true → accesible sin autenticación
 * - requiereAuth: true → redirige a /login si no hay sesión activa
 * - soloAdmin:    true → redirige a /perfil si el rol no es admin
 */

import { createRouter, createWebHistory } from "vue-router";
import { useAuth } from "../composables/useAuth";

import LoginView from "../views/LoginView.vue";
import EquipoView from "../views/EquipoView.vue";
import DashboardView from "../views/DashboardView.vue";
import PerfilView from "../views/PerfilView.vue";
import ResetPasswordView from "../views/ResetPasswordView.vue";

// ── Definición de rutas ───────────────────────────────────────────────────────
const routes = [
  // Redirige la raíz según el rol del usuario (gestionado en el guard)
  { path: "/", redirect: "/equipo" },

  // Rutas públicas — accesibles sin token
  { path: "/login", component: LoginView, meta: { publica: true } },
  {
    path: "/reset-password",
    component: ResetPasswordView,
    meta: { publica: true },
  },

  // Rutas de administrador — requieren autenticación y rol admin
  {
    path: "/equipo",
    component: EquipoView,
    meta: { requiereAuth: true, soloAdmin: true },
  },
  {
    path: "/dashboard",
    component: DashboardView,
    meta: { requiereAuth: true, soloAdmin: true },
  },

  // Rutas de empleado — requieren autenticación, accesibles para cualquier rol
  { path: "/perfil", component: PerfilView, meta: { requiereAuth: true } },
];

// ── Instancia del router ──────────────────────────────────────────────────────
const router = createRouter({
  history: createWebHistory(), // URLs limpias sin hash (#)
  routes,
});

// ── Guard de navegación global ────────────────────────────────────────────────
/**
 * Se ejecuta antes de cada cambio de ruta.
 * Comprueba en orden:
 * 1. Si la ruta es pública → permite el acceso sin más comprobaciones.
 * 2. Si la sesión ha expirado → cierra sesión y redirige a /login.
 * 3. Si la ruta requiere autenticación y no hay usuario → redirige a /login.
 * 4. Si la ruta es solo para admin y el usuario no lo es → redirige a /perfil.
 * 5. Si la ruta es "/" → redirige según el rol (admin → /equipo, resto → /perfil).
 */
router.beforeEach((to) => {
  const { usuario, sesionExpirada, logout } = useAuth();

  // Rutas públicas: siempre permitidas
  if (to.meta.publica) return true;

  // Sesión caducada: limpiar estado y redirigir al login
  if (sesionExpirada()) {
    logout();
    return "/login";
  }

  // Sin usuario autenticado: redirigir al login
  if (to.meta.requiereAuth && !usuario.value) return "/login";

  // Ruta exclusiva de admin: redirigir a perfil si el rol no es admin
  if (to.meta.soloAdmin && usuario.value?.rol !== "admin") return "/perfil";

  // Ruta raíz: redirigir según rol
  if (to.path === "/") {
    return usuario.value?.rol === "admin" ? "/equipo" : "/perfil";
  }

  // Acceso permitido
  return true;
});

export default router;
