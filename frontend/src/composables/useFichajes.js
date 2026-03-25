/**
 * useFichajes.js — Composable para la gestión de fichajes y jornadas
 *
 * Gestiona el estado de los registros horarios, la navegación por periodos
 * (día, semana, mes) y las acciones de entrada/salida de empleados.
 * * Funcionalidades principales:
 * - Obtención de historial desde API con filtrado dinámico.
 * - Cálculo de etiquetas temporales para navegación (UI).
 * - Procesamiento y formateo de datos de jornada para visualización.
 * - Gestión de errores y estados de carga.
 *
 * Usado habitualmente en vistas de Panel de Control o Historial de Empleado.
 */

import { ref, computed } from "vue";
import axios from "axios";

export function useFichajes() {
  // --- ESTADO REACTIVO ---

  // Listado de registros obtenidos del servidor
  const historial = ref([]);

  // Estado de carga para feedback visual (spinners/esqueletos)
  const loadingHistorial = ref(false);

  // Filtro temporal seleccionado: "hoy", "semana" o "mes"
  const periodoActivo = ref("semana");

  // Mensaje de error descriptivo capturado tras un fallo en la API
  const errorFichaje = ref("");

  // Desplazamiento respecto al periodo actual (0=actual, -1=anterior, +1=siguiente)
  const offset = ref(0);

  // --- COMPUTED PROPERTIES ---

  /**
   * Genera la etiqueta de texto para la navegación según el periodo y offset.
   * Ejemplo: "lun, 20 mar", "18 mar – 24 mar" o "marzo de 2026".
   * * @returns {string} Texto formateado para mostrar en el selector de fechas.
   */
  const etiquetaPeriodo = computed(() => {
    const hoy = new Date();
    
    if (periodoActivo.value === "hoy") {
      const d = new Date(hoy);
      d.setDate(d.getDate() + offset.value);
      return d.toLocaleDateString("es-ES", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      });
    }
    
    if (periodoActivo.value === "semana") {
      const d = new Date(hoy);
      d.setDate(d.getDate() + offset.value * 7);
      const dia = d.getDay() || 7;
      const lunes = new Date(d);
      lunes.setDate(d.getDate() - dia + 1);
      const domingo = new Date(lunes);
      domingo.setDate(lunes.getDate() + 6);
      const fmt = (x) =>
        x.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
      return `${fmt(lunes)} – ${fmt(domingo)}`;
    }
    
    if (periodoActivo.value === "mes") {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() + offset.value, 1);
      return d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    }
    
    return "";
  });

  // --- MÉTODOS DE APOYO (HELPERS) ---

  /**
   * Construye el objeto de parámetros necesario para la consulta a la API
   * basándose en el estado actual de periodoActivo y offset.
   * * @returns {Object} Payload con el tipo de periodo y la fecha de referencia.
   */
  function getParams() {
    const hoy = new Date();
    if (periodoActivo.value === "hoy") {
      const d = new Date(hoy);
      d.setDate(d.getDate() + offset.value);
      return { periodo: "hoy", fecha: d.toISOString().slice(0, 10) };
    }
    if (periodoActivo.value === "semana") {
      const d = new Date(hoy);
      d.setDate(d.getDate() + offset.value * 7);
      const dia = d.getDay() || 7;
      const lunes = new Date(d);
      lunes.setDate(d.getDate() - dia + 1);
      return { periodo: "semana", fecha: lunes.toISOString().slice(0, 10) };
    }
    if (periodoActivo.value === "mes") {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() + offset.value, 1);
      return { periodo: "mes", fecha: d.toISOString().slice(0, 10) };
    }
    return { periodo: periodoActivo.value };
  }

  // --- ACCIONES ASÍNCRONAS (API) ---

  /**
   * Recupera el historial de fichajes de la API para un empleado específico.
   * Incluye la cabecera de autorización Bearer Token.
   * * @param {number|string} empleado_id - ID del empleado a consultar.
   */
  async function fetchHistorial(empleado_id) {
    try {
      loadingHistorial.value = true;
      const token = localStorage.getItem("token");
      const params = getParams();
      const query = new URLSearchParams(params).toString();
      const { data } = await axios.get(
        `/api/fichajes/${empleado_id}?${query}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      historial.value = data;
    } catch (err) {
      console.error("Error fetchHistorial:", err);
    } finally {
      loadingHistorial.value = false;
    }
  }

  /**
   * Cambia el tipo de filtro temporal y reinicia el offset a cero.
   * * @param {number|string} empleado_id - ID del empleado.
   * @param {string} periodo - Nuevo periodo ("hoy", "semana", "mes").
   */
  async function cambiarPeriodo(empleado_id, periodo) {
    periodoActivo.value = periodo;
    offset.value = 0;
    await fetchHistorial(empleado_id);
  }

  /**
   * Desplaza la ventana temporal hacia adelante o atrás y actualiza los datos.
   * * @param {number|string} empleado_id - ID del empleado.
   * @param {number} dir - Dirección del desplazamiento (1 o -1).
   */
  async function navegarPeriodo(empleado_id, dir) {
    offset.value += dir;
    await fetchHistorial(empleado_id);
  }

  /**
   * Registra un nuevo evento de fichaje (Entrada o Salida).
   * * @param {number|string} empleado_id - ID del empleado que ficha.
   * @param {string} tipo - Tipo de acción: "ENTRADA" o "SALIDA".
   * @returns {Promise<Object>} Resultado de la operación { ok: boolean, error?: string }.
   */
  async function fichar(empleado_id, tipo) {
    errorFichaje.value = "";
    try {
      const token = localStorage.getItem("token");
      const endpoint = tipo === "ENTRADA" ? "entrada" : "salida";
      await axios.post(
        `/api/fichajes/${endpoint}`,
        { empleado_id },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      await fetchHistorial(empleado_id);
      return { ok: true };
    } catch (err) {
      errorFichaje.value = err.response?.data?.error || "Error al fichar";
      return { ok: false, error: errorFichaje.value };
    }
  }

  // --- FORMATEO DE DATOS PARA UI ---

  /**
   * Transforma un objeto de jornada crudo del back-end a un formato
   * optimizado para su visualización en tablas o tarjetas.
   * * @param {Object} jornada - Registro de jornada original.
   * @returns {Object} Jornada procesada con campos formateados.
   */
  function formatJornada(jornada) {
    const fecha = formatFecha(jornada.fecha_entrada);
    const entrada = jornada.hora_entrada?.slice(0, 5) || "--:--";
    const salida = jornada.hora_salida?.slice(0, 5) || null;
    const duracion = calcularDuracion(
      jornada.hora_entrada,
      jornada.hora_salida,
    );
    return {
      fecha,
      entrada,
      salida,
      duracion,
      incidencia: !!jornada.motivo_incidencia,
    };
  }

  /**
   * Convierte una cadena de fecha o Date a formato legible: "lun, 10/05/2026".
   * * @param {string|Date} fecha 
   * @returns {string} Fecha formateada en es-ES.
   */
  function formatFecha(fecha) {
    if (!fecha) return "";
    const str =
      fecha instanceof Date
        ? fecha.toISOString().slice(0, 10)
        : String(fecha).slice(0, 10);
    return new Date(str + "T12:00:00").toLocaleDateString("es-ES", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  /**
   * Calcula la diferencia temporal entre dos horas y devuelve un string legible.
   * Ejemplo: "8h 30m".
   * * @param {string} horaEntrada - HH:mm:ss
   * @param {string} horaSalida - HH:mm:ss
   * @returns {string|null} Duración formateada o null si faltan datos.
   */
  function calcularDuracion(horaEntrada, horaSalida) {
    if (!horaEntrada || !horaSalida) return null;
    const [he, me] = horaEntrada.split(":").map(Number);
    const [hs, ms] = horaSalida.split(":").map(Number);
    const mins = hs * 60 + ms - (he * 60 + me);
    if (mins <= 0) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  /**
   * Formatea una fecha y hora completa.
   * * @param {string|Date} fechaHora 
   * @returns {string} Ejemplo: "10/05/2026, 08:30".
   */
  function formatFechaHora(fechaHora) {
    if (!fechaHora) return "";
    return new Date(fechaHora).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return {
    historial,
    loadingHistorial,
    periodoActivo,
    errorFichaje,
    offset,
    etiquetaPeriodo,
    fetchHistorial,
    cambiarPeriodo,
    navegarPeriodo,
    fichar,
    formatJornada,
    formatFecha,
    calcularDuracion,
    formatFechaHora,
  };
}