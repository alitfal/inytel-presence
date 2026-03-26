/**
 * main.js — Punto de entrada de la aplicación Vue.js
 *
 * Inicializa la instancia de Vue, registra el router
 * e inyecta los estilos globales antes de montar la app
 * en el elemento raíz del DOM (#app).
 */
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "./style.css"; // estilos globales Tailwind CSS

createApp(App).use(router).mount("#app");
