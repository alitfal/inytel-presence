<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import AdminLayout from "../components/AdminLayout.vue";
import EmployeeCard from "../components/EmployeeCard.vue";
import EmployeeModal from "../components/EmployeeModal.vue";
import EmployeeForm from "../components/EmployeeForm.vue";
import CambiarPasswordModal from "../components/CambiarPasswordModal.vue";
import { MoreHorizontal, KeyRound, UserX, UserCheck } from "lucide-vue-next";
import { useEmployees } from "../composables/useEmployees";
import { useEmployeeForm } from "../composables/useEmployeeForm";
import axios from "axios";

const API = "/api";
const searchQuery = ref("");
const empleadoSeleccionado = ref(null);
const vistaGrid = ref(true);
const mostrarCambiarPassword = ref(false);
const credencialesNuevas = ref(null);

const menuAbierto = ref(null);
const menuBtn = ref(null);
const mostrandoResetId = ref(null);
const passwordReset = ref("");
const passwordResetConfirm = ref("");
const errorReset = ref("");
const exitoReset = ref(false);
const loadingReset = ref(false);
const loadingActivo = ref(false);

const loadingRefresh = ref(false);
const ultimaActualizacion = ref(null);
const flashVerde = ref(false);
let refreshInterval = null;

async function refrescar() {
  loadingRefresh.value = true;
  await fetchEmployees();
  ultimaActualizacion.value = new Date().toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
  loadingRefresh.value = false;
  flashVerde.value = true;
  setTimeout(() => {
    flashVerde.value = false;
  }, 1500);
}

function toggleMenuLista(id) {
  menuAbierto.value = menuAbierto.value === id ? null : id;
  mostrandoResetId.value = null;
  passwordReset.value = "";
  passwordResetConfirm.value = "";
  errorReset.value = "";
  exitoReset.value = false;
}

async function resetPasswordLista(employee) {
  errorReset.value = "";
  if (!passwordReset.value || passwordReset.value.length < 6) {
    errorReset.value = "Mínimo 6 caracteres";
    return;
  }
  if (passwordReset.value !== passwordResetConfirm.value) {
    errorReset.value = "Las contraseñas no coinciden";
    return;
  }
  try {
    loadingReset.value = true;
    await axios.put(`${API}/auth/reset/${employee.id}`, {
      password_nueva: passwordReset.value,
    });
    exitoReset.value = true;
    setTimeout(() => {
      menuAbierto.value = null;
      mostrandoResetId.value = null;
      exitoReset.value = false;
      passwordReset.value = "";
      passwordResetConfirm.value = "";
    }, 1500);
  } catch (err) {
    errorReset.value = err.response?.data?.error || "Error al resetear";
  } finally {
    loadingReset.value = false;
  }
}

async function toggleActivoLista(employee) {
  try {
    loadingActivo.value = true;
    await axios.put(`${API}/empleados/${employee.id}/activo`, {
      activo: employee.activo ? 0 : 1,
    });
    await fetchEmployees();
    menuAbierto.value = null;
  } catch (err) {
    console.error("Error:", err);
  } finally {
    loadingActivo.value = false;
  }
}

const {
  employees,
  loading,
  fetchEmployees,
  crearEmpleado,
  editarEmpleado,
  eliminarEmpleado,
} = useEmployees();
const {
  mostrarFormulario,
  modoEdicion,
  formData,
  erroresCampo,
  tocados,
  validarFormulario,
  abrirNuevo,
  abrirEditar,
  cerrarFormulario,
  claseCampo,
  marcarTocado,
} = useEmployeeForm();

const filteredEmployees = computed(() =>
  employees.value.filter(
    (p) =>
      p.nombre.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      p.cargo.toLowerCase().includes(searchQuery.value.toLowerCase()),
  ),
);

function abrirFicha(employee) {
  empleadoSeleccionado.value = employee;
}
function cerrarFicha() {
  empleadoSeleccionado.value = null;
}
function handleEditar(employee) {
  cerrarFicha();
  abrirEditar(employee);
}

async function handleFichar(tipo) {
  empleadoSeleccionado.value = {
    ...empleadoSeleccionado.value,
    estado: tipo === "ENTRADA" ? "DENTRO" : "FUERA",
  };
  const emp = employees.value.find(
    (e) => e.id === empleadoSeleccionado.value.id,
  );
  if (emp) emp.estado = empleadoSeleccionado.value.estado;
}

async function handleEliminar(employee) {
  if (
    !confirm(
      `¿Eliminar a ${employee.nombre}? Esta acción no se puede deshacer.`,
    )
  )
    return;
  await eliminarEmpleado(employee.id);
  cerrarFicha();
}

