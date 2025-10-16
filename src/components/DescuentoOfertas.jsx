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
        case "80": // Descuentos (usa % de rubro)
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
        case "420": // VP Mercadeo
        case "440": // Admon CANALES
        case "450": // Operación Logística
        case "503": // Total Asesoras de Belleza
        case "505": // Vendedores Público
        case "506": // Vendedores Salon'in
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

    /* Columnas (productos/referencias) – mock como tenías */
    const [productos, setProductos] = useState([
        {
            clienteId: "4000348",
            clienteNombre: "ALMACENES ÉXITO S.A.",
            id: "682335",
            nombre: "Desod Deo Pies Antibact 260ml 20PE Duo",
            ventasBrutas: 636531342,
            descuentos: 33228931, // se recalcula desde % si existe rubro 80
            costoVenta: 205236683,
            gastos: {
                mercadoCanales: 82109458, // usados como fallback para % si API no trae rubro
                vendedoresBelle: 98217633,
                promoPublicidad: 192755120,
            },
            financierosCTO: 18099072, // fallback para % si API no trae rubro 2010
        },
        {
            clienteId: "4000348",
            clienteNombre: "ALMACENES ÉXITO S.A.",
            id: "682366",
            nombre: "Desod Deo Pies Mujeres 260ml 20PE Duo",
            ventasBrutas: 283177618,
            descuentos: 14782759,
            costoVenta: 112289621,
            gastos: {
                mercadoCanales: 36528540,
                vendedoresBelle: 43694683,
                promoPublicidad: 85752157,
            },
            financierosCTO: 8051846,
        },
        {
            clienteId: "4000348",
            clienteNombre: "ALMACENES ÉXITO S.A.",
            id: "614763",
            nombre: "Desod DeoPies Clinic x260ml Pe20 Duo",
            ventasBrutas: 153909611,
            descuentos: 8034564,
            costoVenta: 61875747,
            gastos: {
                mercadoCanales: 19853594,
                vendedoresBelle: 23748458,
                promoPublicidad: 46607078,
            },
            financierosCTO: 4376251,
        },
    ]);

    /* Rubros/Conceptos desde la API */
    const [rubrosClientes, setRubrosClientes] = useState([]);
    const [loadingRubros, setLoadingRubros] = useState(true);
    const [errorRubros, setErrorRubros] = useState("");

    useEffect(() => {
        (async () => {
            try {
                setLoadingRubros(true);
                setErrorRubros("");
                const r = await fetch(`${apiBaseURL}/rubros/listar`);
                const j = await r.json();
                const data = Array.isArray(j) ? j : j?.data || [];
                setRubrosClientes(data);
            } catch (e) {
                console.error(e);
                setErrorRubros("No se pudieron cargar los rubros.");
            } finally {
                setLoadingRubros(false);
            }
        })();
    }, [apiBaseURL]);

    /* Conceptos dinámicos (unión de todos, con meta de estilo) */
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

    /* Rubros editables por cliente */
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

    const calcularExcelItem = (p, rubrosPctCliente) => {
        // % DESCUENTO (80)
        const descPctFallback = p.ventasBrutas ? (p.descuentos / p.ventasBrutas) * 100 : 0;
        const descuentoPct = getPct(rubrosPctCliente, "80", descPctFallback);

        const descuentos = p.ventasBrutas * (descuentoPct / 100);
        const ventasNetas = p.ventasBrutas - descuentos;

        // COSTO DE VENTA (200) es valor absoluto
        const costoVenta = p.costoVenta;

        // UTILIDAD BRUTA (300)
        const utilidadBruta = ventasNetas - costoVenta;

        // % de GASTOS sobre VENTAS NETAS (500/600/920)
        const pct500 = getPct(
            rubrosPctCliente,
            "500",
            ventasNetas ? ((p.gastos?.mercadoCanales || 0) / ventasNetas) * 100 : 0
        );
        const pct600 = getPct(
            rubrosPctCliente,
            "600",
            ventasNetas ? ((p.gastos?.vendedoresBelle || 0) / ventasNetas) * 100 : 0
        );
        const pct920 = getPct(
            rubrosPctCliente,
            "920",
            ventasNetas ? ((p.gastos?.promoPublicidad || 0) / ventasNetas) * 100 : 0
        );

        const g500 = ventasNetas * (pct500 / 100);
        const g600 = ventasNetas * (pct600 / 100);
        const g920 = ventasNetas * (pct920 / 100);

        // TOTAL GASTOS DE VENTAS (1000)
        const totalGastosVentas = g500 + g600 + g920;

        // GASTOS OPERACIÓN (1200) % sobre ventas netas (fallback 11.05)
        const pct1200 = getPct(rubrosPctCliente, "1200", 11.05);
        const gastosOperacion = ventasNetas * (pct1200 / 100);

        // UTILIDAD OPERACIÓN (1500)
        const utilidadOperacion = utilidadBruta - totalGastosVentas - gastosOperacion;

        // FINANCIEROS (2010) % sobre ventas netas (fallback 3% o derivado)
        const finPctFallback = ventasNetas ? ((p.financierosCTO || 0) / ventasNetas) * 100 : 0;
        const pct2010 = getPct(rubrosPctCliente, "2010", finPctFallback || 3);
        const financierosCalc = ventasNetas * (pct2010 / 100);

        // UTILIDAD DESPUÉS DE C.T.O. (2020)
        const utilidadDespCTO = utilidadOperacion - financierosCalc;

        return {
            ...p,
            // cantidades calculadas:
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

    // valor por conceptoId para un producto (ahora usa los campos calculados)
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

    // Base de porcentaje: casi todo sobre ventas netas (como Excel)
    const basePorcentaje = (conceptoId, p) => {
        const sobreNetas = new Set([
            "100", // Ventas netas
            "200", // Costo de venta
            "300", // Utilidad bruta
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

    /* Agrupar referencias por cliente (para columnas) */
    const groupByCliente = useMemo(() => {
        const m = new Map();
        productos.forEach((p) => {
            if (!m.has(p.clienteId))
                m.set(p.clienteId, { nombre: p.clienteNombre, items: [] });
            m.get(p.clienteId).items.push(p); // guardamos crudo; calculamos dentro de Section con rubros del cliente
        });
        return m;
    }, [productos]);

    /* Filtros */
    const [clienteSel, setClienteSel] = useState(ALL);
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [refQuery, setRefQuery] = useState("");

    const clientes = useMemo(
        () => rubrosClientes.map((c) => ({ id: c.clienteId, nombre: c.clienteNombre })),
        [rubrosClientes]
    );

    const clientesFiltrados = useMemo(() => {
        const base = [{ id: ALL, nombre: "Todos los clientes" }, ...clientes];
        const q = norm(query);
        if (!q) return base;
        return base.filter(
            (c) =>
                norm(c.id).includes(q) ||
                norm(c.nombre).includes(q) ||
                q.includes(norm(c.nombre))
        );
    }, [clientes, query]);

    const clearFilter = () => {
        setClienteSel(ALL);
        setQuery("");
        setOpen(false);
    };

    /* ====== Celdas con edición estable ====== */

    // Ventas Brutas: estado local + commit en blur (muestra % según ventasNetas)
    const VentasBrutasCell = (p) => {
        const [local, setLocal] = useState(toMilesString(p.ventasBrutas));

        useEffect(() => {
            setLocal(toMilesString(p.ventasBrutas));
        }, [p.ventasBrutas]);

        const onBlur = () => {
            const val = toNumberFromMiles(local);
            setProductos((prev) =>
                prev.map((x) => (x.id === p.id ? { ...x, ventasBrutas: val } : x))
            );
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
                        aria-label={`Ventas Brutas ${p.id}`}
                    />
                    <span className="text-[11px] text-slate-500">
                        {pct(p.ventasBrutas, p.ventasNetas)}
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

    const ValorCell = (c, p) => {
        const valor = valorPorConcepto(c.id, p);
        const base = basePorcentaje(c.id, p);
        const isMoney = typeof valor === "number";
        const textClass = isMoney && negativo(valor) ? "text-red-600" : "text-slate-800";

        const bandCls =
            (c.tipo === "band" ? "bg-blue-50 " : "") +
            (c.band === "y" ? "bg-yellow-50 " : "") +
            (c.band === "y-strong" ? "bg-yellow-100 " : "");

        return (
            <td className={`px-6 py-3 align-top border-b text-right ${bandCls}`}>
                {isMoney ? (
                    <div className="flex items-baseline justify-end gap-2">
                        <span className={`font-medium ${textClass}`}>{fmtCOP(valor)}</span>
                        <span className="text-[11px] text-slate-500">
                            {pct(valor, base)}
                        </span>
                    </div>
                ) : (
                    <div className="flex items-baseline justify-end gap-2 text-slate-400">
                        <span>—</span>
                    </div>
                )}
            </td>
        );
    };

    /* Sección por cliente (mantiene estilos anteriores) */
    const Section = ({ clienteId, clienteNombre }) => {
        const allItems = groupByCliente.get(clienteId)?.items || [];
        const refQ = norm(refQuery);
        const itemsFiltradosCrudos = refQ
            ? allItems.filter(
                (p) => norm(p.id).includes(refQ) || norm(p.nombre).includes(refQ)
            )
            : allItems;

        // Cálculo estilo Excel usando rubros del cliente
        const rubrosCliente = rubrosEdit?.[clienteId] || {};
        const itemsFiltrados = itemsFiltradosCrudos.map((p) =>
            calcularExcelItem(p, rubrosCliente)
        );

        return (
            <section className="mb-6">
                <div className="rounded-2xl bg-blue-900 text-white px-6 py-4 shadow-sm mt-3 mb-3">
                    <div className="text-sm opacity-90">{clienteId}</div>
                    <div className="text-xl font-bold tracking-wide">{clienteNombre}</div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg ring-1 ring-black/5">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                            <tr>
                                <th className="w-[220px] md:w-[260px] text-left px-4 py-3 bg-blue-50 font-semibold text-slate-700 border-b">
                                    Concepto
                                </th>
                                <th className="w-[140px] text-right px-6 py-3 bg-blue-50 font-semibold text-slate-700 border-b">
                                    Rubro (%)
                                </th>
                                {itemsFiltrados.map((p) => (
                                    <th key={p.id} className="px-6 py-3 text-left bg-blue-50 border-b">
                                        <div className="font-bold text-slate-800">
                                            {p.id} — {p.nombre.split(" ")[0]}
                                        </div>
                                        <div className="text-xs text-slate-500 leading-tight">{p.nombre}</div>
                                    </th>
                                ))}
                            </tr>
                            </thead>

                            <tbody>
                            {conceptos.map((c) => {
                                const conceptBandCls =
                                    (c.tipo === "band" ? "bg-blue-50 " : "") +
                                    (c.band === "y" ? "bg-yellow-50 " : "") +
                                    (c.band === "y-strong" ? "bg-yellow-100 " : "");
                                const conceptTxtCls = [
                                    c.strong ? "font-semibold" : "",
                                    c.emph ? "text-slate-900" : "text-slate-600",
                                    c.ital ? "italic" : "",
                                ]
                                    .filter(Boolean)
                                    .join(" ");

                                return (
                                    <tr key={c.id} className="group">
                                        {/* Concepto */}
                                        <td
                                            className={[
                                                "px-6 py-3 align-top border-b",
                                                conceptBandCls,
                                                conceptTxtCls,
                                                "w-[220px] md:w-[260px] px-4 whitespace-normal break-words leading-snug",
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

                                        {/* Valores por referencia */}
                                        {itemsFiltrados.map((p) =>
                                            c.editable ? (
                                                <VentasBrutasCell key={`${p.id}_${c.id}`} {...p} />
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

    /* Render principal (misma barra de filtros y colores) */
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
                <div className="sticky top-0 z-20 pt-3 pb-2 bg-[rgba(248,250,252,0.85)] backdrop-blur supports-[backdrop-filter]:backdrop-blur">
                    <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                        {/* Filtro por cliente */}
                        <div className="flex-1">
                            <div className="text-sm text-slate-400 pl-1 mb-1">Filtrar por cliente</div>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔎</span>
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onFocus={() => setOpen(true)}
                                    placeholder="Todos los clientes (vacío) • o busca: olimpica, éxito..."
                                    className="w-full pl-9 pr-24 py-2.5 rounded-full border border-slate-200 shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setOpen((v) => !v)}
                                    className="absolute right-12 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    aria-label="Abrir lista"
                                >
                                    ▼
                                </button>
                                <button
                                    type="button"
                                    onClick={clearFilter}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded-full border border-slate-200 bg-white hover:bg-slate-50"
                                    title="Mostrar todos"
                                >
                                    Limpiar
                                </button>

                                {open && (
                                    <ul className="absolute z-30 mt-2 w-full bg-white rounded-xl shadow-lg ring-1 ring-black/5 max-h-64 overflow-auto">
                                        {[{ id: ALL, nombre: "Todos los clientes" }, ...clientesFiltrados].map((c) => (
                                            <li
                                                key={c.id}
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => {
                                                    setClienteSel(c.id);
                                                    setQuery(c.id === ALL ? "" : `${c.id} — ${c.nombre}`);
                                                    setOpen(false);
                                                }}
                                                className={`px-4 py-2 cursor-pointer text-sm hover:bg-blue-50 ${
                                                    c.id === clienteSel ? "bg-blue-50 font-semibold" : ""
                                                }`}
                                            >
                                                {c.id === ALL ? "Todos los clientes" : `${c.id} — ${c.nombre}`}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* Filtro por referencia */}
                        <div className="flex-1">
                            <div className="text-sm text-slate-400 pl-1 mb-1">
                                Filtrar por referencia (ID o nombre)
                            </div>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🧾</span>
                                <input
                                    type="text"
                                    value={refQuery}
                                    onChange={(e) => setRefQuery(e.target.value)}
                                    placeholder="Ej: 682335, 614763 o parte del nombre"
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
                {(() => {
                    const entries =
                        clienteSel !== ALL
                            ? rubrosClientes.filter((c) => c.clienteId === clienteSel)
                            : rubrosClientes;
                    return entries.map((c) => (
                        <Section
                            key={c.clienteId}
                            clienteId={c.clienteId}
                            clienteNombre={c.clienteNombre}
                        />
                    ));
                })()}

                <div className="text-xs text-slate-500 mt-2 px-1">
                    * Conceptos y porcentajes (Rubro %) vienen del API; los valores
                    se calculan como en Excel sobre Ventas Netas.
                </div>
            </div>
        </div>
    );
}
