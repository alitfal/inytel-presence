<script setup>
/**
 * @component MiControlHorarioView
 * @description Vista personal del empleado para consultar su control horario mensual.
 *              Muestra balance de horas, horas extra y desglose día a día
 *              con horas trabajadas vs planificadas, inspirado en Factorial HR.
 */
import { ref, computed, onMounted } from "vue";
import { ChevronLeft, ChevronRight, Clock, KeyRound } from "lucide-vue-next";
import { useAuth } from "../composables/useAuth";
import { useRouter } from "vue-router";
import CambiarPasswordModal from "../components/CambiarPasswordModal.vue";
import IncidenciaModal from "../components/IncidenciaModal.vue";
import axios from "axios";

const router = useRouter();
const { usuario, logout } = useAuth();

// ── Estado ────────────────────────────────────────────────────────────────────
const datos = ref(null);               // Datos del mes cargados desde la API
const loading = ref(true);             // Estado de carga
const error = ref(null);               // Mensaje de error si falla la API
const mesActual = ref(new Date().toISOString().slice(0, 7)); // Mes activo YYYY-MM
const mostrarCambiarPassword = ref(false);
const incidenciaPendiente = ref(null); // Jornada sin cerrar pendiente

// ── Nombres de días ───────────────────────────────────────────────────────────
const nombresDia = ["", "lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

// ── Navegación de mes ─────────────────────────────────────────────────────────

/** Retrocede un mes y recarga los datos. */
function mesAnterior() {
    const [a, m] = mesActual.value.split("-").map(Number);
    const d = new Date(a, m - 2, 1);
    mesActual.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    cargar();
}

/** Avanza un mes si no estamos ya en el mes actual. */
function mesSiguiente() {
    const [a, m] = mesActual.value.split("-").map(Number);
    const d = new Date(a, m, 1);
    const hoy = new Date();
    const limite = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
    const siguiente = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (siguiente <= limite) { mesActual.value = siguiente; cargar(); }
}

/** True si el mes activo es el mes en curso. */
const esMesActual = computed(() => {
    const hoy = new Date();
    return mesActual.value === `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
});

/** Etiqueta legible del mes activo: "mayo 2026". */
const etiquetaMes = computed(() => {
    const [a, m] = mesActual.value.split("-").map(Number);
    return new Date(a, m - 1, 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
});

// ── Formateo ──────────────────────────────────────────────────────────────────

/** Formatea minutos como "Xh YYm" (sin signo). */
function formatMin(min) {
    const abs = Math.abs(min);
    return `${Math.floor(abs / 60)}h ${String(abs % 60).padStart(2, "0")}m`;
}

/** Formatea minutos como balance con signo: "+2h 30m" o "-1h 00m". */
function formatBalance(min) {
    const h = Math.floor(Math.abs(min) / 60);
    const m = String(Math.abs(min) % 60).padStart(2, "0");
    return `${min >= 0 ? "+" : "-"}${h}h ${m}m`;
}

// ── API ───────────────────────────────────────────────────────────────────────

/** Carga el desglose mensual del empleado autenticado. */
async function cargar() {
    loading.value = true;
    error.value = null;
    try {
        const token = localStorage.getItem("token");
        const id = usuario.value.empleado_id;
        const { data } = await axios.get(
            `/api/control-horario/empleado/${id}/mensual?mes=${mesActual.value}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        datos.value = data;
    } catch (err) {
        error.value = err.response?.data?.error || "Error al cargar datos";
    } finally {
        loading.value = false;
    }
}

/**
 * Comprueba si hay una jornada sin cerrar del día anterior.
 * Si la hay, guarda los datos para mostrar el modal de incidencia.
 */
async function checkIncidencia() {
    try {
        const token = localStorage.getItem("token");
        const { data } = await axios.get(
            `/api/fichajes/pendiente/${usuario.value.empleado_id}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        if (data.pendiente) incidenciaPendiente.value = data;
    } catch { }
}

/** Cierra la sesión y redirige al login. */
function handleLogout() {
    logout();
    router.push("/login");
}

// ── Ciclo de vida ─────────────────────────────────────────────────────────────
onMounted(async () => {
    await cargar();
    await checkIncidencia();
});
</script>

<template>
    <div class="min-h-screen bg-slate-50 font-sans antialiased text-slate-900 pb-20">

        <!-- Header: logo, botón volver, cambiar contraseña y cerrar sesión -->
        <div class="bg-white border-b border-slate-100 px-6 py-4">
            <div class="max-w-5xl mx-auto flex justify-between items-center">
                <div class="flex items-center gap-3">
                    <div
                        class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-200 shadow-lg">
                        <span class="text-white font-black text-xl italic">I</span>
                    </div>
                    <h1 class="text-xl font-extrabold tracking-tighter">
                        INYTEL <span class="text-indigo-600 font-light ml-1">| Presence</span>
                    </h1>
                </div>
                <div class="flex gap-2">
                    <button @click="router.push('/perfil')"
                        class="border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 text-slate-400 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer">
                        ← Perfil
                    </button>
                    <button @click="mostrarCambiarPassword = true"
                        class="border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 text-slate-400 p-2.5 rounded-xl transition-all cursor-pointer">
                        <KeyRound class="w-4 h-4" />
                    </button>
                    <button @click="handleLogout"
                        class="bg-rose-50 hover:bg-rose-100 text-rose-500 px-5 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer">
                        Salir
                    </button>
                </div>
            </div>
        </div>

        <main class="max-w-5xl mx-auto px-4 sm:px-6 py-6">

            <!-- Título + navegación de mes -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div class="flex items-center gap-3">
                    <div
                        class="w-9 h-9 bg-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-rose-200">
                        <Clock class="w-4 h-4 text-white" />
                    </div>
                    <h2 class="text-xl font-bold text-slate-900">Mi control horario</h2>
                </div>
                <div class="flex items-center gap-2">
                    <button @click="mesAnterior"
                        class="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer">
                        <ChevronLeft class="w-4 h-4" />
                    </button>
                    <span class="text-sm font-bold text-slate-900 capitalize min-w-32 text-center">{{ etiquetaMes
                    }}</span>
                    <button @click="mesSiguiente" :disabled="esMesActual"
                        class="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                        <ChevronRight class="w-4 h-4" />
                    </button>
                </div>
            </div>

            <!-- Estado de carga -->
            <div v-if="loading" class="flex justify-center py-20 text-indigo-600 font-bold animate-pulse text-sm">
                Cargando...
            </div>

            <!-- Error -->
            <div v-else-if="error"
                class="bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl px-6 py-4 text-sm font-medium text-center">
                {{ error }}
            </div>

            <template v-else-if="datos">

                <!-- Tarjetas resumen: Balance y Horas extra -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">

                    <!-- Balance -->
                    <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                        <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Balance</p>
                        <p class="text-xs text-slate-400 mb-4">
                            {{ datos.resumen.balance_positivo
                                ? '¡Al día! Has trabajado las horas planificadas.'
                                : 'Has trabajado menos horas de las planificadas.' }}
                        </p>
                        <p class="text-4xl font-black font-mono"
                            :class="datos.resumen.balance_positivo ? 'text-emerald-500' : 'text-rose-500'">
                            {{ datos.resumen.balance }}
                        </p>
                    </div>

                    <!-- Horas extra -->
                    <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                        <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Horas extra</p>
                        <p class="text-xs text-slate-400 mb-4">
                            {{ datos.resumen.horas_extra_min === 0
                                ? '¡Todo va bien! No hay horas extra durante este periodo.'
                                : 'Tienes horas extra acumuladas este mes.' }}
                        </p>
                        <p class="text-4xl font-black font-mono text-slate-900">
                            {{ formatMin(datos.resumen.horas_extra_min) }}
                        </p>
                    </div>
                </div>

                <!-- Estado del periodo -->
                <div class="flex items-center gap-3 mb-4 flex-wrap">
                    <span class="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-lg"
                        :class="esMesActual ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'">
                        <span class="w-1.5 h-1.5 rounded-full"
                            :class="esMesActual ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'"></span>
                        {{ esMesActual ? 'En progreso' : 'Periodo cerrado' }}
                    </span>
                    <span class="text-xs text-slate-400">
                        {{ esMesActual ? 'Esta hoja de fichajes corresponde a un periodo abierto' : 'Este periodo ya está cerrado' }}
                    </span>
                </div>

                <!-- Tabla desglose día a día -->
                <div class="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">

                    <!-- Cabecera de columnas -->
                    <div
                        class="grid grid-cols-12 gap-2 px-6 py-3 border-b border-slate-100 bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <div class="col-span-2">Día</div>
                        <div class="col-span-4">Trabajadas / Planificadas</div>
                        <div class="col-span-2">Balance</div>
                        <div class="col-span-2">H. extra</div>
                        <div class="col-span-2">Ausencias</div>
                    </div>

                    <!-- Fila por cada día del mes -->
                    <div v-for="dia in datos.dias" :key="dia.fecha"
                        class="grid grid-cols-12 gap-2 px-6 py-3 border-b border-slate-50 items-center text-sm"
                        :class="!dia.es_laborable ? 'bg-slate-50/50 opacity-50' : 'hover:bg-slate-50 transition-colors'">

                        <!-- Día: número + nombre -->
                        <div class="col-span-2">
                            <p class="font-bold text-slate-900 text-sm">
                                {{ new Date(dia.fecha + 'T12:00:00').getDate() }}
                                {{ new Date(dia.fecha + 'T12:00:00').toLocaleDateString('es-ES', { month: 'short' }) }}.
                            </p>
                            <p class="text-xs text-slate-400">{{ nombresDia[dia.dia_semana] }}</p>
                        </div>

                        <!-- Horas trabajadas / planificadas con horario -->
                        <div class="col-span-4">
                            <div class="flex items-center gap-1.5">
                                <Clock class="w-3 h-3 text-slate-300 shrink-0" />
                                <span class="font-mono font-bold text-slate-700 text-xs">{{
                                    formatMin(dia.horas_trabajadas_min) }}</span>
                                <span class="text-slate-300 text-xs">/</span>
                                <span class="font-mono text-slate-400 text-xs">{{ formatMin(dia.horas_planificadas_min)
                                }}</span>
                            </div>
                            <!-- Horario de entrada/salida si fichó -->
                            <p v-if="dia.hora_entrada" class="text-[10px] text-slate-300 mt-0.5 font-mono">
                                {{ dia.hora_entrada }}{{ dia.hora_salida ? ' → ' + dia.hora_salida : ' → en curso' }}
                            </p>
                        </div>

                        <!-- Balance del día -->
                        <div class="col-span-2">
                            <span v-if="dia.es_laborable" class="text-xs font-bold font-mono"
                                :class="dia.balance_min >= 0 ? 'text-emerald-600' : 'text-rose-500'">
                                {{ formatBalance(dia.balance_min) }}
                            </span>
                            <span v-else class="text-xs text-slate-300">—</span>
                        </div>

                        <!-- Horas extra del día -->
                        <div class="col-span-2">
                            <span class="text-xs font-mono text-slate-500">
                                {{ dia.horas_extra_min > 0 ? formatMin(dia.horas_extra_min) : '0h 00m' }}
                            </span>
                        </div>

                        <!-- Ausencia si existe -->
                        <div class="col-span-2">
                            <span v-if="dia.ausencia"
                                class="text-[10px] font-bold px-2 py-1 rounded-lg bg-rose-100 text-rose-500 capitalize">
                                {{ dia.ausencia.replace('_', ' ') }}
                            </span>
                            <span v-else-if="dia.incidencia"
                                class="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-500">
                                Incidencia
                            </span>
                        </div>
                    </div>
                </div>
            </template>
        </main>

        <!-- Modal de cambio de contraseña -->
        <CambiarPasswordModal v-if="mostrarCambiarPassword" @cerrar="mostrarCambiarPassword = false" />

        <!-- Modal de incidencia pendiente -->
        <IncidenciaModal v-if="incidenciaPendiente" :fichaje-id="incidenciaPendiente.fichaje_id"
            :fecha-entrada="incidenciaPendiente.fecha_entrada" :hora-entrada="incidenciaPendiente.hora_entrada"
            @resuelta="incidenciaPendiente = null; cargar()" />
    </div>
</template>