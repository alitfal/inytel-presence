/**
 * Rutas de exportación de informes de jornada laboral
 * Genera informes en PDF o Excel filtrables por empleado y período.
 * Cumple con el requisito de conservación de registros del Art. 34.9 ET.
 */
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authMiddleware, soloAdmin } = require("../middlewares/auth");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

/**
 * GET /api/exportacion/informe
 * Exporta el informe de jornada laboral en PDF o Excel.
 *
 * Query params:
 * - formato: "pdf" | "excel" (requerido)
 * - empleado_id: número | "todos" (por defecto "todos")
 * - desde: YYYY-MM-DD (por defecto primer día del mes actual)
 * - hasta: YYYY-MM-DD (por defecto hoy)
 */
router.get("/informe", authMiddleware, soloAdmin, async (req, res) => {
    try {
        const formato = req.query.formato || "excel";
        const empleado_id = req.query.empleado_id || "todos";
        const hasta = req.query.hasta || new Date().toISOString().slice(0, 10);
        const desde = req.query.desde || hasta.slice(0, 7) + "-01";

        // Obtener empleados
        let empleados;
        if (empleado_id === "todos") {
            const [rows] = await db.execute(
                "SELECT id, nombre, cargo, departamento, horas_semanales FROM empleados WHERE activo = 1 ORDER BY nombre"
            );
            empleados = rows;
        } else {
            const [rows] = await db.execute(
                "SELECT id, nombre, cargo, departamento, horas_semanales FROM empleados WHERE id = ?",
                [empleado_id]
            );
            empleados = rows;
        }

        // Obtener fichajes para cada empleado
        const datos = [];
        for (const emp of empleados) {
            const [fichajes] = await db.execute(
                `SELECT fecha_entrada, hora_entrada, hora_salida, hora_salida_real,
         motivo_incidencia, observaciones
         FROM fichajes
         WHERE empleado_id = ? AND fecha_entrada BETWEEN ? AND ?
         ORDER BY fecha_entrada ASC`,
                [emp.id, desde, hasta]
            );
            datos.push({ empleado: emp, fichajes });
        }

        if (formato === "excel") {
            await generarExcel(res, datos, desde, hasta);
        } else {
            await generarPDF(res, datos, desde, hasta);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

async function generarExcel(res, datos, desde, hasta) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "INYTEL Presence";
    workbook.created = new Date();

    for (const { empleado, fichajes } of datos) {
        const sheet = workbook.addWorksheet(empleado.nombre.slice(0, 31));

        // Cabecera
        sheet.mergeCells("A1:G1");
        sheet.getCell("A1").value = "INYTEL Presence — Informe de jornada laboral";
        sheet.getCell("A1").font = { bold: true, size: 14 };
        sheet.getCell("A1").alignment = { horizontal: "center" };

        sheet.mergeCells("A2:G2");
        sheet.getCell("A2").value = `Empleado: ${empleado.nombre} | Cargo: ${empleado.cargo} | Período: ${desde} → ${hasta}`;
        sheet.getCell("A2").alignment = { horizontal: "center" };

        sheet.addRow([]);

        // Encabezados
        const headerRow = sheet.addRow([
            "Fecha", "Entrada", "Salida", "Salida real", "Horas trabajadas", "Incidencia", "Observaciones"
        ]);
        headerRow.font = { bold: true };
        headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
        headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };

        // Anchos de columna
        sheet.getColumn(1).width = 14;
        sheet.getColumn(2).width = 10;
        sheet.getColumn(3).width = 10;
        sheet.getColumn(4).width = 12;
        sheet.getColumn(5).width = 18;
        sheet.getColumn(6).width = 20;
        sheet.getColumn(7).width = 30;

        let totalMinutos = 0;

        // Filas de datos
        for (const f of fichajes) {
            let minutos = 0;
            const salida = f.hora_salida_real || f.hora_salida;
            if (f.hora_entrada && salida) {
                const [he, me] = f.hora_entrada.split(":").map(Number);
                const [hs, ms] = salida.split(":").map(Number);
                minutos = (hs * 60 + ms) - (he * 60 + me);
                totalMinutos += minutos;
            }
            const horasTrabajadas = minutos > 0
                ? `${Math.floor(minutos / 60)}h ${minutos % 60}m`
                : "—";

            const row = sheet.addRow([
                f.fecha_entrada,
                f.hora_entrada || "—",
                f.hora_salida || "—",
                f.hora_salida_real || "—",
                horasTrabajadas,
                f.motivo_incidencia || "",
                f.observaciones || ""
            ]);

            if (f.motivo_incidencia) {
                row.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDE68A" } };
            }
        }

        // Total
        sheet.addRow([]);
        const totalHoras = `${Math.floor(totalMinutos / 60)}h ${totalMinutos % 60}m`;
        const totalRow = sheet.addRow(["TOTAL", "", "", "", totalHoras, "", ""]);
        totalRow.font = { bold: true };
        totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } };
    }

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=informe-jornada-${desde}-${hasta}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
}

