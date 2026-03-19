<script setup>
import { computed } from "vue";

const props = defineProps({
  formData: { type: Object, required: true },
  erroresCampo: { type: Object, required: true },
  tocados: { type: Object, required: true },
  modoEdicion: { type: Boolean, required: true },
  claseCampo: { type: Function, required: true },
  marcarTocado: { type: Function, required: true },
});

const emit = defineEmits(["guardar", "cancelar"]);

const diasSemana = [
  { num: 1, label: "L" },
  { num: 2, label: "M" },
  { num: 3, label: "X" },
  { num: 4, label: "J" },
  { num: 5, label: "V" },
  { num: 6, label: "S" },
  { num: 7, label: "D" },
];

// Convertir string "1,2,3,4,5" ↔ array [1,2,3,4,5]
const diasSeleccionados = computed({
  get() {
    if (!props.formData.dias_laborables) return [1, 2, 3, 4, 5];
    return props.formData.dias_laborables.split(",").map(Number);
  },
  set(val) {
    props.formData.dias_laborables = val.sort((a, b) => a - b).join(",");
  },
});

function toggleDia(num) {
  const actual = [...diasSeleccionados.value];
  const idx = actual.indexOf(num);
  if (idx === -1) actual.push(num);
  else if (actual.length > 1) actual.splice(idx, 1); // mínimo 1 día
  diasSeleccionados.value = actual;
}
</script>

<template>
  <div
    class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    @click.self="emit('cancelar')"
  >
    <div
      class="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
    >
      <h2 class="text-xl font-bold text-slate-900 mb-6">
        {{ modoEdicion ? "Editar empleado" : "Nuevo empleado" }}
      </h2>

      <div class="space-y-4 text-sm">
        <!-- Nombre -->
        <div>
          <label class="text-slate-400 font-medium block mb-1">Nombre</label>
          <input
            v-model="formData.nombre"
            type="text"
            :class="claseCampo('nombre')"
            class="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-100 transition-colors"
            placeholder="Carlos López"
            @blur="marcarTocado('nombre')"
          />
          <p
            v-if="tocados.nombre && erroresCampo.nombre"
            class="text-rose-500 text-xs mt-1"
          >
            {{ erroresCampo.nombre }}
          </p>
        </div>

        <!-- Cargo -->
        <div>
          <label class="text-slate-400 font-medium block mb-1">Cargo</label>
          <input
            v-model="formData.cargo"
            type="text"
            :class="claseCampo('cargo')"
            class="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-100 transition-colors"
            placeholder="Técnico de Redes"
            @blur="marcarTocado('cargo')"
          />
          <p
            v-if="tocados.cargo && erroresCampo.cargo"
            class="text-rose-500 text-xs mt-1"
          >
            {{ erroresCampo.cargo }}
          </p>
        </div>

        <!-- DNI -->
        <div>
          <label class="text-slate-400 font-medium block mb-1">DNI</label>
          <input
            v-model="formData.dni"
            type="text"
            :class="claseCampo('dni')"
            class="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-100 transition-colors"
            placeholder="12345678A"
            @blur="marcarTocado('dni')"
          />
          <p
            v-if="tocados.dni && erroresCampo.dni"
            class="text-rose-500 text-xs mt-1"
          >
            {{ erroresCampo.dni }}
          </p>
        </div>

        <!-- Email -->
        <div>
          <label class="text-slate-400 font-medium block mb-1">Email</label>
          <input
            v-model="formData.email"
            type="email"
            :class="claseCampo('email')"
            class="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-100 transition-colors"
            placeholder="carlos@inytel.es"
            @blur="marcarTocado('email')"
          />
          <p
            v-if="tocados.email && erroresCampo.email"
            class="text-rose-500 text-xs mt-1"
          >
            {{ erroresCampo.email }}
          </p>
        </div>

        <!-- Teléfono -->
        <div>
          <label class="text-slate-400 font-medium block mb-1">Teléfono</label>
          <input
            v-model="formData.telefono"
            type="text"
            :class="claseCampo('telefono')"
            class="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-100 transition-colors"
            placeholder="612 345 678"
            @blur="marcarTocado('telefono')"
          />
          <p
            v-if="tocados.telefono && erroresCampo.telefono"
            class="text-rose-500 text-xs mt-1"
          >
            {{ erroresCampo.telefono }}
          </p>
        </div>

        <!-- Departamento -->
        <div>
          <label class="text-slate-400 font-medium block mb-1"
            >Departamento</label
          >
          <input
            v-model="formData.departamento"
            type="text"
            :class="claseCampo('departamento')"
            class="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-100 transition-colors"
            placeholder="Infraestructura"
            @blur="marcarTocado('departamento')"
          />
          <p
            v-if="tocados.departamento && erroresCampo.departamento"
            class="text-rose-500 text-xs mt-1"
          >
            {{ erroresCampo.departamento }}
          </p>
        </div>

        <!-- Fecha de alta -->
        <div>
          <label class="text-slate-400 font-medium block mb-1"
            >Fecha de alta</label
          >
          <input
            v-model="formData.fecha_alta"
            type="date"
            :class="claseCampo('fecha_alta')"
            class="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-100 transition-colors"
            @blur="marcarTocado('fecha_alta')"
          />
          <p
            v-if="tocados.fecha_alta && erroresCampo.fecha_alta"
            class="text-rose-500 text-xs mt-1"
          >
            {{ erroresCampo.fecha_alta }}
          </p>
        </div>

        <!-- Separador -->
        <div class="pt-2 pb-1">
          <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Jornada laboral
          </p>
        </div>

        <!-- Horas semanales -->
        <div>
          <label class="text-slate-400 font-medium block mb-1"
            >Horas semanales</label
          >
          <div class="flex items-center gap-3">
            <input
              v-model.number="formData.horas_semanales"
              type="number"
              min="1"
              max="60"
              class="w-full border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-colors"
              placeholder="40"
            />
            <span class="text-slate-400 font-medium shrink-0">h/semana</span>
          </div>
          <p class="text-slate-400 text-xs mt-1">
            {{
              formData.horas_semanales && diasSeleccionados.length
                ? (formData.horas_semanales / diasSeleccionados.length).toFixed(
                    1,
                  ) + " h/día"
                : ""
            }}
          </p>
        </div>

        <!-- Días laborables -->
        <div>
          <label class="text-slate-400 font-medium block mb-2"
            >Días laborables</label
          >
          <div class="flex gap-2">
            <button
              v-for="dia in diasSemana"
              :key="dia.num"
              type="button"
              @click="toggleDia(dia.num)"
              :class="
                diasSeleccionados.includes(dia.num)
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
              "
              class="flex-1 h-10 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              {{ dia.label }}
            </button>
          </div>
        </div>
      </div>

      <div class="mt-6 flex gap-3">
        <button
          @click="emit('cancelar')"
          class="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          @click="emit('guardar')"
          class="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-colors cursor-pointer"
        >
          {{ modoEdicion ? "Guardar cambios" : "Crear empleado" }}
        </button>
      </div>
    </div>
  </div>
</template>
