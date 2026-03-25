<script setup>
/**
 * @component EmployeeModal
 * @description Modal de detalle de empleado para el panel de administración.
 *              Muestra información personal, resumen de horas semanales con
 *              navegación temporal e historial de fichajes con soporte de incidencias.
 *
 * @prop {Object} employee - Objeto con los datos del empleado a mostrar.
 *
 * @emits cerrar   - Cierra el modal.
 * @emits editar   - Abre el formulario de edición con el empleado como payload.
 * @emits eliminar - Solicita la eliminación del empleado con el empleado como payload.
 * @emits fichar   - Notifica que se ha realizado un fichaje (payload: tipo 'entrada'|'salida').
 */
import { ref, onMounted } from "vue";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import { useFichajes } from "../composables/useFichajes";
import axios from "axios";

const props = defineProps({
  employee: { type: Object, required: true },
});
const emit = defineEmits(["cerrar", "editar", "eliminar", "fichar"]);

// ── Composable de fichajes ────────────────────────────────────────────────────
const {
  historial, // Array de jornadas del periodo seleccionado
  loadingHistorial, // Boolean: estado de carga del historial
  periodoActivo, // String: 'hoy' | 'semana' | 'mes'
  fetchHistorial, // fn(id, periodo) — carga el historial desde la API
  cambiarPeriodo, // fn(id, periodo) — cambia el periodo y recarga
  navegarPeriodo, // fn(id, dir) — navega ±1 unidad temporal (offset)
  etiquetaPeriodo, // String: etiqueta legible del periodo actual
  offset, // Number: desplazamiento temporal respecto al periodo actual
  formatJornada, // fn(jornada) → { duracion, ... } — formatea una jornada
  formatFecha, // fn(fecha) → String — formatea una fecha en texto legible
} = useFichajes();

// ── Estado: resumen de horas semanales ───────────────────────────────────────
const resumenHoras = ref(null); // Datos devueltos por la API de horas
const loadingHoras = ref(false); // Boolean: estado de carga del resumen
const semanaActual = ref(""); // Semana en formato ISO: YYYY-Www

/**
 * Calcula la semana ISO (YYYY-Www) correspondiente a un offset dado.
 * Un offset de 0 equivale a la semana actual; -1 a la anterior, etc.
 *
 * @param {number} [offset=0] - Desplazamiento en semanas respecto a hoy.
 * @returns {string} Semana en formato YYYY-Www (e.g. "2025-W22").
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

/** Desplazamiento de semana para la navegación del resumen de horas. */
let semanaOffset = 0;

/**
 * Obtiene el resumen de horas semanales del empleado desde la API.
 * Usa la semana indicada en `semanaActual`.
 */
