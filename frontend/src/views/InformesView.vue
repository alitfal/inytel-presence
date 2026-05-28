<script setup>
import { ref, computed, onMounted } from "vue";
import { FileText, Download, Filter, Users, Calendar } from "lucide-vue-next";
import AdminLayout from "../components/AdminLayout.vue";
import axios from "axios";

// ── Filtros ───────────────────────────────────────────────────────────────────
const empleados = ref([]);
const empleadoSeleccionado = ref("todos");
const formato = ref("excel");
const periodoRapido = ref("este-mes");
const desde = ref("");
const hasta = ref("");
const cargando = ref(false);
const error = ref("");

// ── Períodos rápidos ──────────────────────────────────────────────────────────
const periodosRapidos = [
    { label: "Este mes", value: "este-mes" },
    { label: "Mes anterior", value: "mes-anterior" },
    { label: "Últimos 3 meses", value: "3-meses" },
    { label: "Este año", value: "este-año" },
    { label: "Personalizado", value: "personalizado" },
];

function calcularPeriodo(periodo) {
    const hoy = new Date();
    const fmt = (d) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    switch (periodo) {
        case "este-mes":
            return {
                desde: fmt(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
                hasta: fmt(hoy),
            };
        case "mes-anterior": {
            const primerDia = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
            const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
            return { desde: fmt(primerDia), hasta: fmt(ultimoDia) };
        }
        case "3-meses":
            return {
                desde: fmt(new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1)),
                hasta: fmt(hoy),
            };
        case "este-año":
            return {
                desde: fmt(new Date(hoy.getFullYear(), 0, 1)),
                hasta: fmt(hoy),
            };
        default:
            return { desde: desde.value, hasta: hasta.value };
    }
}

const periodoActual = computed(() => calcularPeriodo(periodoRapido.value));

// ── Formato de visualización de fechas ───────────────────────────────────────
const fmtMostrar = (fecha) => {
  if (!fecha) return "";
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
};

// ── Cargar empleados ──────────────────────────────────────────────────────────
onMounted(async () => {
    try {
        const { data } = await axios.get("/api/empleados");
        empleados.value = data;
    } catch {
        error.value = "Error al cargar los empleados";
    }
});

// ── Descargar informe ─────────────────────────────────────────────────────────
async function descargarInforme() {
    cargando.value = true;
    error.value = "";
    try {
        const { desde: d, hasta: h } = periodoActual.value;
        const params = new URLSearchParams({
            formato: formato.value,
            empleado_id: empleadoSeleccionado.value,
            desde: d,
            hasta: h,
        });

        const response = await axios.get(`/api/exportacion/informe?${params}`, {
            responseType: "blob",
        });

        const ext = formato.value === "excel" ? "xlsx" : "pdf";
        const url = URL.createObjectURL(response.data);
        const a = document.createElement("a");
        a.href = url;
        a.download = `informe-jornada-${d}-${h}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
    } catch {
        error.value = "Error al generar el informe";
    } finally {
        cargando.value = false;
    }
}
</script>

<template>
    <AdminLayout>
        <div class="p-6 max-w-4xl mx-auto">

            <!-- Cabecera -->
            <div class="mb-8">
                <div class="flex items-center gap-3 mb-2">
                    <div
                        class="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                        <FileText class="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 class="text-2xl font-black text-slate-900">Informes</h1>
                        <p class="text-sm text-slate-400">Exporta registros de jornada laboral</p>
                    </div>
                </div>
            </div>

            <!-- Panel de filtros -->
            <div class="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-6">
                <div class="flex items-center gap-2 mb-5">
                    <Filter class="w-4 h-4 text-indigo-600" />
                    <h2 class="text-sm font-bold text-slate-900 uppercase tracking-wider">Filtros</h2>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">

                    <!-- Empleado -->
                    <div>
                        <label class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                            <Users class="w-3 h-3 inline mr-1" />Empleado
                        </label>
                        <select v-model="empleadoSeleccionado"
                            class="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors bg-white">
                            <option value="todos">Todos los empleados</option>
                            <option v-for="emp in empleados" :key="emp.id" :value="emp.id">
                                {{ emp.nombre }} — {{ emp.cargo }}
                            </option>
                        </select>
                    </div>

                    <!-- Formato -->
                    <div>
                        <label class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                            <FileText class="w-3 h-3 inline mr-1" />Formato
                        </label>
                        <div class="flex gap-3">
                            <button v-for="f in [{ label: 'Excel', value: 'excel' }, { label: 'PDF', value: 'pdf' }]"
                                :key="f.value" @click="formato = f.value"
                                class="flex-1 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer" :class="formato === f.value
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'">
                                {{ f.label }}
                            </button>
                        </div>
                    </div>

                    <!-- Período rápido -->
                    <div class="md:col-span-2">
                        <label class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                            <Calendar class="w-3 h-3 inline mr-1" />Período
                        </label>
                        <div class="flex flex-wrap gap-2">
                            <button v-for="p in periodosRapidos" :key="p.value" @click="periodoRapido = p.value"
                                class="px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer" :class="periodoRapido === p.value
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'">
                                {{ p.label }}
                            </button>
                        </div>
                    </div>

                    <!-- Fechas personalizadas -->
                    <template v-if="periodoRapido === 'personalizado'">
                        <div>
                            <label
                                class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Desde</label>
                            <input type="date" v-model="desde"
                                class="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors" />
                        </div>
                        <div>
                            <label
                                class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Hasta</label>
                            <input type="date" v-model="hasta"
                                class="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors" />
                        </div>
                    </template>

                </div>
            </div>

            <!-- Resumen y botón de descarga -->
            <div class="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <div class="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <p class="text-sm font-bold text-slate-900">
                            {{empleadoSeleccionado === 'todos' ? 'Todos los empleados' : empleados.find(e => e.id ==
                                empleadoSeleccionado)?.nombre}}
                        </p>
                        <p class="text-xs text-slate-400 mt-0.5">
                            {{ fmtMostrar(periodoActual.desde) }} → {{ fmtMostrar(periodoActual.hasta) }} · {{ formato.toUpperCase() }}
                        </p>
                    </div>

                    <button @click="descargarInforme" :disabled="cargando"
                        class="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                        <Download class="w-4 h-4" />
                        {{ cargando ? 'Generando...' : 'Descargar informe' }}
                    </button>
                </div>

                <p v-if="error" class="mt-3 text-sm text-rose-500">{{ error }}</p>
            </div>

        </div>
    </AdminLayout>
</template>