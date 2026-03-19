import { ref, computed } from "vue";

export function useEmployeeForm() {
  const mostrarFormulario = ref(false);
  const modoEdicion = ref(false);
  const errores = ref({});
  const tocados = ref({});

  function hoyISO() {
    return new Date().toISOString().split("T")[0];
  }

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
      horas_semanales: 40,        // ← nuevo
      dias_laborables: "1,2,3,4,5", // ← nuevo
    };
  }

  const formData = ref(formularioVacio());

  function validarDNI(dni) {
    return /^[0-9]{8}[A-Za-z]$/.test(dni);
  }

  function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  const erroresCampo = computed(() => {
    const e = {};
    const f = formData.value;
    if (!f.nombre.trim()) e.nombre = "El nombre es obligatorio";
    if (!f.cargo.trim()) e.cargo = "El cargo es obligatorio";
    if (!f.departamento.trim()) e.departamento = "El departamento es obligatorio";
    if (!f.telefono.trim()) e.telefono = "El teléfono es obligatorio";
    if (!f.fecha_alta) e.fecha_alta = "La fecha de alta es obligatoria";
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

  function claseCampo(campo) {
    if (!tocados.value[campo]) return "border-slate-200";
    return erroresCampo.value[campo] ? "border-rose-400" : "border-emerald-400";
  }

  function marcarTocado(campo) {
    tocados.value[campo] = true;
  }

  function validarFormulario() {
    ["nombre", "cargo", "departamento", "telefono", "fecha_alta", "dni", "email"].forEach((c) => {
      tocados.value[c] = true;
    });
    errores.value = erroresCampo.value;
    return Object.keys(erroresCampo.value).length === 0;
  }

  function abrirNuevo() {
    modoEdicion.value = false;
    errores.value = {};
    tocados.value = {};
    formData.value = formularioVacio();
    mostrarFormulario.value = true;
  }

  function abrirEditar(employee) {
    modoEdicion.value = true;
    errores.value = {};
    tocados.value = {};
    formData.value = {
      id: employee.id,
      nombre: employee.nombre,
      cargo: employee.cargo,
      email: employee.email,
      telefono: employee.telefono,
      departamento: employee.departamento,
      fecha_alta: employee.fecha_alta ? employee.fecha_alta.split("T")[0] : hoyISO(),
      dni: employee.dni,
      horas_semanales: employee.horas_semanales ?? 40,          // ← nuevo
      dias_laborables: employee.dias_laborables ?? "1,2,3,4,5", // ← nuevo
    };
    mostrarFormulario.value = true;
  }

  function cerrarFormulario() {
    mostrarFormulario.value = false;
    errores.value = {};
    tocados.value = {};
  }

  return {
    mostrarFormulario, modoEdicion, formData, errores, erroresCampo, tocados,
    validarFormulario, abrirNuevo, abrirEditar, cerrarFormulario,
    claseCampo, marcarTocado,
  };
}