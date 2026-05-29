<script setup>
import { ref, computed, onMounted } from "vue";
import { ChevronLeft, ChevronRight, Clock, TrendingUp, TrendingDown, Users } from "lucide-vue-next";
import AdminLayout from "../components/AdminLayout.vue";
import axios from "axios";

const datos = ref(null);
const loading = ref(true);
const error = ref(null);
const mesActual = ref(new Date().toISOString().slice(0, 7));
const filtro = ref("todos");

function mesAnterior() {
    const [a, m] = mesActual.value.split("-").map(Number);
    const d = new Date(a, m - 2, 1);
    mesActual.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    cargar();
}

function mesSiguiente() {
    const [a, m] = mesActual.value.split("-").map(Number);
    const d = new Date(a, m, 1);
    const hoy = new Date();
    const limite = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
    const siguiente = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (siguiente <= limite) { mesActual.value = siguiente; cargar(); }
}

const esMesActual = computed(() => {
    const hoy = new Date();
    return mesActual.value === `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
});

const etiquetaMes = computed(() => {
    const [a, m] = mesActual.value.split("-").map(Number);
    return new Date(a, m - 1, 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
});

const empleadosFiltrados = computed(() => {
    if (!datos.value) return [];
    const lista = datos.value.empleados;
    if (filtro.value === "positivo") return lista.filter(e => e.balance_min >= 0);
    if (filtro.value === "negativo") return lista.filter(e => e.balance_min < 0);
    return lista;
});

const resumenGlobal = computed(() => {
    if (!datos.value) return null;
    const lista = datos.value.empleados;
    const totalTrab = lista.reduce((s, e) => s + e.horas_trabajadas_min, 0);
    const totalPlan = lista.reduce((s, e) => s + e.horas_planificadas_min, 0);
    const conPositivo = lista.filter(e => e.balance_min >= 0).length;
    const conNegativo = lista.filter(e => e.balance_min < 0).length;
    return { totalTrab, totalPlan, conPositivo, conNegativo, total: lista.length };
});

async function cargar() {
    loading.value = true;
    error.value = null;
    try {
        const token = localStorage.getItem("token");
        const { data } = await axios.get(`/api/control-horario/admin/mensual?mes=${mesActual.value}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        datos.value = data;
    } catch (err) {
        error.value = err.response?.data?.error || "Error al cargar datos";
    } finally {
        loading.value = false;
    }
}

function colorBarra(valor) {
    return valor === 1 ? "bg-indigo-500" : "bg-slate-100";
}

function formatBalance(min) {
    const abs = Math.abs(min);
    const h = Math.floor(abs / 60);
    const m = String(abs % 60).padStart(2, "0");
    return `${min >= 0 ? "+" : "-"}${h}h ${m}m`;
}

onMounted(cargar);
</script>

