import { ref } from "vue";
import axios from "axios";

export function useEmployees() {
  const employees = ref([]);
  const loading = ref(false);

  async function fetchEmployees() {
    try {
      loading.value = true;
      const { data } = await axios.get("/api/empleados");
      employees.value = data;
    } catch (err) {
      console.error("Error fetchEmployees:", err);
    } finally {
      loading.value = false;
    }
  }

  async function crearEmpleado(datos) {
    const { data } = await axios.post("/api/empleados", datos);
    await fetchEmployees();
    return data;
  }

  async function editarEmpleado(id, datos) {
    await axios.put(`/api/empleados/${id}`, datos);
    await fetchEmployees();
  }

  async function eliminarEmpleado(id) {
    await axios.delete(`/api/empleados/${id}`);
    await fetchEmployees();
  }

  return { employees, loading, fetchEmployees, crearEmpleado, editarEmpleado, eliminarEmpleado };
}