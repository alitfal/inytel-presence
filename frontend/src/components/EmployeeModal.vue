<script setup>
/**
 * EmployeeModal.vue — Vista detallada y gestión de ficha de empleado
 *
 * Modal expansivo que muestra el perfil completo de un empleado, incluyendo:
 * - Datos personales y profesionales.
 * - Resumen de horas trabajadas en la semana actual (vía API).
 * - Historial interactivo de jornadas/fichajes con paginación por periodos.
 * - Acceso a acciones de edición y eliminación.
 *
 * Contexto de uso:
 * Se invoca desde la lista de empleados al pulsar en "Ver ficha". Utiliza el
 * composable 'useFichajes' para abstraer la lógica de consulta al historial.
 *
 * Props:
 * @prop {Object} employee - Objeto con los datos básicos del empleado a visualizar.
 *
 * Eventos emitidos:
 * @emits cerrar    - Cierra el modal de detalle.
 * @emits editar    - Notifica la intención de editar los datos del empleado.
 * @emits eliminar  - Dispara el flujo de borrado del empleado.
 * @emits fichar    - Permite realizar un fichaje manual desde la ficha.
 */

import { ref, onMounted } from "vue";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import { useFichajes } from "../composables/useFichajes";
import axios from "axios";

const props = defineProps({
  employee: { type: Object, required: true },
});

const emit = defineEmits(["cerrar", "editar", "eliminar", "fichar"]);

/**
 * Desestructuración de lógica compartida para el historial de fichajes.
 * Gestiona estados de carga, formateo de fechas y navegación entre semanas/meses.
 */
const {
  historial,
  loadingHistorial,
  periodoActivo,
  fetchHistorial,
  cambiarPeriodo,
  navegarPeriodo,
  etiquetaPeriodo,
  offset,
  formatJornada,
  formatFecha,
} = useFichajes();

// --- ESTADO LOCAL: RESUMEN SEMANAL ---
const resumenHoras = ref(null); // Almacena horas totales, extras y faltantes
const loadingHoras = ref(false); // Estado de carga específico para el resumen
const semanaActual = ref(""); // Almacena el código de semana en formato YYYY-Www

/**
 * Calcula el código de semana ISO 8601 (ej: 2024-W12).
 * Se utiliza para realizar consultas precisas de horas por periodos semanales.
 * @param {Number} offset - Desplazamiento respecto a la semana actual (0, -1, +1...)
 * @returns {String} Cadena formateada YYYY-Www
 */
function getSemanaISO(offset = 0) {
  const hoy = new Date();
  hoy.setDate(hoy.getDate() + offset * 7);
  const dia = hoy.getDay() || 7;
  hoy.setDate(hoy.getDate() - dia + 4);
  const anio = hoy.getFullYear();
  const inicioAnio = new Date(anio, 0, 1);
  const semana = Math.ceil(
    ((hoy - inicioAnio) / 86400000 + inicioAnio.getDay() + 1) / 7,
  );
  return `${anio}-W${String(semana).padStart(2, "0")}`;
}

/**
 * Obtiene el resumen de horas del empleado para la semana seleccionada.
 * Llama al endpoint de analítica para obtener totales y desviaciones de jornada.
 */
async function fetchResumenHoras() {
  try {
    loadingHoras.value = true;
    const res = await axios.get(
      `/api/employees/${props.employee.id}/summary-hours`,
      { params: { week: semanaActual.value } },
    );
    resumenHoras.value = res.data;
  } catch (err) {
    console.error("Error al obtener resumen de horas:", err);
  } finally {
    loadingHoras.value = false;
  }
}

/**
 * Ciclo de vida: Carga inicial de datos.
 * Obtiene tanto el historial detallado como el resumen de horas al montar el componente.
 */
onMounted(() => {
  semanaActual.value = getSemanaISO();
  fetchResumenHoras();
  fetchHistorial(props.employee.id);
});
</script>

