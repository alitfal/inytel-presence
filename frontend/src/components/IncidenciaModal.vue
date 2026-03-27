<script setup>
/**
 * IncidenciaModal.vue — Modal de resolución de fichaje incompleto
 *
 * Se muestra automáticamente al iniciar sesión cuando el sistema detecta
 * que el empleado tiene una jornada sin cerrar de un día anterior.
 * El modal es bloqueante — no puede cerrarse sin resolver la incidencia.
 *
 * El empleado debe indicar:
 * - Motivo por el que no fichó la salida
 * - Hora real de salida de ese día
 * - Observaciones opcionales
 *
 * Props:
 * @prop {Number} fichajeId    - ID del fichaje sin cerrar
 * @prop {String} fechaEntrada - Fecha del fichaje pendiente (YYYY-MM-DD)
 * @prop {String} horaEntrada  - Hora de entrada registrada (HH:mm:ss)
 *
 * Eventos emitidos:
 * @emits resuelta - Se emite cuando la incidencia se registra correctamente
 */

import { ref, computed } from "vue";
import { AlertTriangle } from "lucide-vue-next";
import axios from "axios";

const props = defineProps({
  fichajeId: { type: Number, required: true },
  fechaEntrada: { type: String, required: true },
  horaEntrada: { type: String, required: true },
});

const emit = defineEmits(["resuelta"]);

// Campos del formulario de incidencia
const motivo = ref("");
const horaSalida = ref("");
const observaciones = ref("");
const loading = ref(false);
const error = ref("");

// Opciones disponibles para el motivo de la incidencia
const motivoOpciones = [
  { value: "olvido", label: "Olvido" },
  { value: "error_aplicacion", label: "Error de aplicación" },
  { value: "otros", label: "Otros" },
];

/**
 * Formatea la hora de entrada a HH:mm para mostrarla en el mensaje.
 * FIX: se usa este computed en el template en lugar de horaEntrada directamente.
 * @returns {string} Hora formateada o "--:--" si no está disponible
 */
const horaEntradaFormateada = computed(
  () => props.horaEntrada?.slice(0, 5) || "--:--",
);

/**
 * Formatea la fecha de entrada a texto legible en español.
 * Se añade T12:00:00 para evitar desfases por zona horaria que causaban "Invalid date".
 * @returns {string} Ejemplo: "lunes, 10 de marzo"
 */
const diaFormateado = computed(() => {
  if (!props.fechaEntrada) return "";
  const fecha = props.fechaEntrada instanceof Date
    ? props.fechaEntrada.toISOString().slice(0, 10)
    : String(props.fechaEntrada).slice(0, 10);
  return new Date(fecha + "T12:00:00").toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
});

/**
 * Valida el formulario y envía la incidencia a la API.
 * Actualiza el fichaje con el motivo, hora real de salida
 * y observaciones opcionales.
 * Emite "resuelta" si la operación es exitosa.
 */
async function resolver() {
  error.value = "";

  if (!motivo.value) {
    error.value = "Selecciona un motivo";
    return;
  }
  if (!horaSalida.value) {
    error.value = "Indica la hora de salida";
    return;
  }

  try {
    loading.value = true;
    const token = localStorage.getItem("token");
    await axios.put(
      `/api/fichajes/${props.fichajeId}/incidencia`,
      {
        motivo_incidencia: motivo.value,
        hora_salida_real: horaSalida.value,
        observaciones: observaciones.value || null,
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    emit("resuelta");
  } catch (err) {
    error.value =
      err.response?.data?.error || "Error al registrar la incidencia";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <!-- Overlay bloqueante — no se puede cerrar haciendo clic fuera -->
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <!-- FIX móvil: overflow-y-auto + max-h para que no se desborde en pantallas pequeñas -->
    <div class="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl overflow-y-auto max-h-[90vh]">

      <!-- Icono de alerta -->
      <div class="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mb-4">
        <AlertTriangle class="w-6 h-6 text-amber-500" />
      </div>

      <h2 class="text-xl font-bold text-slate-900 mb-1">Fichaje incompleto</h2>
      <p class="text-slate-400 text-sm mb-6">
        El
        <!-- FIX invalid date: usar diaFormateado en lugar de fechaEntrada directamente -->
        <span class="font-semibold text-slate-600 capitalize">{{ diaFormateado }}</span>
        fichaste la entrada a las
        <!-- FIX invalid date: usar horaEntradaFormateada en lugar de horaEntrada directamente -->
        <span class="font-semibold text-slate-600">{{ horaEntradaFormateada }}</span>
        pero no registraste la salida. Indícanos qué ocurrió.
      </p>

      <div class="space-y-4 text-sm">
        <!-- Selector de motivo mediante radio buttons estilizados -->
        <div>
          <label class="text-slate-400 font-medium block mb-1">Motivo</label>
          <div class="flex flex-col gap-2">
            <label
              v-for="op in motivoOpciones"
              :key="op.value"
              class="flex items-center gap-3 border rounded-xl px-4 py-2.5 cursor-pointer transition-all"
              :class="motivo === op.value
                ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 hover:border-slate-300 text-slate-600'"
            >
              <input type="radio" v-model="motivo" :value="op.value" class="accent-indigo-600" />
              {{ op.label }}
            </label>
          </div>
        </div>

        <!-- Input de hora de salida real -->
        <div>
          <label class="text-slate-400 font-medium block mb-1">
            ¿A qué hora saliste el {{ diaFormateado }}?
          </label>
          <input
            v-model="horaSalida"
            type="time"
            class="w-full border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-colors"
          />
        </div>

        <!-- Textarea de observaciones (campo opcional) -->
        <div>
          <label class="text-slate-400 font-medium block mb-1">
            Observaciones <span class="text-slate-300">(opcional)</span>
          </label>
          <textarea
            v-model="observaciones"
            rows="2"
            placeholder="Añade cualquier detalle relevante..."
            class="w-full border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-colors resize-none text-slate-700"
          />
        </div>

        <p v-if="error" class="text-rose-500 text-xs font-medium">{{ error }}</p>
      </div>

      <button
        @click="resolver"
        :disabled="loading"
        class="mt-6 w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-colors cursor-pointer"
      >
        {{ loading ? "Guardando..." : "Confirmar y continuar" }}
      </button>
    </div>
  </div>
</template>