<script setup>
import { ref, computed } from "vue";
import { AlertTriangle } from "lucide-vue-next";
import axios from "axios";

const props = defineProps({
  fichajeId: { type: Number, required: true },
  fechaEntrada: { type: String, required: true },
  horaEntrada: { type: String, required: true },
});

const emit = defineEmits(["resuelta"]);

const API = import.meta.env.VITE_API_URL
const motivo = ref("");
const horaSalida = ref("");
const observaciones = ref("");
const loading = ref(false);
const error = ref("");

const motivoOpciones = [
  { value: "olvido", label: "Olvido" },
  { value: "error_aplicacion", label: "Error de aplicación" },
  { value: "otros", label: "Otros" },
];

const horaEntradaFormateada = computed(
  () => props.horaEntrada?.slice(0, 5) || "--:--",
);

const diaFormateado = computed(() =>
  new Date(props.fechaEntrada + "T12:00:00").toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }),
);

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
      `${API}/api/fichajes/${props.fichajeId}/incidencia`,
      {
        motivo_incidencia: motivo.value,
        hora_salida_real: horaSalida.value, // solo TIME "HH:MM"
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
  <!-- Overlay bloqueante — no se puede cerrar haciendo click fuera -->
  <div
    class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
  >
    <div class="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
      <!-- Icono -->
      <div
        class="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mb-4"
      >
        <AlertTriangle class="w-6 h-6 text-amber-500" />
      </div>

      <h2 class="text-xl font-bold text-slate-900 mb-1">Fichaje incompleto</h2>
      <p class="text-slate-400 text-sm mb-6">
        El
        <span class="font-semibold text-slate-600 capitalize">{{
          diaFormateado
        }}</span>
        fichaste la entrada a las
        <span class="font-semibold text-slate-600">{{ horaEntrada }}</span>
        pero no registraste la salida. Indícanos qué ocurrió.
      </p>

      <div class="space-y-4 text-sm">
        <!-- Motivo -->
        <div>
          <label class="text-slate-400 font-medium block mb-1">Motivo</label>
          <div class="flex flex-col gap-2">
            <label
              v-for="op in motivoOpciones"
              :key="op.value"
              class="flex items-center gap-3 border rounded-xl px-4 py-2.5 cursor-pointer transition-all"
              :class="
                motivo === op.value
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 hover:border-slate-300 text-slate-600'
              "
            >
              <input
                type="radio"
                v-model="motivo"
                :value="op.value"
                class="accent-indigo-600"
              />
              {{ op.label }}
            </label>
          </div>
        </div>

        <!-- Hora de salida -->
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

        <!-- Observaciones -->
        <div>
          <label class="text-slate-400 font-medium block mb-1"
            >Observaciones <span class="text-slate-300">(opcional)</span></label
          >
          <textarea
            v-model="observaciones"
            rows="2"
            placeholder="Añade cualquier detalle relevante..."
            class="w-full border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-colors resize-none text-slate-700"
          />
        </div>

        <!-- Error -->
        <p v-if="error" class="text-rose-500 text-xs font-medium">
          {{ error }}
        </p>
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