async function generarPDF(res, datos, desde, hasta) {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=informe-jornada-${desde}-${hasta}.pdf`);
    doc.pipe(res);

    for (let idx = 0; idx < datos.length; idx++) {
        const { empleado, fichajes } = datos[idx];
        if (idx > 0) doc.addPage();

        // ── Logo ──────────────────────────────────────
        const logoX = 40, logoY = 40, logoSize = 36;
doc.roundedRect(logoX, logoY, logoSize, logoSize, 7).fill("#4F46E5");
doc.fontSize(22).font("Helvetica-BoldOblique").fillColor("white")
   .text("I", logoX, logoY + 9, { width: logoSize, align: "center", lineBreak: false });

        // ── Nombre aplicación ─────────────────────────
        doc.fontSize(15).font("Helvetica-Bold").fillColor("#0f172a")
            .text("INYTEL", logoX + logoSize + 10, logoY + 6, { lineBreak: false });
        doc.fontSize(15).font("Helvetica").fillColor("#4F46E5")
            .text(" | Presence", logoX + logoSize + 10 + doc.widthOfString("INYTEL") + 1, logoY + 6, { lineBreak: false });

        // ── Subtítulo ─────────────────────────────────
        doc.fontSize(9).font("Helvetica").fillColor("#64748b")
            .text("Informe de jornada laboral", logoX + logoSize + 10, logoY + 24);

        // ── Separador ─────────────────────────────────
        doc.moveTo(40, 90).lineTo(555, 90).strokeColor("#e2e8f0").lineWidth(1).stroke();

        // ── Info empleado ─────────────────────────────
        doc.fontSize(10).font("Helvetica-Bold").fillColor("#0f172a")
            .text(`${empleado.nombre}`, 40, 100);
        doc.fontSize(9).font("Helvetica").fillColor("#475569")
            .text(`${empleado.cargo} · ${empleado.departamento || ""}`, 40, 114);
        doc.fontSize(9).fillColor("#64748b")
            .text(`Período: ${desde} → ${hasta}   ·   Generado: ${new Date().toLocaleDateString("es-ES")}`, 40, 128);

        // ── Tabla ─────────────────────────────────────
        const colWidths = [85, 60, 60, 65, 70, 115];
        const headers = ["Fecha", "Entrada", "Salida", "S. Real", "Horas", "Incidencia"];
        const startX = 40;
        let y = 150;

        doc.rect(startX, y, 455, 18).fill("#4F46E5");
        doc.fillColor("white").fontSize(9).font("Helvetica-Bold");
        let x = startX;
        headers.forEach((h, i) => {
            doc.text(h, x + 4, y + 5, { width: colWidths[i], lineBreak: false });
            x += colWidths[i];
        });

        y += 18;
        let totalMinutos = 0;

        for (let fi = 0; fi < fichajes.length; fi++) {
            const f = fichajes[fi];
            let minutos = 0;
            const salida = f.hora_salida_real || f.hora_salida;
            if (f.hora_entrada && salida) {
                const [he, me] = f.hora_entrada.split(":").map(Number);
                const [hs, ms] = salida.split(":").map(Number);
                minutos = (hs * 60 + ms) - (he * 60 + me);
                totalMinutos += minutos;
            }

            const horasTrabajadas = minutos > 0
                ? `${Math.floor(minutos / 60)}h ${minutos % 60}m` : "—";

            const bgColor = f.motivo_incidencia ? "#FDE68A" : (fi % 2 === 0 ? "#F8FAFC" : "white");
            doc.rect(startX, y, 455, 16).fill(bgColor);
            doc.fillColor("black").fontSize(8).font("Helvetica");

            x = startX;
            const cols = [
                String(f.fecha_entrada).slice(0, 10),
                f.hora_entrada || "—",
                f.hora_salida || "—",
                f.hora_salida_real || "—",
                horasTrabajadas,
                f.motivo_incidencia || ""
            ];
            cols.forEach((c, i) => {
                doc.text(c, x + 4, y + 4, { width: colWidths[i] - 6, lineBreak: false });
                x += colWidths[i];
            });

            y += 16;
            if (y > 760) { doc.addPage(); y = 40; }
        }

        // ── Total ──────────────────────────────────────
        const totalHoras = `${Math.floor(totalMinutos / 60)}h ${totalMinutos % 60}m`;
        doc.rect(startX, y, 455, 18).fill("#E0E7FF");
        doc.fillColor("#1e1b4b").fontSize(9).font("Helvetica-Bold");
        doc.text("TOTAL", startX + 4, y + 5, { width: 300, lineBreak: false });
        doc.text(totalHoras, startX + 340, y + 5, { width: 80, lineBreak: false });
    }

    doc.end();
}

module.exports = router;