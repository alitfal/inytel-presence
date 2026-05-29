/**
 * Rutas de Control Horario
 * - GET /api/control-horario/admin/mensual  → resumen mensual de todos los empleados (admin)
 * - GET /api/control-horario/empleado/:id/mensual → desglose día a día de un empleado
 */
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authMiddleware, soloAdmin } = require("../middlewares/auth");

function minutosEntreHoras(entrada, salida) {
    if (!entrada || !salida) return 0;
    const [hE, mE] = entrada.split(":").map(Number);
    const [hS, mS] = salida.split(":").map(Number);
    return Math.max(0, hS * 60 + mS - (hE * 60 + mE));
}

function diasLaborablesEnMes(anio, mes, diasLaborables) {
    const dias = (diasLaborables || "1,2,3,4,5").split(",").map(Number);
    const totalDias = new Date(anio, mes, 0).getDate();
    let count = 0;
    for (let d = 1; d <= totalDias; d++) {
        const fecha = new Date(anio, mes - 1, d);
        const diaSemana = fecha.getDay() === 0 ? 7 : fecha.getDay();
        if (dias.includes(diaSemana)) count++;
    }
    return count;
}

router.get("/admin/mensual", authMiddleware, soloAdmin, async (req, res) => {
    try {
        const mesParam = req.query.mes || new Date().toISOString().slice(0, 7);
        const [anio, mes] = mesParam.split("-").map(Number);
        const inicio = `${mesParam}-01`;
        const totalDias = new Date(anio, mes, 0).getDate();
        const fin = `${mesParam}-${String(totalDias).padStart(2, "0")}`;

        const [empleados] = await db.execute(
            "SELECT id, nombre, cargo, departamento, horas_semanales, dias_laborables FROM empleados WHERE activo = 1 ORDER BY nombre"
        );

        const [fichajes] = await db.execute(
            `SELECT empleado_id, fecha_entrada, hora_entrada, hora_salida
       FROM fichajes
       WHERE fecha_entrada BETWEEN ? AND ?
       ORDER BY empleado_id, fecha_entrada`,
            [inicio, fin]
        );

        const fichajesPorEmpleado = {};
        for (const f of fichajes) {
            if (!fichajesPorEmpleado[f.empleado_id]) fichajesPorEmpleado[f.empleado_id] = [];
            fichajesPorEmpleado[f.empleado_id].push(f);
        }

        const resultado = empleados.map((emp) => {
            const fEmp = fichajesPorEmpleado[emp.id] || [];
            const horasSemanales = emp.horas_semanales || 40;
            const diasLab = diasLaborablesEnMes(anio, mes, emp.dias_laborables);
            const minutosPlanificados = Math.round((horasSemanales / 5) * diasLab * 60);

            let minutosT = 0;
            const diasConFichaje = new Set();

            for (const f of fEmp) {
                const mins = minutosEntreHoras(f.hora_entrada, f.hora_salida);
                minutosT += mins;
                diasConFichaje.add(f.fecha_entrada);
            }

            const minutosExtra = Math.max(0, minutosT - minutosPlanificados);
            const balance = minutosT - minutosPlanificados;

            const distribucion = [];
            for (let d = 1; d <= totalDias; d++) {
                const fechaStr = `${mesParam}-${String(d).padStart(2, "0")}`;
                distribucion.push(diasConFichaje.has(fechaStr) ? 1 : 0);
            }

            return {
                id: emp.id,
                nombre: emp.nombre,
                cargo: emp.cargo,
                departamento: emp.departamento,
                horas_trabajadas_min: minutosT,
                horas_planificadas_min: minutosPlanificados,
                balance_min: balance,
                horas_extra_min: minutosExtra,
                horas_trabajadas: `${Math.floor(minutosT / 60)}h ${String(minutosT % 60).padStart(2, "0")}m`,
                horas_planificadas: `${Math.floor(minutosPlanificados / 60)}h ${String(minutosPlanificados % 60).padStart(2, "0")}m`,
                balance: `${balance >= 0 ? "+" : ""}${Math.floor(Math.abs(balance) / 60)}h ${String(Math.abs(balance % 60)).padStart(2, "0")}m`,
                horas_extra: `${Math.floor(minutosExtra / 60)}h ${String(minutosExtra % 60).padStart(2, "0")}m`,
                distribucion,
                estado_revision: "pendiente",
                dias_fichados: diasConFichaje.size,
                dias_laborables: diasLab,
            };
        });

        res.json({ mes: mesParam, empleados: resultado });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get("/empleado/:id/mensual", authMiddleware, async (req, res) => {
    try {
        const empleadoId = parseInt(req.params.id);

        if (req.usuario.rol !== "admin" && req.usuario.empleado_id !== empleadoId) {
            return res.status(403).json({ error: "Acceso denegado" });
        }

        const mesParam = req.query.mes || new Date().toISOString().slice(0, 7);
        const [anio, mes] = mesParam.split("-").map(Number);
        const inicio = `${mesParam}-01`;
        const totalDias = new Date(anio, mes, 0).getDate();
        const fin = `${mesParam}-${String(totalDias).padStart(2, "0")}`;

        const [[emp]] = await db.execute(
            "SELECT id, nombre, cargo, horas_semanales, dias_laborables FROM empleados WHERE id = ?",
            [empleadoId]
        );
        if (!emp) return res.status(404).json({ error: "Empleado no encontrado" });

        const horasSemanales = emp.horas_semanales || 40;
        const minutosDia = Math.round((horasSemanales / 5) * 60);
        const diasPermitidos = (emp.dias_laborables || "1,2,3,4,5").split(",").map(Number);

        const [fichajes] = await db.execute(
            `SELECT fecha_entrada, hora_entrada, hora_salida, hora_salida_real, motivo_incidencia, observaciones
       FROM fichajes
       WHERE empleado_id = ? AND fecha_entrada BETWEEN ? AND ?
       ORDER BY fecha_entrada, hora_entrada`,
            [empleadoId, inicio, fin]
        );

        const fichajesPorFecha = {};
        for (const f of fichajes) {
            fichajesPorFecha[f.fecha_entrada] = f;
        }

        const [ausencias] = await db.execute(
            `SELECT tipo, fecha_inicio, fecha_fin, estado
       FROM ausencias
       WHERE empleado_id = ? AND estado = 'aprobada'
         AND fecha_inicio <= ? AND fecha_fin >= ?`,
            [empleadoId, fin, inicio]
        );

        let totalMinutosT = 0;
        let totalMinutosPlan = 0;
        let totalMinutosExtra = 0;
        const dias = [];

        for (let d = 1; d <= totalDias; d++) {
            const fechaStr = `${mesParam}-${String(d).padStart(2, "0")}`;
            const fecha = new Date(anio, mes - 1, d);
            const diaSemana = fecha.getDay() === 0 ? 7 : fecha.getDay();
            const esLaborable = diasPermitidos.includes(diaSemana);

            const fichaje = fichajesPorFecha[fechaStr] || null;
            const ausencia = ausencias.find(a => a.fecha_inicio <= fechaStr && a.fecha_fin >= fechaStr) || null;

            const minPlan = esLaborable ? minutosDia : 0;
            const minTrab = fichaje ? minutosEntreHoras(fichaje.hora_entrada, fichaje.hora_salida) : 0;
            const balance = minTrab - minPlan;
            const extra = Math.max(0, balance);

            totalMinutosT += minTrab;
            totalMinutosPlan += minPlan;
            totalMinutosExtra += extra;

            dias.push({
                fecha: fechaStr,
                dia_semana: diaSemana,
                es_laborable: esLaborable,
                horas_planificadas_min: minPlan,
                horas_trabajadas_min: minTrab,
                balance_min: balance,
                horas_extra_min: extra,
                hora_entrada: fichaje?.hora_entrada?.slice(0, 5) || null,
                hora_salida: fichaje?.hora_salida?.slice(0, 5) || null,
                en_curso: fichaje && !fichaje.hora_salida,
                incidencia: fichaje?.motivo_incidencia || null,
                ausencia: ausencia ? ausencia.tipo : null,
            });
        }

        const balanceTotal = totalMinutosT - totalMinutosPlan;

        res.json({
            mes: mesParam,
            empleado: { id: emp.id, nombre: emp.nombre, cargo: emp.cargo },
            resumen: {
                horas_trabajadas_min: totalMinutosT,
                horas_planificadas_min: totalMinutosPlan,
                balance_min: balanceTotal,
                horas_extra_min: totalMinutosExtra,
                horas_trabajadas: `${Math.floor(totalMinutosT / 60)}h ${String(totalMinutosT % 60).padStart(2, "0")}m`,
                horas_planificadas: `${Math.floor(totalMinutosPlan / 60)}h ${String(totalMinutosPlan % 60).padStart(2, "0")}m`,
                balance: `${balanceTotal >= 0 ? "+" : ""}${Math.floor(Math.abs(balanceTotal) / 60)}h ${String(Math.abs(balanceTotal % 60)).padStart(2, "0")}m`,
                balance_positivo: balanceTotal >= 0,
            },
            dias,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;