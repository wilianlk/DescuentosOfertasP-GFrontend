/* eslint-disable react-hooks/exhaustive-deps */
import React, {
    useEffect,
    useMemo,
    useRef,
    useState,
    useDeferredValue,
} from "react";
import { Virtuoso } from "react-virtuoso";
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
        case "60":
            return { editable: true };
        case "80":
            return {};
        case "100":
            return { ...blueBand };
        case "200":
            return {};
        case "300":
            return { ...blueBand };
        case "500":
        case "600":
        case "920":
        case "420":
        case "440":
        case "450":
        case "503":
        case "505":
        case "506":
            return { ...yellowBand };
        case "1000":
            return { ...yellowStrong };
        case "1200":
            return { ...yellowBand };
        case "1500":
            return { strong: true, emph: true };
        case "2010":
            return { ital: true };
        case "2020":
            return { strong: true, emph: true };
        default:
            return {};
    }
}

/* ====== funciones puras de cálculo ====== */
const getPct = (mapa, key, fallback) => {
    const v = mapa?.[key];
    return typeof v === "number" ? v : fallback;
};

const calcularExcelItem = (p, rubrosPctCliente) => {
    const descPct = getPct(rubrosPctCliente, "80", 0);
    const descuentos = p.ventasBrutas * (descPct / 100);
    const ventasNetas = p.ventasBrutas - descuentos;
    const costoVenta = p.costoVenta;
    const utilidadBruta = ventasNetas - costoVenta;

    const pct500 = getPct(rubrosPctCliente, "500", 0);
    const pct600 = getPct(rubrosPctCliente, "600", 0);
    const pct920 = getPct(rubrosPctCliente, "920", 0);

    const g500 = ventasNetas * (pct500 / 100);
    const g600 = ventasNetas * (pct600 / 100);
    const g920 = ventasNetas * (pct920 / 100);

    const totalGastosVentas = g500 + g600 + g920;

    const pct1200 = getPct(rubrosPctCliente, "1200", 11.05);
    const gastosOperacion = ventasNetas * (pct1200 / 100);

    const utilidadOperacion = utilidadBruta - totalGastosVentas - gastosOperacion;

    const pct2010 = getPct(rubrosPctCliente, "2010", 3);
    const financierosCalc = ventasNetas * (pct2010 / 100);

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

/* ==================== SECCIÓN (memoizada) ==================== */
const Section = React.memo(function Section({
                                                cliente,
                                                conceptos,
                                                rubrosEdit,
                                                setRubrosEdit,
                                                ventasOverride,
                                                setVentasOverride,
                                                deferredRefQuery,
                                                numero,
                                                totalGlobal,
                                            }) {
    const clienteId = cliente.clienteId;
    const clienteNombre = cliente.clienteNombre;

    // columnas/ofertas
    const ofertas = Array.isArray(cliente.ofertas) ? cliente.ofertas : [];
    const ventasOverrideCliente = ventasOverride?.[clienteId] || {};

    // filtro referencia diferido
    const refQ = norm(deferredRefQuery);
    const ofertasFiltradas = useMemo(
        () => (refQ ? ofertas.filter((o) => norm(o.codigoProducto).includes(refQ)) : ofertas),
        [ofertas, refQ]
    );

    const rubrosCliente = rubrosEdit?.[clienteId] || {};

    const items = useMemo(() => {
        return ofertasFiltradas.map((o) => {
            const override = ventasOverrideCliente?.[o.codigoProducto] ?? null;
            const ventasBrutas = Number.isFinite(override) ? override : o.totalPrecio || 0;
            const costoVenta = o.totalCosto || 0;

            const base = {
                id: o.codigoProducto,
                codigo: o.codigoProducto,
                nombre: o.codigoProducto, // mostramos nombre en el thead sin tocar lógica
                ventasBrutas,
                costoVenta,
            };
            return calcularExcelItem(base, rubrosCliente);
        });
    }, [ofertasFiltradas, ventasOverrideCliente, rubrosCliente]);

    // === celdas ===
    const VentasBrutasCell = React.memo(function VentasBrutasCell({
                                                                      clienteId,
                                                                      codigoProducto,
                                                                      valorActual,
                                                                      ventasNetas,
                                                                  }) {
        const overrideActual = ventasOverride?.[clienteId]?.[codigoProducto] ?? null;
        const [local, setLocal] = useState(toMilesString(overrideActual ?? valorActual));

        useEffect(() => {
            const ov = ventasOverride?.[clienteId]?.[codigoProducto] ?? null;
            setLocal(toMilesString(ov ?? valorActual));
        }, [valorActual, clienteId, codigoProducto, ventasOverride]);

        const onBlur = () => {
            const val = toNumberFromMiles(local);
            setVentasOverride((prev) => ({
                ...prev,
                [clienteId]: { ...(prev[clienteId] || {}), [codigoProducto]: val },
            }));
            setLocal(toMilesString(val));
        };

        return (
            <td className="px-6 py-3 align-top border-b text-right">
                <div className="min-w-[200px] max-w-[240px] ml-auto flex items-center justify-end gap-2">
                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9\\.]*"
                        value={local}
                        onChange={(e) => setLocal(e.target.value)}
                        onBlur={onBlur}
                        /* ancho más cómodo para alinear con el encabezado */
                        className="w-[200px] text-right rounded-lg border border-slate-300 px-3 py-2.5 text-[15px] font-semibold text-slate-800 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                        aria-label={`Ventas Brutas ${codigoProducto}`}
                    />
                    <span className="text-[11px] text-slate-500">
            {pct(overrideActual ?? valorActual, ventasNetas)}
          </span>
                </div>
            </td>
        );
    });

    const RubroCell = React.memo(function RubroCell({ clienteId, rubroId, value }) {
        const [local, setLocal] = useState(String(value ?? 0));
        useEffect(() => setLocal(String(value ?? 0)), [value, clienteId, rubroId]);

        const commit = (text) => {
            const raw = `${text}`.replace(",", ".").replace(/[^0-9.]/g, "");
            const num = raw === "" ? 0 : Math.min(9999, Math.max(0, parseFloat(raw)));
            setRubrosEdit((p) => ({
                ...p,
                [clienteId]: { ...(p[clienteId] || {}), [rubroId]: Number.isNaN(num) ? 0 : num },
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

    return (
        <section className="mb-6">
            <div className="rounded-2xl bg-blue-900 text-white px-6 py-4 shadow-sm mt-3 mb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm opacity-90">{clienteId}</div>
                        <div className="text-xl font-bold tracking-wide">{clienteNombre}</div>
                    </div>
                    <div
                        className="ml-3 shrink-0 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold"
                        aria-label={`Cliente ${numero} de ${totalGlobal}`}
                    >
                        {numero} / {totalGlobal}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg ring-1 ring-black/5">
                <div className="relative overflow-auto max-h-[75vh] will-change-transform">
                    <table className="min-w-full text-sm border-separate border-spacing-0">
                        <thead>
                        <tr>
                            {/* Columna Concepto fija a la izquierda */}
                            <th
                                className="w-[220px] md:w-[260px] text-left px-4 py-3
                 bg-blue-50 font-semibold text-slate-700 border-b
                 sticky top-0 left-0 z-[50]
                 shadow-[2px_0_5px_rgba(0,0,0,0.15)]"
                            >
                                Concepto
                            </th>

                            {/* Columna Rubro */}
                            <th
                                className="w-[140px] text-right px-6 py-3 bg-blue-50 font-semibold
                 text-slate-700 border-b sticky top-0 z-[45]"
                            >
                                Rubro (%)
                            </th>

                            {/* Encabezados de productos (ítems) */}
                            {items.map((p, idx) => {
                                const nombreProducto =
                                    ofertasFiltradas[idx]?.productoNombre ?? p.nombre;
                                return (
                                    <th
                                        key={p.id}
                                        className="px-6 py-3 bg-blue-50 border-b text-center
                     sticky top-0 z-[40]
                     shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]
                     backdrop-blur-sm"
                                    >
                                        <div className="min-w-[200px] max-w-[240px] mx-auto">
                                            <div className="font-bold text-slate-800 leading-tight">
                                                {p.id}
                                            </div>
                                            <div
                                                className="text-xs text-slate-600 leading-tight
                         break-words whitespace-normal mt-0.5"
                                            >
                                                {nombreProducto}
                                            </div>
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
                                    {/* Columna Concepto fija a la izquierda */}
                                    <td
                                        className={[
                                            "px-6 py-3 align-top border-b",
                                            conceptBandCls,
                                            conceptTxtCls,
                                            "w-[220px] md:w-[260px] px-4 whitespace-normal break-words leading-snug",
                                            "sticky left-0 z-30",
                                            "border-r border-slate-200",
                                            "shadow-[6px_0_8px_-4px_rgba(0,0,0,0.25)]",
                                            "font-semibold text-slate-800",
                                        ].join(" ")}
                                    >
                                        {c.nombre}
                                    </td>

                                    {/* Columna Rubro editable por fila */}
                                    <RubroCell
                                        clienteId={clienteId}
                                        rubroId={c.id}
                                        value={rubrosEdit?.[clienteId]?.[c.id] ?? ""}
                                    />

                                    {/* Celdas de cada producto */}
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
                                                    <div className="min-w-[200px] max-w-[240px] ml-auto">
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
                                                    </div>
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
});

/* ==================== Componente principal (scroll infinito + loader + FAB filtros) ==================== */
export default function DescuentoOfertas() {
    const { apiBaseURL } = getConfig();

    const [rubrosClientes, setRubrosClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorRubros, setErrorRubros] = useState("");

    const [totalGlobal, setTotalGlobal] = useState(0);
    const LIMIT = 15;
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const sentinelRef = useRef(null);

    // Ediciones locales
    const [rubrosEdit, setRubrosEdit] = useState({});
    const [ventasOverride, setVentasOverride] = useState({});

    /* ========= Filtros ========= */
    const [open, setOpen] = useState(false);
    const [clientesSel, setClientesSel] = useState([ALL]);
    const [queryClientes, setQueryClientes] = useState("");
    const [refQuery, setRefQuery] = useState("");

    const deferredRefQuery = useDeferredValue(refQuery);

    // ===== Modal de filtros + FAB =====
    const [filterModalOpen, setFilterModalOpen] = useState(false);
    const openFiltersModal = () => setFilterModalOpen(true);
    const closeFiltersModal = () => setFilterModalOpen(false);

    // ====== Carga infinita ======
    useEffect(() => {
        let abort = false;

        const loadData = async () => {
            setLoading(true);
            try {
                const r = await fetch(`${apiBaseURL}/rubros/listar?page=${page}&limit=${LIMIT}`);
                if (!r.ok) throw new Error(`Error HTTP: ${r.status}`);

                const j = await r.json();
                const data = Array.isArray(j) ? j : j?.data || [];

                // totales del API (si existen)
                const totalGlobalApi =
                    typeof j?.totalGlobal === "number" ? j.totalGlobal : undefined;
                const totalClientesApi =
                    typeof j?.totalClientes === "number" ? j.totalClientes : undefined;

                if (abort) return;

                setRubrosClientes((prev) => {
                    const merged = [...prev, ...data];

                    if (totalGlobalApi != null || totalClientesApi != null) {
                        const tg = totalGlobalApi ?? totalClientesApi;
                        setTotalGlobal(tg);
                        const reachedEnd = merged.length >= tg || data.length === 0;
                        setHasMore(!reachedEnd);
                    } else {
                        // sin totales: continuar mientras llegue LIMIT
                        setTotalGlobal((old) => Math.max(old, merged.length));
                        setHasMore(data.length === LIMIT);
                    }

                    return merged;
                });
            } catch (e) {
                console.error(e);
                if (!abort) setErrorRubros("No se pudieron cargar los rubros.");
            } finally {
                if (!abort) setLoading(false);
            }
        };

        loadData();
        return () => {
            abort = true;
        };
    }, [page, apiBaseURL]);

    useEffect(() => {
        if (!sentinelRef.current) return;
        const obs = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && hasMore && !loading) {
                    setPage((p) => p + 1);
                }
            },
            { root: null, rootMargin: "200px", threshold: 0 }
        );
        obs.observe(sentinelRef.current);
        return () => obs.disconnect();
    }, [loading, hasMore]);

    // Merge NO-DESTRUCTIVO de rubrosEdit (cuando llegan nuevos clientes)
    useEffect(() => {
        setRubrosEdit((prev) => {
            const next = { ...prev };
            for (const c of rubrosClientes) {
                const cid = c.clienteId;
                if (!next[cid]) next[cid] = {};
                (c.rubros || []).forEach((r) => {
                    if (!(r.id in next[cid])) next[cid][r.id] = r.porcentaje ?? 0;
                });
            }
            return next;
        });
    }, [rubrosClientes]);

    // Derivados para filtros
    const clientes = useMemo(
        () => rubrosClientes.map((c) => ({ id: c.clienteId, nombre: c.clienteNombre })),
        [rubrosClientes]
    );

    // Debounce manual (simple) sobre queryClientes
    const [debouncedQuery, setDebouncedQuery] = useState(queryClientes);
    useEffect(() => {
        const t = setTimeout(() => setDebouncedQuery(queryClientes), 300);
        return () => clearTimeout(t);
    }, [queryClientes]);

    const clientesFiltrados = useMemo(() => {
        if (!open) return [];
        const q = norm(debouncedQuery);
        if (!q) return clientes;
        return clientes.filter(
            (c) => norm(c.id).includes(q) || norm(c.nombre).includes(q)
        );
    }, [clientes, debouncedQuery, open]);

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
        setClientesSel([ALL]);
        setOpen(false);
    };

    const entries = useMemo(() => {
        const q = norm(deferredRefQuery);
        const base = clientesSel.includes(ALL)
            ? rubrosClientes
            : rubrosClientes.filter((c) => clientesSel.includes(c.clienteId));

        if (!q) return base;

        // Solo muestra clientes que tengan al menos una oferta con el código buscado
        return base.filter(
            (c) =>
                Array.isArray(c.ofertas) &&
                c.ofertas.some((o) => norm(o.codigoProducto).includes(q))
        );
    }, [rubrosClientes, clientesSel, deferredRefQuery]);

    const textoSeleccion = clientesSel.includes(ALL)
        ? "Todos los clientes"
        : `${clientesSel.length} cliente(s) seleccionados`;

    const badgeIndex = (idx) => idx + 1;

    // Conceptos
    const conceptos = useMemo(() => {
        const map = new Map();
        rubrosClientes.forEach((c) => {
            (c.rubros || []).forEach((r) => {
                if (!map.has(r.id)) map.set(r.id, r.nombre);
            });
        });
        return Array.from(map, ([id, nombre]) => ({ id, nombre, ...metaConcepto(id) })).sort(
            (a, b) => {
                const na = Number(a.id);
                const nb = Number(b.id);
                if (Number.isNaN(na) || Number.isNaN(nb))
                    return String(a.id).localeCompare(String(b.id));
                return na - nb;
            }
        );
    }, [rubrosClientes]);

    // Filtrado para el MODAL (independiente del dropdown 'open')
    const clientesFiltradosModal = useMemo(() => {
        const q = norm(debouncedQuery);
        if (!q) return clientes;
        return clientes.filter(
            (c) => norm(c.id).includes(q) || norm(c.nombre).includes(q)
        );
    }, [clientes, debouncedQuery]);

    /* Render principal */
    if (errorRubros)
        return <div className="w-full text-center py-6 text-red-600">{errorRubros}</div>;

    return (
        <div className="w-full overflow-x-auto relative">
            <div className="mx-auto max-w-[1400px]">
                {/* Barra de filtros */}
                <div className="sticky top-0 z-[9999] pt-3 pb-2 bg-[rgba(248,250,252,0.95)] backdrop-blur supports-[backdrop-filter]:backdrop-blur shadow-lg">
                    <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                        {/* Filtro por cliente (virtualizado con Virtuoso) */}
                        <div className="flex-1">
                            <div className="text-sm text-slate-400 pl-1 mb-1">Filtrar por cliente</div>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setOpen((v) => !v)}
                                    className="w-full text-left pl-4 pr-10 py-2.5 rounded-full border border-slate-200 shadow-sm bg-white hover:bg-slate-50"
                                >
                                    {textoSeleccion}
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    ▼
                  </span>
                                </button>

                                {open && (
                                    <div className="absolute z-[10000] mt-2 w-full max-h-[70vh] overflow-hidden bg-white rounded-xl shadow-2xl ring-1 ring-black/10 p-2">
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

                                        <div className="px-2 pb-2">
                                            <input
                                                type="text"
                                                value={queryClientes}
                                                onChange={(e) => setQueryClientes(e.target.value)}
                                                placeholder="Buscar cliente…"
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                            />
                                        </div>

                                        {/* Lista virtualizada con react-virtuoso */}
                                        <Virtuoso
                                            style={{ height: 350, width: "100%" }}
                                            totalCount={clientesFiltrados.length}
                                            itemContent={(index) => {
                                                const c = clientesFiltrados[index];
                                                const isAll = clientesSel.includes(ALL);
                                                const checked = isAll ? false : clientesSel.includes(c.id);
                                                return (
                                                    <div
                                                        key={c.id}
                                                        className="flex items-center gap-2 px-4 py-2 hover:bg-blue-50 cursor-pointer"
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => toggleCliente(c.id)}
                                                    >
                                                        <input type="checkbox" readOnly checked={checked} />
                                                        <span className="text-sm truncate">
                              {c.id} — {c.nombre}
                            </span>
                                                    </div>
                                                );
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Filtro por referencia (código de producto) */}
                        <div className="flex-1">
                            <div className="text-sm text-slate-400 pl-1 mb-1">
                                Filtrar por referencia (código de producto)
                            </div>
                            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  🧾
                </span>
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

                    {/* Contador global */}
                    <div className="mt-3 text-sm text-slate-700">
                        Clientes: <span className="font-semibold">1-{rubrosClientes.length}</span> de{" "}
                        <span className="font-semibold">{totalGlobal}</span>
                    </div>
                </div>

                {/* Secciones por cliente */}
                {entries.map((c, idx) => (
                    <Section
                        key={c.clienteId}
                        cliente={c}
                        conceptos={conceptos}
                        rubrosEdit={setRubrosEdit ? rubrosEdit : {}}
                        setRubrosEdit={setRubrosEdit}
                        ventasOverride={ventasOverride}
                        setVentasOverride={setVentasOverride}
                        deferredRefQuery={deferredRefQuery}
                        numero={badgeIndex(idx)}
                        totalGlobal={totalGlobal}
                    />
                ))}

                {/* Sentinel para cargas infinitas */}
                <div ref={sentinelRef} className="h-8" />

                {/* Fin de lista */}
                {!loading && !hasMore && rubrosClientes.length > 0 && (
                    <div className="py-6 text-center text-slate-400">No hay más clientes</div>
                )}
            </div>

            {/* Loader único centrado en la pantalla */}
            {loading && hasMore && (
                <div className="fixed inset-0 z-[10000] pointer-events-none flex items-center justify-center">
                    <div className="bg-white/90 backdrop-blur px-4 py-3 rounded-full shadow border border-slate-200 text-sm text-slate-700 flex items-center">
                        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600 mr-2" />
                        Cargando…
                    </div>
                </div>
            )}

            {/* ===== FAB de Filtros ===== */}
            <button
                type="button"
                onClick={openFiltersModal}
                className="fixed bottom-6 right-6 z-[11001] rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 flex items-center gap-2"
                aria-label="Abrir filtros rápidos"
                title="Abrir filtros"
            >
                <span>🔍</span>
                <span className="font-semibold">Filtros</span>
            </button>

            {/* ===== Modal de Filtros ===== */}
            {filterModalOpen && (
                <div
                    className="fixed inset-0 z-[11000] bg-black/40 backdrop-blur-sm flex items-center justify-center px-4"
                    onClick={closeFiltersModal}
                >
                    <div
                        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl ring-1 ring-black/10 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="filtros-title"
                    >
                        <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
                            <h2 id="filtros-title" className="text-lg font-semibold text-slate-800">
                                Filtros rápidos
                            </h2>
                            <button
                                className="text-slate-500 hover:text-slate-700"
                                onClick={closeFiltersModal}
                                aria-label="Cerrar"
                                title="Cerrar"
                            >
                                ✖
                            </button>
                        </div>

                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Bloque clientes */}
                            <div>
                                <div className="text-sm text-slate-400 mb-2">Filtrar por cliente</div>

                                <div className="flex items-center gap-2 pb-2 text-xs">
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

                                <div className="pb-2">
                                    <input
                                        type="text"
                                        value={queryClientes}
                                        onChange={(e) => setQueryClientes(e.target.value)}
                                        placeholder="Buscar cliente…"
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                </div>

                                <div className="rounded-lg border border-slate-200 overflow-hidden">
                                    <Virtuoso
                                        style={{ height: 300, width: "100%" }}
                                        totalCount={clientesFiltradosModal.length}
                                        itemContent={(index) => {
                                            const c = clientesFiltradosModal[index];
                                            const isAll = clientesSel.includes(ALL);
                                            const checked = isAll ? false : clientesSel.includes(c.id);
                                            return (
                                                <div
                                                    key={c.id}
                                                    className="flex items-center gap-2 px-4 py-2 hover:bg-blue-50 cursor-pointer"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => toggleCliente(c.id)}
                                                >
                                                    <input type="checkbox" readOnly checked={checked} />
                                                    <span className="text-sm truncate">
                            {c.id} — {c.nombre}
                          </span>
                                                </div>
                                            );
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Bloque referencia */}
                            <div>
                                <div className="text-sm text-slate-400 mb-2">
                                    Filtrar por referencia (código de producto)
                                </div>
                                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    🧾
                  </span>
                                    <input
                                        type="text"
                                        value={refQuery}
                                        onChange={(e) => setRefQuery(e.target.value)}
                                        placeholder="Ej: 682335, 614763 o parte del código"
                                        className="w-full pl-9 pr-24 py-2.5 rounded-lg border border-slate-200 shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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

                                <div className="mt-4 text-sm text-slate-700">
                                    Selección actual:{" "}
                                    <span className="font-semibold">
                    {clientesSel.includes(ALL)
                        ? "Todos los clientes"
                        : `${clientesSel.length} cliente(s)`}
                  </span>
                                </div>
                            </div>
                        </div>

                        <div className="px-5 py-4 border-t bg-slate-50 flex items-center justify-end gap-3">
                            <button
                                className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-white"
                                onClick={closeFiltersModal}
                            >
                                Cerrar
                            </button>
                            <button
                                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                onClick={closeFiltersModal}
                            >
                                Aplicar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
