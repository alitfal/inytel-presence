<script setup>
/**
 * @component DashboardView
 * @description Vista principal del panel de administración.
 *              Muestra un resumen en tiempo real del estado de presencia
 *              del equipo mediante tarjetas, gráficas, calendario y rankings.
 *
 * Secciones:
 * - Tarjetas resumen: total empleados, dentro/fuera ahora, fichajes hoy.
 * - Gráficas de actividad: fichajes por hora (hoy) y por día (últimos 7 días o rango).
 * - Calendario interactivo con listado de fichajes del día seleccionado.
 * - Ranking de horas trabajadas en la semana actual.
 * - Alertas de empleados sin fichar en los últimos N días.
 * - Resumen semanal de horas por empleado con barra de progreso.
 */
import { ref, onMounted, computed } from "vue";
import AdminLayout from "../components/AdminLayout.vue";
import { Bar, Line } from "vue-chartjs";
import EmployeeForm from "../components/EmployeeForm.vue";
import CambiarPasswordModal from "../components/CambiarPasswordModal.vue";
import { useEmployees } from "../composables/useEmployees";
import { useEmployeeForm } from "../composables/useEmployeeForm";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
} from "chart.js";
import {
  CalendarDays,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Trophy,
  ChevronLeft,
  ChevronRight,
} from "lucide-vue-next";
import axios from "axios";

// Registro de componentes necesarios de Chart.js
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
);

const API = "/api";

// ── Estado global ─────────────────────────────────────────────────────────────
const loading = ref(true); // true mientras carga fetchStats
const stats = ref(null); // Datos de estadísticas generales
const loadingRefresh = ref(false); // true durante el refresco manual
const ultimaActualizacion = ref(null); // Hora de la última actualización formateada
const flashVerde = ref(false); // Activa el flash verde en el indicador

// ── Filtro de fechas para las gráficas ───────────────────────────────────────
const fechaDesde = ref(""); // Fecha inicio del rango personalizado (YYYY-MM-DD)
const fechaHasta = ref(""); // Fecha fin del rango personalizado (YYYY-MM-DD)

// ── Estado del calendario ─────────────────────────────────────────────────────
const calendarioFecha = ref(new Date().toISOString().slice(0, 10)); // Día seleccionado
const calendarioData = ref([]); // Fichajes del día seleccionado
const loadingCalendario = ref(false); // true mientras carga fetchCalendario
const mesActual = ref(new Date()); // Mes visible en el calendario

/**
 * Devuelve el número de días del mes de una fecha dada.
 * @param {Date} fecha
 * @returns {number}
 */
function diasEnMes(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).getDate();
}

/**
 * Devuelve el índice del primer día de la semana del mes (0=lunes, 6=domingo).
 * Ajusta el domingo (0 en JS) a 6 para que la semana empiece en lunes.
 * @param {Date} fecha
 * @returns {number}
 */
function primerDiaMes(fecha) {
  const d = new Date(fecha.getFullYear(), fecha.getMonth(), 1).getDay();
  return d === 0 ? 6 : d - 1;
}

/**
 * Formatea un año, mes (0-indexed) y día a formato YYYY-MM-DD.
 * @param {number} anio
 * @param {number} mes  - Mes 0-indexed
 * @param {number} dia
 * @returns {string}
 */
