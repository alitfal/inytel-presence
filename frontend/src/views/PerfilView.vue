<script setup>
/**
 * @component PerfilView
 * @description Vista principal del empleado autenticado.
 *              Muestra los datos personales, el estado de presencia,
 *              los botones de fichaje, el resumen de horas del periodo
 *              activo y el historial de jornadas con navegación temporal.
 *
 * Al montar comprueba si hay una jornada sin cerrar del día anterior
 * (incidencia pendiente) y muestra el modal correspondiente si es así.
 */
import { ref, computed, onMounted } from "vue";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import { useRouter } from "vue-router";
import { useAuth } from "../composables/useAuth";
import { useFichajes } from "../composables/useFichajes";
import CambiarPasswordModal from "../components/CambiarPasswordModal.vue";
import axios from "axios";
import { KeyRound } from "lucide-vue-next";
import IncidenciaModal from "../components/IncidenciaModal.vue";

const router = useRouter();
const { usuario, logout } = useAuth();

// ── Composable de fichajes ────────────────────────────────────────────────────
const {
  historial, // Array de jornadas del periodo activo
  loadingHistorial, // Boolean: estado de carga del historial
  periodoActivo, // String: 'hoy' | 'semana' | 'mes'
  errorFichaje, // String: mensaje de error al fichar
  fetchHistorial, // fn(id, periodo) — carga el historial
  cambiarPeriodo, // fn(id, periodo) — cambia el periodo y recarga
  navegarPeriodo, // fn(id, dir) — navega ±1 unidad temporal
  etiquetaPeriodo, // String: etiqueta del periodo actual
  offset, // Number: desplazamiento temporal (0 = actual)
  fichar, // fn(id, tipo) — registra entrada o salida
  formatJornada, // fn(jornada) → { duracion, ... }
  formatFecha, // fn(fecha) → String legible
} = useFichajes();

// ── Estado ────────────────────────────────────────────────────────────────────
const empleado = ref(null); // Datos del empleado cargados desde la API
const loadingEmpleado = ref(true); // Boolean: estado de carga del perfil
const mostrarCambiarPassword = ref(false); // Controla la visibilidad del modal de cambio de contraseña
const incidenciaPendiente = ref(null); // Jornada sin cerrar pendiente de resolver (o null si no hay)

// ── Computed: cálculo de objetivos horarios ───────────────────────────────────

/** Horas diarias objetivo calculadas a partir de la jornada semanal del empleado. */
const HORAS_DIA = computed(() => (empleado.value?.horas_semanales || 40) / 5);

/** Horas semanales objetivo según la jornada configurada del empleado. */
const HORAS_SEMANA = computed(() => empleado.value?.horas_semanales || 40);

/**
 * Horas mensuales objetivo estimadas proporcionalmente
 * en base a los días del mes actual y la jornada semanal.
 */
const HORAS_MES = computed(() => {
  const hoy = new Date();
  const diasEnMes = new Date(
    hoy.getFullYear(),
    hoy.getMonth() + 1,
    0,
  ).getDate();
  return Math.round(HORAS_SEMANA.value * (diasEnMes / 7));
});

/** Título de la sección de horas según el periodo activo. */
const tituloHoras = computed(() => {
  if (periodoActivo.value === "hoy") return "Horas hoy";
  if (periodoActivo.value === "mes") return "Horas este mes";
  return "Horas esta semana";
});

/** Objetivo de horas en función del periodo activo (día / semana / mes). */
const objetivoHoras = computed(() => {
  if (periodoActivo.value === "hoy") return HORAS_DIA.value;
  if (periodoActivo.value === "mes") return HORAS_MES.value;
  return HORAS_SEMANA.value;
});

/**
 * Calcula el resumen de horas trabajadas en el periodo activo
 * a partir de las jornadas del historial cargado.
 *
 * @returns {{ texto: string, porcentaje: number, diasTrabajados: number, totalMin: number }}
 */
