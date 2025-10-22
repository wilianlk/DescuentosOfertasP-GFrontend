/* eslint-disable react-hooks/exhaustive-deps */
// src/components/GestorDeRubros.jsx
import React, { useEffect, useMemo, useState } from "react";
import { getConfig } from "../config/config";
import {
    FaSearch,
    FaSyncAlt,
    FaPlus,
    FaTrash,
    FaSave,
    FaInfoCircle,
    FaEdit,
    FaUser,
    FaChevronLeft,
    FaChevronRight,
} from "react-icons/fa";

/* =========================
   Utilidades
========================= */
const clampPct = (v) => {
    const n = Number(String(v).replace(",", "."));
    if (Number.isNaN(n)) return 0;
    return Math.max(-9999, Math.min(9999, n));
};
const norm = (s) =>
    (s || "")
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "")
        .toLowerCase();

const fmtCOP = (n) =>
    (Number(n) || 0).toLocaleString("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
    });

const clampMoney = (v) => {
    const n = Number(
        String(v).replace(/\s+/g, "").replace(/\./g, "").replace(",", ".")
    );
    if (Number.isNaN(n)) return 0;
    return Math.max(0, n);
};

/* Map helpers tolerantes a camelCase/PascalCase */
const pick = (obj, ...keys) => {
    for (const k of keys) {
        if (obj && Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
    }
    return undefined;
};

/* =========================
   Modal base (accesible)
========================= */
function Modal({ open, title, children, onClose }) {
    if (!open) return null;
    return (
        <div
            className="fixed inset-0 z-[11000] bg-black/40 backdrop-blur-sm flex items-center justify-center px-4"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
            aria-label={title}
        >
            <div
                className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl ring-1 ring-black/10 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
                    <button
                        className="text-slate-500 hover:text-slate-700"
                        onClick={onClose}
                        aria-label="Cerrar"
                        title="Cerrar"
                    >
                        ✖
                    </button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
}

/* =========================
   Confirmación genérica
========================= */
function ConfirmModal({ open, text, onCancel, onConfirm }) {
    return (
        <Modal open={open} title="Confirmar acción" onClose={onCancel}>
            <p className="text-slate-700">{text}</p>
            <div className="mt-5 flex items-center justify-end gap-3">
                <button
                    className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-white"
                    onClick={onCancel}
                >
                    Cancelar
                </button>
                <button
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold"
                    onClick={onConfirm}
                >
                    Confirmar
                </button>
            </div>
        </Modal>
    );
}

/* =========================
   Modal Crear Rubro
========================= */
function CrearRubroModal({
                             open,
                             onClose,
                             onCreate,
                             clienteId,
                             clienteNombre,
                         }) {
    const [form, setForm] = useState({
        rubroId: "",
        rubroNombre: "",
        porcentaje: "",
    });

    useEffect(() => {
        if (open) {
            setForm({ rubroId: "", rubroNombre: "", porcentaje: "" });
        }
    }, [open]);

    const puedeCrear =
        clienteId?.trim().length > 0 &&
        form.rubroId.trim().length > 0 &&
        form.rubroNombre.trim().length > 0 &&
        String(form.porcentaje).trim() !== "";

    const submit = () => {
        if (!puedeCrear) return;
        onCreate({
            ClienteId: clienteId.trim(),
            ClienteNombre: (clienteNombre || "").trim(),
            RubroId: form.rubroId.trim(),
            RubroNombre: form.rubroNombre.trim(),
            Porcentaje: clampPct(form.porcentaje),
        });
    };

    return (
        <Modal open={open} title="Nuevo rubro" onClose={onClose}>
            <div className="space-y-4">
                <div>
                    <div className="text-xs text-slate-500 mb-1">Cliente</div>
                    <div className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
                        {clienteId || "—"} {clienteNombre ? `— ${clienteNombre}` : ""}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-slate-500 pl-1">Rubro ID</label>
                        <input
                            type="text"
                            value={form.rubroId}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, rubroId: e.target.value }))
                            }
                            placeholder="Ej: 500, 600, 1200…"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-slate-500 pl-1">Porcentaje</label>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={form.porcentaje}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, porcentaje: e.target.value }))
                            }
                            placeholder="0"
                            className="w-full text-right px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-sm text-slate-500 pl-1">Nombre del rubro</label>
                    <input
                        type="text"
                        value={form.rubroNombre}
                        onChange={(e) =>
                            setForm((p) => ({ ...p, rubroNombre: e.target.value }))
                        }
                        placeholder="Nombre del rubro"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                        className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-white"
                        onClick={onClose}
                    >
                        Cancelar
                    </button>
                    <button
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
                        onClick={submit}
                        disabled={!puedeCrear}
                    >
                        <FaPlus /> Crear
                    </button>
                </div>
            </div>
        </Modal>
    );
}