async function guardarEmpleado() {
  if (!validarFormulario()) return;
  if (modoEdicion.value) {
    await editarEmpleado(formData.value.id, formData.value);
    cerrarFormulario();
  } else {
    const emailEmpleado = formData.value.email;
    const dniEmpleado = formData.value.dni;
    await crearEmpleado(formData.value);
    cerrarFormulario();
    credencialesNuevas.value = { email: emailEmpleado, password: dniEmpleado };
  }
}

onMounted(async () => {
  await refrescar();
  refreshInterval = setInterval(refrescar, 60_000);
});
onUnmounted(() => clearInterval(refreshInterval));
</script>

<template>
  <AdminLayout
    v-model:search-query="searchQuery"
    @abrir-nuevo="abrirNuevo"
    @cambiar-password="mostrarCambiarPassword = true"
  >
    <div class="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto w-full">
      <!-- Cabecera -->
      <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div class="flex items-center gap-3">
          <button
            @click="vistaGrid = !vistaGrid"
            class="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-base sm:text-lg cursor-pointer"
          >
            {{ vistaGrid ? "☰" : "⊞" }}
          </button>
          <h2
            class="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 italic"
          >
            Equipo
          </h2>
        </div>

        <!-- Refresh -->
        <div class="flex items-center gap-2">
          <span
            v-if="ultimaActualizacion"
            class="text-xs font-medium transition-colors duration-700 hidden sm:inline"
            :class="flashVerde ? 'text-emerald-500' : 'text-slate-400'"
          >
            Actualizado {{ ultimaActualizacion }}
          </span>
          <button
            @click="refrescar"
            :disabled="loadingRefresh"
            class="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-600 font-bold text-sm rounded-xl transition-all cursor-pointer"
          >
            <span
              :class="loadingRefresh ? 'animate-spin' : ''"
              class="inline-block text-base"
              >↻</span
            >
            <span class="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      <div
        v-if="loading && !ultimaActualizacion"
        class="flex justify-center py-20 animate-pulse text-indigo-600 font-bold"
      >
        Cargando equipo...
      </div>

      <template v-else>
        <!-- Vista grid: 2 cols móvil, 2 tablet, 3 lg, 4 xl -->
        <div
          v-if="vistaGrid"
          class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6"
        >
          <EmployeeCard
            v-for="person in filteredEmployees"
            :key="person.id"
            :employee="person"
            @ver-ficha="abrirFicha"
            @actualizar="fetchEmployees"
          />
        </div>

        <!-- Vista listado — compacta -->
        <div v-else class="flex flex-col gap-2" style="overflow: visible">
          <div
            v-for="person in filteredEmployees"
            :key="person.id"
            class="bg-white border border-slate-100 rounded-2xl px-3 sm:px-5 py-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-all"
            style="overflow: visible"
          >
            <!-- Avatar -->
            <div
              @click="abrirFicha(person)"
              class="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shrink-0 cursor-pointer text-sm"
              :class="!person.activo ? 'opacity-40' : ''"
            >
              {{ person.nombre.charAt(0) }}
            </div>

            <!-- Nombre + cargo -->
            <div
              @click="abrirFicha(person)"
              class="flex-1 min-w-0 cursor-pointer"
              :class="!person.activo ? 'opacity-40' : ''"
            >
              <p class="font-bold text-slate-900 text-sm truncate">
                {{ person.nombre }}
              </p>
              <p class="text-slate-400 text-xs truncate hidden sm:block">
                {{ person.cargo }} · {{ person.departamento }}
              </p>
              <p class="text-slate-400 text-xs truncate sm:hidden">
                {{ person.cargo }}
              </p>
            </div>

            <!-- Estado -->
            <span
              :class="[
                person.estado === 'DENTRO'
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-slate-100 text-slate-400',
                !person.activo ? 'opacity-40' : '',
              ]"
              class="text-[10px] font-bold px-2 py-1 rounded-lg uppercase shrink-0"
            >
              {{ person.estado === "DENTRO" ? "● Dentro" : "○ Fuera" }}
            </span>

            <!-- Menú -->
            <div class="relative shrink-0">
              <button
                @click.stop="toggleMenuLista(person.id)"
                class="text-slate-300 hover:text-slate-600 p-1 cursor-pointer"
              >
                <MoreHorizontal class="w-4 h-4" />
              </button>
              <div
                v-if="menuAbierto === person.id"
                class="absolute right-0 top-8 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 w-52 p-2"
              >
                <div v-if="mostrandoResetId !== person.id">
                  <button
                    @click="mostrandoResetId = person.id"
                    class="w-full text-left px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <KeyRound class="w-4 h-4" /> Resetear contraseña
                  </button>
                  <button
                    @click="toggleActivoLista(person)"
                    :disabled="loadingActivo"
                    :class="
                      person.activo
                        ? 'text-rose-500 hover:bg-rose-50'
                        : 'text-emerald-600 hover:bg-emerald-50'
                    "
                    class="w-full text-left px-3 py-2 text-sm font-medium rounded-xl transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    <UserX v-if="person.activo" class="w-4 h-4" />
                    <UserCheck v-else class="w-4 h-4" />
                    {{ person.activo ? "Desactivar acceso" : "Activar acceso" }}
                  </button>
                  <hr class="my-1 border-slate-100" />
                  <button
                    @click="menuAbierto = null"
                    class="w-full text-left px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
                <div v-else class="px-1 py-1">
                  <p class="text-xs font-bold text-slate-500 mb-2 px-2">
                    Nueva contraseña
                  </p>
                  <input
                    v-model="passwordReset"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    class="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 transition-colors mb-2"
                  />
                  <input
                    v-model="passwordResetConfirm"
                    type="password"
                    placeholder="Confirmar contraseña"
                    class="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 transition-colors mb-2"
                    @keyup.enter="resetPasswordLista(person)"
                  />
                  <p v-if="errorReset" class="text-rose-500 text-xs mb-2 px-1">
                    {{ errorReset }}
                  </p>
                  <p
                    v-if="exitoReset"
                    class="text-emerald-500 text-xs mb-2 px-1"
                  >
                    ✓ Contraseña actualizada
                  </p>
                  <div class="flex gap-2">
                    <button
                      @click="mostrandoResetId = null"
                      class="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Atrás
                    </button>
                    <button
                      @click="resetPasswordLista(person)"
                      :disabled="loadingReset"
                      class="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer"
                    >
                      {{ loadingReset ? "..." : "Guardar" }}
                    </button>
                  </div>
                </div>
              </div>
              <div
                v-if="menuAbierto === person.id"
                class="fixed inset-0 z-0"
                @click="menuAbierto = null"
              ></div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Modales -->
    <EmployeeModal
      v-if="empleadoSeleccionado"
      :employee="empleadoSeleccionado"
      @cerrar="cerrarFicha"
      @editar="handleEditar"
      @eliminar="handleEliminar"
      @fichar="handleFichar"
    />
    <EmployeeForm
      v-if="mostrarFormulario"
      :formData="formData"
      :erroresCampo="erroresCampo"
      :tocados="tocados"
      :modoEdicion="modoEdicion"
      :claseCampo="claseCampo"
      :marcarTocado="marcarTocado"
      @guardar="guardarEmpleado"
      @cancelar="cerrarFormulario"
    />
    <CambiarPasswordModal
      v-if="mostrarCambiarPassword"
      @cerrar="mostrarCambiarPassword = false"
    />

    <!-- Modal credenciales nuevas -->
    <div
      v-if="credencialesNuevas"
      class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div class="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl">
        <div
          class="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4"
        >
          <span class="text-emerald-600 text-xl font-bold">✓</span>
        </div>
        <h2 class="text-xl font-bold text-slate-900 mb-1">Empleado creado</h2>
        <p class="text-slate-400 text-sm mb-6">
          Comparte estas credenciales con el empleado
        </p>
        <div class="space-y-3 text-sm">
          <div
            class="bg-slate-50 rounded-2xl px-4 py-3 flex justify-between items-center gap-2"
          >
            <span class="text-slate-400 font-medium shrink-0">Email</span>
            <span class="text-slate-700 font-bold truncate">{{
              credencialesNuevas.email
            }}</span>
          </div>
          <div
            class="bg-slate-50 rounded-2xl px-4 py-3 flex justify-between items-center gap-2"
          >
            <span class="text-slate-400 font-medium shrink-0">Contraseña</span>
            <span class="text-slate-700 font-bold">{{
              credencialesNuevas.password
            }}</span>
          </div>
        </div>
        <p class="text-xs text-slate-400 mt-4 text-center">
          El empleado debería cambiar su contraseña en el primer acceso
        </p>
        <button
          @click="credencialesNuevas = null"
          class="mt-6 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-colors cursor-pointer"
        >
          Entendido
        </button>
      </div>
    </div>
  </AdminLayout>
</template>
