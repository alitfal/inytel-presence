<script setup>
/**
 * EmployeeForm.vue — Formulario de alta y edición de empleados
 *
 * Componente modal que centraliza la gestión de datos de los empleados.
 * Incluye validación visual por campo y un gestor de jornada laboral
 * (horas semanales y días laborables).
 *
 * Contexto de uso:
 * Se abre desde la vista de administración para crear un nuevo perfil
 * o editar uno existente, inyectando los datos y errores desde el padre.
 *
 * Props:
 * @prop {Object} formData      - Objeto reactivo con los datos del empleado (nombre, cargo, dni, etc.)
 * @prop {Object} erroresCampo  - Diccionario con los mensajes de error por cada campo
 * @prop {Object} tocados       - Registro de qué campos han sido interactuados por el usuario
 * @prop {Boolean} modoEdicion  - Define si el título y botones deben indicar "Editar" o "Crear"
 * @prop {Function} claseCampo  - Función externa que devuelve las clases CSS según el estado del campo
 * @prop {Function} marcarTocado - Función externa para registrar el evento 'blur' en un campo
 *
 * Eventos emitidos:
 * @emits guardar - Dispara la lógica de persistencia en el componente padre
 * @emits cancelar - Cierra el modal sin guardar cambios
 */

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

/**
 * Listado estático de los días de la semana para la selección de jornada.
 */
const diasSemana = [
  { num: 1, label: "L" },
  { num: 2, label: "M" },
  { num: 3, label: "X" },
  { num: 4, label: "J" },
  { num: 5, label: "V" },
  { num: 6, label: "S" },
  { num: 7, label: "D" },
];

/**
 * Propiedad computada con Getter/Setter para sincronizar la interfaz con el modelo.
 * - Get: Convierte el string de la DB ("1,2,3") en un Array para los botones de la UI.
 * - Set: Ordena y convierte el Array de vuelta a un string separado por comas para el formData.
 */
const diasSeleccionados = computed({
  get() {
    if (!props.formData.dias_laborables) return [1, 2, 3, 4, 5]; // Valor por defecto
    return props.formData.dias_laborables.split(",").map(Number);
  },
  set(val) {
    props.formData.dias_laborables = val.sort((a, b) => a - b).join(",");
  },
});

/**
 * Añade o elimina un día de la selección de la jornada.
 * Garantiza que el empleado siempre tenga al menos un día seleccionado.
 * @param {Number} num - Identificador del día (1-7)
 */
function toggleDia(num) {
  const actual = [...diasSeleccionados.value];
  const idx = actual.indexOf(num);
  if (idx === -1) {
    actual.push(num);
  } else if (actual.length > 1) {
    actual.splice(idx, 1);
  }
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

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-slate-400 font-medium block mb-1">DNI</label>
            <input
              v-model="formData.dni"
              type="text"
              :class="claseCampo('dni')"
              class="w-full border rounded-2xl px-4 py-3 outline-none"
              placeholder="12345678A"
              @blur="marcarTocado('dni')"
            />
          </div>
          <div>
            <label class="text-slate-400 font-medium block mb-1"
              >Teléfono</label
            >
            <input
              v-model="formData.telefono"
              type="text"
              :class="claseCampo('telefono')"
              class="w-full border rounded-2xl px-4 py-3 outline-none"
              placeholder="612 345 678"
              @blur="marcarTocado('telefono')"
            />
          </div>
        </div>

        <div>
          <label class="text-slate-400 font-medium block mb-1">Email</label>
          <input
            v-model="formData.email"
            type="email"
            :class="claseCampo('email')"
            class="w-full border rounded-2xl px-4 py-3 outline-none"
            placeholder="carlos@empresa.es"
            @blur="marcarTocado('email')"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-slate-400 font-medium block mb-1"
              >Departamento</label
            >
            <input
              v-model="formData.departamento"
              type="text"
              :class="claseCampo('departamento')"
              class="w-full border rounded-2xl px-4 py-3 outline-none"
              placeholder="Infraestructura"
              @blur="marcarTocado('departamento')"
            />
          </div>
          <div>
            <label class="text-slate-400 font-medium block mb-1"
              >Fecha de alta</label
            >
            <input
              v-model="formData.fecha_alta"
              type="date"
              :class="claseCampo('fecha_alta')"
              class="w-full border rounded-2xl px-4 py-3 outline-none"
              @blur="marcarTocado('fecha_alta')"
            />
          </div>
        </div>

        <div class="pt-4 pb-1">
          <p
            class="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2"
          >
            Jornada laboral
          </p>
        </div>

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
              class="w-full border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-100"
              placeholder="40"
            />
            <span class="text-slate-400 font-medium shrink-0">h/semana</span>
          </div>
          <p
            class="text-slate-400 text-xs mt-2 italic"
            v-if="formData.horas_semanales && diasSeleccionados.length"
          >
            Calculado:
            {{
              (formData.horas_semanales / diasSeleccionados.length).toFixed(1)
            }}
            h/día
          </p>
        </div>

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

      <div class="mt-8 flex gap-3">
        <button
          @click="emit('cancelar')"
          class="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          @click="emit('guardar')"
          class="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-colors cursor-pointer shadow-lg shadow-indigo-200"
        >
          {{ modoEdicion ? "Guardar cambios" : "Crear empleado" }}
        </button>
      </div>
    </div>
  </div>
</template>
