/* eslint-disable react-hooks/exhaustive-deps */
import React, {useEffect, useMemo, useState} from "react";
import {getConfig} from "../config/config";

/* ==== Helpers ==== */
const fmtCOP = (n) =>
    (Number(n) || 0).toLocaleString("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
    });

const pct = (num, den) => (den ? `${((num / den) * 100).toFixed(1)}%` : "-");
const norm = (s) =>
    (s || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

/* ==== Conceptos en el orden del pantallazo ==== */
const CONCEPTOS = [
    {id: "60", nombre: "Ventas Brutas - Colombia", band: "b"},
    {id: "80", nombre: "Descuentos en Ventas"},
    {id: "100", nombre: "Ventas Netas", band: "b"},
    {id: "200", nombre: "Costo de Ventas"},
    {id: "300", nombre: "Utilidad Bruta", band: "b"},
    {id: "500", nombre: "Gastos Mercadeo y CANALES", band: "y"},
    {id: "600", nombre: "Vendedores y Asesoras Belle", band: "y"},
    {id: "920", nombre: "Gastos Promocion y Publicidad", band: "y"},
    {id: "1000", nombre: "Total Gastos de Ventas", band: "y-strong"},
    {id: "1200", nombre: "Gastos de Operacion", band: "y"},
    {id: "1500", nombre: "Utilidad o perdida Operacion", emph: true},
    {id: "2010", nombre: "Costos Financieros C.T.O.", ital: true},
    {id: "2020", nombre: "Utilidad despues de C.T.O.", emph: true},
];

/* extrae valor por concepto del objeto que viene del API */
const valorPorConcepto = (cId, x = {}) => {
    switch (cId) {
        case "60":
            return x.ventasBrutas;
        case "80":
            return x.descuentos;
        case "100":
            return x.ventasNetas;
        case "200":
            return x.costoVenta;
        case "300":
            return x.utilidadBruta;
        case "500":
            return x.g500;
        case "600":
            return x.g600;
        case "920":
            return x.g920;
        case "1000":
            return x.totalGastosVentas;
        case "1200":
            return x.gastosOperacion;
        case "1500":
            return x.utilidadOperacion;
        case "2010":
            return x.financierosCalc;
        case "2020":
            return x.utilidadDespCTO;
        default:
            return 0;
    }
};

const basePct = (cId, x = {}) => {
    const sobreNetas = new Set([
        "100", "200", "300", "500", "600", "920", "1000", "1200", "1500", "2010", "2020",
    ]);
    return sobreNetas.has(cId) ? x.ventasNetas : x.ventasBrutas;
};

export default function ResumenProductos() {
    const {apiBaseURL} = getConfig();

    // ===== Filtros (en drawer derecho) =====
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [codigosInput, setCodigosInput] = useState("");
    const [clienteIdsInput, setClienteIdsInput] = useState("");

    const codigos = useMemo(
        () => norm(codigosInput).split(/[\s,;]+/).map(s => s.trim()).filter(Boolean),
        [codigosInput]
    );
    const clientes = useMemo(
        () => norm(clienteIdsInput).split(/[\s,;]+/).map(s => s.trim()).filter(Boolean),
        [clienteIdsInput]
    );

    // ===== Datos =====
    const [items, setItems] = useState([]); // [{codigoProducto, productoNombre, resumen}]
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // ===== Acordeón SOLO para la fila 1500 por producto (toggle abrir/cerrar) =====
    const [openOper, setOpenOper] = useState(new Set());
    const toggleOper = (codigoProducto) => {
        setOpenOper(prev => {
            const next = new Set(prev);
            if (next.has(codigoProducto)) next.delete(codigoProducto);
            else next.add(codigoProducto);
            return next;
        });
    };

    // Construcción de URL acorde a tu controller
    const buildURL = () => {
        const base = (apiBaseURL || "").replace(/\/$/, "");
        const url = new URL(`${base}/rubros/calculos`);

        if (codigos.length) url.searchParams.set("codigos", codigos.join(","));
        if (clientes.length) clientes.forEach(c => url.searchParams.append("clientes", c));

        url.searchParams.set("_ts", Date.now()); // rompe caché
        return url.toString();
    };

    const fetchData = async () => {
        setLoading(true);
        setError("");
        try {
            const url = buildURL();
            const r = await fetch(url, {
                headers: {Accept: "application/json"},
                cache: "no-store",
            });

            if (!r.ok) {
                const text = await r.text().catch(() => "");
                throw new Error(`HTTP ${r.status} – ${text.slice(0, 200)}`);
            }

            const ct = r.headers.get("content-type") || "";
            if (!ct.includes("application/json")) {
                const text = await r.text().catch(() => "");
                throw new Error(`Respuesta no JSON (Content-Type: ${ct}). Primeros bytes: ${text.slice(0, 200)}`);
            }

            const j = await r.json();
            const data = Array.isArray(j?.data) ? j.data : j?.data ?? [];
            setItems(data);
        } catch (e) {
            console.error(e);
            setError("No se pudo cargar el resumen. " + (e?.message || ""));
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []); // carga inicial

    return (
        <div className="w-full mx-auto max-w-[1400px] p-4 relative">
            {/* Encabezado simple */}
            <div className="mb-3 flex items-center justify-between">
                <h1 className="text-lg font-semibold text-slate-800">Módulo de Rentabilidad</h1>
            </div>

            {/* Lista por producto (solo RESUMEN) */}
            {error && <div className="text-center text-red-600 py-4">{error}</div>}

            {items.map((prod) => {
                const sum = prod.resumen || {};
                const isOpen = openOper.has(prod.codigoProducto);

                // valores para la fila 1500 en estado colapsado
                const utilOper = Number(sum?.utilidadOperacion) || 0;
                const base1500 = basePct("1500", sum);

                return (
                    <div key={prod.codigoProducto} className="mb-6">
                        <div
                            className="rounded-2xl bg-blue-900 text-white px-6 py-4 shadow flex items-center justify-between">
                            <div>
                                <div className="text-sm opacity-90">{prod.codigoProducto}</div>
                                <div className="text-xl font-bold tracking-wide">{prod.productoNombre}</div>
                            </div>
                        </div>

                        {/* ABIERTO: tu tabla original. CERRADO: solo la fila 1500 con valor y %. */}
                        {isOpen ? (
                            <React.Fragment key={`open-${prod.codigoProducto}`}>
                                {/* Encabezado clickeable en azul con el icono ▼ */}
                                <button
                                    type="button"
                                    onClick={() => toggleOper(prod.codigoProducto)}
                                    className="w-full text-left bg-blue-800 text-white
                                             rounded-b-none rounded-t-xl mt-1 px-6 py-3
                                             flex justify-between items-center
                                             hover:bg-blue-700 transition-colors shadow-sm"
                                                                >
                                    <span className="font-semibold"></span>
                                    <span className="text-white text-xs select-none">▼</span>
                                </button>

                                <div className="bg-white rounded-b-2xl shadow ring-1 ring-black/5 overflow-x-auto">
                                    <table className="min-w-full text-sm border-separate border-spacing-0">
                                        <thead>
                                        <tr>
                                            <th className="w-[280px] text-left px-4 py-3 bg-blue-50 font-semibold text-slate-700 border-b sticky left-0 z-20">
                                                Concepto
                                            </th>
                                            <th className="text-right px-6 py-3 bg-blue-50 font-semibold text-slate-700 border-b">
                                                Resumen
                                            </th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {CONCEPTOS.map((c) => {
                                            const v = valorPorConcepto(c.id, sum);
                                            const base = basePct(c.id, sum);
                                            const bandCls =
                                                c.band === "b"
                                                    ? "bg-blue-50"
                                                    : c.band === "y"
                                                        ? "bg-yellow-50"
                                                        : c.band === "y-strong"
                                                            ? "bg-yellow-100"
                                                            : "";
                                            const valCls =
                                                typeof v === "number" && v < 0 ? "text-red-600" : "text-slate-800";

                                            return (
                                                <tr key={c.id} className={bandCls}>
                                                    <td
                                                        className={[
                                                            "px-6 py-3 border-b sticky left-0 z-10",
                                                            c.emph ? "font-semibold" : "",
                                                            c.ital ? "italic" : "",
                                                        ].join(" ")}
                                                    >
                                                        {c.nombre}
                                                    </td>
                                                    <td className="px-6 py-3 border-b text-right">
                                                        <div className="flex gap-2 justify-end items-baseline">
                                                            <span
                                                                className={["font-medium", valCls].join(" ")}>{fmtCOP(v)}</span>
                                                            <span
                                                                className="text-[11px] text-slate-500">{pct(v, base)}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        </tbody>
                                    </table>
                                </div>
                            </React.Fragment>
                        ) : (
                            <React.Fragment key={`closed-${prod.codigoProducto}`}>
                                <button
                                    type="button"
                                    onClick={() => toggleOper(prod.codigoProducto)}
                                    className="w-full text-left bg-blue-50 rounded-2xl shadow ring-1 ring-black/5 px-6 py-4 hover:bg-blue-100 transition-colors flex justify-between items-center"
                                >
      <span className="font-semibold text-slate-900">
        Utilidad o pérdida de Operación
      </span>

                                    <span className="flex items-baseline gap-2">
        <span className={`font-medium ${utilOper < 0 ? "text-red-600" : "text-slate-800"}`}>
          {fmtCOP(utilOper)}
        </span>
        <span className="text-[11px] text-slate-500">{pct(utilOper, base1500)}</span>
        <span className="text-blue-600 text-xs select-none">
          ▶
        </span>
      </span>
                                </button>
                            </React.Fragment>
                        )}

                    </div>
                );
            })}

            {!loading && !error && items.length === 0 && (
                <div className="text-center text-slate-500 py-10">Sin resultados</div>
            )}

            {/* ===== FAB de Filtros (abre drawer derecho) ===== */}
            <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="fixed bottom-6 right-6 z-[11001] rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 flex items-center gap-2"
                aria-label="Abrir filtros"
                title="Abrir filtros"
            >
                <span>🔍</span>
                <span className="font-semibold">Filtros</span>
            </button>

            {/* ===== Drawer de Filtros (derecha) ===== */}
            {filtersOpen && (
                <div
                    className="fixed inset-0 z-[11000] flex"
                    aria-modal="true"
                    role="dialog"
                    onClick={() => setFiltersOpen(false)}
                >
                    {/* backdrop */}
                    <div className="flex-1 bg-black/40 backdrop-blur-sm"/>
                    {/* panel */}
                    <div
                        className="w-full max-w-md bg-white h-full shadow-2xl ring-1 ring-black/10 translate-x-0
                       animate-[slideIn_.2s_ease-out]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-slate-800">Filtros</h2>
                            <button
                                className="text-slate-500 hover:text-slate-700"
                                onClick={() => setFiltersOpen(false)}
                                aria-label="Cerrar"
                                title="Cerrar"
                            >
                                ✖
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <div className="text-sm text-slate-500 mb-1">Códigos de producto</div>
                                <input
                                    type="text"
                                    value={codigosInput}
                                    onChange={(e) => setCodigosInput(e.target.value)}
                                    placeholder="Ej: 617573, 614763"
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                />
                            </div>

                            <div>
                                <div className="text-sm text-slate-500 mb-1">Cliente(s) por ID</div>
                                <input
                                    type="text"
                                    value={clienteIdsInput}
                                    onChange={(e) => setClienteIdsInput(e.target.value)}
                                    placeholder="Ej: 4000348, 1000478"
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                />
                            </div>
                        </div>

                        <div className="px-5 py-4 border-t bg-slate-50 flex items-center justify-end gap-3">
                            <button
                                className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-white"
                                onClick={() => {
                                    setCodigosInput("");
                                    setClienteIdsInput("");
                                }}
                            >
                                Limpiar
                            </button>
                            <button
                                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                onClick={() => {
                                    setFiltersOpen(false);
                                    fetchData();
                                }}
                            >
                                Aplicar filtros
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Spinner overlay al estilo del otro componente */}
            {loading && (
                <div className="fixed inset-0 z-[12000] pointer-events-none flex items-center justify-center">
                    <div
                        className="bg-white/90 backdrop-blur px-4 py-3 rounded-full shadow border border-slate-200 text-sm text-slate-700 flex items-center">
                        <span
                            className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600 mr-2"/>
                        Cargando…
                    </div>
                </div>
            )}

            {/* animación del drawer */}
            <style>{`
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
        </div>
    );
}
