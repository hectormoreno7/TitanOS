import { useEffect, useMemo, useRef, useState } from "react";
import PreviewSection from "../servicios/PreviewSection";
import SuspensionReceipt from "../suspensiones/SuspensionReceipt";
import MovimientoReceipt from "../recoleccionEntrega/MovimientoReceipt";
import NotaReceipt from "../notasRapidas/NotaReceipt";
import { generarPDFDesdeElemento } from "../servicios/pdfGenerator";
import { useAuth } from "../../context/AuthContext";
import { getTenantItems } from "../../firebase/firestore";

const SERVICES_KEY = "titanos_servicios_v3";
const SUSPENSIONES_KEY = "titanos_suspensiones_v2";
const ER_KEY = "titanos_recoleccion_entrega_v8";
const NOTAS_KEY = "titanos_notas_rapidas_v1";

function saveStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function totalConceptos(conceptos = []) {
  return conceptos.reduce((acc, item) => {
    return acc + Number(item.cantidad || 0) * Number(item.precio || 0);
  }, 0);
}

function normalizarHistorial({ servicios, suspensiones, movimientos, notas }) {
  const serviciosNormalizados = servicios.map((item) => ({
    id: `servicio-${item.id}`,
    tipo: "servicio",
    folio: item.folio,
    cliente: item.cliente,
    telefono: item.telefono,
    fecha: item.fechaEntrega || item.fechaIngreso || "",
    estado: item.estado || "activo",
    total: Number(item.total || totalConceptos(item.conceptos)),
    raw: item,
  }));

  const suspensionesNormalizadas = suspensiones.map((item) => ({
    id: `suspension-${item.id}`,
    tipo: "suspension",
    folio: item.folio,
    cliente: item.cliente,
    telefono: item.telefono,
    fecha: item.fechaCierre || item.fechaCreacion || "",
    estado: item.estado || "abierta",
    total: Number(item.total || totalConceptos(item.conceptos)),
    raw: item,
  }));

  const movimientosNormalizados = movimientos.map((item) => ({
    id: `movimiento-${item.id}`,
    tipo: "recoleccion",
    folio: item.folio,
    cliente: item.cliente,
    telefono: item.telefono,
    fecha: item.fechaCierre || item.fechaCreacion || item.fechaProgramada || "",
    estado: item.estado || "programada",
    total: 0,
    raw: item,
  }));

  const notasNormalizadas = notas.map((item) => ({
    id: `nota-${item.id}`,
    tipo: "nota",
    folio: item.folio,
    cliente: item.cliente || "Cliente general",
    telefono: item.telefono,
    fecha: item.fechaCreacion || "",
    estado: item.estadoPago || item.estado || "abierta",
    total: totalConceptos(item.conceptos),
    raw: item,
  }));

  return [
    ...serviciosNormalizados,
    ...suspensionesNormalizadas,
    ...movimientosNormalizados,
    ...notasNormalizadas,
  ];
}

function tipoLabel(tipo) {
  if (tipo === "servicio") return "Servicio";
  if (tipo === "suspension") return "Suspensión";
  if (tipo === "recoleccion") return "Recolección / Entrega";
  if (tipo === "nota") return "Nota rápida";
  return tipo;
}

