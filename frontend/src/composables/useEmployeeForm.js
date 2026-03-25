/**
 * useEmployeeForm.js — Composable del formulario de empleados
 *
 * Gestiona el estado y la validación del formulario de creación
 * y edición de empleados. Soporta dos modos de operación:
 * - Nuevo empleado: inicializa el formulario vacío
 * - Editar empleado: precarga los datos del empleado seleccionado
 *
 * Incluye validación en tiempo real con feedback visual por campo
 * y validación completa al intentar guardar.
 *
 * Usado en EquipoView.vue junto con el componente EmployeeForm.vue.
 */

import { ref, computed } from "vue";

export function useEmployeeForm() {
  // Controla la visibilidad del formulario modal
  const mostrarFormulario = ref(false);

  // true = editar empleado existente, false = crear nuevo
  const modoEdicion = ref(false);

  // Errores de validación del último intento de guardar
  const errores = ref({});

  // Campos que el usuario ha tocado (para mostrar validación progresiva)
  const tocados = ref({});

  /**
   * Devuelve la fecha de hoy en formato ISO (YYYY-MM-DD).
   * Se usa como valor por defecto para fecha_alta.
   */
  function hoyISO() {
    return new Date().toISOString().split("T")[0];
  }

  /**
   * Devuelve un objeto con los valores por defecto del formulario.
   * Se llama al abrir el formulario en modo creación.
   */
  function formularioVacio() {
    return {
      id: null,
      nombre: "",
      cargo: "",
      email: "",
      telefono: "",
      departamento: "",
      fecha_alta: hoyISO(),
      dni: "",
      horas_semanales: 40,           // Jornada estándar de 40h semanales
      dias_laborables: "1,2,3,4,5",  // Lunes a viernes (1=lun, 5=vie)
    };
  }

  // Datos actuales del formulario (reactivos)
  const formData = ref(formularioVacio());

  /**
   * Valida el formato de un DNI español (8 dígitos + letra).
   * @param {string} dni
   * @returns {boolean}
   */
  function validarDNI(dni) {
    return /^[0-9]{8}[A-Za-z]$/.test(dni);
  }

  /**
   * Valida el formato básico de un email.
   * @param {string} email
   * @returns {boolean}
   */
  function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Computed que calcula los errores de validación en tiempo real.
   * Se recalcula automáticamente cada vez que cambia formData.
   * Solo muestra errores en los campos que el usuario ha tocado.
   */
  const erroresCampo = computed(() => {
    const e = {};
    const f = formData.value;
    if (!f.nombre.trim())       e.nombre      = "El nombre es obligatorio";
    if (!f.cargo.trim())        e.cargo       = "El cargo es obligatorio";
    if (!f.departamento.trim()) e.departamento = "El departamento es obligatorio";
    if (!f.telefono.trim())     e.telefono    = "El teléfono es obligatorio";
    if (!f.fecha_alta)          e.fecha_alta  = "La fecha de alta es obligatoria";
    if (!f.dni.trim()) {
      e.dni = "El DNI es obligatorio";
    } else if (!validarDNI(f.dni)) {
      e.dni = "DNI inválido (ej: 12345678A)";
    }
    if (!f.email.trim()) {
      e.email = "El email es obligatorio";
    } else if (!validarEmail(f.email)) {
      e.email = "Email inválido";
    }
    return e;
  });

  /**
   * Devuelve la clase CSS del borde de un campo según su estado:
   * - Sin tocar: gris (neutral)
   * - Tocado con error: rojo
   * - Tocado sin error: verde
   *
   * @param {string} campo - Nombre del campo del formulario
   * @returns {string} Clase Tailwind del borde
   */
  function claseCampo(campo) {
    if (!tocados.value[campo]) return "border-slate-200";
    return erroresCampo.value[campo] ? "border-rose-400" : "border-emerald-400";
  }

  /**
   * Marca un campo como tocado para activar su validación visual.
   * Se llama en el evento @blur de cada input.
   *
   * @param {string} campo - Nombre del campo tocado
   */
  function marcarTocado(campo) {
    tocados.value[campo] = true;
  }

  /**
   * Valida todos los campos del formulario de una vez.
   * Marca todos como tocados para mostrar todos los errores.
   *
   * @returns {boolean} true si el formulario es válido
   */
  function validarFormulario() {
    ["nombre", "cargo", "departamento", "telefono", "fecha_alta", "dni", "email"].forEach((c) => {
      tocados.value[c] = true;
    });
    errores.value = erroresCampo.value;
    return Object.keys(erroresCampo.value).length === 0;
  }

  /**
   * Abre el formulario en modo creación con todos los campos vacíos.
   */
  function abrirNuevo() {
    modoEdicion.value = false;
    errores.value = {};
    tocados.value = {};
    formData.value = formularioVacio();
    mostrarFormulario.value = true;
  }

  /**
   * Abre el formulario en modo edición precargando los datos del empleado.
   * Normaliza la fecha_alta al formato YYYY-MM-DD que requiere el input date.
   *
   * @param {Object} employee - Datos del empleado a editar
   */
  function abrirEditar(employee) {
    modoEdicion.value = true;
    errores.value = {};
    tocados.value = {};
    formData.value = {
      id:              employee.id,
      nombre:          employee.nombre,
      cargo:           employee.cargo,
      email:           employee.email,
      telefono:        employee.telefono,
      departamento:    employee.departamento,
      fecha_alta:      employee.fecha_alta ? employee.fecha_alta.split("T")[0] : hoyISO(),
      dni:             employee.dni,
      horas_semanales: employee.horas_semanales ?? 40,
      dias_laborables: employee.dias_laborables ?? "1,2,3,4,5",
    };
    mostrarFormulario.value = true;
  }

  /**
   * Cierra el formulario y limpia los errores y campos tocados.
   */
  function cerrarFormulario() {
    mostrarFormulario.value = false;
    errores.value = {};
    tocados.value = {};
  }

  return {
    mostrarFormulario,
    modoEdicion,
    formData,
    errores,
    erroresCampo,
    tocados,
    validarFormulario,
    abrirNuevo,
    abrirEditar,
    cerrarFormulario,
    claseCampo,
    marcarTocado,
  };
}