const horasSemanales = computed(() => {
  let totalMin = 0;
  let diasTrabajados = 0;
  for (const j of historial.value ?? []) {
    if (!j.hora_entrada) continue;
    diasTrabajados++;
    if (!j.hora_salida) continue;
    const [hE, mE] = j.hora_entrada.split(":").map(Number);
    const [hS, mS] = j.hora_salida.split(":").map(Number);
    totalMin += hS * 60 + mS - (hE * 60 + mE);
  }
  const horas = Math.floor(totalMin / 60);
  const minutos = totalMin % 60;
  const porcentaje = Math.min(
    (totalMin / (objetivoHoras.value * 60)) * 100,
    100,
  );
  return {
    texto: `${horas}h ${minutos.toString().padStart(2, "0")}m`,
    porcentaje: Math.round(porcentaje),
    diasTrabajados,
    totalMin,
  };
});

// ── Acciones asíncronas ───────────────────────────────────────────────────────

/**
 * Comprueba si el empleado tiene una jornada sin cerrar del día anterior.
 * Si la hay, guarda los datos en `incidenciaPendiente` para mostrar el modal.
 */
async function checkIncidencia() {
  try {
    const token = localStorage.getItem("token");
    const { data } = await axios.get(
      `/api/fichajes/pendiente/${usuario.value.empleado_id}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (data.pendiente) {
      incidenciaPendiente.value = {
        fichaje_id: data.fichaje_id,
        fecha_entrada: data.fecha_entrada,
        hora_entrada: data.hora_entrada,
      };
    }
  } catch (err) {
    console.error("Error check incidencia:", err);
  }
}

/**
 * Carga los datos del empleado autenticado desde la API.
 * Usa el `empleado_id` almacenado en el token JWT decodificado.
 */
async function fetchEmpleado() {
  try {
    const { data } = await axios.get(
      `/api/empleados/${usuario.value.empleado_id}`,
    );
    empleado.value = data;
  } catch (err) {
    console.error("Error al cargar empleado:", err);
  } finally {
    loadingEmpleado.value = false;
  }
}

/**
 * Registra un fichaje de entrada o salida y actualiza el estado local
 * del empleado sin necesidad de recargar desde la API.
 *
 * @param {'ENTRADA'|'SALIDA'} tipo - Tipo de fichaje a registrar.
 */
async function handleFichar(tipo) {
  const result = await fichar(empleado.value.id, tipo);
  if (result.ok)
    empleado.value.estado = tipo === "ENTRADA" ? "DENTRO" : "FUERA";
}

/** Cierra la sesión del usuario y redirige al login. */
function handleLogout() {
  logout();
  router.push("/login");
}

// ── Ciclo de vida ─────────────────────────────────────────────────────────────
onMounted(async () => {
  await fetchEmpleado();
  if (empleado.value) {
    // Cargar historial de la semana actual y comprobar incidencias pendientes
    await fetchHistorial(empleado.value.id, "semana");
    await checkIncidencia();
  }
});
</script>

<template>
  <div
    class="min-h-screen bg-slate-50 font-sans antialiased text-slate-900 pb-20"
  >
    <!-- Header: logo, botón cambiar contraseña y cerrar sesión -->
    <div class="bg-white border-b border-slate-100 px-6 py-4">
      <div class="max-w-6xl mx-auto flex justify-between items-center">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-200 shadow-lg"
          >
            <span class="text-white font-black text-xl italic">I</span>
          </div>
          <h1 class="text-xl font-extrabold tracking-tighter">
            INYTEL
            <span class="text-indigo-600 font-light ml-1">| Presence</span>
          </h1>
        </div>
        <div class="flex gap-2">
          <!-- Acceso al modal de cambio de contraseña -->
          <button
            @click="mostrarCambiarPassword = true"
            class="border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 text-slate-400 p-2.5 rounded-xl transition-all cursor-pointer"
          >
            <KeyRound class="w-4 h-4" />
          </button>
          <button
            @click="handleLogout"
            class="bg-rose-50 hover:bg-rose-100 text-rose-500 px-5 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer"
          >
            Salir
          </button>
        </div>
      </div>
    </div>

    <main class="max-w-6xl mx-auto px-6 py-8">
      <!-- Estado de carga inicial del perfil -->
      <div
        v-if="loadingEmpleado"
        class="flex justify-center py-20 animate-pulse text-indigo-600 font-bold"
      >
        Cargando perfil...
      </div>

      <template v-else-if="empleado">
        <!-- Layout de dos columnas: perfil+horas (izq) e historial (dcha) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:items-start">
          <!-- Columna izquierda: datos de perfil y resumen de horas -->
          <div class="space-y-6">
            <!-- Tarjeta de perfil: avatar, datos personales y botones de fichaje -->
            <div
              class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm"
            >
              <div class="flex items-center gap-4 mb-6">
                <div
                  class="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center text-3xl font-black text-white shrink-0"
                >
                  {{ empleado.nombre.charAt(0) }}
                </div>
                <div>
                  <h2 class="text-2xl font-black text-slate-900">
                    {{ empleado.nombre }}
                  </h2>
                  <p
                    class="text-slate-400 text-sm uppercase tracking-wider font-medium"
                  >
                    {{ empleado.cargo }}
                  </p>
                  <!-- Indicador de estado con punto animado -->
                  <div class="flex items-center gap-2 mt-2">
                    <span
                      :class="
                        empleado.estado === 'DENTRO'
                          ? 'bg-emerald-500'
                          : 'bg-slate-300'
                      "
                      class="w-2 h-2 rounded-full animate-pulse"
                    ></span>
                    <span
                      :class="
                        empleado.estado === 'DENTRO'
                          ? 'text-emerald-600'
                          : 'text-slate-400'
                      "
                      class="text-xs font-bold uppercase"
                    >
                      {{ empleado.estado }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Filas de datos personales -->
              <div class="text-sm space-y-0">
                <div
                  class="flex justify-between py-3 border-b border-slate-100"
                >
                  <span class="text-slate-400 font-medium">DNI</span>
                  <span class="text-slate-700 font-medium">{{
                    empleado.dni
                  }}</span>
                </div>
                <div
                  class="flex justify-between py-3 border-b border-slate-100"
                >
                  <span class="text-slate-400 font-medium">Email</span>
                  <span class="text-slate-700 font-medium truncate ml-4">{{
                    empleado.email
                  }}</span>
                </div>
                <div
                  class="flex justify-between py-3 border-b border-slate-100"
                >
                  <span class="text-slate-400 font-medium">Teléfono</span>
                  <span class="text-slate-700 font-medium">{{
                    empleado.telefono
                  }}</span>
                </div>
                <div
                  class="flex justify-between py-3 border-b border-slate-100"
                >
                  <span class="text-slate-400 font-medium">Departamento</span>
                  <span class="text-slate-700 font-medium">{{
                    empleado.departamento
                  }}</span>
                </div>
                <div class="flex justify-between py-3">
                  <span class="text-slate-400 font-medium"
                    >Alta en empresa</span
                  >
                  <span class="text-slate-700 font-medium">{{
                    new Date(empleado.fecha_alta).toLocaleDateString("es-ES")
                  }}</span>
                </div>
              </div>

              <!-- Error de fichaje si la API devuelve un fallo -->
              <div
                v-if="errorFichaje"
                class="mt-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium rounded-2xl px-4 py-3 text-center"
              >
                {{ errorFichaje }}
              </div>

              <!-- Botones de fichaje: deshabilitados según el estado actual -->
              <div class="mt-4 flex gap-3">
                <button
                  @click="handleFichar('ENTRADA')"
                  :disabled="empleado.estado === 'DENTRO'"
                  class="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-colors cursor-pointer"
                >
                  Entrada
                </button>
                <button
                  @click="handleFichar('SALIDA')"
                  :disabled="empleado.estado === 'FUERA'"
                  class="flex-1 py-3 bg-rose-500 hover:bg-rose-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-colors cursor-pointer"
                >
                  Salida
                </button>
              </div>
            </div>

            <!-- Tarjeta de resumen de horas con barra de progreso -->
            <div
              class="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm"
            >
              <div class="flex items-center justify-between mb-4">
                <h3 class="font-bold text-slate-900">{{ tituloHoras }}</h3>
                <span
                  class="text-xs font-bold text-slate-400 uppercase tracking-wider"
                >
                  {{ horasSemanales.diasTrabajados }} día{{
                    horasSemanales.diasTrabajados !== 1 ? "s" : ""
                  }}
                </span>
              </div>
              <div class="flex items-end gap-2 mb-3">
                <span class="text-3xl font-black text-slate-900">{{
                  horasSemanales.texto
                }}</span>
                <span class="text-sm text-slate-400 font-medium mb-1"
                  >/ {{ objetivoHoras }}h objetivo</span
                >
              </div>
              <!-- Barra de progreso: color según porcentaje alcanzado -->
              <div
                class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden"
              >
                <div
                  class="h-2.5 rounded-full transition-all duration-700"
                  :class="
                    horasSemanales.porcentaje >= 100
                      ? 'bg-emerald-500'
                      : horasSemanales.porcentaje >= 60
                        ? 'bg-indigo-500'
                        : 'bg-amber-400'
                  "
                  :style="{ width: horasSemanales.porcentaje + '%' }"
                ></div>
              </div>
              <div class="flex justify-between mt-1.5">
                <span class="text-xs text-slate-400">0h</span>
                <span
                  class="text-xs font-bold"
                  :class="
                    horasSemanales.porcentaje >= 100
                      ? 'text-emerald-500'
                      : horasSemanales.porcentaje >= 60
                        ? 'text-indigo-500'
                        : 'text-amber-500'
                  "
                >
                  {{ horasSemanales.porcentaje }}%
                </span>
                <span class="text-xs text-slate-400">{{ objetivoHoras }}h</span>
              </div>
            </div>
          </div>

          <!-- Columna derecha: historial de fichajes con navegación temporal -->
          <div
            class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm overflow-hidden"
            style="height: 655px"
          >
            <h3 class="font-bold text-slate-900 mb-4">Historial de fichajes</h3>

            <!-- Selector de periodo: Hoy / Semana / Mes -->
            <div class="flex gap-2 mb-3">
              <button
                v-for="p in [
                  { key: 'hoy', label: 'Hoy' },
                  { key: 'semana', label: 'Semana' },
                  { key: 'mes', label: 'Mes' },
                ]"
                :key="p.key"
                @click="cambiarPeriodo(empleado.id, p.key)"
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

            <!-- Navegación temporal: periodo anterior / siguiente -->
            <div class="flex items-center justify-between mb-4">
              <button
                @click="navegarPeriodo(empleado.id, -1)"
                class="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <ChevronLeft class="w-4 h-4" />
              </button>
              <span class="text-xs font-medium text-slate-500 text-center">{{
                etiquetaPeriodo
              }}</span>
              <!-- Deshabilitado si ya estamos en el periodo actual -->
              <button
                @click="navegarPeriodo(empleado.id, 1)"
                :disabled="offset >= 0"
                class="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer disabled:opacity-30"
              >
                <ChevronRight class="w-4 h-4" />
              </button>
            </div>

            <!-- Estado de carga -->
            <div
              v-if="loadingHistorial"
              class="text-center py-4 text-indigo-600 text-sm font-bold animate-pulse"
            >
              Cargando historial...
            </div>

            <!-- Sin fichajes en el periodo -->
            <div
              v-else-if="historial.length === 0"
              class="text-center py-6 text-slate-300 text-sm font-medium"
            >
              Sin fichajes en este periodo
            </div>

            <!-- Lista de jornadas con scroll interno -->
            <div
              v-else
              class="space-y-2 overflow-y-auto pr-1"
              style="max-height: calc(655px - 130px)"
            >
              <div
                v-for="j in historial"
                :key="j.id"
                class="bg-slate-50 rounded-2xl px-4 py-3"
                :class="j.motivo_incidencia ? 'border border-amber-200' : ''"
              >
                <!-- Cabecera: fecha + botón expandir incidencia si aplica -->
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

                <!-- Hora entrada / salida + duración -->
                <div class="flex items-center gap-3 text-xs">
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
                    <span class="text-slate-400 font-medium"
                      >Registrada el</span
                    >
                    <span class="font-medium text-slate-500">
                      {{
                        new Date(j.fecha_incidencia).toLocaleDateString(
                          "es-ES",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          },
                        )
                      }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </main>

    <!-- Modal de cambio de contraseña -->
    <CambiarPasswordModal
      v-if="mostrarCambiarPassword"
      @cerrar="mostrarCambiarPassword = false"
    />

    <!-- Modal de incidencia pendiente — se muestra si hay una jornada sin cerrar -->
    <IncidenciaModal
      v-if="incidenciaPendiente"
      :fichaje-id="incidenciaPendiente.fichaje_id"
      :fecha-entrada="incidenciaPendiente.fecha_entrada"
      :hora-entrada="incidenciaPendiente.hora_entrada"
      @resuelta="incidenciaPendiente = null"
    />
  </div>
</template>
