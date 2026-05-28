import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock localStorage antes de importar el composable
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] ?? null,
        setItem: (key, value) => { store[key] = String(value); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { store = {}; },
    };
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock });

const { useAuth } = await import("../composables/useAuth");

describe("useAuth", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("usuario es null si no hay sesión", () => {
        const { usuario } = useAuth();
        expect(usuario.value).toBeNull();
    });

    it("token es null si no hay sesión", () => {
        const { token } = useAuth();
        expect(token.value).toBeNull();
    });

    it("sesionExpirada devuelve false si no hay loginAt", () => {
        const { sesionExpirada } = useAuth();
        expect(sesionExpirada()).toBe(false);
    });
});