<template>
  <div
    class="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-0 sm:p-4"
    @click.self="emit('cerrar')"
  >
    <div
      class="bg-white w-full max-w-2xl h-full sm:h-auto sm:max-h-[92vh] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
    >
      <div
        class="px-8 pt-8 pb-6 bg-slate-50/50 border-b border-slate-100 relative"
      >
        <div class="flex items-center gap-5">
          <div
            class="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-indigo-200"
          >
            {{ employee.nombre.charAt(0) }}
          </div>
          <div>
            <h2 class="text-2xl font-bold text-slate-900 leading-tight">
              {{ employee.nombre }}
            </h2>
            <p
              class="text-slate-500 font-medium uppercase tracking-wider text-sm"
            >
              {{ employee.cargo }}
            </p>
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-8 space-y-8">
        <div class="grid grid-cols-2 gap-y-6 gap-x-8">
          <div
            v-for="(val, label) in {
              Email: employee.email,
              Teléfono: employee.telefono,
              DNI: employee.dni,
              Departamento: employee.departamento,
            }"
            :key="label"
          >
            <span
              class="text-slate-400 text-xs font-bold uppercase block mb-1"
              >{{ label }}</span
            >
            <span class="text-slate-700 font-medium">{{ val || "—" }}</span>
          </div>
        </div>

        <div
          class="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100/50"
        >
          <div class="flex justify-between items-center mb-4">
            <h3
              class="text-indigo-900 font-bold text-sm uppercase tracking-wider"
            >
              Resumen Semanal
            </h3>
            <span
              class="text-indigo-600 font-bold text-xs bg-white px-3 py-1 rounded-full shadow-sm"
            >
              {{ semanaActual }}
            </span>
          </div>

          <div
            v-if="loadingHoras"
            class="h-12 flex items-center justify-center"
          >
            <div
              class="animate-pulse text-indigo-400 text-xs font-bold uppercase"
            >
              Cargando métricas...
            </div>
          </div>

          <div
            v-else-if="resumenHoras"
            class="grid grid-cols-3 gap-4 text-center"
          >
            <div class="bg-white p-3 rounded-xl shadow-sm">
              <span
                class="block text-slate-400 text-[10px] font-bold uppercase mb-1"
                >Trabajadas</span
              >
              <span class="text-lg font-black text-indigo-600"
                >{{ resumenHoras.total_horas }}h</span
              >
            </div>
            <div class="bg-white p-3 rounded-xl shadow-sm">
              <span
                class="block text-slate-400 text-[10px] font-bold uppercase mb-1"
                >Extras</span
              >
              <span class="text-lg font-black text-emerald-500"
                >+{{ resumenHoras.horas_extra }}h</span
              >
            </div>
            <div class="bg-white p-3 rounded-xl shadow-sm">
              <span
                class="block text-slate-400 text-[10px] font-bold uppercase mb-1"
                >Contrato</span
              >
              <span class="text-lg font-black text-slate-700"
                >{{ employee.horas_semanales }}h</span
              >
            </div>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-6">
            <h3 class="font-bold text-slate-900">Historial de actividad</h3>

            <div class="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                @click="navegarPeriodo(-1, employee.id)"
                class="p-1.5 hover:bg-white rounded-lg transition-all cursor-pointer"
              >
                <ChevronLeft class="w-4 h-4 text-slate-600" />
              </button>
              <span
                class="text-xs font-bold text-slate-600 px-2 min-w-[100px] text-center uppercase"
              >
                {{ etiquetaPeriodo }}
              </span>
              <button
                @click="navegarPeriodo(1, employee.id)"
                class="p-1.5 hover:bg-white rounded-lg transition-all cursor-pointer"
              >
                <ChevronRight class="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>

          <div class="space-y-3">
            <div
              v-if="loadingHistorial"
              class="text-center py-10 text-slate-400 text-sm animate-pulse italic"
            >
              Consultando registros...
            </div>
            <div
              v-else-if="historial.length === 0"
              class="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm"
            >
              No hay actividad en este periodo
            </div>

            <div
              v-for="j in historial"
              :key="j.id"
              class="p-4 rounded-2xl border border-slate-100 hover:border-indigo-100 transition-colors bg-white group"
            >
              <div class="flex justify-between items-start mb-2">
                <span class="text-sm font-bold text-slate-700 uppercase">{{
                  formatFecha(j.fecha)
                }}</span>
                <span
                  class="text-xs font-black px-2 py-0.5 rounded-md"
                  :class="
                    j.total_horas
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-rose-50 text-rose-500'
                  "
                >
                  {{ j.total_horas ? `${j.total_horas} horas` : "Incompleto" }}
                </span>
              </div>

              <div class="space-y-1.5 pt-2 border-t border-slate-50">
                <div class="flex justify-between text-xs">
                  <span class="text-slate-400 font-medium"
                    >Entrada / Salida</span
                  >
                  <span class="font-bold text-slate-700">
                    {{ j.hora_entrada.slice(0, 5) }} —
                    {{ j.hora_salida?.slice(0, 5) || "??" }}
                  </span>
                </div>
                <div
                  v-if="j.hora_salida_real"
                  class="flex justify-between text-xs italic"
                >
                  <span class="text-indigo-400 font-medium"
                    >Salida Real (Incidencia)</span
                  >
                  <span class="font-bold text-slate-700">{{
                    j.hora_salida_real?.slice(0, 5)
                  }}</span>
                </div>
                <div
                  v-if="j.observaciones"
                  class="flex justify-between text-xs gap-4"
                >
                  <span class="text-slate-400 font-medium shrink-0"
                    >Observaciones</span
                  >
                  <span class="font-medium text-slate-600 text-right">{{
                    j.observaciones
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex gap-3 px-8 pb-8 pt-4 border-t border-slate-100">
        <button
          @click="emit('eliminar', employee)"
          class="py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-500 font-bold rounded-2xl transition-colors text-sm cursor-pointer"
        >
          Eliminar
        </button>
        <button
          @click="emit('cerrar')"
          class="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-colors text-sm cursor-pointer"
        >
          Cerrar
        </button>
        <button
          @click="emit('editar', employee)"
          class="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-colors text-sm cursor-pointer shadow-lg shadow-indigo-100"
        >
          Editar Perfil
        </button>
      </div>
    </div>
  </div>
</template>
