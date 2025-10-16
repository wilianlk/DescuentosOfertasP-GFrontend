/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from "react";
import { getConfig } from "../config/config";

/* === Utilidades === */
const fmtCOP = (n) =>
    (Number(n) || 0).toLocaleString("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
    });

const pct = (num, den) => (den ? `${((num / den) * 100).toFixed(1)}%` : "-");
const negativo = (n) => n < 0;

const toMilesString = (value) =>
    (Number.isFinite(value) ? value : 0).toLocaleString("es-CO", {
        maximumFractionDigits: 0,
    });

const toNumberFromMiles = (txt) => {
    const onlyDigits = `${txt ?? ""}`.replace(/[^0-9]/g, "");
    return onlyDigits.length ? parseInt(onlyDigits, 10) : 0;
};

const norm = (s) =>
    (s || "")
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "")
        .toLowerCase();

const ALL = "__ALL__";

/* === Mapeo de estilo igual al diseño original === */
function metaConcepto(id) {
    const blueBand = { tipo: "band" }; // celda azul claro
    const yellowBand = { band: "y" }; // celda amarilla
    const yellowStrong = { band: "y-strong", strong: true };

    switch (id) {
        case "60": // Ventas Brutas (editable)
            return { editable: true };
        case "80": // Descuentos
            return {};
        case "100": // Ventas Netas
            return { ...blueBand };
        case "200": // Costo de Ventas
            return {};
        case "300": // Utilidad Bruta
            return { ...blueBand };
        case "500": // Gastos Mercadeo y CANALES
        case "600": // Vendedores y Asesoras Belle
        case "920": // Gastos Promoción y Publicidad
        case "420":
        case "440":
        case "450":
        case "503":
        case "505":
        case "506":
            return { ...yellowBand };
        case "1000": // Total Gastos de Ventas
            return { ...yellowStrong };
        case "1200": // Gastos de Operación
            return { ...yellowBand };
        case "1500": // Utilidad o pérdida Operación
            return { strong: true, emph: true };
        case "2010": // Costos Financieros C.T.O.
            return { ital: true };
        case "2020": // Utilidad después de C.T.O.
            return { strong: true, emph: true };
        default:
            return {};
    }
}

