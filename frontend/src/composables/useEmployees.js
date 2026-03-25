/**
 * useEmployees.js — Composable de gestión de empleados
 *
 * Centraliza todas las operaciones CRUD sobre empleados:
 * carga, creación, edición y eliminación.
 * Tras cada operación de escritura recarga la lista completa
 * para mantener el estado sincronizado con la base de datos.
 *
 * Usado principalmente en EquipoView.vue y EmployeeForm.vue.
 */

import { ref } from "vue";
import axios from "axios";

export function useEmployees() {
  // Lista reactiva de empleados cargados desde la API
  const employees = ref([]);

  // Indica si hay una petición en curso para mostrar estados de carga
  const loading = ref(false);

  /**
   * Carga todos los empleados desde la API.
   * El estado de cada empleado (DENTRO/FUERA) se calcula
   * dinámicamente en el backend en tiempo real.
   */
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

  /**
   * Crea un nuevo empleado y su usuario de acceso asociado.
   * El backend genera automáticamente las credenciales usando el DNI
   * como contraseña temporal y envía un email de bienvenida.
   *
   * @param {Object} datos - Datos del nuevo empleado
   * @returns {Object} Respuesta de la API con el ID creado
   */
  async function crearEmpleado(datos) {
    const { data } = await axios.post("/api/empleados", datos);
    await fetchEmployees();
    return data;
  }

  /**
   * Actualiza los datos de un empleado existente.
   *
   * @param {number} id - ID del empleado a editar
   * @param {Object} datos - Nuevos datos del empleado
   */
  async function editarEmpleado(id, datos) {
    await axios.put(`/api/empleados/${id}`, datos);
    await fetchEmployees();
  }

  /**
   * Elimina un empleado y todos sus datos asociados.
   * La eliminación incluye sus fichajes y su usuario de acceso.
   *
   * @param {number} id - ID del empleado a eliminar
   */
  async function eliminarEmpleado(id) {
    await axios.delete(`/api/empleados/${id}`);
    await fetchEmployees();
  }

  return {
    employees,
    loading,
    fetchEmployees,
    crearEmpleado,
    editarEmpleado,
    eliminarEmpleado,
  };
}