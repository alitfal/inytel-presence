import { describe, it, expect } from "vitest";

// Función extraída de InformesView para testear
function calcularPeriodo(periodo, hoy = new Date()) {
    const fmt = (d) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    switch (periodo) {
        case "este-mes":
            return {
                desde: fmt(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
                hasta: fmt(hoy),
            };
        case "mes-anterior": {
            const primerDia = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
            const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
            return { desde: fmt(primerDia), hasta: fmt(ultimoDia) };
        }
        case "3-meses":
            return {
                desde: fmt(new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1)),
                hasta: fmt(hoy),
            };
        default:
            return { desde: "", hasta: "" };
    }
}

describe("calcularPeriodo", () => {
    const hoy = new Date(2026, 4, 28); // 28 mayo 2026

    it("este-mes empieza el día 1 del mes actual", () => {
        const { desde } = calcularPeriodo("este-mes", hoy);
        expect(desde).toBe("2026-05-01");
    });

    it("este-mes termina hoy", () => {
        const { hasta } = calcularPeriodo("este-mes", hoy);
        expect(hasta).toBe("2026-05-28");
    });

    it("mes-anterior es abril 2026", () => {
        const { desde, hasta } = calcularPeriodo("mes-anterior", hoy);
        expect(desde).toBe("2026-04-01");
        expect(hasta).toBe("2026-04-30");
    });

    it("3-meses empieza en marzo 2026", () => {
        const { desde } = calcularPeriodo("3-meses", hoy);
        expect(desde).toBe("2026-03-01");
    });
});