/* === Componente === */
export default function DescuentoOfertas() {
    const { apiBaseURL } = getConfig();

    /* ======= Estado traído del backend (clientes con rubros + ofertas) ======= */
    const [rubrosClientes, setRubrosClientes] = useState([]);
    const [loadingRubros, setLoadingRubros] = useState(true);
    const [errorRubros, setErrorRubros] = useState("");

    /* AJUSTE: fetch con AbortController para evitar doble llamada en StrictMode */
    useEffect(() => {
        const controller = new AbortController();

        (async () => {
            try {
                setLoadingRubros(true);
                setErrorRubros("");

                const r = await fetch(`${apiBaseURL}/rubros/listar`, {
                    signal: controller.signal,
                });
                if (!r.ok) throw new Error(`Error HTTP: ${r.status}`);

                const j = await r.json();
                const data = Array.isArray(j) ? j : j?.data || [];
                setRubrosClientes(data);
            } catch (e) {
                if (e.name === "AbortError") return;
                console.error(e);
                setErrorRubros("No se pudieron cargar los rubros.");
            } finally {
                setLoadingRubros(false);
            }
        })();

        return () => controller.abort();
    }, [apiBaseURL]);

    /* Conceptos dinámicos (unión de todos + estilos) */
    const conceptos = useMemo(() => {
        const map = new Map();
        rubrosClientes.forEach((c) => {
            (c.rubros || []).forEach((r) => {
                if (!map.has(r.id)) map.set(r.id, r.nombre);
            });
        });
        return Array.from(map, ([id, nombre]) => ({
            id,
            nombre,
            ...metaConcepto(id),
        })).sort((a, b) => {
            const na = Number(a.id);
            const nb = Number(b.id);
            if (Number.isNaN(na) || Number.isNaN(nb))
                return String(a.id).localeCompare(String(b.id));
            return na - nb;
        });
    }, [rubrosClientes]);

    /* Rubros editables por cliente (porcentaje) */
    const [rubrosEdit, setRubrosEdit] = useState({});
    useEffect(() => {
        const obj = {};
        rubrosClientes.forEach((c) => {
            obj[c.clienteId] = {};
            (c.rubros || []).forEach((r) => {
                obj[c.clienteId][r.id] = r.porcentaje ?? 0;
            });
        });
        setRubrosEdit(obj);
    }, [rubrosClientes]);

    const onRubroChange = (clienteId, rubroId) => (e) => {
        const raw = `${e.target.value}`.replace(",", ".").replace(/[^0-9.]/g, "");
        const num = raw === "" ? 0 : Math.min(9999, Math.max(0, parseFloat(raw)));
        setRubrosEdit((p) => ({
            ...p,
            [clienteId]: { ...(p[clienteId] || {}), [rubroId]: Number.isNaN(num) ? 0 : num },
        }));
    };

    /* ===================== Cálculos estilo Excel ===================== */
    const getPct = (mapa, key, fallback) => {
        const v = mapa?.[key];
        return typeof v === "number" ? v : fallback;
    };

    // Overrides locales para Ventas Brutas (60) por oferta (sin tocar backend)
    // estructura: { [clienteId]: { [codigoProducto]: numberOverride } }
    const [ventasOverride, setVentasOverride] = useState({});

    const calcularExcelItem = (p, rubrosPctCliente) => {
        // 80 - Descuento (% sobre ventas brutas)
        const descPct = getPct(rubrosPctCliente, "80", 0);
        const descuentos = p.ventasBrutas * (descPct / 100);

        // 100 - Ventas Netas
        const ventasNetas = p.ventasBrutas - descuentos;

        // 200 - Costo de Venta (valor)
        const costoVenta = p.costoVenta;

        // 300 - Utilidad Bruta
        const utilidadBruta = ventasNetas - costoVenta;

        // 500/600/920 - Gastos (% sobre ventas netas)
        const pct500 = getPct(rubrosPctCliente, "500", 0);
        const pct600 = getPct(rubrosPctCliente, "600", 0);
        const pct920 = getPct(rubrosPctCliente, "920", 0);

        const g500 = ventasNetas * (pct500 / 100);
        const g600 = ventasNetas * (pct600 / 100);
        const g920 = ventasNetas * (pct920 / 100);

        // 1000 - Total Gastos de Ventas
        const totalGastosVentas = g500 + g600 + g920;

        // 1200 - Gastos de Operación (% sobre ventas netas)
        const pct1200 = getPct(rubrosPctCliente, "1200", 11.05);
        const gastosOperacion = ventasNetas * (pct1200 / 100);

        // 1500 - Utilidad o pérdida de Operación
        const utilidadOperacion = utilidadBruta - totalGastosVentas - gastosOperacion;

        // 2010 - Costos Financieros C.T.O. (% sobre ventas netas)
        const pct2010 = getPct(rubrosPctCliente, "2010", 3);
        const financierosCalc = ventasNetas * (pct2010 / 100);

        // 2020 - Utilidad después de C.T.O.
        const utilidadDespCTO = utilidadOperacion - financierosCalc;

        return {
            ...p,
            descuentos,
            ventasNetas,
            costoVenta,
            utilidadBruta,
            g500,
            g600,
            g920,
            totalGastosVentas,
            gastosOperacion,
            utilidadOperacion,
            financierosCalc,
            utilidadDespCTO,
        };
    };

    // valor por conceptoId para un producto (usa los campos calculados)
    const valorPorConcepto = (conceptoId, p) => {
        switch (conceptoId) {
            case "60":
                return p.ventasBrutas;
            case "80":
                return p.descuentos;
            case "100":
                return p.ventasNetas;
            case "200":
                return p.costoVenta;
            case "300":
                return p.utilidadBruta;
            case "500":
                return p.g500;
            case "600":
                return p.g600;
            case "920":
                return p.g920;
            case "1000":
                return p.totalGastosVentas;
            case "1200":
                return p.gastosOperacion;
            case "1500":
                return p.utilidadOperacion;
            case "2010":
                return p.financierosCalc;
            case "2020":
                return p.utilidadDespCTO;
            default:
                return null;
        }
    };

    // Base de porcentaje (Excel): casi todo sobre ventas netas
    const basePorcentaje = (conceptoId, p) => {
        const sobreNetas = new Set([
            "100",
            "200",
            "300",
            "500",
            "600",
            "920",
            "1000",
            "1200",
            "1500",
            "2010",
            "2020",
        ]);
        return sobreNetas.has(conceptoId) ? p.ventasNetas : p.ventasBrutas;
    };

    /* ========= Filtros ========= */

    // >>> Multi-selección de clientes
    const clientes = useMemo(
        () => rubrosClientes.map((c) => ({ id: c.clienteId, nombre: c.clienteNombre })),
        [rubrosClientes]
    );

    const [clientesSel, setClientesSel] = useState([ALL]); // ALL = mostrar todos
    const [open, setOpen] = useState(false);
    const [queryClientes, setQueryClientes] = useState("");
    const [refQuery, setRefQuery] = useState("");

    const clientesFiltrados = useMemo(() => {
        const q = norm(queryClientes);
        if (!q) return clientes;
        return clientes.filter(
            (c) => norm(c.id).includes(q) || norm(c.nombre).includes(q)
        );
    }, [clientes, queryClientes]);

    const toggleCliente = (id) => {
        setClientesSel((prev) => {
            if (id === ALL) {
                setOpen(false);
                return [ALL];
            }
            const next = prev.includes(id)
                ? prev.filter((x) => x !== id)
                : [...prev.filter((x) => x !== ALL), id];
            setOpen(false);
            return next.length === 0 ? [ALL] : next;
        });
    };

    const seleccionarTodos = () => {
        setClientesSel([ALL]);
        setOpen(false);
    };

    const marcarTodos = () => {
        setClientesSel(clientes.map((c) => c.id));
        setOpen(false);
    };

    const limpiarSeleccion = () => {
        setClientesSel([ALL]); // estado por defecto
        setOpen(false);
    };

    const entries = useMemo(
        () =>
            clientesSel.includes(ALL)
                ? rubrosClientes
                : rubrosClientes.filter((c) => clientesSel.includes(c.clienteId)),
        [rubrosClientes, clientesSel]
    );

    const textoSeleccion = clientesSel.includes(ALL)
        ? "Todos los clientes"
        : `${clientesSel.length} cliente(s) seleccionados`;

    /* ====== Celdas con edición estable ====== */

    // Ventas Brutas: estado local + commit en blur (override por oferta)
    const VentasBrutasCell = ({ clienteId, codigoProducto, valorActual, ventasNetas }) => {
        const overrideActual =
            ventasOverride?.[clienteId]?.[codigoProducto] ?? null;
        const [local, setLocal] = useState(
            toMilesString(overrideActual ?? valorActual)
        );

        useEffect(() => {
            const ov = ventasOverride?.[clienteId]?.[codigoProducto] ?? null;
            setLocal(toMilesString(ov ?? valorActual));
        }, [valorActual, clienteId, codigoProducto, ventasOverride]);

        const onBlur = () => {
            const val = toNumberFromMiles(local);
            setVentasOverride((prev) => ({
                ...prev,
                [clienteId]: {
                    ...(prev[clienteId] || {}),
                    [codigoProducto]: val,
                },
            }));
            setLocal(toMilesString(val));
        };

        return (
            <td className="px-6 py-3 align-top border-b text-right">
                <div className="flex items-center justify-end gap-2">
                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9\\.]*"
                        value={local}
                        onChange={(e) => setLocal(e.target.value)}
                        onBlur={onBlur}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                        aria-label={`Ventas Brutas ${codigoProducto}`}
                    />
                    <span className="text-[11px] text-slate-500">
            {pct(overrideActual ?? valorActual, ventasNetas)}
          </span>
                </div>
            </td>
        );
    };

    // Rubro (%): estado local + commit en blur
    const RubroCell = React.memo(function RubroCell({
                                                        clienteId,
                                                        rubroId,
                                                        value,
                                                        setRubrosEdit,
                                                    }) {
        const [local, setLocal] = useState(String(value ?? 0));

        useEffect(() => {
            setLocal(String(value ?? 0));
        }, [value, clienteId, rubroId]);

        const commit = (text) => {
            const raw = `${text}`.replace(",", ".").replace(/[^0-9.]/g, "");
            const num = raw === "" ? 0 : Math.min(9999, Math.max(0, parseFloat(raw)));
            setRubrosEdit((p) => ({
                ...p,
                [clienteId]: {
                    ...(p[clienteId] || {}),
                    [rubroId]: Number.isNaN(num) ? 0 : num,
                },
            }));
            setLocal(String(Number.isNaN(num) ? 0 : num));
        };

        return (
            <td className="px-6 py-3 align-top border-b bg-slate-50">
                <div className="flex items-center justify-end gap-2">
                    <input
                        type="text"
                        inputMode="decimal"
                        value={local}
                        onChange={(e) => setLocal(e.target.value)}
                        onBlur={(e) => commit(e.target.value)}
                        className="w-24 text-right rounded-lg border border-slate-300 px-2 py-1.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label={`Rubro ${rubroId}`}
                    />
                    <span className="text-slate-500 text-sm">%</span>
                </div>
            </td>
        );
    });

    /* Sección por cliente (tabla completa) */
    const Section = ({ cliente }) => {
        const clienteId = cliente.clienteId;
        const clienteNombre = cliente.clienteNombre;

        // Ofertas del cliente -> columnas
        const ofertas = Array.isArray(cliente.ofertas) ? cliente.ofertas : [];

        // Filtro por referencia (por código de producto)
        const refQ = norm(refQuery);
        const ofertasFiltradas = refQ
            ? ofertas.filter((o) => norm(o.codigoProducto).includes(refQ))
            : ofertas;

        // Rubros del cliente (porcentajes)
        const rubrosCliente = rubrosEdit?.[clienteId] || {};

        // Construir "items" por oferta para cálculos (similar a tus productos antes)
        const items = ofertasFiltradas.map((o) => {
            const override =
                ventasOverride?.[clienteId]?.[o.codigoProducto] ?? null;
            const ventasBrutas = Number.isFinite(override)
                ? override
                : o.totalPrecio || 0;
            const costoVenta = o.totalCosto || 0;

            const base = {
                id: o.codigoProducto,
                codigo: o.codigoProducto,
                nombre: o.codigoProducto, // (no se toca la lógica original)
                ventasBrutas,
                costoVenta,
            };
            return calcularExcelItem(base, rubrosCliente);
        });

        return (
            <section className="mb-6">
                <div className="rounded-2xl bg-blue-900 text-white px-6 py-4 shadow-sm mt-3 mb-3">
                    <div className="text-sm opacity-90">{clienteId}</div>
                    <div className="text-xl font-bold tracking-wide">{clienteNombre}</div>
                </div>

                {/* CONTENEDOR SCROLLEABLE con sticky context */}
                <div className="bg-white rounded-2xl shadow-lg ring-1 ring-black/5">
                    <div className="relative overflow-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                            <tr>
                                <th className="w-[220px] md:w-[260px] text-left px-4 py-3 bg-blue-50 font-semibold text-slate-700 border-b sticky top-0 z-40">
                                    Concepto
                                </th>
                                <th className="w-[140px] text-right px-6 py-3 bg-blue-50 font-semibold text-slate-700 border-b sticky top-0 z-40">
                                    Rubro (%)
                                </th>

                                {/* Encabezado por oferta - se muestra productoNombre sin cambiar items */}
                                {items.map((p, idx) => {
                                    const nombreProducto =
                                        ofertasFiltradas[idx]?.productoNombre ?? p.nombre;
                                    return (
                                        <th
                                            key={p.id}
                                            className="px-6 py-3 text-left bg-blue-50 border-b sticky top-0 z-40"
                                        >
                                            <div className="font-bold text-slate-800">{p.id}</div>
                                            <div className="text-xs text-slate-500 leading-tight">
                                                {nombreProducto}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                            </thead>

                            <tbody>
                            {conceptos.map((c) => {
                                const conceptBandCls =
                                    (c.tipo === "band" ? "bg-blue-50 " : "") +
                                    (c.band === "y" ? "bg-yellow-50 " : "") +
                                    (c.band === "y-strong" ? "bg-yellow-100 " : "") ||
                                    "bg-white ";
                                const conceptTxtCls = [
                                    c.strong ? "font-semibold" : "",
                                    c.emph ? "text-slate-900" : "text-slate-600",
                                    c.ital ? "italic" : "",
                                ]
                                    .filter(Boolean)
                                    .join(" ");

                                return (
                                    <tr key={c.id} className="group">
                                        {/* Concepto: COLUMNA FIJA */}
                                        <td
                                            className={[
                                                "px-6 py-3 align-top border-b",
                                                conceptBandCls,
                                                conceptTxtCls,
                                                "w-[220px] md:w-[260px] px-4 whitespace-normal break-words leading-snug",
                                                "sticky left-0 z-30", // fija primera columna
                                                // AJUSTE VISUAL: resaltar columna fija sin tocar bandas
                                                "border-r border-slate-200",
                                                "shadow-[6px_0_8px_-4px_rgba(0,0,0,0.25)]",
                                                "font-semibold text-slate-800",
                                            ].join(" ")}
                                        >
                                            {c.nombre}
                                        </td>

                                        {/* Rubro (%) */}
                                        <RubroCell
                                            clienteId={clienteId}
                                            rubroId={c.id}
                                            value={rubrosEdit?.[clienteId]?.[c.id] ?? ""}
                                            setRubrosEdit={setRubrosEdit}
                                        />

                                        {/* Valores por referencia (oferta) */}
                                        {items.map((p) =>
                                                c.editable ? (
                                                    <VentasBrutasCell
                                                        key={`${p.id}_${c.id}`}
                                                        clienteId={clienteId}
                                                        codigoProducto={p.id}
                                                        valorActual={p.ventasBrutas}
                                                        ventasNetas={p.ventasNetas}
                                                    />
                                                ) : (
                                                    <td
                                                        key={`${p.id}_${c.id}`}
                                                        className={[
                                                            "px-6 py-3 align-top border-b text-right",
                                                            c.tipo === "band" ? "bg-blue-50" : "",
                                                            c.band === "y" ? "bg-yellow-50" : "",
                                                            c.band === "y-strong" ? "bg-yellow-100" : "",
                                                        ]
                                                            .filter(Boolean)
                                                            .join(" ")}
                                                    >
                                                        {(() => {
                                                            const valor = valorPorConcepto(c.id, p);
                                                            const base = basePorcentaje(c.id, p);
                                                            const isMoney = typeof valor === "number";
                                                            const textClass =
                                                                isMoney && negativo(valor)
                                                                    ? "text-red-600"
                                                                    : "text-slate-800";
                                                            return isMoney ? (
                                                                <div className="flex items-baseline justify-end gap-2">
                                  <span className={`font-medium ${textClass}`}>
                                    {fmtCOP(valor)}
                                  </span>
                                                                    <span className="text-[11px] text-slate-500">
                                    {pct(valor, base)}
                                  </span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-baseline justify-end gap-2 text-slate-400">
                                                                    <span>—</span>
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>
                                                )
                                        )}
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        );
    };

    /* Render principal */
    if (loadingRubros) {
        return <div className="w-full text-center py-6 text-slate-500">Cargando…</div>;
    }
    if (errorRubros) {
        return <div className="w-full text-center py-6 text-red-600">{errorRubros}</div>;
    }

    return (
        <div className="w-full overflow-x-auto">
            <div className="mx-auto max-w-[1400px]">
                {/* Barra de filtros */}
                <div className="sticky top-0 z-[9999] pt-3 pb-2 bg-[rgba(248,250,252,0.95)] backdrop-blur supports-[backdrop-filter]:backdrop-blur shadow-lg">
                <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                        {/* Filtro por cliente (multi) */}
                        <div className="flex-1">
                            <div className="text-sm text-slate-400 pl-1 mb-1">Filtrar por cliente</div>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setOpen((v) => !v)}
                                    className="w-full text-left pl-4 pr-10 py-2.5 rounded-full border border-slate-200 shadow-sm bg-white hover:bg-slate-50"
                                >
                                    {textoSeleccion}
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">▼</span>
                                </button>

                                {open && (
                                    <div className="absolute z-[10000] mt-2 w-full max-h-[70vh] overflow-auto bg-white rounded-xl shadow-2xl ring-1 ring-black/10 p-2">
                                    {/* Acciones */}
                                        <div className="flex items-center gap-2 px-2 pb-2 text-xs">
                                            <button
                                                type="button"
                                                onClick={seleccionarTodos}
                                                className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                                            >
                                                Seleccionar TODOS
                                            </button>
                                            <button
                                                type="button"
                                                onClick={marcarTodos}
                                                className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                                            >
                                                Marcar todos
                                            </button>
                                            <button
                                                type="button"
                                                onClick={limpiarSeleccion}
                                                className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50"
                                            >
                                                Limpiar selección
                                            </button>
                                        </div>

                                        {/* Buscador dentro del menú */}
                                        <div className="px-2 pb-2">
                                            <input
                                                type="text"
                                                value={queryClientes}
                                                onChange={(e) => setQueryClientes(e.target.value)}
                                                placeholder="Buscar cliente…"
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                            />
                                        </div>

                                        {/* Lista de clientes */}
                                        <ul className="max-h-64 overflow-auto">
                                            <li
                                                className="flex items-center gap-2 px-4 py-2 hover:bg-blue-50 cursor-pointer"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => toggleCliente(ALL)}
                                            >
                                                <input type="checkbox" readOnly checked={clientesSel.includes(ALL)} />
                                                <span className="text-sm font-semibold">Todos los clientes</span>
                                            </li>

                                            {clientesFiltrados.map((c) => {
                                                const isAll = clientesSel.includes(ALL);
                                                const checked = isAll ? false : clientesSel.includes(c.id);
                                                return (
                                                    <li
                                                        key={c.id}
                                                        className="flex items-center gap-2 px-4 py-2 hover:bg-blue-50 cursor-pointer"
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => toggleCliente(c.id)}
                                                    >
                                                        <input type="checkbox" readOnly checked={checked} />
                                                        <span className="text-sm">{`${c.id} — ${c.nombre}`}</span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Filtro por referencia */}
                        <div className="flex-1">
                            <div className="text-sm text-slate-400 pl-1 mb-1">
                                Filtrar por referencia (código de producto)
                            </div>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🧾</span>
                                <input
                                    type="text"
                                    value={refQuery}
                                    onChange={(e) => setRefQuery(e.target.value)}
                                    placeholder="Ej: 682335, 614763 o parte del código"
                                    className="w-full pl-9 pr-24 py-2.5 rounded-full border border-slate-200 shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {refQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setRefQuery("")}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded-full border border-slate-200 bg-white hover:bg-slate-50"
                                        title="Limpiar referencia"
                                    >
                                        Limpiar
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Secciones por cliente */}
                {entries.map((c) => (
                    <Section key={c.clienteId} cliente={c} />
                ))}

            </div>
        </div>
    );
}