async function fetchHoras() {
  try {
    loadingHoras.value = true;
    const token = localStorage.getItem("token");
    const { data } = await axios.get(
      `/api/empleados/${props.employee.id}/horas?semana=${semanaActual.value}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    resumenHoras.value = data;
  } catch (err) {
    console.error("Error horas:", err);
  } finally {
    loadingHoras.value = false;
  }
}

/**
 * Navega hacia la semana anterior o siguiente en el resumen de horas.
 *
 * @param {number} dir - Dirección: -1 (anterior) o +1 (siguiente).
 */
function cambiarSemana(dir) {
  semanaOffset += dir;
  semanaActual.value = getSemanaISO(semanaOffset);
  fetchHoras();
}

// ── Helpers de formato ────────────────────────────────────────────────────────

/**
 * Formatea un rango de fechas como "DD mmm – DD mmm" en español.
 *
 * @param {string} inicio - Fecha de inicio (ISO o compatible con Date).
 * @param {string} fin    - Fecha de fin.
 * @returns {string} Rango formateado (e.g. "05 may – 11 may").
 */
function formatSemana(inicio, fin) {
  const fmt = (d) =>
    new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
  return `${fmt(inicio)} – ${fmt(fin)}`;
}

/**
 * Formatea una fecha como "día DD" abreviado en español.
 *
 * @param {string} fecha - Fecha en formato ISO.
 * @returns {string} Texto formateado (e.g. "lun 05").
 */
function formatDia(fecha) {
  return new Date(fecha).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "2-digit",
  });
}

/**
 * Devuelve la clase de color Tailwind según la diferencia de horas.
 * - Verde:  diferencia >= 0 (cumple o supera)
 * - Ámbar:  entre -1h y 0h (leve déficit)
 * - Rojo:   por debajo de -1h (déficit significativo)
 *
 * @param {number} diff - Diferencia en horas (puede ser negativa).
 * @returns {string} Clase Tailwind de color.
 */
function colorDiferencia(diff) {
  if (diff >= 0) return "text-emerald-500";
  if (diff >= -1) return "text-amber-500";
  return "text-rose-500";
}

/**
 * Convierte un valor decimal de horas en texto legible (e.g. 1.5 → "1h 30m").
 * Soporta valores negativos (e.g. -0.5 → "-30m").
 *
 * @param {number|null} decimal - Horas en formato decimal.
 * @returns {string} Texto formateado.
 */
function horasATexto(decimal) {
  if (decimal === null || decimal === undefined) return "0m";
  const total = Math.round(decimal * 60);
  const h = Math.floor(Math.abs(total) / 60);
  const m = Math.abs(total) % 60;
  const signo = decimal < 0 ? "-" : "";
  if (h === 0) return `${signo}${m}m`;
  if (m === 0) return `${signo}${h}h`;
  return `${signo}${h}h ${m}m`;
}

/**
 * Formatea la diferencia de horas añadiendo "+" si es positiva.
 *
 * @param {number|null} decimal - Diferencia en horas.
 * @returns {string} Texto con signo (e.g. "+1h 30m" o "-45m").
 */
function difTexto(decimal) {
  if (decimal === null || decimal === undefined) return "0m";
  const signo = decimal > 0 ? "+" : "";
  return signo + horasATexto(decimal);
}

/**
 * Registra un fichaje de entrada o salida para el empleado
 * y notifica al componente padre.
 *
 * @param {'entrada'|'salida'} tipo - Tipo de fichaje a registrar.
 */
async function handleFichar(tipo) {
  await fichar(props.employee.id, tipo);
  emit("fichar", tipo);
}

// ── Ciclo de vida ─────────────────────────────────────────────────────────────
onMounted(() => {
  // Carga el historial de la semana actual y el resumen de horas al abrir el modal
  fetchHistorial(props.employee.id, "semana");
  semanaActual.value = getSemanaISO(0);
  fetchHoras();
});
</script>

<template>
  <div
    class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    @click.self="emit('cerrar')"
  >
    <div
      class="bg-white rounded-3xl w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto"
    >
      <!-- ── Cabecera: avatar, nombre, cargo y acceso a edición ── -->
      <div
        class="flex items-center gap-4 px-8 pt-8 pb-6 border-b border-slate-100"
      >
        <div
          class="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shrink-0"
        >
          {{ employee.nombre.charAt(0) }}
        </div>
        <div class="flex-1">
          <h2 class="text-xl font-bold text-slate-900">
            {{ employee.nombre }}
          </h2>
          <p
            class="text-slate-400 text-sm uppercase tracking-wider font-medium"
          >
            {{ employee.cargo }}
          </p>
        </div>
        <button
          @click="emit('editar', employee)"
          class="text-slate-400 hover:text-indigo-600 transition-colors text-sm font-bold cursor-pointer"
        >
          Editar
        </button>
      </div>

      <!-- ── Cuerpo: dos columnas en md+, una columna en móvil ── -->
      <div
        class="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x md:divide-slate-100"
      >
        <!-- Columna izquierda: datos personales + resumen horas semanales -->
        <div class="px-8 py-6 space-y-6">
          <!-- Filas de información del empleado -->
          <div class="text-sm">
            <div class="flex justify-between py-3 border-b border-slate-100">
              <span class="text-slate-400 font-medium">Estado</span>
              <span
                :class="
                  employee.estado === 'DENTRO'
                    ? 'text-emerald-500'
                    : 'text-slate-400'
                "
                class="font-bold uppercase"
              >
                {{ employee.estado }}
              </span>
            </div>
            <div class="flex justify-between py-3 border-b border-slate-100">
              <span class="text-slate-400 font-medium">DNI</span>
              <span class="text-slate-700 font-medium">{{ employee.dni }}</span>
            </div>
            <div class="flex justify-between py-3 border-b border-slate-100">
              <span class="text-slate-400 font-medium">Email</span>
              <span class="text-slate-700 font-medium truncate ml-4">{{
                employee.email
              }}</span>
            </div>
            <div class="flex justify-between py-3 border-b border-slate-100">
              <span class="text-slate-400 font-medium">Teléfono</span>
              <span class="text-slate-700 font-medium">{{
                employee.telefono
              }}</span>
            </div>
            <div class="flex justify-between py-3 border-b border-slate-100">
              <span class="text-slate-400 font-medium">Departamento</span>
              <span class="text-slate-700 font-medium">{{
                employee.departamento
              }}</span>
            </div>
            <div class="flex justify-between py-3 border-b border-slate-100">
              <span class="text-slate-400 font-medium">Alta en empresa</span>
              <span class="text-slate-700 font-medium">{{
                new Date(employee.fecha_alta).toLocaleDateString("es-ES")
              }}</span>
            </div>
            <div class="flex justify-between py-3">
              <span class="text-slate-400 font-medium">Jornada</span>
              <span class="text-slate-700 font-medium"
                >{{ employee.horas_semanales || 40 }} h/semana</span
              >
            </div>
          </div>

          <!-- Resumen de horas semanales con navegación por semanas -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-bold text-slate-900">Horas semanales</h3>
              <!-- Navegación: semana anterior / semana siguiente -->
              <div class="flex items-center gap-1">
                <button
                  @click="cambiarSemana(-1)"
                  class="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <ChevronLeft class="w-4 h-4" />
                </button>
                <span
                  class="text-xs font-medium text-slate-500 px-1 w-28 text-center inline-block"
                >
                  {{
                    resumenHoras
                      ? formatSemana(
                          resumenHoras.semana.inicio,
                          resumenHoras.semana.fin,
                        )
                      : "..."
                  }}
                </span>
                <!-- Deshabilitado si ya estamos en la semana actual -->
                <button
                  @click="cambiarSemana(1)"
                  :disabled="semanaOffset >= 0"
                  class="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer disabled:opacity-30"
                >
                  <ChevronRight class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- Estado de carga -->
            <div
              v-if="loadingHoras"
              class="text-center py-4 text-indigo-600 text-sm font-bold animate-pulse"
            >
              Cargando horas...
            </div>

            <!-- Datos del resumen: tarjetas de totales + barras por día -->
            <template v-else-if="resumenHoras">
              <!-- Totales: trabajadas / esperadas / diferencia -->
              <div class="grid grid-cols-3 gap-3 mb-4">
                <div class="bg-slate-50 rounded-2xl p-3 text-center">
                  <p
                    class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1"
                  >
                    Trabajadas
                  </p>
                  <p class="text-xl font-black text-slate-900">
                    {{ horasATexto(resumenHoras.total_trabajadas) }}
                  </p>
                </div>
                <div class="bg-slate-50 rounded-2xl p-3 text-center">
                  <p
                    class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1"
                  >
                    Esperadas
                  </p>
                  <p class="text-xl font-black text-slate-900">
                    {{ horasATexto(resumenHoras.total_esperadas) }}
                  </p>
                </div>
                <!-- Color dinámico según si hay déficit o superávit -->
                <div
                  class="rounded-2xl p-3 text-center"
                  :class="
                    resumenHoras.diferencia_total >= 0
                      ? 'bg-emerald-50'
                      : resumenHoras.diferencia_total >= -2
                        ? 'bg-amber-50'
                        : 'bg-rose-50'
                  "
                >
                  <p
                    class="text-[10px] font-bold uppercase tracking-wider mb-1"
                    :class="
                      resumenHoras.diferencia_total >= 0
                        ? 'text-emerald-400'
                        : resumenHoras.diferencia_total >= -2
                          ? 'text-amber-400'
                          : 'text-rose-400'
                    "
                  >
                    Diferencia
                  </p>
                  <p
                    class="text-xl font-black"
                    :class="colorDiferencia(resumenHoras.diferencia_total)"
                  >
                    {{ difTexto(resumenHoras.diferencia_total) }}
                  </p>
                </div>
              </div>

              <!-- Desglose diario: barra de progreso + horas + diferencia -->
              <div class="space-y-2">
                <div
                  v-for="dia in resumenHoras.dias"
                  :key="dia.fecha"
                  class="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2"
                >
                  <span
                    class="text-xs font-bold text-slate-400 w-10 capitalize"
                    >{{ formatDia(dia.fecha) }}</span
                  >
                  <!-- Barra de progreso: verde si cumple, roja si no llega -->
                  <div
                    class="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden"
                  >
                    <div
                      class="h-full rounded-full transition-all"
                      :class="
                        dia.diferencia >= 0 ? 'bg-emerald-500' : 'bg-rose-400'
                      "
                      :style="{
                        width:
                          Math.min(
                            (dia.horas_trabajadas / dia.horas_esperadas) * 100,
                            100,
                          ) + '%',
                      }"
                    ></div>
                  </div>
                  <span
                    class="text-xs font-bold text-slate-700 shrink-0 text-right"
                    >{{ horasATexto(dia.horas_trabajadas) }}</span
                  >
                  <span
                    class="text-xs font-medium shrink-0 text-right w-14"
                    :class="colorDiferencia(dia.diferencia)"
                  >
                    {{ difTexto(dia.diferencia) }}
                  </span>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- Columna derecha: historial de fichajes con navegación temporal -->
        <div class="px-8 py-6">
          <h3 class="font-bold text-slate-900 mb-3">Historial de fichajes</h3>

          <!-- Selector de periodo: Hoy / Semana / Mes -->
          <div class="flex gap-2 mb-3">
            <button
              v-for="p in [
                { key: 'hoy', label: 'Hoy' },
                { key: 'semana', label: 'Semana' },
                { key: 'mes', label: 'Mes' },
              ]"
              :key="p.key"
              @click="cambiarPeriodo(employee.id, p.key)"
              :class="
                periodoActivo === p.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              "
              class="flex-1 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              {{ p.label }}
            </button>
          </div>

          <!-- Navegación temporal: período anterior / siguiente -->
          <div class="flex items-center justify-between mb-4">
            <button
              @click="navegarPeriodo(employee.id, -1)"
              class="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <ChevronLeft class="w-4 h-4" />
            </button>
            <span class="text-xs font-medium text-slate-500 text-center">{{
              etiquetaPeriodo
            }}</span>
            <!-- Deshabilitado si el offset es 0 (no se puede ir al futuro) -->
            <button
              @click="navegarPeriodo(employee.id, 1)"
              :disabled="offset >= 0"
              class="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer disabled:opacity-30"
            >
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>

          <!-- Estado de carga del historial -->
          <div
            v-if="loadingHistorial"
            class="text-center py-4 text-indigo-600 text-sm font-bold animate-pulse"
          >
            Cargando historial...
          </div>

          <!-- Mensaje vacío -->
          <div
            v-else-if="historial.length === 0"
            class="text-center py-4 text-slate-400 text-sm"
          >
            Sin fichajes en este periodo
          </div>

          <!-- Lista de jornadas -->
          <div
            v-else
            class="space-y-2 overflow-y-auto pr-1"
            style="max-height: 560px"
          >
            <div
              v-for="j in historial"
              :key="j.id"
              class="bg-slate-50 rounded-2xl px-4 py-3"
              :class="j.motivo_incidencia ? 'border border-amber-200' : ''"
            >
              <!-- Cabecera de jornada: fecha + badge de incidencia si aplica -->
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-bold text-slate-500 capitalize">{{
                  formatFecha(j.fecha_entrada)
                }}</span>
                <!-- Botón expandir/colapsar detalle de incidencia -->
                <button
                  v-if="j.motivo_incidencia"
                  @click="j._expandido = !j._expandido"
                  class="text-[10px] font-bold text-amber-500 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  Incidencia {{ j._expandido ? "▲" : "▼" }}
                </button>
              </div>

              <!-- Hora entrada / salida + duración total -->
              <div class="flex items-center gap-2 text-xs">
                <span
                  class="bg-emerald-100 text-emerald-600 font-bold px-2 py-1 rounded-lg"
                >
                  ▶ {{ j.hora_entrada?.slice(0, 5) || "--:--" }}
                </span>
                <span class="text-slate-300">→</span>
                <span
                  :class="
                    j.hora_salida
                      ? 'bg-rose-100 text-rose-500'
                      : 'bg-slate-100 text-slate-400'
                  "
                  class="font-bold px-2 py-1 rounded-lg"
                >
                  ■ {{ j.hora_salida?.slice(0, 5) || "En curso" }}
                </span>
                <span
                  v-if="j.hora_salida"
                  class="text-slate-400 ml-auto font-medium"
                >
                  {{ formatJornada(j).duracion }}
                </span>
              </div>

              <!-- Detalle expandible de incidencia -->
              <div
                v-if="j.motivo_incidencia && j._expandido"
                class="mt-3 pt-3 border-t border-amber-100 space-y-2"
              >
                <div class="flex justify-between text-xs">
                  <span class="text-slate-400 font-medium">Motivo</span>
                  <span class="font-bold text-amber-600 capitalize">
                    {{
                      j.motivo_incidencia === "olvido"
                        ? "Olvido de fichaje"
                        : j.motivo_incidencia === "error_aplicacion"
                          ? "Error de aplicación"
                          : "Otros"
                    }}
                  </span>
                </div>
                <div
                  v-if="j.hora_salida_real"
                  class="flex justify-between text-xs"
                >
                  <span class="text-slate-400 font-medium"
                    >Hora real salida</span
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
                <div
                  v-if="j.fecha_incidencia"
                  class="flex justify-between text-xs"
                >
                  <span class="text-slate-400 font-medium">Registrada el</span>
                  <span class="font-medium text-slate-500">
                    {{
                      new Date(j.fecha_incidencia).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Acciones: eliminar y cerrar ── -->
      <div class="flex gap-3 px-8 pb-8 pt-4 border-t border-slate-100">
        <button
          @click="emit('eliminar', employee)"
          class="py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-500 font-bold rounded-2xl transition-colors text-sm cursor-pointer"
        >
          Eliminar
        </button>
        <button
          @click="emit('cerrar')"
          class="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-colors cursor-pointer"
        >
          Cerrar
        </button>
      </div>
    </div>
  </div>
</template>
