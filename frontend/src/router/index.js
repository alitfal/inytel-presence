import { createRouter, createWebHistory } from "vue-router";
import { useAuth } from "../composables/useAuth";

import LoginView from "../views/LoginView.vue";
import EquipoView from "../views/EquipoView.vue";
import DashboardView from "../views/DashboardView.vue";
import PerfilView from "../views/PerfilView.vue";
import ResetPasswordView from "../views/ResetPasswordView.vue";

const routes = [
  { path: "/", redirect: "/equipo" },
  { path: "/login", component: LoginView, meta: { publica: true } },
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
  { path: "/perfil", component: PerfilView, meta: { requiereAuth: true } },
  {
    path: "/reset-password",
    component: ResetPasswordView,
    meta: { publica: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const { usuario, sesionExpirada, logout } = useAuth();

  if (to.meta.publica) return true;

  // Sesión caducada → limpiar y mandar al login
  if (sesionExpirada()) {
    logout();
    return "/login";
  }

  if (to.meta.requiereAuth && !usuario.value) return "/login";

  if (to.meta.soloAdmin && usuario.value?.rol !== "admin") return "/perfil";

  if (to.path === "/") {
    return usuario.value?.rol === "admin" ? "/equipo" : "/perfil";
  }

  return true;
});

export default router;