/* =========================
   Modal Editar Porcentaje Rubro
========================= */
function EditarPctModal({ open, onClose, rubro, onSave }) {
    const [pct, setPct] = useState("");

    useEffect(() => {
        if (open && rubro) {
            setPct(String(rubro.porcentaje ?? 0));
        }
    }, [open, rubro]);

    const submit = () => onSave(clampPct(pct));

    if (!rubro) return null;

    return (
        <Modal open={open} title="Editar porcentaje" onClose={onClose}>
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <div className="text-xs text-slate-500 mb-1">Rubro ID</div>
                        <div className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
                            {rubro.rubroId}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 mb-1">Nombre</div>
                        <div className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 truncate">
                            {rubro.rubroNombre}
                        </div>
                    </div>
                </div>

                <div>
                    <label className="text-sm text-slate-500 pl-1">Porcentaje</label>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={pct}
                        onChange={(e) => setPct(e.target.value)}
                        onBlur={() => setPct(String(clampPct(pct)))}
                        className="w-full text-right px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                        className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-white"
                        onClick={onClose}
                    >
                        Cancelar
                    </button>
                    <button
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        onClick={submit}
                    >
                        <FaSave /> Guardar
                    </button>
                </div>
            </div>
        </Modal>
    );
}

/* =========================
   Modal Crear Oferta
========================= */
function CrearOfertaModal({ open, onClose, onCreate, clienteId, clienteNombre }) {
    const [form, setForm] = useState({
        codigoProducto: "",
        productoNombre: "",
        totalCosto: "",
        totalPrecio: "",
    });

    useEffect(() => {
        if (open) {
            setForm({
                codigoProducto: "",
                productoNombre: "",
                totalCosto: "",
                totalPrecio: "",
            });
        }
    }, [open]);

    const puedeCrear =
        clienteId?.trim().length > 0 &&
        form.codigoProducto.trim().length > 0 &&
        form.productoNombre.trim().length > 0 &&
        String(form.totalPrecio).trim() !== "";

    const submit = () => {
        if (!puedeCrear) return;
        onCreate({
            ClienteId: clienteId.trim(),
            ClienteNombre: (clienteNombre || "").trim(),
            CodigoProducto: form.codigoProducto.trim(),
            ProductoNombre: form.productoNombre.trim(),
            TotalCosto: clampMoney(form.totalCosto),
            TotalPrecio: clampMoney(form.totalPrecio),
        });
    };

    return (
        <Modal open={open} title="Nuevo producto / oferta" onClose={onClose}>
            <div className="space-y-4">
                <div className="text-xs text-slate-500">Cliente</div>
                <div className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
                    {clienteId || "—"} {clienteNombre ? `— ${clienteNombre}` : ""}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-slate-500 pl-1">Código</label>
                        <input
                            type="text"
                            value={form.codigoProducto}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, codigoProducto: e.target.value }))
                            }
                            placeholder="Ej: 682335"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-slate-500 pl-1">Nombre</label>
                        <input
                            type="text"
                            value={form.productoNombre}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, productoNombre: e.target.value }))
                            }
                            placeholder="Nombre del producto"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-slate-500 pl-1">Costo total</label>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={form.totalCosto}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, totalCosto: e.target.value }))
                            }
                            placeholder="0"
                            className="w-full text-right px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-slate-500 pl-1">Precio total</label>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={form.totalPrecio}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, totalPrecio: e.target.value }))
                            }
                            placeholder="0"
                            className="w-full text-right px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                        className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-white"
                        onClick={onClose}
                    >
                        Cancelar
                    </button>
                    <button
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
                        onClick={submit}
                        disabled={!puedeCrear}
                    >
                        <FaPlus /> Crear
                    </button>
                </div>
            </div>
        </Modal>
    );
}

/* =========================
   Modal Editar Oferta
========================= */
function EditarOfertaModal({ open, onClose, oferta, onSave }) {
    const [form, setForm] = useState({
        productoNombre: "",
        totalCosto: "",
        totalPrecio: "",
    });

    useEffect(() => {
        if (open && oferta) {
            setForm({
                productoNombre: oferta.productoNombre || "",
                totalCosto: String(oferta.totalCosto ?? 0),
                totalPrecio: String(oferta.totalPrecio ?? 0),
            });
        }
    }, [open, oferta]);

    if (!oferta) return null;

    const submit = () =>
        onSave({
            ProductoNombre: form.productoNombre.trim(),
            TotalCosto: clampMoney(form.totalCosto),
            TotalPrecio: clampMoney(form.totalPrecio),
        });

    return (
        <Modal
            open={open}
            title={`Editar producto ${oferta.codigoProducto}`}
            onClose={onClose}
        >
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <div className="text-xs text-slate-500 mb-1">Código</div>
                        <div className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
                            {oferta.codigoProducto}
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-sm text-slate-500 pl-1">Nombre</label>
                        <input
                            type="text"
                            value={form.productoNombre}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, productoNombre: e.target.value }))
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-slate-500 pl-1">Costo total</label>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={form.totalCosto}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, totalCosto: e.target.value }))
                            }
                            className="w-full text-right px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-slate-500 pl-1">Precio total</label>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={form.totalPrecio}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, totalPrecio: e.target.value }))
                            }
                            className="w-full text-right px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                        className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-white"
                        onClick={onClose}
                    >
                        Cancelar
                    </button>
                    <button
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        onClick={submit}
                    >
                        <FaSave /> Guardar
                    </button>
                </div>
            </div>
        </Modal>
    );
}