<template>
    <AdminLayout>
        <div class="px-4 sm:px-6 lg:px-8 py-6">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 class="text-xl font-bold text-slate-900">Control horario</h1>
                    <p class="text-xs text-slate-400 font-medium mt-0.5">Resumen mensual de horas por empleado</p>
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

            <div v-if="loading" class="flex justify-center py-20 text-indigo-600 font-bold animate-pulse text-sm">
                Cargando datos...
            </div>

            <div v-else-if="error"
                class="bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl px-6 py-4 text-sm font-medium text-center">
                {{ error }}
            </div>

            <template v-else-if="datos">
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                    <div class="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                        <div class="flex items-center gap-2 mb-2">
                            <Users class="w-4 h-4 text-indigo-400" />
                            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Empleados</span>
                        </div>
                        <p class="text-3xl font-black text-slate-900">{{ resumenGlobal.total }}</p>
                    </div>
                    <div class="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                        <div class="flex items-center gap-2 mb-2">
                            <Clock class="w-4 h-4 text-indigo-400" />
                            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Horas totales</span>
                        </div>
                        <p class="text-3xl font-black text-slate-900">{{ Math.floor(resumenGlobal.totalTrab / 60) }}h
                        </p>
                        <p class="text-xs text-slate-400 mt-1">de {{ Math.floor(resumenGlobal.totalPlan / 60) }}h
                            planificadas</p>
                    </div>
                    <div class="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                        <div class="flex items-center gap-2 mb-2">
                            <TrendingUp class="w-4 h-4 text-emerald-400" />
                            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Al día</span>
                        </div>
                        <p class="text-3xl font-black text-emerald-500">{{ resumenGlobal.conPositivo }}</p>
                    </div>
                    <div class="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                        <div class="flex items-center gap-2 mb-2">
                            <TrendingDown class="w-4 h-4 text-rose-400" />
                            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Con déficit</span>
                        </div>
                        <p class="text-3xl font-black text-rose-500">{{ resumenGlobal.conNegativo }}</p>
                    </div>
                </div>

                <div class="flex gap-2 mb-4">
                    <button
                        v-for="f in [{ key: 'todos', label: 'Todos' }, { key: 'positivo', label: 'Al día' }, { key: 'negativo', label: 'Con déficit' }]"
                        :key="f.key" @click="filtro = f.key"
                        class="px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        :class="filtro === f.key ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'">
                        {{ f.label }}
                    </button>
                </div>

                <div class="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <div class="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-100 bg-slate-50">
                        <div class="col-span-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Empleado</div>
                        <div
                            class="col-span-3 text-xs font-bold text-slate-400 uppercase tracking-wider hidden lg:block">
                            Distribución</div>
                        <div class="col-span-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Trabajadas /
                            Plan</div>
                        <div class="col-span-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Balance</div>
                        <div
                            class="col-span-1 text-xs font-bold text-slate-400 uppercase tracking-wider hidden lg:block">
                            H. Extra</div>
                        <div class="col-span-1 text-xs font-bold text-slate-400 uppercase tracking-wider">Estado</div>
                    </div>

                    <div v-if="empleadosFiltrados.length === 0"
                        class="text-center py-12 text-slate-300 text-sm font-medium">
                        No hay empleados con los filtros seleccionados
                    </div>

                    <div v-for="emp in empleadosFiltrados" :key="emp.id"
                        class="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-50 hover:bg-slate-50 transition-colors items-center">
                        <div class="col-span-3 flex items-center gap-3">
                            <div class="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                                <span class="text-indigo-600 font-bold text-xs">{{ emp.nombre.charAt(0) }}</span>
                            </div>
                            <div class="min-w-0">
                                <p class="text-sm font-bold text-slate-900 truncate">{{ emp.nombre }}</p>
                                <p class="text-xs text-slate-400 truncate">{{ emp.cargo }}</p>
                            </div>
                        </div>
                        <div class="col-span-3 hidden lg:flex items-center gap-px">
                            <div v-for="(val, idx) in emp.distribucion" :key="idx"
                                :class="[colorBarra(val), 'h-6 flex-1 rounded-sm']"
                                :title="`Día ${idx + 1}: ${val ? 'fichado' : 'sin fichaje'}`">
                            </div>
                        </div>
                        <div class="col-span-2">
                            <p class="text-sm font-bold text-slate-900 font-mono">{{ emp.horas_trabajadas }}</p>
                            <p class="text-xs text-slate-400">/ {{ emp.horas_planificadas }}</p>
                        </div>
                        <div class="col-span-2">
                            <span class="text-sm font-bold font-mono"
                                :class="emp.balance_min >= 0 ? 'text-emerald-600' : 'text-rose-500'">
                                {{ formatBalance(emp.balance_min) }}
                            </span>
                        </div>
                        <div class="col-span-1 hidden lg:block">
                            <span class="text-sm font-mono text-slate-500">{{ emp.horas_extra }}</span>
                        </div>
                        <div class="col-span-1">
                            <span
                                class="text-[10px] font-bold px-2 py-1 rounded-lg uppercase bg-amber-50 text-amber-500">Pendiente</span>
                        </div>
                    </div>
                </div>
            </template>
        </div>
    </AdminLayout>
</template>