import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import tbwLogo from "../../assets/logos/tbw-logo.png";
import { getWorkshopConfig } from "../../utils/workshopConfig";
import { useAuth } from "../../context/AuthContext";
import { getTenantItems } from "../../firebase/firestore";

const SERVICES_KEY = "titanos_servicios_v3";
const CLIENTS_KEY = "titanos_clientes_v1";
const ER_KEY = "titanos_recoleccion_entrega_v8";
const NOTES_KEY = "titanos_notas_rapidas_v1";
const SUSPENSIONES_KEY = "titanos_suspensiones_v2";
const MONTHLY_KEY = "titanos_dashboard_monthly_v2";

function getStorage(key, fallback = []) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function saveStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function parseDateMX(dateString) {
  if (!dateString) return null;
  const [day, month, year] = dateString.split("/");
  if (!day || !month || !year) return null;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function sameDay(a, b) {
  return (
    a &&
    b &&
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

function sameMonth(a, b) {
  return (
    a &&
    b &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

function sameWeek(date, today) {
  if (!date) return false;

  const first = new Date(today);
  first.setDate(today.getDate() - today.getDay());

  const last = new Date(first);
  last.setDate(first.getDate() + 6);

  return date >= first && date <= last;
}

function totalConceptos(conceptos = []) {
  return conceptos.reduce((acc, item) => {
    return acc + Number(item.cantidad || 0) * Number(item.precio || 0);
  }, 0);
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

function Dashboard() {
  const navigate = useNavigate();
  const { tenantId } = useAuth();
  const config = getWorkshopConfig();

  const [cargando, setCargando] = useState(true);
  const [servicios, setServicios] = useState(() => getStorage(SERVICES_KEY));
  const [clientes, setClientes] = useState(() => getStorage(CLIENTS_KEY));
  const [movimientos, setMovimientos] = useState(() => getStorage(ER_KEY));
  const [notas, setNotas] = useState(() => getStorage(NOTES_KEY));
  const [suspensiones, setSuspensiones] = useState(() =>
    getStorage(SUSPENSIONES_KEY)
  );

  const today = new Date();

  useEffect(() => {
    async function cargarDashboard() {
      setCargando(true);

      try {
        const [
          firebaseServicios,
          firebaseClientes,
          firebaseMovimientos,
          firebaseNotas,
          firebaseSuspensiones,
        ] = await Promise.all([
          getTenantItems("servicios", tenantId),
          getTenantItems("clientes", tenantId),
          getTenantItems("recoleccionEntrega", tenantId),
          getTenantItems("notasRapidas", tenantId),
          getTenantItems("suspensiones", tenantId),
        ]);

        setServicios(firebaseServicios);
        setClientes(firebaseClientes);
        setMovimientos(firebaseMovimientos);
        setNotas(firebaseNotas);
        setSuspensiones(firebaseSuspensiones);

        saveStorage(SERVICES_KEY, firebaseServicios);
        saveStorage(CLIENTS_KEY, firebaseClientes);
        saveStorage(ER_KEY, firebaseMovimientos);
        saveStorage(NOTES_KEY, firebaseNotas);
        saveStorage(SUSPENSIONES_KEY, firebaseSuspensiones);
      } catch (error) {
        console.error("Error cargando dashboard desde Firebase:", error);
      } finally {
        setCargando(false);
      }
    }

    cargarDashboard();
  }, [tenantId]);

  const resumen = useMemo(() => {
    const serviciosActivos = servicios.filter(
      (item) => item.estado !== "finalizado" && item.estado !== "cancelado"
    );

    const serviciosFinalizados = servicios.filter(
      (item) => item.estado === "finalizado"
    );

    const suspensionesAbiertas = suspensiones.filter(
      (item) => item.estado !== "cerrada" && item.estado !== "cancelada"
    );

    const suspensionesCerradas = suspensiones.filter(
      (item) => item.estado === "cerrada"
    );

    const notasValidas = notas.filter((nota) => nota.estado !== "cancelada");
    const notasPagadas = notasValidas.filter(
      (nota) => nota.estadoPago === "Pagado"
    );
    const notasPendientes = notasValidas.filter(
      (nota) => nota.estadoPago !== "Pagado"
    );

    const entregasPendientesLista = movimientos.filter(
      (item) =>
        item.estado === "programada" || item.estado === "pendienteEntrega"
    );

    const totalServiciosHoy = serviciosFinalizados
      .filter((item) => sameDay(parseDateMX(item.fechaEntrega), today))
      .reduce(
        (acc, item) =>
          acc + Number(item.total || totalConceptos(item.conceptos)),
        0
      );

    const totalServiciosSemana = serviciosFinalizados
      .filter((item) => sameWeek(parseDateMX(item.fechaEntrega), today))
      .reduce(
        (acc, item) =>
          acc + Number(item.total || totalConceptos(item.conceptos)),
        0
      );

    const totalServiciosMes = serviciosFinalizados
      .filter((item) => sameMonth(parseDateMX(item.fechaEntrega), today))
      .reduce(
        (acc, item) =>
          acc + Number(item.total || totalConceptos(item.conceptos)),
        0
      );

    const totalSuspensionesHoy = suspensionesCerradas
      .filter((item) => sameDay(parseDateMX(item.fechaCierre), today))
      .reduce(
        (acc, item) =>
          acc + Number(item.total || totalConceptos(item.conceptos)),
        0
      );

    const totalSuspensionesSemana = suspensionesCerradas
      .filter((item) => sameWeek(parseDateMX(item.fechaCierre), today))
      .reduce(
        (acc, item) =>
          acc + Number(item.total || totalConceptos(item.conceptos)),
        0
      );

    const totalSuspensionesMes = suspensionesCerradas
      .filter((item) => sameMonth(parseDateMX(item.fechaCierre), today))
      .reduce(
        (acc, item) =>
          acc + Number(item.total || totalConceptos(item.conceptos)),
        0
      );

    const totalNotasHoy = notasPagadas
      .filter((item) => sameDay(parseDateMX(item.fechaCreacion), today))
      .reduce((acc, item) => acc + totalConceptos(item.conceptos), 0);

    const totalNotasSemana = notasPagadas
      .filter((item) => sameWeek(parseDateMX(item.fechaCreacion), today))
      .reduce((acc, item) => acc + totalConceptos(item.conceptos), 0);

    const totalNotasMes = notasPagadas
      .filter((item) => sameMonth(parseDateMX(item.fechaCreacion), today))
      .reduce((acc, item) => acc + totalConceptos(item.conceptos), 0);

    const pendientesCobro = notasPendientes.reduce(
      (acc, item) =>
        acc + totalConceptos(item.conceptos) - Number(item.abono || 0),
      0
    );

    const bicicletasRegistradas = clientes.reduce(
      (acc, cliente) => acc + (cliente.bicicletas || []).length,
      0
    );

    return {
      totalHoy: totalServiciosHoy + totalSuspensionesHoy + totalNotasHoy,
      totalSemana:
        totalServiciosSemana + totalSuspensionesSemana + totalNotasSemana,
      totalMes: totalServiciosMes + totalSuspensionesMes + totalNotasMes,
      pendientesCobro,

      serviciosActivos: serviciosActivos.length,
      serviciosFinalizadosMes: serviciosFinalizados.filter((item) =>
        sameMonth(parseDateMX(item.fechaEntrega), today)
      ).length,

      suspensionesAbiertas: suspensionesAbiertas.length,
      suspensionesCerradasMes: suspensionesCerradas.filter((item) =>
        sameMonth(parseDateMX(item.fechaCierre), today)
      ).length,

      clientes: clientes.length,
      bicicletas: bicicletasRegistradas,

      notasMes: notasValidas.filter((item) =>
        sameMonth(parseDateMX(item.fechaCreacion), today)
      ).length,

      notasPendientes: notasPendientes.length,
      entregasPendientes: entregasPendientesLista.length,

      movimientosMes: movimientos.filter((item) =>
        sameMonth(parseDateMX(item.fechaCreacion), today)
      ).length,
    };
  }, [servicios, clientes, movimientos, notas, suspensiones]);

  useEffect(() => {
    const key = monthKey(today);
    const historial = getStorage(MONTHLY_KEY, {});

    const actualizado = {
      ...historial,
      [key]: {
        mes: key,
        totalMes: resumen.totalMes,
        pendientesCobro: resumen.pendientesCobro,
        serviciosFinalizadosMes: resumen.serviciosFinalizadosMes,
        suspensionesCerradasMes: resumen.suspensionesCerradasMes,
        notasMes: resumen.notasMes,
        movimientosMes: resumen.movimientosMes,
        actualizado: new Date().toLocaleString("es-MX"),
      },
    };

    localStorage.setItem(MONTHLY_KEY, JSON.stringify(actualizado));
  }, [resumen]);

  const historialMensual = Object.values(getStorage(MONTHLY_KEY, {})).sort(
    (a, b) => b.mes.localeCompare(a.mes)
  );

  return (
    <section className="dashboard-page">
      <div className="dashboard-hero compact-hero">
        <div>
          <img
            src={config.logo || tbwLogo}
            alt={config.nombre}
            className="dashboard-logo"
          />
          <p>
            {cargando
              ? "Actualizando datos desde Firebase..."
              : "Sistema de gestión para taller."}
          </p>
        </div>
      </div>

      <h3 className="dashboard-section-title">Pendientes / Activos</h3>

      <div className="dashboard-cards secondary-cards">
        <article
          className="dashboard-card clickable-card"
          onClick={() => navigate("/servicios")}
        >
          <span>Servicios activos</span>
          <strong>{resumen.serviciosActivos}</strong>
        </article>

        <article
          className="dashboard-card clickable-card"
          onClick={() => navigate("/suspensiones")}
        >
          <span>Suspensiones abiertas</span>
          <strong>{resumen.suspensionesAbiertas}</strong>
        </article>

        <article
          className="dashboard-card clickable-card"
          onClick={() => navigate("/recoleccion-entrega")}
        >
          <span>Entregas pendientes</span>
          <strong>{resumen.entregasPendientes}</strong>
        </article>

        <article
          className="dashboard-card clickable-card pending-card"
          onClick={() => navigate("/notas")}
        >
          <span>Notas pendientes</span>
          <strong>{resumen.notasPendientes}</strong>
        </article>
      </div>

      <h3 className="dashboard-section-title">Resumen económico</h3>

      <div className="dashboard-cards">
        <article
          className="dashboard-card money-card clickable-card"
          onClick={() => navigate("/historial")}
        >
          <span>Hoy</span>
          <strong>${resumen.totalHoy.toFixed(2)}</strong>
        </article>

        <article
          className="dashboard-card money-card clickable-card"
          onClick={() => navigate("/historial")}
        >
          <span>Semana</span>
          <strong>${resumen.totalSemana.toFixed(2)}</strong>
        </article>

        <article
          className="dashboard-card money-card clickable-card"
          onClick={() => navigate("/historial")}
        >
          <span>Mes</span>
          <strong>${resumen.totalMes.toFixed(2)}</strong>
        </article>

        <article
          className="dashboard-card pending-card clickable-card"
          onClick={() => navigate("/notas")}
        >
          <span>Pendiente de cobro</span>
          <strong>${resumen.pendientesCobro.toFixed(2)}</strong>
        </article>
      </div>

      <h3 className="dashboard-section-title">Datos generales</h3>

      <div className="dashboard-cards secondary-cards">
        <article
          className="dashboard-card clickable-card"
          onClick={() => navigate("/historial")}
        >
          <span>Servicios finalizados mes</span>
          <strong>{resumen.serviciosFinalizadosMes}</strong>
        </article>

        <article
          className="dashboard-card clickable-card"
          onClick={() => navigate("/historial")}
        >
          <span>Suspensiones cerradas mes</span>
          <strong>{resumen.suspensionesCerradasMes}</strong>
        </article>

        <article
          className="dashboard-card clickable-card"
          onClick={() => navigate("/historial")}
        >
          <span>Notas del mes</span>
          <strong>{resumen.notasMes}</strong>
        </article>

        <article
          className="dashboard-card clickable-card"
          onClick={() => navigate("/historial")}
        >
          <span>Movimientos mes</span>
          <strong>{resumen.movimientosMes}</strong>
        </article>

        <article
          className="dashboard-card clickable-card"
          onClick={() => navigate("/clientes")}
        >
          <span>Clientes</span>
          <strong>{resumen.clientes}</strong>
        </article>

        <article
          className="dashboard-card clickable-card"
          onClick={() => navigate("/clientes")}
        >
          <span>Bicicletas</span>
          <strong>{resumen.bicicletas}</strong>
        </article>
      </div>

      <div className="dashboard-panel">
        <h3>Historial mensual</h3>

        <div className="monthly-history">
          {historialMensual.map((item) => (
            <article
              key={item.mes}
              className="monthly-card"
              onClick={() => navigate("/historial")}
            >
              <strong>{item.mes}</strong>
              <span>Total: ${Number(item.totalMes || 0).toFixed(2)}</span>
              <span>
                Pendiente: ${Number(item.pendientesCobro || 0).toFixed(2)}
              </span>
              <span>Servicios: {item.serviciosFinalizadosMes}</span>
              <span>Suspensiones: {item.suspensionesCerradasMes}</span>
              <span>Notas: {item.notasMes}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Dashboard;