function formatFechaCalendario(anio, mes, dia) {
  return `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/**
 * Genera el array de celdas del calendario del mes actual.
 * Incluye nulls al inicio para alinear el primer día con el lunes.
 */
const diasCalendario = computed(() => {
  const total = diasEnMes(mesActual.value);
  const inicio = primerDiaMes(mesActual.value);
  const celdas = [];
  for (let i = 0; i < inicio; i++) celdas.push(null); // celdas vacías de alineación
  for (let d = 1; d <= total; d++) celdas.push(d);
  return celdas;
});

/** Navega al mes anterior o siguiente en el calendario. */
function cambiarMes(dir) {
  const d = new Date(mesActual.value);
  d.setMonth(d.getMonth() + dir);
  mesActual.value = d;
}

/** Selecciona un día del calendario y carga sus fichajes. */
async function seleccionarDia(dia) {
  if (!dia) return;
  calendarioFecha.value = formatFechaCalendario(
    mesActual.value.getFullYear(),
    mesActual.value.getMonth(),
    dia,
  );
  await fetchCalendario();
}

/** Comprueba si un día es el actualmente seleccionado en el calendario. */
function esDiaSeleccionado(dia) {
  if (!dia) return false;
  return (
    calendarioFecha.value ===
    formatFechaCalendario(
      mesActual.value.getFullYear(),
      mesActual.value.getMonth(),
      dia,
    )
  );
}

/** Comprueba si un día corresponde a la fecha actual. */
function esHoy(dia) {
  if (!dia) return false;
  const hoy = new Date().toISOString().slice(0, 10);
  return (
    hoy ===
    formatFechaCalendario(
      mesActual.value.getFullYear(),
      mesActual.value.getMonth(),
      dia,
    )
  );
}

// ── Estado: empleados sin fichar ──────────────────────────────────────────────
const sinFichar = ref([]); // Lista de empleados sin actividad reciente
const diasSinFichar = ref(3); // Umbral de días sin fichar para la alerta
const loadingSinFichar = ref(false);

// ── Estado: ranking semanal ───────────────────────────────────────────────────
const ranking = ref([]);
const loadingRanking = ref(false);

// ── Estado: resumen semanal por empleado ──────────────────────────────────────
const resumenSemanal = ref([]);
const loadingResumen = ref(false);

// ── Helpers de autenticación ──────────────────────────────────────────────────
const token = () => localStorage.getItem("token");
const headers = () => ({ Authorization: `Bearer ${token()}` });

// ── Fetch functions ───────────────────────────────────────────────────────────

/**
 * Carga las estadísticas generales del dashboard.
 * Acepta un rango de fechas opcional para filtrar las gráficas.
 */
async function fetchStats() {
  try {
    loading.value = true;
    const params =
      fechaDesde.value && fechaHasta.value
        ? `?desde=${fechaDesde.value}&hasta=${fechaHasta.value}`
        : "";
    const { data } = await axios.get(`${API}/dashboard/stats${params}`, {
      headers: headers(),
    });
    stats.value = data;
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
}

/**
 * Carga los fichajes del día seleccionado en el calendario.
 */
async function fetchCalendario() {
  try {
    loadingCalendario.value = true;
    const { data } = await axios.get(
      `${API}/dashboard/calendario?fecha=${calendarioFecha.value}`,
      { headers: headers() },
    );
    calendarioData.value = data;
  } catch (err) {
    console.error(err);
  } finally {
    loadingCalendario.value = false;
  }
}

/**
 * Carga los empleados activos que llevan más de `diasSinFichar` días sin actividad.
 */
async function fetchSinFichar() {
  try {
    loadingSinFichar.value = true;
    const { data } = await axios.get(
      `${API}/dashboard/sin-fichar?dias=${diasSinFichar.value}`,
      { headers: headers() },
    );
    sinFichar.value = data;
  } catch (err) {
    console.error(err);
  } finally {
    loadingSinFichar.value = false;
  }
}

/**
 * Carga el ranking de horas trabajadas en la semana actual.
 */
async function fetchRanking() {
  try {
    loadingRanking.value = true;
    const { data } = await axios.get(`${API}/dashboard/ranking`, {
      headers: headers(),
    });
    ranking.value = data;
  } catch (err) {
    console.error(err);
  } finally {
    loadingRanking.value = false;
  }
}

/**
 * Carga el resumen semanal de horas para cada empleado activo.
 * Hace una petición por empleado en paralelo con Promise.all.
 * Descarta resultados con nombre inválido o peticiones fallidas.
 */
async function fetchResumenSemanal() {
  try {
    loadingResumen.value = true;
    const { data: empleados } = await axios.get(`${API}/empleados`, {
      headers: headers(),
    });
    const activos = empleados.filter((e) => e.activo);
    const resultados = await Promise.all(
      activos.map((e) =>
        axios
          .get(`${API}/empleados/${e.id}/horas`, { headers: headers() })
          .then((r) => {
            // Guardia: descartar si el empleado no tiene nombre válido
            if (!e.nombre) return null;
            return { ...r.data, nombre: e.nombre, cargo: e.cargo };
          })
          .catch(() => null),
      ),
    );
    resumenSemanal.value = resultados.filter(Boolean);
  } catch (err) {
    console.error(err);
  } finally {
    loadingResumen.value = false;
  }
}

/**
 * Lanza todas las peticiones del dashboard en paralelo y actualiza
 * el indicador de última actualización con flash verde de feedback.
 */
async function refrescarTodo() {
  loadingRefresh.value = true;
  await Promise.all([
    fetchStats(),
    fetchCalendario(),
    fetchSinFichar(),
    fetchRanking(),
    fetchResumenSemanal(),
  ]);
  ultimaActualizacion.value = new Date().toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
  loadingRefresh.value = false;
  flashVerde.value = true;
  setTimeout(() => {
    flashVerde.value = false;
  }, 1500);
}

// ── Computed: datos para Chart.js ─────────────────────────────────────────────

/**
 * Dataset para la gráfica de fichajes por hora del día actual.
 * Usa optional chaining para evitar crashes si stats aún no ha cargado.
 */
const chartPorHoras = computed(() => ({
  labels: stats.value?.por_horas?.map((h) => `${h.hora}:00`) || [],
  datasets: [
    {
      label: "Fichajes",
      data: stats.value?.por_horas?.map((h) => h.total) || [],
      backgroundColor: "rgba(99,102,241,0.15)",
      borderColor: "rgba(99,102,241,1)",
      borderWidth: 2,
      fill: true,
      tension: 0.4,
      pointBackgroundColor: "rgba(99,102,241,1)",
    },
  ],
}));

/**
 * Dataset para la gráfica de fichajes por día (últimos 7 días o rango personalizado).
 * Usa optional chaining para evitar crashes si stats aún no ha cargado.
 */
const chartPorDias = computed(() => ({
  labels:
    stats.value?.por_dias?.map((d) =>
      new Date(d.dia).toLocaleDateString("es-ES", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
      }),
    ) || [],
  datasets: [
    {
      label: "Fichajes",
      data: stats.value?.por_dias?.map((d) => d.total) || [],
      backgroundColor: "rgba(16,185,129,0.7)",
      borderRadius: 8,
      borderSkipped: false,
    },
  ],
}));

/** Opciones compartidas para ambas gráficas de Chart.js. */
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { stepSize: 1 },
      grid: { color: "rgba(0,0,0,0.05)" },
    },
    x: { grid: { display: false } },
  },
};

// ── Helpers de estilos dinámicos ──────────────────────────────────────────────

/**
 * Clase de color de texto según la diferencia de horas.
 * Verde >= 0, ámbar entre -2 y 0, rojo < -2.
 */
function colorDiff(diff) {
  if (diff >= 0) return "text-emerald-500";
  if (diff >= -2) return "text-amber-500";
  return "text-rose-500";
}

/**
 * Clase de color de fondo y borde según la diferencia de horas.
 * Verde >= 0, ámbar entre -2 y 0, rojo < -2.
 */
function bgDiff(diff) {
  if (diff >= 0) return "bg-emerald-50 border-emerald-100";
  if (diff >= -2) return "bg-amber-50 border-amber-100";
  return "bg-rose-50 border-rose-100";
}

/** Formatea una hora HH:mm:ss a HH:mm. Devuelve "—" si no hay valor. */
function formatHora(val) {
  if (!val) return "—";
  return String(val).slice(0, 5);
}

/** Formatea una fecha como "mes de año" en español. */
function nombreMes(fecha) {
  return fecha.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

// ── Formulario de empleados ───────────────────────────────────────────────────
const mostrarCambiarPassword = ref(false);
const credencialesNuevas = ref(null); // Credenciales del empleado recién creado

const { crearEmpleado, editarEmpleado } = useEmployees();
const {
  mostrarFormulario,
  modoEdicion,
  formData,
  erroresCampo,
  tocados,
  validarFormulario,
  abrirNuevo,
  abrirEditar,
  cerrarFormulario,
  claseCampo,
  marcarTocado,
} = useEmployeeForm();

/**
 * Guarda el empleado (crear o editar) tras validar el formulario.
 * Si es creación, guarda las credenciales para mostrarlas al admin.
 */
async function guardarEmpleado() {
  if (!validarFormulario()) return;
  if (modoEdicion.value) {
    await editarEmpleado(formData.value.id, formData.value);
    cerrarFormulario();
  } else {
    const emailEmpleado = formData.value.email;
    const dniEmpleado = formData.value.dni;
    await crearEmpleado(formData.value);
    cerrarFormulario();
    credencialesNuevas.value = { email: emailEmpleado, password: dniEmpleado };
  }
}

// ── Ciclo de vida ─────────────────────────────────────────────────────────────
onMounted(() => {
  // Inicializar el filtro de fechas con los últimos 7 días
  const hoy = new Date();
  const hace7 = new Date();
  hace7.setDate(hoy.getDate() - 6);
  fechaHasta.value = hoy.toISOString().slice(0, 10);
  fechaDesde.value = hace7.toISOString().slice(0, 10);
  refrescarTodo();
});
</script>

<template>
  <AdminLayout @abrir-nuevo="abrirNuevo">
    <div class="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <!-- Cabecera: título y botón de refresco manual -->
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2
            class="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 italic"
          >
            Dashboard
          </h2>
          <p class="text-slate-400 mt-1 hidden sm:block">
            Resumen de presencia en tiempo real
          </p>
        </div>
        <div class="flex items-center gap-2">
          <!-- Indicador de última actualización con flash verde -->
          <span
            v-if="ultimaActualizacion"
            class="text-xs font-medium transition-colors duration-700 hidden sm:inline"
            :class="flashVerde ? 'text-emerald-500' : 'text-slate-400'"
          >
            Actualizado {{ ultimaActualizacion }}
          </span>
          <button
            @click="refrescarTodo"
            :disabled="loadingRefresh"
            class="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-600 font-bold text-sm rounded-xl transition-all cursor-pointer"
          >
            <span
              :class="loadingRefresh ? 'animate-spin' : ''"
              class="inline-block text-base"
              >↻</span
            >
            <span class="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      <!-- Tarjetas resumen: solo visibles cuando stats ha cargado -->
      <div
        v-if="!loading && stats"
        class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6"
      >
        <div
          class="bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm"
        >
          <p
            class="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2"
          >
            Total empleados
          </p>
          <p class="text-3xl sm:text-4xl font-black text-slate-900">
            {{ stats.total }}
          </p>
          <div class="mt-3 w-8 h-1 bg-indigo-600 rounded-full"></div>
        </div>
        <div
          class="bg-emerald-500 rounded-3xl p-4 sm:p-6 shadow-sm shadow-emerald-200"
        >
          <p
            class="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-2"
          >
            Dentro ahora
          </p>
          <p class="text-3xl sm:text-4xl font-black text-white">
            {{ stats.dentro }}
          </p>
          <div class="mt-3 w-8 h-1 bg-white/40 rounded-full"></div>
        </div>
        <div
          class="bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm"
        >
          <p
            class="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2"
          >
            Fuera ahora
          </p>
          <p class="text-3xl sm:text-4xl font-black text-slate-900">
            {{ stats.fuera }}
          </p>
          <div class="mt-3 w-8 h-1 bg-slate-200 rounded-full"></div>
        </div>
        <div
          class="bg-indigo-600 rounded-3xl p-4 sm:p-6 shadow-sm shadow-indigo-200"
        >
          <p
            class="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-2"
          >
            Fichajes hoy
          </p>
          <p class="text-3xl sm:text-4xl font-black text-white">
            {{ stats.fichajes_hoy }}
          </p>
          <div class="mt-3 w-8 h-1 bg-white/40 rounded-full"></div>
        </div>
      </div>

      <!-- Gráficas de actividad con filtro de fechas personalizable -->
      <div
        class="bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm"
      >
        <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h3 class="font-bold text-slate-900">Actividad de fichajes</h3>
            <p class="text-slate-400 text-xs hidden sm:block">
              Filtra por rango de fechas o ve los últimos 7 días
            </p>
          </div>
          <!-- Selector de rango de fechas -->
          <div class="flex items-center gap-2 flex-wrap">
            <input
              v-model="fechaDesde"
              type="date"
              class="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 transition-colors"
            />
            <span class="text-slate-400 text-sm">—</span>
            <input
              v-model="fechaHasta"
              type="date"
              class="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 transition-colors"
            />
            <button
              @click="fetchStats"
              class="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              Filtrar
            </button>
            <!-- Botón limpiar solo visible si hay fechas seleccionadas -->
            <button
              v-if="fechaDesde || fechaHasta"
              @click="
                fechaDesde = '';
                fechaHasta = '';
                fetchStats();
              "
              class="bg-slate-100 text-slate-500 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Limpiar
            </button>
          </div>
        </div>

        <!-- Estado de carga -->
        <div
          v-if="loading"
          class="flex justify-center py-12 animate-pulse text-indigo-600 font-bold"
        >
          Cargando...
        </div>

        <!-- Gráficas: solo cuando stats tiene datos -->
        <div v-else-if="stats" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p class="text-sm font-bold text-slate-700 mb-3">
              Fichajes por hora (hoy)
            </p>
            <div class="h-48">
              <Bar
                v-if="stats?.por_horas?.length"
                :data="chartPorHoras"
                :options="chartOptions"
              />
              <div
                v-else
                class="h-full flex items-center justify-center text-slate-300 text-sm"
              >
                Sin fichajes hoy
              </div>
            </div>
          </div>
          <div>
            <p class="text-sm font-bold text-slate-700 mb-3">
              Fichajes por día
              <span
                v-if="fechaDesde && fechaHasta"
                class="text-indigo-500 font-normal text-xs ml-1"
                >(rango seleccionado)</span
              >
              <span v-else class="text-slate-400 font-normal text-xs ml-1"
                >(últimos 7 días)</span
              >
            </p>
            <div class="h-48">
              <Bar
                v-if="stats?.por_dias?.length"
                :data="chartPorDias"
                :options="chartOptions"
              />
              <div
                v-else
                class="h-full flex items-center justify-center text-slate-300 text-sm"
              >
                Sin datos
              </div>
            </div>
          </div>
        </div>

        <!-- Error de carga de stats -->
        <div v-else class="text-center py-12 text-slate-300 text-sm">
          No se pudieron cargar los datos
        </div>
      </div>

      <!-- Calendario interactivo + fichajes del día seleccionado -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Calendario mensual con navegación -->
        <div
          class="bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm"
        >
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-slate-900 flex items-center gap-2">
              <CalendarDays class="w-4 h-4 text-indigo-500" /> Calendario
            </h3>
            <div class="flex items-center gap-1">
              <button
                @click="cambiarMes(-1)"
                class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer transition-colors"
              >
                <ChevronLeft class="w-4 h-4" />
              </button>
              <span class="text-xs font-bold text-slate-600 px-2 capitalize">{{
                nombreMes(mesActual)
              }}</span>
              <button
                @click="cambiarMes(1)"
                class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer transition-colors"
              >
                <ChevronRight class="w-4 h-4" />
              </button>
            </div>
          </div>
          <!-- Cabecera de días de la semana -->
          <div class="grid grid-cols-7 mb-2">
            <div
              v-for="d in ['L', 'M', 'X', 'J', 'V', 'S', 'D']"
              :key="d"
              class="text-center text-xs font-bold text-slate-400 py-1"
            >
              {{ d }}
            </div>
          </div>
          <!-- Celdas del mes: null = celda vacía de alineación -->
          <div class="grid grid-cols-7 gap-1">
            <div
              v-for="(dia, i) in diasCalendario"
              :key="i"
              @click="seleccionarDia(dia)"
              :class="[
                'h-9 flex items-center justify-center rounded-xl text-sm font-medium transition-all',
                !dia ? '' : 'cursor-pointer',
                esDiaSeleccionado(dia)
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : esHoy(dia)
                    ? 'bg-indigo-50 text-indigo-600 font-bold'
                    : dia
                      ? 'hover:bg-slate-100 text-slate-600'
                      : '',
              ]"
            >
              {{ dia || "" }}
            </div>
          </div>
        </div>

        <!-- Fichajes del día seleccionado -->
        <div
          class="bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm flex flex-col"
        >
          <h3 class="font-bold text-slate-900 mb-1">
            Fichajes del
            {{
              new Date(calendarioFecha + "T12:00:00").toLocaleDateString(
                "es-ES",
                { weekday: "long", day: "2-digit", month: "long" },
              )
            }}
          </h3>
          <p class="text-slate-400 text-xs mb-4">
            Empleados que registraron actividad
          </p>
          <div
            v-if="loadingCalendario"
            class="flex-1 flex items-center justify-center animate-pulse text-indigo-600 text-sm font-bold"
          >
            Cargando...
          </div>
          <div
            v-else-if="calendarioData.length === 0"
            class="flex-1 flex items-center justify-center text-slate-300 text-sm"
          >
            Sin fichajes ese día
          </div>
          <div v-else class="space-y-2 overflow-y-auto flex-1 max-h-64">
            <div
              v-for="emp in calendarioData"
              :key="emp.id"
              class="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3"
            >
              <div
                class="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
              >
                <!-- FIX: optional chaining para evitar crash si nombre es undefined -->
                {{ emp.nombre?.charAt(0) ?? "?" }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-bold text-slate-800 text-sm truncate">
                  {{ emp.nombre }}
                </p>
                <p class="text-slate-400 text-xs truncate">{{ emp.cargo }}</p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-xs font-bold text-emerald-600">
                  {{ formatHora(emp.primera_entrada) }}
                </p>
                <p class="text-xs text-slate-400">
                  {{ formatHora(emp.ultima_salida) }}
                </p>
              </div>
              <span
                class="text-[10px] font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded-lg"
              >
                {{ emp.total_fichajes }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Ranking semanal + alertas de sin fichar -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Ranking: ordenado por horas trabajadas esta semana -->
        <div
          class="bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm"
        >
          <h3 class="font-bold text-slate-900 mb-1 flex items-center gap-2">
            <Trophy class="w-4 h-4 text-amber-400" /> Ranking horas esta semana
          </h3>
          <p class="text-slate-400 text-xs mb-4">
            Ordenado por horas trabajadas
          </p>
          <div
            v-if="loadingRanking"
            class="text-center py-6 animate-pulse text-indigo-600 text-sm font-bold"
          >
            Cargando...
          </div>
          <div
            v-else-if="ranking.length === 0"
            class="text-center py-6 text-slate-300 text-sm"
          >
            Sin datos
          </div>
          <div v-else class="space-y-2 max-h-72 overflow-y-auto">
            <div
              v-for="(emp, idx) in ranking"
              :key="emp.id"
              class="flex items-center gap-3 rounded-2xl px-4 py-3 border"
              :class="bgDiff(emp.diferencia)"
            >
              <!-- Posición: colores especiales para el podio -->
              <span
                class="text-xs font-black w-5 text-center"
                :class="
                  idx === 0
                    ? 'text-amber-500'
                    : idx === 1
                      ? 'text-slate-400'
                      : idx === 2
                        ? 'text-orange-400'
                        : 'text-slate-300'
                "
              >
                {{ idx + 1 }}
              </span>
              <div class="flex-1 min-w-0">
                <p class="font-bold text-slate-800 text-sm truncate">
                  {{ emp.nombre }}
                </p>
                <p class="text-slate-400 text-xs truncate">{{ emp.cargo }}</p>
              </div>
              <div class="text-right shrink-0">
                <p class="font-black text-slate-900 text-sm">
                  {{ emp.horas_trabajadas
                  }}<span class="text-xs font-medium text-slate-400">h</span>
                </p>
                <p class="text-xs font-bold" :class="colorDiff(emp.diferencia)">
                  {{ emp.diferencia > 0 ? "+" : "" }}{{ emp.diferencia }}h
                </p>
              </div>
              <!-- Icono de tendencia según diferencia -->
              <component
                :is="emp.diferencia >= 0 ? TrendingUp : TrendingDown"
                class="w-4 h-4 shrink-0"
                :class="colorDiff(emp.diferencia)"
              />
            </div>
          </div>
        </div>

        <!-- Alertas: empleados sin fichar en los últimos N días -->
        <div
          class="bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm"
        >
          <div class="flex items-center justify-between mb-1">
            <h3 class="font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle class="w-4 h-4 text-amber-400" /> Sin fichar
            </h3>
            <!-- Selector de umbral de días -->
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-400">Más de</span>
              <select
                v-model.number="diasSinFichar"
                @change="fetchSinFichar"
                class="border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:border-indigo-400 cursor-pointer"
              >
                <option :value="1">1 día</option>
                <option :value="2">2 días</option>
                <option :value="3">3 días</option>
                <option :value="5">5 días</option>
                <option :value="7">7 días</option>
              </select>
            </div>
          </div>
          <p class="text-slate-400 text-xs mb-4">
            Empleados activos sin actividad reciente
          </p>
          <div
            v-if="loadingSinFichar"
            class="text-center py-6 animate-pulse text-indigo-600 text-sm font-bold"
          >
            Cargando...
          </div>
          <div
            v-else-if="sinFichar.length === 0"
            class="text-center py-6 text-emerald-500 text-sm font-bold"
          >
            ✓ Todos han fichado recientemente
          </div>
          <div v-else class="space-y-2 max-h-72 overflow-y-auto">
            <div
              v-for="emp in sinFichar"
              :key="emp.id"
              class="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3"
            >
              <div
                class="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 text-xs font-bold shrink-0"
              >
                <!-- FIX: optional chaining para evitar crash si nombre es undefined -->
                {{ emp.nombre?.charAt(0) ?? "?" }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-bold text-slate-800 text-sm truncate">
                  {{ emp.nombre }}
                </p>
                <p class="text-slate-400 text-xs">
                  {{ emp.cargo }} · {{ emp.departamento }}
                </p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-xs font-black text-amber-600">
                  {{
                    emp.dias_sin_fichar === null ? "∞" : emp.dias_sin_fichar
                  }}
                  días
                </p>
                <p class="text-[10px] text-slate-400">
                  {{
                    emp.ultimo_fichaje
                      ? new Date(emp.ultimo_fichaje).toLocaleDateString("es-ES")
                      : "Nunca"
                  }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Resumen semanal de horas por empleado -->
      <div
        class="bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm"
      >
        <h3 class="font-bold text-slate-900 mb-1">
          Resumen semanal por empleado
        </h3>
        <p class="text-slate-400 text-xs mb-5">
          Horas trabajadas vs esperadas esta semana
        </p>
        <div
          v-if="loadingResumen"
          class="text-center py-8 animate-pulse text-indigo-600 font-bold"
        >
          Cargando...
        </div>
        <div
          v-else-if="resumenSemanal.length === 0"
          class="text-center py-8 text-slate-300 text-sm"
        >
          Sin datos
        </div>
        <div
          v-else
          class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          <div
            v-for="emp in resumenSemanal"
            :key="emp.nombre"
            class="border rounded-2xl p-4"
            :class="bgDiff(emp.diferencia_total)"
          >
            <div class="flex items-center justify-between mb-3">
              <div>
                <p class="font-bold text-slate-800 text-sm">{{ emp.nombre }}</p>
                <p class="text-slate-400 text-xs">{{ emp.cargo }}</p>
              </div>
              <span
                class="text-sm font-black"
                :class="colorDiff(emp.diferencia_total)"
              >
                {{ emp.diferencia_total > 0 ? "+" : ""
                }}{{ emp.diferencia_total }}h
              </span>
            </div>
            <!-- Barra de progreso: color según déficit o superávit -->
            <div class="h-2 bg-white/70 rounded-full overflow-hidden mb-2">
              <div
                class="h-full rounded-full transition-all"
                :class="
                  emp.diferencia_total >= 0
                    ? 'bg-emerald-500'
                    : emp.diferencia_total >= -2
                      ? 'bg-amber-400'
                      : 'bg-rose-400'
                "
                :style="{
                  width:
                    Math.min(
                      (emp.total_trabajadas / emp.total_esperadas) * 100,
                      100,
                    ) + '%',
                }"
              ></div>
            </div>
            <div class="flex justify-between text-xs text-slate-500">
              <span>{{ emp.total_trabajadas }}h trabajadas</span>
              <span>{{ emp.total_esperadas }}h esperadas</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Formulario de creación / edición de empleado -->
    <EmployeeForm
      v-if="mostrarFormulario"
      :formData="formData"
      :erroresCampo="erroresCampo"
      :tocados="tocados"
      :modoEdicion="modoEdicion"
      :claseCampo="claseCampo"
      :marcarTocado="marcarTocado"
      @guardar="guardarEmpleado"
      @cancelar="cerrarFormulario"
    />

    <!-- Modal de credenciales del empleado recién creado -->
    <div
      v-if="credencialesNuevas"
      class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div class="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl">
        <div
          class="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4"
        >
          <span class="text-emerald-600 text-xl font-bold">✓</span>
        </div>
        <h2 class="text-xl font-bold text-slate-900 mb-1">Empleado creado</h2>
        <p class="text-slate-400 text-sm mb-6">
          Comparte estas credenciales con el empleado
        </p>
        <div class="space-y-3 text-sm">
          <div
            class="bg-slate-50 rounded-2xl px-4 py-3 flex justify-between items-center gap-2"
          >
            <span class="text-slate-400 font-medium shrink-0">Email</span>
            <span class="text-slate-700 font-bold truncate">{{
              credencialesNuevas.email
            }}</span>
          </div>
          <div
            class="bg-slate-50 rounded-2xl px-4 py-3 flex justify-between items-center gap-2"
          >
            <span class="text-slate-400 font-medium shrink-0">Contraseña</span>
            <span class="text-slate-700 font-bold">{{
              credencialesNuevas.password
            }}</span>
          </div>
        </div>
        <button
          @click="credencialesNuevas = null"
          class="mt-6 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-colors cursor-pointer"
        >
          Entendido
        </button>
      </div>
    </div>
  </AdminLayout>
</template>