/* =========================
   GestorDeRubros + Ofertas con modales
========================= */
export default function GestorDeRubros() {
    const { apiBaseURL } = getConfig();

    // Lista de clientes (para no escribir nada)
    const [clientes, setClientes] = useState([]); // [{id, nombre}]
    const [loadingClientes, setLoadingClientes] = useState(true);
    const [errorClientes, setErrorClientes] = useState("");

    // Cliente seleccionado
    const [clienteSel, setClienteSel] = useState(null); // {id, nombre}

    // Rubros del cliente
    const [rubros, setRubros] = useState([]); // [{rubroId, rubroNombre, porcentaje}]
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState({ type: "", text: "" });
    const limpiarMensajes = () => setMsg({ type: "", text: "" });

    // Ofertas (productos) del cliente
    const [ofertas, setOfertas] = useState([]); // [{codigoProducto, productoNombre, totalCosto, totalPrecio}]
    const [qRef, setQRef] = useState("");

    // Modales rubros
    const [openCrear, setOpenCrear] = useState(false);
    const [openEditar, setOpenEditar] = useState(false);
    const [rubroEditando, setRubroEditando] = useState(null);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [rubroAEliminar, setRubroAEliminar] = useState(null);

    // Modales ofertas
    const [openCrearOferta, setOpenCrearOferta] = useState(false);
    const [openEditarOferta, setOpenEditarOferta] = useState(false);
    const [ofertaEditando, setOfertaEditando] = useState(null);
    const [openConfirmOferta, setOpenConfirmOferta] = useState(false);
    const [ofertaAEliminar, setOfertaAEliminar] = useState(null);

    // Modal de selección de cliente
    const [openSelCliente, setOpenSelCliente] = useState(false);
    const [qCliente, setQCliente] = useState("");

    // === Cargar lista de clientes al montar ===
    useEffect(() => {
        let abort = false;
        const loadClientes = async () => {
            setLoadingClientes(true);
            setErrorClientes("");
            try {
                const r = await fetch(
                    `${apiBaseURL}/rubros/listar-global?page=1&limit=100`
                );
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                const j = await r.json();
                const data = Array.isArray(j) ? j : j?.data || [];

                const list = data.map((c) => ({
                    id: pick(c, "clienteId", "ClienteId"),
                    nombre: pick(c, "clienteNombre", "ClienteNombre") || "",
                }));
                if (!abort) {
                    setClientes(list);
                    if (list.length > 0) {
                        setClienteSel(list[0]); // auto-selección
                    }
                }
            } catch (e) {
                console.error(e);
                if (!abort)
                    setErrorClientes("No se pudieron cargar los clientes (listar-global).");
            } finally {
                if (!abort) setLoadingClientes(false);
            }
        };
        loadClientes();
        return () => {
            abort = true;
        };
    }, [apiBaseURL]);

    // === Cuando cambia cliente seleccionado => traer rubros y ofertas (si hay) ===
    useEffect(() => {
        if (!clienteSel?.id) {
            setRubros([]);
            setOfertas([]);
            return;
        }
        const fetchRubrosYOfertas = async () => {
            setLoading(true);
            limpiarMensajes();
            try {
                // Intento principal: endpoint por cliente (detalle rubros + ofertas)
                const r = await fetch(
                    `${apiBaseURL}/rubros/ofertas-detalle/${encodeURIComponent(
                        clienteSel.id
                    )}`
                );

                if (r.ok) {
                    const j = await r.json();

                    // Rubros: acepta varias formas
                    const arrRubros = Array.isArray(j?.data)
                        ? j.data
                        : Array.isArray(j?.rubros)
                            ? j.rubros
                            : Array.isArray(j)
                                ? j
                                : [];

                    const mappedRubros = arrRubros.map((x) => ({
                        clienteId: j?.clienteId ?? clienteSel.id,
                        clienteNombre: j?.clienteNombre ?? clienteSel.nombre,
                        rubroId: pick(x, "RubroId", "rubroId", "id"),
                        rubroNombre: pick(x, "RubroNombre", "rubroNombre", "nombre"),
                        porcentaje: Number(pick(x, "Porcentaje", "porcentaje")) || 0,
                    }));

                    // Ofertas si vienen en la respuesta
                    const arrOfertas = Array.isArray(j?.ofertas) ? j.ofertas : [];
                    const mappedOfertas = arrOfertas.map((o) => ({
                        codigoProducto: pick(o, "codigoProducto", "CodigoProducto") || "",
                        productoNombre: pick(o, "productoNombre", "ProductoNombre") || "",
                        totalCosto: Number(pick(o, "totalCosto", "TotalCosto")) || 0,
                        totalPrecio: Number(pick(o, "totalPrecio", "TotalPrecio")) || 0,
                    }));

                    setRubros(mappedRubros);
                    setOfertas(mappedOfertas);

                    const nombreInferido = j?.clienteNombre || clienteSel.nombre || "";
                    setClienteSel((prev) =>
                        prev ? { ...prev, nombre: nombreInferido } : prev
                    );

                    setMsg({
                        type: "success",
                        text: `Cargados ${mappedRubros.length} rubro(s) y ${mappedOfertas.length} producto(s) del cliente ${clienteSel.id}.`,
                    });
                } else {
                    // Fallback: buscar cliente en listar-global
                    const rg = await fetch(
                        `${apiBaseURL}/rubros/listar-global?page=1&limit=1000`
                    );
                    if (!rg.ok) throw new Error(`HTTP ${rg.status}`);
                    const jg = await rg.json();
                    const arr = Array.isArray(jg) ? jg : jg?.data || [];
                    const item = arr.find(
                        (c) => pick(c, "clienteId", "ClienteId") === clienteSel.id
                    );

                    const rubrosArr = item?.rubros || item?.Rubros || [];
                    const ofertasArr = item?.ofertas || item?.Ofertas || [];

                    const mappedRubros = rubrosArr.map((rx) => ({
                        clienteId: pick(item, "clienteId", "ClienteId"),
                        clienteNombre: pick(item, "clienteNombre", "ClienteNombre") || "",
                        rubroId: pick(rx, "id", "Id", "rubroId", "RubroId"),
                        rubroNombre: pick(
                            rx,
                            "nombre",
                            "Nombre",
                            "rubroNombre",
                            "RubroNombre"
                        ),
                        porcentaje: Number(pick(rx, "porcentaje", "Porcentaje")) || 0,
                    }));

                    const mappedOfertas = ofertasArr.map((o) => ({
                        codigoProducto: pick(o, "codigoProducto", "CodigoProducto") || "",
                        productoNombre: pick(o, "productoNombre", "ProductoNombre") || "",
                        totalCosto: Number(pick(o, "totalCosto", "TotalCosto")) || 0,
                        totalPrecio: Number(pick(o, "totalPrecio", "TotalPrecio")) || 0,
                    }));

                    setRubros(mappedRubros);
                    setOfertas(mappedOfertas);

                    const nombreInferido =
                        pick(item, "clienteNombre", "ClienteNombre") ||
                        clienteSel.nombre ||
                        "";
                    setClienteSel((prev) =>
                        prev ? { ...prev, nombre: nombreInferido } : prev
                    );

                    setMsg({
                        type: "success",
                        text: `Cargados ${mappedRubros.length} rubro(s) y ${mappedOfertas.length} producto(s) del cliente ${clienteSel.id}.`,
                    });
                }
            } catch (e) {
                console.error(e);
                setRubros([]);
                setOfertas([]);
                setMsg({
                    type: "error",
                    text: "No se pudieron obtener los datos del cliente. Verifica el backend.",
                });
            } finally {
                setLoading(false);
            }
        };
        fetchRubrosYOfertas();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clienteSel?.id]);

    // === Acciones CRUD Rubros (sin cambios) ===
    const actualizarRubro = async (rubroId, nuevoPorcentaje) => {
        limpiarMensajes();
        const pct = clampPct(nuevoPorcentaje);
        try {
            const r = await fetch(
                `${apiBaseURL}/rubros/${encodeURIComponent(
                    clienteSel.id
                )}/${encodeURIComponent(rubroId)}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(pct),
                }
            );
            const j = await r.json();
            if (!r.ok || j?.success === false)
                throw new Error(j?.message || `HTTP ${r.status}`);

            setRubros((prev) =>
                prev.map((x) =>
                    x.rubroId === rubroId ? { ...x, porcentaje: pct } : x
                )
            );
            setMsg({ type: "success", text: "Rubro actualizado correctamente." });
        } catch (e) {
            console.error(e);
            setMsg({
                type: "error",
                text:
                    "Error al actualizar el rubro. Revisa logs/servicio y formato del porcentaje.",
            });
        }
    };

    const eliminarRubro = async (rubroId) => {
        limpiarMensajes();
        try {
            const r = await fetch(
                `${apiBaseURL}/rubros/${encodeURIComponent(
                    clienteSel.id
                )}/${encodeURIComponent(rubroId)}`,
                { method: "DELETE" }
            );
            const j = await r.json();
            if (!r.ok || j?.success === false)
                throw new Error(j?.message || `HTTP ${r.status}`);

            setRubros((prev) => prev.filter((x) => x.rubroId !== rubroId));
            setMsg({ type: "success", text: "Rubro eliminado." });
        } catch (e) {
            console.error(e);
            setMsg({
                type: "error",
                text: "No se pudo eliminar el rubro. Verifica dependencias.",
            });
        }
    };

    const crearRubro = async (dto) => {
        limpiarMensajes();
        try {
            const r = await fetch(`${apiBaseURL}/rubros`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dto),
            });
            const j = await r.json();
            if (!r.ok || j?.success === false)
                throw new Error(j?.message || `HTTP ${r.status}`);

            setMsg({ type: "success", text: "Rubro creado correctamente." });
            setOpenCrear(false);
            // Refrescar del backend
            setClienteSel((prev) => ({ ...prev })); // dispara useEffect
        } catch (e) {
            console.error(e);
            setMsg({
                type: "error",
                text:
                    "Error al crear el rubro. Verifica duplicados (PK cliente_id + rubro_id).",
            });
        }
    };

    // === Acciones CRUD Ofertas ===
    const crearOferta = async (dto) => {
        limpiarMensajes();
        try {
            const r = await fetch(`${apiBaseURL}/rubros/ofertas`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dto),
            });
            const j = await r.json();
            if (!r.ok || j?.success === false)
                throw new Error(j?.message || `HTTP ${r.status}`);

            setMsg({ type: "success", text: "Producto creado correctamente." });
            setOpenCrearOferta(false);
            setClienteSel((prev) => ({ ...prev })); // refresca
        } catch (e) {
            console.error(e);
            setMsg({
                type: "error",
                text:
                    "Error al crear el producto. Verifica duplicados (PK cliente_id + codigo).",
            });
        }
    };

    const actualizarOferta = async (codigoProducto, changes) => {
        limpiarMensajes();
        try {
            const r = await fetch(
                `${apiBaseURL}/rubros/ofertas/${encodeURIComponent(
                    clienteSel.id
                )}/${encodeURIComponent(codigoProducto)}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(changes),
                }
            );
            const j = await r.json();
            if (!r.ok || j?.success === false)
                throw new Error(j?.message || `HTTP ${r.status}`);

            setOfertas((prev) =>
                prev.map((o) =>
                    o.codigoProducto === codigoProducto
                        ? {
                            ...o,
                            productoNombre:
                                typeof changes.ProductoNombre === "string"
                                    ? changes.ProductoNombre
                                    : o.productoNombre,
                            totalCosto:
                                typeof changes.TotalCosto === "number"
                                    ? changes.TotalCosto
                                    : o.totalCosto,
                            totalPrecio:
                                typeof changes.TotalPrecio === "number"
                                    ? changes.TotalPrecio
                                    : o.totalPrecio,
                        }
                        : o
                )
            );
            setMsg({ type: "success", text: "Producto actualizado correctamente." });
        } catch (e) {
            console.error(e);
            setMsg({
                type: "error",
                text: "Error al actualizar el producto.",
            });
        }
    };

    const eliminarOferta = async (codigoProducto) => {
        limpiarMensajes();
        try {
            const r = await fetch(
                `${apiBaseURL}/rubros/ofertas/${encodeURIComponent(
                    clienteSel.id
                )}/${encodeURIComponent(codigoProducto)}`,
                { method: "DELETE" }
            );
            const j = await r.json();
            if (!r.ok || j?.success === false)
                throw new Error(j?.message || `HTTP ${r.status}`);

            setOfertas((prev) =>
                prev.filter((o) => o.codigoProducto !== codigoProducto)
            );
            setMsg({ type: "success", text: "Producto eliminado." });
        } catch (e) {
            console.error(e);
            setMsg({
                type: "error",
                text: "No se pudo eliminar el producto.",
            });
        }
    };

    // === Derivados / filtros ===
    const encabezadoCliente = useMemo(() => {
        if (!clienteSel?.id) return "Sin cliente";
        if (!clienteSel?.nombre) return clienteSel.id;
        return `${clienteSel.id} — ${clienteSel.nombre}`;
    }, [clienteSel]);

    const [qRubros, setQRubros] = useState("");
    const rubrosFiltrados = useMemo(() => {
        const nq = norm(qRubros);
        if (!nq) return rubros;
        return rubros.filter(
            (r) => norm(r.rubroId).includes(nq) || norm(r.rubroNombre).includes(nq)
        );
    }, [qRubros, rubros]);

    const ofertasFiltradas = useMemo(() => {
        const nq = norm(qRef);
        if (!nq) return ofertas;
        return ofertas.filter(
            (o) =>
                norm(o.codigoProducto).includes(nq) ||
                norm(o.productoNombre).includes(nq)
        );
    }, [qRef, ofertas]);

    const idxSel = useMemo(
        () => clientes.findIndex((c) => c.id === clienteSel?.id),
        [clientes, clienteSel?.id]
    );
    const canPrev = idxSel > 0;
    const canNext = idxSel >= 0 && idxSel < clientes.length - 1;

    const goPrev = () => {
        if (!canPrev) return;
        setClienteSel(clientes[idxSel - 1]);
    };
    const goNext = () => {
        if (!canNext) return;
        setClienteSel(clientes[idxSel + 1]);
    };

    const clientesFiltrados = useMemo(() => {
        const nq = norm(qCliente);
        if (!nq) return clientes;
        return clientes.filter(
            (c) => norm(c.id).includes(nq) || norm(c.nombre).includes(nq)
        );
    }, [clientes, qCliente]);

    // ==== UI ====
    return (
        <div className="w-full max-w-[1200px] mx-auto">
            {/* Header */}
            <div className="rounded-2xl bg-blue-900 text-white px-6 py-4 shadow-sm mt-3 mb-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <div className="text-sm opacity-90">Gestor de Rubros • CRUD</div>
                        <div className="text-xl font-bold tracking-wide flex items-center gap-2">
                            <FaUser className="opacity-90" />
                            {encabezadoCliente}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setOpenSelCliente(true)}
                            disabled={loadingClientes}
                            className="shrink-0 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20 disabled:opacity-50 flex items-center gap-2"
                            title="Cambiar cliente"
                        >
                            Seleccionar cliente
                        </button>

                        <div className="hidden md:flex items-center gap-2">
                            <button
                                type="button"
                                onClick={goPrev}
                                disabled={!canPrev}
                                className="shrink-0 rounded-full bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20 disabled:opacity-40 flex items-center gap-2"
                                title="Anterior cliente"
                            >
                                <FaChevronLeft />
                            </button>
                            <button
                                type="button"
                                onClick={goNext}
                                disabled={!canNext}
                                className="shrink-0 rounded-full bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20 disabled:opacity-40 flex items-center gap-2"
                                title="Siguiente cliente"
                            >
                                <FaChevronRight />
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => clienteSel?.id && setClienteSel({ ...clienteSel })}
                            disabled={!clienteSel?.id || loading}
                            className="shrink-0 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20 disabled:opacity-50 flex items-center gap-2"
                            title="Recargar"
                        >
                            <FaSyncAlt className={loading ? "animate-spin" : ""} />
                            Recargar
                        </button>

                        <button
                            type="button"
                            onClick={() => setOpenCrear(true)}
                            disabled={!clienteSel?.id}
                            className="shrink-0 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
                            title="Nuevo rubro"
                        >
                            <FaPlus />
                            Nuevo rubro
                        </button>
                    </div>
                </div>
            </div>

            {/* Estado de clientes */}
            {loadingClientes && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-sm">
                    Cargando clientes…
                </div>
            )}
            {errorClientes && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    {errorClientes}
                </div>
            )}

            {/* ---- Rubros ---- */}
            <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-slate-600">
                    {rubros.length > 0
                        ? `Rubros: ${rubrosFiltrados.length} / ${rubros.length}`
                        : clienteSel?.id
                            ? "Sin datos cargados"
                            : "Selecciona un cliente"}
                </div>
                <div className="relative">
                    <input
                        type="text"
                        value={qRubros}
                        onChange={(e) => setQRubros(e.target.value)}
                        placeholder="Filtrar rubros por ID o nombre…"
                        className="pl-3 pr-3 py-2 rounded-lg border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                </div>
            </div>

            {/* Mensajes de API */}
            {msg.text && (
                <div
                    className={[
                        "mb-2 px-3 py-2 rounded-lg text-sm flex items-center gap-2",
                        msg.type === "error"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : msg.type === "success"
                                ? "bg-green-50 text-green-700 border border-green-200"
                                : "bg-slate-50 text-slate-700 border border-slate-200",
                    ].join(" ")}
                >
                    <FaInfoCircle />
                    <span>{msg.text}</span>
                </div>
            )}

            {/* Tabla de rubros */}
            <div className="bg-white rounded-2xl shadow-lg ring-1 ring-black/5 overflow-hidden mb-8">
                <div className="relative overflow-auto">
                    <table className="min-w-full text-sm border-separate border-spacing-0">
                        <thead>
                        <tr className="sticky top-0 z-10 bg-blue-50 text-slate-700">
                            <th className="text-left px-4 py-3 border-b w-[180px]">
                                Rubro ID
                            </th>
                            <th className="text-left px-4 py-3 border-b">Nombre</th>
                            <th className="text-right px-4 py-3 border-b w-[160px]">
                                Porcentaje (%)
                            </th>
                            <th className="text-right px-4 py-3 border-b w-[220px]">
                                Acciones
                            </th>
                        </tr>
                        </thead>

                        <tbody>
                        {!clienteSel?.id ? (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="px-6 py-6 text-center text-slate-500"
                                >
                                    {loadingClientes
                                        ? "Cargando clientes…"
                                        : "Selecciona un cliente."}
                                </td>
                            </tr>
                        ) : rubros.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="px-6 py-6 text-center text-slate-500"
                                >
                                    {loading ? "Cargando rubros…" : "Sin rubros para este cliente."}
                                </td>
                            </tr>
                        ) : rubrosFiltrados.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="px-6 py-6 text-center text-slate-500"
                                >
                                    No hay coincidencias para el filtro.
                                </td>
                            </tr>
                        ) : (
                            rubrosFiltrados.map((r) => (
                                <tr key={r.rubroId} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 border-t font-semibold text-slate-700">
                                        {r.rubroId}
                                    </td>
                                    <td className="px-4 py-3 border-t">{r.rubroNombre}</td>
                                    <td className="px-4 py-3 border-t text-right">
                                        {String(r.porcentaje ?? 0)}
                                    </td>
                                    <td className="px-4 py-3 border-t">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setRubroEditando(r);
                                                    setOpenEditar(true);
                                                }}
                                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                                                title="Editar porcentaje"
                                            >
                                                <FaEdit />
                                                Editar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setRubroAEliminar(r);
                                                    setOpenConfirm(true);
                                                }}
                                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                                                title="Eliminar rubro"
                                            >
                                                <FaTrash />
                                                Eliminar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ---- Ofertas / Productos ---- */}
            <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-slate-600">
                    {ofertas.length > 0
                        ? `Productos: ${ofertasFiltradas.length} / ${ofertas.length}`
                        : "Sin productos cargados"}
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={qRef}
                        onChange={(e) => setQRef(e.target.value)}
                        placeholder="Buscar por código o nombre…"
                        className="pl-3 pr-3 py-2 rounded-lg border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <button
                        type="button"
                        onClick={() => setOpenCrearOferta(true)}
                        disabled={!clienteSel?.id}
                        className="shrink-0 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
                        title="Nuevo producto"
                    >
                        <FaPlus />
                        Nuevo producto
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg ring-1 ring-black/5 overflow-hidden">
                <div className="relative overflow-auto">
                    <table className="min-w-full text-sm border-separate border-spacing-0">
                        <thead>
                        <tr className="sticky top-0 z-10 bg-blue-50 text-slate-700">
                            <th className="text-left px-4 py-3 border-b w-[140px]">
                                Código
                            </th>
                            <th className="text-left px-4 py-3 border-b">Producto</th>
                            <th className="text-right px-4 py-3 border-b w-[140px]">
                                Costo
                            </th>
                            <th className="text-right px-4 py-3 border-b w-[140px]">
                                Precio
                            </th>
                            <th className="text-right px-4 py-3 border-b w-[140px]">
                                Utilidad
                            </th>
                            <th className="text-right px-4 py-3 border-b w-[120px]">
                                % Utilidad
                            </th>
                            <th className="text-right px-4 py-3 border-b w-[220px]">
                                Acciones
                            </th>
                        </tr>
                        </thead>
                        <tbody>
                        {ofertas.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-6 py-6 text-center text-slate-500"
                                >
                                    {loading
                                        ? "Cargando productos…"
                                        : "Sin productos para este cliente."}
                                </td>
                            </tr>
                        ) : ofertasFiltradas.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-6 py-6 text-center text-slate-500"
                                >
                                    No hay coincidencias para el filtro.
                                </td>
                            </tr>
                        ) : (
                            ofertasFiltradas.map((o) => {
                                const utilidad = (o.totalPrecio || 0) - (o.totalCosto || 0);
                                const pct = o.totalPrecio
                                    ? ((utilidad / o.totalPrecio) * 100).toFixed(1) + "%"
                                    : "-";
                                return (
                                    <tr key={o.codigoProducto} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 border-t font-semibold text-slate-700">
                                            {o.codigoProducto}
                                        </td>
                                        <td className="px-4 py-3 border-t">{o.productoNombre}</td>
                                        <td className="px-4 py-3 border-t text-right">
                                            {fmtCOP(o.totalCosto)}
                                        </td>
                                        <td className="px-4 py-3 border-t text-right">
                                            {fmtCOP(o.totalPrecio)}
                                        </td>
                                        <td className="px-4 py-3 border-t text-right">
                                            {fmtCOP(utilidad)}
                                        </td>
                                        <td className="px-4 py-3 border-t text-right">{pct}</td>
                                        <td className="px-4 py-3 border-t">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setOfertaEditando(o);
                                                        setOpenEditarOferta(true);
                                                    }}
                                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                                                    title="Editar producto"
                                                >
                                                    <FaEdit />
                                                    Editar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setOfertaAEliminar(o);
                                                        setOpenConfirmOferta(true);
                                                    }}
                                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                                                    title="Eliminar producto"
                                                >
                                                    <FaTrash />
                                                    Eliminar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Overlay global de carga */}
            {loading && (
                <div className="fixed inset-0 z-[10000] pointer-events-none flex items-center justify-center">
                    <div className="bg-white/90 backdrop-blur px-4 py-3 rounded-full shadow border border-slate-200 text-sm text-slate-700 flex items-center">
                        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600 mr-2" />
                        Cargando…
                    </div>
                </div>
            )}

            {/* === Modales Rubros === */}
            <CrearRubroModal
                open={openCrear}
                onClose={() => setOpenCrear(false)}
                onCreate={crearRubro}
                clienteId={clienteSel?.id || ""}
                clienteNombre={clienteSel?.nombre || ""}
            />

            <EditarPctModal
                open={openEditar}
                onClose={() => setOpenEditar(false)}
                rubro={rubroEditando}
                onSave={(pct) => {
                    if (!rubroEditando) return;
                    actualizarRubro(rubroEditando.rubroId, pct);
                    setOpenEditar(false);
                }}
            />

            <ConfirmModal
                open={openConfirm}
                text={
                    rubroAEliminar
                        ? `¿Eliminar el rubro ${rubroAEliminar.rubroId} (${rubroAEliminar.rubroNombre})?`
                        : "¿Eliminar?"
                }
                onCancel={() => setOpenConfirm(false)}
                onConfirm={() => {
                    if (!rubroAEliminar) return;
                    eliminarRubro(rubroAEliminar.rubroId);
                    setOpenConfirm(false);
                }}
            />

            {/* === Modales Ofertas === */}
            <CrearOfertaModal
                open={openCrearOferta}
                onClose={() => setOpenCrearOferta(false)}
                onCreate={crearOferta}
                clienteId={clienteSel?.id || ""}
                clienteNombre={clienteSel?.nombre || ""}
            />

            <EditarOfertaModal
                open={openEditarOferta}
                onClose={() => setOpenEditarOferta(false)}
                oferta={ofertaEditando}
                onSave={(changes) => {
                    if (!ofertaEditando) return;
                    actualizarOferta(ofertaEditando.codigoProducto, changes);
                    setOpenEditarOferta(false);
                }}
            />

            <ConfirmModal
                open={openConfirmOferta}
                text={
                    ofertaAEliminar
                        ? `¿Eliminar el producto ${ofertaAEliminar.codigoProducto} (${ofertaAEliminar.productoNombre})?`
                        : "¿Eliminar?"
                }
                onCancel={() => setOpenConfirmOferta(false)}
                onConfirm={() => {
                    if (!ofertaAEliminar) return;
                    eliminarOferta(ofertaAEliminar.codigoProducto);
                    setOpenConfirmOferta(false);
                }}
            />

            {/* ===== Modal Seleccionar Cliente ===== */}
            <Modal
                open={openSelCliente}
                title="Seleccionar cliente"
                onClose={() => setOpenSelCliente(false)}
            >
                <div className="space-y-3">
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={qCliente}
                            onChange={(e) => setQCliente(e.target.value)}
                            placeholder="Buscar por ID o nombre (opcional)"
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                    </div>

                    <div className="max-h-[50vh] overflow-auto rounded-xl border border-slate-200">
                        {clientesFiltrados.length === 0 ? (
                            <div className="p-4 text-sm text-slate-500">Sin resultados.</div>
                        ) : (
                            <ul className="divide-y divide-slate-200">
                                {clientesFiltrados.map((c) => (
                                    <li
                                        key={c.id}
                                        className="px-4 py-3 hover:bg-blue-50 cursor-pointer flex items-center justify-between"
                                        onClick={() => {
                                            setClienteSel(c);
                                            setOpenSelCliente(false);
                                        }}
                                    >
                                        <div className="min-w-0">
                                            <div className="font-semibold text-slate-800 truncate">
                                                {c.id}
                                            </div>
                                            <div className="text-sm text-slate-600 truncate">
                                                {c.nombre}
                                            </div>
                                        </div>
                                        <span className="text-xs text-slate-500">Seleccionar</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="pt-1 flex items-center justify-end gap-3">
                        <button
                            className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-white"
                            onClick={() => setOpenSelCliente(false)}
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
