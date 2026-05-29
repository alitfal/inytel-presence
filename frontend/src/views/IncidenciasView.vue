<script setup>
import { ref, onMounted, computed } from "vue";
import { AlertCircle, CheckCircle, XCircle, Clock, Plus, Filter } from "lucide-vue-next";
import AdminLayout from "../components/AdminLayout.vue";
import axios from "axios";

const incidencias = ref([]);
const cargando = ref(false);
const error = ref("");
const filtroEstado = ref("todas");
const mostrarModal = ref(false);
const incidenciaSeleccionada = ref(null);
const comentarioAdmin = ref("");
const empleados = ref([]);

// ── Formulario nueva incidencia ───────────────────────────────────────────────
const nuevaIncidencia = ref({
    empleado_id: "",
    tipo: "vacaciones",
    fecha_inicio: "",
    fecha_fin: "",
    hora_inicio: "",
    hora_fin: "",
    descripcion: "",
});
const mostrarFormulario = ref(false);
const guardando = ref(false);

const tipos = [
    { value: "vacaciones", label: "Vacaciones" },
    { value: "baja_medica", label: "Baja médica" },
    { value: "permiso_personal", label: "Permiso personal" },
    { value: "retraso_justificado", label: "Retraso justificado" },
    { value: "retraso_injustificado", label: "Retraso injustificado" },
    { value: "salida_anticipada", label: "Salida anticipada" },
    { value: "cambio_turno", label: "Cambio de turno" },
    { value: "horas_extra", label: "Horas extra" },
    { value: "otro", label: "Otro" },
];

const estadoColores = {
    pendiente: "bg-amber-100 text-amber-700",
    aprobada: "bg-emerald-100 text-emerald-700",
    rechazada: "bg-rose-100 text-rose-700",
    cancelada: "bg-slate-100 text-slate-500",
};

const incidenciasFiltradas = computed(() => {
    if (filtroEstado.value === "todas") return incidencias.value;
    return incidencias.value.filter(i => i.estado === filtroEstado.value);
});

const contadores = computed(() => ({
    todas: incidencias.value.length,
    pendiente: incidencias.value.filter(i => i.estado === "pendiente").length,
    aprobada: incidencias.value.filter(i => i.estado === "aprobada").length,
    rechazada: incidencias.value.filter(i => i.estado === "rechazada").length,
}));

async function cargar() {
    cargando.value = true;
    try {
        const { data } = await axios.get("/api/incidencias");
        incidencias.value = data;
    } catch {
        error.value = "Error al cargar las incidencias";
    } finally {
        cargando.value = false;
    }
}

async function cargarEmpleados() {
    const { data } = await axios.get("/api/empleados");
    empleados.value = data;
}

onMounted(() => {
    cargar();
    cargarEmpleados();
});

function abrirModal(incidencia) {
    incidenciaSeleccionada.value = incidencia;
    comentarioAdmin.value = "";
    mostrarModal.value = true;
}

async function cambiarEstado(estado) {
    try {
        await axios.put(`/api/incidencias/${incidenciaSeleccionada.value.id}/estado`, {
            estado,
            comentario_admin: comentarioAdmin.value,
        });
        mostrarModal.value = false;
        await cargar();
    } catch {
        error.value = "Error al actualizar la incidencia";
    }
}

async function crearIncidencia() {
    guardando.value = true;
    try {
        await axios.post("/api/incidencias", nuevaIncidencia.value);
        mostrarFormulario.value = false;
        nuevaIncidencia.value = { empleado_id: "", tipo: "vacaciones", fecha_inicio: "", fecha_fin: "", hora_inicio: "", hora_fin: "", descripcion: "" };
        await cargar();
    } catch {
        error.value = "Error al crear la incidencia";
    } finally {
        guardando.value = false;
    }
}

const fmtFecha = (f) => {
    if (!f) return "—";
    const [y, m, d] = String(f).slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
};
</script>

