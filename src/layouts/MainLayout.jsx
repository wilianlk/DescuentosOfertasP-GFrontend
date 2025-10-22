
import { useMemo, useState } from "react";
import { FaCalculator, FaList, FaChartBar } from "react-icons/fa";


import DescuentoOfertas from "../components/DescuentoOfertas";
import GestorDeRubros from "../components/GestorDeRubros";
import ResumenProductos from "../components/ResumenProductos";

/* ==========================
   Definiciones de menú
========================== */
const ALL_ITEMS = [
    { key: "simulador", label: "Simulador", icon: FaCalculator },
    { key: "resumen", label: "Resumen", icon: FaChartBar },
    { key: "rubros", label: "Gestion De Rubros", icon: FaList },
];

/* ==========================
   Item de menú
========================== */
function MenuItem({ icon: Icon, label, active, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={label}
            aria-current={active ? "page" : undefined}
            style={{ WebkitTapHighlightColor: "transparent" }}
            className={[
                "relative w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium transition-colors select-none",
                "bg-transparent appearance-none border-0 outline-none ring-0 focus:outline-none focus:ring-0",
                active
                    ? "text-white font-bold bg-gray-700 shadow-md"
                    : "text-white/90 hover:text-white hover:bg-gray-800",
            ].join(" ")}
        >
            {active && (
                <span className="absolute left-0 top-0 h-full w-1.5 bg-white rounded-r-md" />
            )}
            <Icon className="w-5 h-5" />
            <span className="flex-1 min-w-0 whitespace-normal leading-snug text-left">
        {label}
      </span>
        </button>
    );
}

/* ==========================
   Layout principal
========================== */
export default function MainLayout() {
    const allowedKeys = useMemo(() => ["simulador", "resumen", "rubros"], []);
    const [activeKey, setActiveKey] = useState("simulador");
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const visibles = ALL_ITEMS.filter((m) => allowedKeys.includes(m.key));

    const handleClick = (key) => {
        if (!allowedKeys.includes(key)) return;
        setActiveKey(key);
        setSidebarOpen(false);
    };

    const renderPage = (k) => {
        switch (k) {
            case "simulador":
                return <DescuentoOfertas />;
            case "resumen":
                return <ResumenProductos />;
            case "rubros":
                return <GestorDeRubros />;
            default:
                return <p className="text-red-600">Página no encontrada</p>;
        }
    };

    return (
        <div className="flex min-h-screen text-white font-sans">
            {/* HEADER (sin reloj ni logout) */}
            <header className="fixed inset-x-0 top-0 h-16 md:h-20 flex items-center justify-between bg-gray-100 px-4 sm:px-6 z-30 border-b border-gray-200">
                <img
                    src="/img/logo-recamier.png"
                    alt="Logo"
                    className="h-12 md:h-16 max-w-[280px] w-auto object-contain"
                    onError={(e) => {
                        e.currentTarget.style.display = "none";
                    }}
                />

                <h1 className="text-gray-700 font-semibold text-sm md:text-base">
                    Módulo de Rentabilidad
                </h1>

                {/* Botón de menú móvil */}
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    type="button"
                    aria-label="Menu"
                    aria-expanded={sidebarOpen}
                    className="md:hidden appearance-none bg-transparent border-0 p-2 rounded-lg text-gray-700 text-2xl leading-none focus:outline-none hover:bg-white/30 active:bg-white/40"
                >
                    {sidebarOpen ? "✕" : "☰"}
                </button>
            </header>

            {/* SIDEBAR */}
            <aside
                className={[
                    "fixed left-0 top-16 md:top-0 h-[calc(100vh-4rem)] md:h-auto w-60",
                    "bg-gray-900 border-r border-gray-900 flex flex-col",
                    "transform transition-transform duration-300 z-20",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full",
                    "md:static md:translate-x-0",
                ].join(" ")}
            >
                <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-2 md:pt-24">
                    {visibles.map(({ key, label, icon }) => (
                        <MenuItem
                            key={key}
                            icon={icon}
                            label={label}
                            active={activeKey === key}
                            onClick={() => handleClick(key)}
                        />
                    ))}
                </nav>
            </aside>

            {/* Backdrop móvil */}
            {sidebarOpen && (
                <div
                    className="fixed inset-x-0 top-16 md:top-0 bottom-0 bg-black/50 md:hidden z-10"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* CONTENIDO */}
            <main
                key={activeKey}
                className="flex-1 bg-gray-50 p-4 sm:p-6 md:p-8 pt-16 md:pt-20 text-base text-gray-800"
            >
                {renderPage(activeKey)}
            </main>
        </div>
    );
}