function Historial() {
  const { tenantId } = useAuth();
  const receiptRef = useRef(null);

  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [seleccionado, setSeleccionado] = useState(null);
  const [cargando, setCargando] = useState(true);

  const [data, setData] = useState({
    servicios: [],
    suspensiones: [],
    movimientos: [],
    notas: [],
  });

  useEffect(() => {
    async function cargarHistorial() {
      setCargando(true);

      try {
        const [servicios, suspensiones, movimientos, notas] = await Promise.all([
          getTenantItems("servicios", tenantId),
          getTenantItems("suspensiones", tenantId),
          getTenantItems("recoleccionEntrega", tenantId),
          getTenantItems("notasRapidas", tenantId),
        ]);

        setData({
          servicios,
          suspensiones,
          movimientos,
          notas,
        });

        saveStorage(SERVICES_KEY, servicios);
        saveStorage(SUSPENSIONES_KEY, suspensiones);
        saveStorage(ER_KEY, movimientos);
        saveStorage(NOTAS_KEY, notas);
      } catch (error) {
        console.error("Error cargando historial desde Firebase:", error);
      } finally {
        setCargando(false);
      }
    }

    cargarHistorial();
  }, [tenantId]);

  const historial = useMemo(() => normalizarHistorial(data), [data]);

  const filtrado = useMemo(() => {
    const q = search.toLowerCase().trim();

    return historial.filter((item) => {
      const coincideTipo = filtroTipo === "todos" || item.tipo === filtroTipo;

      const texto = `
        ${item.folio}
        ${item.cliente}
        ${item.telefono}
        ${item.estado}
        ${item.tipo}
      `.toLowerCase();

      return coincideTipo && texto.includes(q);
    });
  }, [historial, search, filtroTipo]);

  const descargarPDF = async () => {
    if (!seleccionado) return;

    await generarPDFDesdeElemento(
      receiptRef.current,
      `${seleccionado.folio || "historial"}-${seleccionado.tipo}.pdf`
    );
  };

  const renderPreview = () => {
    if (!seleccionado) return null;

    if (seleccionado.tipo === "servicio") {
      const servicio = seleccionado.raw;

      return (
        <PreviewSection
          previewRef={receiptRef}
          formData={servicio}
          evidencias={servicio.evidencias || []}
          checklist={servicio.checklist || {}}
          grasas={servicio.grasas || {}}
          mediciones={servicio.mediciones || {}}
          observacionesFinales={servicio.observacionesFinales || ""}
          totalServicio={Number(
            servicio.total || totalConceptos(servicio.conceptos)
          )}
        />
      );
    }

    if (seleccionado.tipo === "suspension") {
      return (
        <SuspensionReceipt
          suspension={seleccionado.raw}
          receiptRef={receiptRef}
        />
      );
    }

    if (seleccionado.tipo === "recoleccion") {
      return (
        <MovimientoReceipt
          movimiento={seleccionado.raw}
          receiptRef={receiptRef}
        />
      );
    }

    if (seleccionado.tipo === "nota") {
      return <NotaReceipt nota={seleccionado.raw} receiptRef={receiptRef} />;
    }

    return null;
  };

  return (
    <section className="historial-page">
      <div className="module-header">
        <div>
          <h2>Historial</h2>
          <p>
            {cargando
              ? "Cargando historial desde Firebase..."
              : "Servicios, suspensiones, notas y recolecciones en un solo lugar."}
          </p>
        </div>
      </div>

      <div className="historial-toolbar">
        <input
          value={search}
          placeholder="Buscar por cliente, folio, teléfono o estado..."
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
        >
          <option value="todos">Todo</option>
          <option value="servicio">Servicios</option>
          <option value="suspension">Suspensiones</option>
          <option value="recoleccion">Recolección / Entrega</option>
          <option value="nota">Notas rápidas</option>
        </select>
      </div>

      {cargando && <div className="empty-state">Cargando historial...</div>}

      {!cargando && (
        <div className="historial-grid">
          {filtrado.map((item) => (
            <article className="historial-card" key={item.id}>
              <div className="historial-card-top">
                <span>{item.folio}</span>
                <strong>{tipoLabel(item.tipo)}</strong>
              </div>

              <h3>{item.cliente}</h3>

              <p>{item.fecha || "Sin fecha"}</p>
              <p>{item.estado}</p>

              {item.total > 0 && (
                <div className="historial-total">
                  ${Number(item.total || 0).toFixed(2)}
                </div>
              )}

              <button onClick={() => setSeleccionado(item)}>Ver hoja</button>
            </article>
          ))}
        </div>
      )}

      {!cargando && filtrado.length === 0 && (
        <div className="empty-state">No hay registros en historial.</div>
      )}

      {seleccionado && (
        <div className="modal-backdrop">
          <div className="historial-modal">
            <div className="modal-header">
              <div>
                <h2>{seleccionado.folio}</h2>
                <p>
                  {tipoLabel(seleccionado.tipo)} · {seleccionado.cliente}
                </p>
              </div>

              <button
                className="modal-close"
                onClick={() => setSeleccionado(null)}
              >
                ×
              </button>
            </div>

            <div className="historial-preview-wrap">{renderPreview()}</div>

            <div className="historial-actions">
              <button className="primary-button" onClick={descargarPDF}>
                Descargar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default Historial;