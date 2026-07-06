import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "../components/layout/Layout";

import Dashboard from "../modules/dashboard/Dashboard";
import Clientes from "../modules/clientes/Clientes";
import Servicios from "../modules/servicios/Servicios";
import Suspensiones from "../modules/suspensiones/Suspensiones";
import RecoleccionEntrega from "../modules/recoleccionEntrega/RecoleccionEntrega";
import NotasRapidas from "../modules/notasRapidas/NotasRapidas";
import Configuracion from "../modules/configuracion/Configuracion";
import Contacto from "../modules/contacto/Contacto";
import Historial from "../modules/historial/Historial";
import Login from "../modules/auth/Login";

import { useAuth } from "../context/AuthContext";
import {
  applyWorkshopTheme,
  getWorkshopConfig,
  loadWorkshopConfigFromFirebase,
} from "../utils/workshopConfig";

import "../styles/auth.css";
import "../styles/historial.css";
import "../styles/suspensiones.css";
import "../styles/contacto.css";
import "../styles/configuracion.css";
import "../styles/layout.css";
import "../styles/dashboard.css";
import "../styles/servicios.css";
import "../styles/clientes.css";
import "../styles/recoleccionEntrega.css";
import "../styles/notasRapidas.css";

function App() {
  const { usuario, cargandoAuth, tenantId } = useAuth();
  const [cargandoConfig, setCargandoConfig] = useState(false);

  useEffect(() => {
    applyWorkshopTheme(getWorkshopConfig());

    const actualizarConfig = (event) => {
      applyWorkshopTheme(event.detail);
    };

    window.addEventListener("workshop-config-updated", actualizarConfig);

    return () => {
      window.removeEventListener("workshop-config-updated", actualizarConfig);
    };
  }, []);

  useEffect(() => {
    async function cargarConfigFirebase() {
      if (!usuario || !tenantId) return;

      setCargandoConfig(true);

      const config = await loadWorkshopConfigFromFirebase(tenantId);
      applyWorkshopTheme(config);

      setCargandoConfig(false);
    }

    cargarConfigFirebase();
  }, [usuario, tenantId]);

  if (cargandoAuth || cargandoConfig) {
    return <div className="app-loading">Cargando TitanOS...</div>;
  }

  if (!usuario) {
    return <Login />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="servicios" element={<Servicios />} />
          <Route path="suspensiones" element={<Suspensiones />} />
          <Route path="recoleccion-entrega" element={<RecoleccionEntrega />} />
          <Route path="notas" element={<NotasRapidas />} />
          <Route path="notas-rapidas" element={<NotasRapidas />} />
          <Route path="configuracion" element={<Configuracion />} />
          <Route path="contacto" element={<Contacto />} />
          <Route path="historial" element={<Historial />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;