<template>
    <AdminLayout>
        <div class="p-6 max-w-6xl mx-auto">

            <!-- Cabecera -->
            <div class="flex items-center justify-between mb-8">
                <div class="flex items-center gap-3">
                    <div
                        class="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200">
                        <AlertCircle class="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 class="text-2xl font-black text-slate-900">Incidencias laborales</h1>
                        <p class="text-sm text-slate-400">Gestión de ausencias, permisos y solicitudes</p>
                    </div>
                </div>
                <button @click="mostrarFormulario = true"
                    class="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 transition-all cursor-pointer text-sm">
                    <Plus class="w-4 h-4" />
                    Nueva incidencia
                </button>
            </div>

            <!-- Contadores -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <button v-for="(count, key) in contadores" :key="key" @click="filtroEstado = key"
                    class="bg-white rounded-2xl border p-4 text-left transition-all cursor-pointer"
                    :class="filtroEstado === key ? 'border-indigo-400 shadow-md' : 'border-slate-100'">
                    <p class="text-2xl font-black text-slate-900">{{ count }}</p>
                    <p class="text-xs font-semibold text-slate-400 capitalize mt-1">{{ key }}</p>
                </button>
            </div>

            <!-- Lista de incidencias -->
            <div class="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div v-if="cargando" class="p-8 text-center text-slate-400">Cargando...</div>
                <div v-else-if="incidenciasFiltradas.length === 0" class="p-8 text-center text-slate-400">
                    No hay incidencias {{ filtroEstado !== 'todas' ? filtroEstado + 's' : '' }}
                </div>
                <div v-else>
                    <div v-for="inc in incidenciasFiltradas" :key="inc.id"
                        class="flex items-center justify-between p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0">
                                <span class="text-indigo-600 font-black text-sm">{{ inc.empleado_nombre?.charAt(0)
                                    }}</span>
                            </div>
                            <div>
                                <p class="font-bold text-slate-900 text-sm">{{ inc.empleado_nombre }}</p>
                                <p class="text-xs text-slate-400">
                                    {{tipos.find(t => t.value === inc.tipo)?.label}} ·
                                    {{ fmtFecha(inc.fecha_inicio) }}
                                    <span v-if="inc.fecha_fin"> — {{ fmtFecha(inc.fecha_fin) }}</span>
                                </p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="text-xs font-bold px-3 py-1 rounded-full" :class="estadoColores[inc.estado]">
                                {{ inc.estado }}
                            </span>
                            <button v-if="inc.estado === 'pendiente'" @click="abrirModal(inc)"
                                class="text-xs font-bold px-3 py-1.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all cursor-pointer">
                                Revisar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <p v-if="error" class="mt-3 text-sm text-rose-500">{{ error }}</p>
        </div>

        <!-- Modal revisar incidencia -->
        <div v-if="mostrarModal"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
                <h2 class="text-lg font-black text-slate-900 mb-1">Revisar incidencia</h2>
                <p class="text-sm text-slate-400 mb-4">
                    {{ incidenciaSeleccionada?.empleado_nombre }} ·
                    {{tipos.find(t => t.value === incidenciaSeleccionada?.tipo)?.label}}
                </p>

                <div class="bg-slate-50 rounded-2xl p-4 mb-4 text-sm text-slate-600">
                    <p><span class="font-bold">Período:</span> {{ fmtFecha(incidenciaSeleccionada?.fecha_inicio) }} — {{
                        fmtFecha(incidenciaSeleccionada?.fecha_fin) }}</p>
                    <p v-if="incidenciaSeleccionada?.descripcion" class="mt-2">
                        <span class="font-bold">Descripción:</span> {{ incidenciaSeleccionada?.descripcion }}
                    </p>
                </div>

                <label class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Comentario
                    (opcional)</label>
                <textarea v-model="comentarioAdmin" rows="3"
                    class="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors resize-none mb-4"
                    placeholder="Motivo de la decisión..."></textarea>

                <div class="flex gap-3">
                    <button @click="cambiarEstado('rechazada')"
                        class="flex-1 flex items-center justify-center gap-2 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-2xl transition-all cursor-pointer">
                        <XCircle class="w-4 h-4" />Rechazar
                    </button>
                    <button @click="cambiarEstado('aprobada')"
                        class="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all cursor-pointer">
                        <CheckCircle class="w-4 h-4" />Aprobar
                    </button>
                </div>
                <button @click="mostrarModal = false"
                    class="w-full mt-3 text-sm text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                    Cancelar
                </button>
            </div>
        </div>

        <!-- Modal nueva incidencia -->
        <div v-if="mostrarFormulario"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                <h2 class="text-lg font-black text-slate-900 mb-4">Nueva incidencia</h2>

                <div class="space-y-4">
                    <div>
                        <label
                            class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Empleado</label>
                        <select v-model="nuevaIncidencia.empleado_id"
                            class="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-indigo-400 bg-white">
                            <option value="">Seleccionar empleado</option>
                            <option v-for="emp in empleados" :key="emp.id" :value="emp.id">{{ emp.nombre }}</option>
                        </select>
                    </div>

                    <div>
                        <label class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Tipo</label>
                        <select v-model="nuevaIncidencia.tipo"
                            class="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-indigo-400 bg-white">
                            <option v-for="t in tipos" :key="t.value" :value="t.value">{{ t.label }}</option>
                        </select>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Fecha
                                inicio</label>
                            <input type="date" v-model="nuevaIncidencia.fecha_inicio"
                                class="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-indigo-400" />
                        </div>
                        <div>
                            <label class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Fecha
                                fin</label>
                            <input type="date" v-model="nuevaIncidencia.fecha_fin"
                                class="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-indigo-400" />
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Hora
                                inicio</label>
                            <input type="time" v-model="nuevaIncidencia.hora_inicio"
                                class="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-indigo-400" />
                        </div>
                        <div>
                            <label class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Hora
                                fin</label>
                            <input type="time" v-model="nuevaIncidencia.hora_fin"
                                class="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-indigo-400" />
                        </div>
                    </div>

                    <div>
                        <label
                            class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Descripción</label>
                        <textarea v-model="nuevaIncidencia.descripcion" rows="3"
                            class="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-indigo-400 resize-none"
                            placeholder="Descripción opcional..."></textarea>
                    </div>
                </div>

                <div class="flex gap-3 mt-6">
                    <button @click="mostrarFormulario = false"
                        class="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all cursor-pointer">
                        Cancelar
                    </button>
                    <button @click="crearIncidencia"
                        :disabled="guardando || !nuevaIncidencia.empleado_id || !nuevaIncidencia.fecha_inicio"
                        class="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all cursor-pointer disabled:opacity-50">
                        {{ guardando ? 'Guardando...' : 'Crear incidencia' }}
                    </button>
                </div>
            </div>
        </div>

    </AdminLayout>
</template>