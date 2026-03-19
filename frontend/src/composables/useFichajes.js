import { ref } from "vue";
import axios from "axios";

export function useFichajes() {
  const historial = ref([]);
  const loadingHistorial = ref(false);
  const periodoActivo = ref("semana");
  const errorFichaje = ref("");

  async function fetchHistorial(empleado_id, periodo = "semana") {
    try {
      loadingHistorial.value = true;
      const token = localStorage.getItem("token");
      const { data } = await axios.get(
        `/api/fichajes/${empleado_id}?periodo=${periodo}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      historial.value = data;
    } catch (err) {
      console.error("Error fetchHistorial:", err);
    } finally {
      loadingHistorial.value = false;
    }
  }

  async function cambiarPeriodo(empleado_id, periodo) {
    periodoActivo.value = periodo;
    await fetchHistorial(empleado_id, periodo);
  }

  async function fichar(empleado_id, tipo) {
    errorFichaje.value = "";
    try {
      const token = localStorage.getItem("token");
      const endpoint = tipo === "ENTRADA" ? "entrada" : "salida";
      await axios.post(
        `/api/fichajes/${endpoint}`,
        { empleado_id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchHistorial(empleado_id, periodoActivo.value);
      return { ok: true };
    } catch (err) {
      errorFichaje.value = err.response?.data?.error || "Error al fichar";
      return { ok: false, error: errorFichaje.value };
    }
  }

  function formatJornada(jornada) {
    const fecha = formatFecha(jornada.fecha_entrada);
    const entrada = jornada.hora_entrada?.slice(0, 5) || "--:--";
    const salida = jornada.hora_salida?.slice(0, 5) || null;
    const duracion = calcularDuracion(jornada.hora_entrada, jornada.hora_salida);
    return { fecha, entrada, salida, duracion, incidencia: !!jornada.motivo_incidencia };
  }

  function formatFecha(fecha) {
    if (!fecha) return "";
    const str = fecha instanceof Date
      ? fecha.toISOString().slice(0, 10)
      : String(fecha).slice(0, 10);
    return new Date(str + "T12:00:00").toLocaleDateString("es-ES", {
      weekday: "short", day: "2-digit", month: "2-digit", year: "numeric",
    });
  }

  function calcularDuracion(horaEntrada, horaSalida) {
    if (!horaEntrada || !horaSalida) return null;
    const [he, me] = horaEntrada.split(":").map(Number);
    const [hs, ms] = horaSalida.split(":").map(Number);
    const mins = (hs * 60 + ms) - (he * 60 + me);
    if (mins <= 0) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  function formatFechaHora(fechaHora) {
    if (!fechaHora) return "";
    return new Date(fechaHora).toLocaleString("es-ES", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  return {
    historial, loadingHistorial, periodoActivo, errorFichaje,
    fetchHistorial, cambiarPeriodo, fichar,
    formatJornada, formatFecha, calcularDuracion, formatFechaHora,
  };
}