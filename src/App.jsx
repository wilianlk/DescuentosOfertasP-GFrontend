// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";

export default function App() {
    return (
        <Router>
            <Routes>
                {/* El layout maneja el contenido interno */}
                <Route path="/" element={<MainLayout />} />
                {/* fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}
