<script setup>
import { ref, onMounted } from "vue";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import { useFichajes } from "../composables/useFichajes";
import axios from "axios";

const props = defineProps({
  employee: { type: Object, required: true },
});
const emit = defineEmits(["cerrar", "editar", "eliminar", "fichar"]);

const {
  historial,
  loadingHistorial,
  periodoActivo,
  fetchHistorial,
  cambiarPeriodo,
  formatJornada,
  formatFecha,
} = useFichajes();

// ── Horas ────────────────────────────────────
const resumenHoras = ref(null);
const loadingHoras = ref(false);
const semanaActual = ref(""); // formato YYYY-Www

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

let semanaOffset = 0;

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

function cambiarSemana(dir) {
  semanaOffset += dir;
  semanaActual.value = getSemanaISO(semanaOffset);
  fetchHoras();
}

function formatSemana(inicio, fin) {
  const fmt = (d) =>
    new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
  return `${fmt(inicio)} – ${fmt(fin)}`;
}

function formatDia(fecha) {
  return new Date(fecha).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "2-digit",
  });
}

function colorDiferencia(diff) {
  if (diff >= 0) return "text-emerald-500";
  if (diff >= -1) return "text-amber-500";
  return "text-rose-500";
}

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

function difTexto(decimal) {
  if (decimal === null || decimal === undefined) return "0m";
  const signo = decimal > 0 ? "+" : "";
  return signo + horasATexto(decimal);
}

async function handleFichar(tipo) {
  await fichar(props.employee.id, tipo);
  emit("fichar", tipo);
}

onMounted(() => {
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
      <!-- Cabecera -->
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

      <!-- Cuerpo: dos columnas en md+, una en móvil -->
      <div
        class="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x md:divide-slate-100"
      >
        <!-- Columna izquierda: datos + horas -->
        <div class="px-8 py-6 space-y-6">
          <!-- Info -->
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

          <!-- Resumen horas semanales -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-bold text-slate-900">Horas semanales</h3>
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
                <button
                  @click="cambiarSemana(1)"
                  :disabled="semanaOffset >= 0"
                  class="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer disabled:opacity-30"
                >
                  <ChevronRight class="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              v-if="loadingHoras"
              class="text-center py-4 text-indigo-600 text-sm font-bold animate-pulse"
            >
              Cargando horas...
            </div>

            <template v-else-if="resumenHoras">
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

        <!-- Columna derecha: historial fichajes -->
        <div class="px-8 py-6">
          <h3 class="font-bold text-slate-900 mb-3">Historial de fichajes</h3>
          <div class="flex gap-2 mb-4">
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
          <div
            v-if="loadingHistorial"
            class="text-center py-4 text-indigo-600 text-sm font-bold animate-pulse"
          >
            Cargando historial...
          </div>
          <div
            v-else-if="historial.length === 0"
            class="text-center py-4 text-slate-400 text-sm"
          >
            Sin fichajes en este periodo
          </div>
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
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-bold text-slate-500 capitalize">{{
                  formatFecha(j.fecha_entrada)
                }}</span>
                <button
                  v-if="j.motivo_incidencia"
                  @click="j._expandido = !j._expandido"
                  class="text-[10px] font-bold text-amber-500 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  Incidencia {{ j._expandido ? "▲" : "▼" }}
                </button>
              </div>
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

      <!-- Acciones -->
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
