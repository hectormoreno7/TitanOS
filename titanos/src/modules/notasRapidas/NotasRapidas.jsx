import { useEffect, useMemo, useRef, useState } from "react";
import NuevaNotaModal from "./NuevaNotaModal";
import NotaReceipt from "./NotaReceipt";
import SignatureModal from "../servicios/SignatureModal";
import { generarPDFDesdeElemento } from "../servicios/pdfGenerator";
import { useAuth } from "../../context/AuthContext";
import {
  getTenantItems,
  addTenantItem,
  updateTenantItem,
} from "../../firebase/firestore";

const STORAGE_KEY = "titanos_notas_rapidas_v1";
const COLLECTION = "notasRapidas";

function guardarNotasLocales(notas) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notas));
  } catch {
    console.warn("No se pudieron guardar notas en localStorage.");
  }
}

function generarFolio(notas) {
  const fecha = new Date();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const año = String(fecha.getFullYear()).slice(-2);
  const prefijo = `TBW-N-${mes}${año}-`;

  const numeros = notas
    .map((n) => String(n.folio || ""))
    .filter((folio) => folio.startsWith(prefijo))
    .map((folio) => Number(folio.replace(prefijo, "")))
    .filter((num) => !Number.isNaN(num));

  const siguiente = numeros.length > 0 ? Math.max(...numeros) + 1 : 1;
  return `${prefijo}${String(siguiente).padStart(5, "0")}`;
}

function fechaActual() {
  return new Date().toLocaleDateString("es-MX");
}

function horaActual() {
  return new Date().toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function totalNota(nota) {
  return (nota.conceptos || []).reduce((acc, item) => {
    return acc + Number(item.cantidad || 0) * Number(item.precio || 0);
  }, 0);
}

function normalizar(valor) {
  return String(valor || "").trim().toLowerCase();
}

function esNotaActiva(nota) {
  const estado = normalizar(nota.estado || "abierta");

  return ![
    "cerrada",
    "cerrado",
    "finalizada",
    "finalizado",
    "cancelada",
    "cancelado",
    "historial",
  ].includes(estado);
}

function estadoVisual(nota) {
  const estado = normalizar(nota.estado);
  const estadoPago = normalizar(nota.estadoPago);

  if (estado === "cancelada" || estado === "cancelado") return "Cancelada";
  if (estado === "cerrada" || estado === "cerrado") return "Finalizada";
  if (estadoPago === "pagado") return "Pagado";
  if (estadoPago === "parcial") return "Pago parcial";
  if (estadoPago === "pendiente") return "Pendiente";
  return "Abierta";
}

function uniqueByFirebaseId(items) {
  const map = new Map();

  items.forEach((item) => {
    const key = item.firebaseId || item.id || item.folio;
    if (!map.has(key)) map.set(key, item);
  });

  return Array.from(map.values());
}

function NotasRapidas() {
  const { tenantId } = useAuth();
  const receiptRef = useRef(null);

  const [vista, setVista] = useState("activas");
  const [search, setSearch] = useState("");
  const [notas, setNotas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [notaSeleccionada, setNotaSeleccionada] = useState(null);
  const [firmaModal, setFirmaModal] = useState(false);

  useEffect(() => {
    async function cargarNotas() {
      setCargando(true);

      try {
        const firebaseNotas = await getTenantItems(COLLECTION, tenantId);
        const unicas = uniqueByFirebaseId(firebaseNotas);

        setNotas(unicas);
        guardarNotasLocales(unicas);
      } catch (error) {
        console.error("Error cargando notas:", error);
        setNotas([]);
      } finally {
        setCargando(false);
      }
    }

    cargarNotas();
  }, [tenantId]);

  useEffect(() => {
    guardarNotasLocales(notas);
  }, [notas]);

  const notasFiltradas = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) return notas;

    return notas.filter((nota) => {
      const conceptosTexto = (nota.conceptos || [])
        .map((item) => item.descripcion)
        .join(" ");

      const texto = `
        ${nota.folio}
        ${nota.cliente}
        ${nota.telefono}
        ${nota.estado}
        ${nota.estadoPago}
        ${nota.metodoPago}
        ${conceptosTexto}
      `.toLowerCase();

      return texto.includes(query);
    });
  }, [search, notas]);

  const notasActivas = useMemo(() => {
    return notasFiltradas.filter(esNotaActiva);
  }, [notasFiltradas]);

  const notasHistorial = useMemo(() => {
    return notasFiltradas.filter((nota) => !esNotaActiva(nota));
  }, [notasFiltradas]);

  const listaVisible = vista === "activas" ? notasActivas : notasHistorial;

  const actualizarNotaLocal = (actualizada) => {
    setNotas((prev) =>
      prev.map((item) =>
        String(item.firebaseId || item.id) ===
        String(actualizada.firebaseId || actualizada.id)
          ? actualizada
          : item
      )
    );

    setNotaSeleccionada(actualizada);
  };

  const guardarNotaFirebase = async (nota) => {
    let final = nota;

    if (nota.firebaseId) {
      await updateTenantItem(COLLECTION, nota.firebaseId, nota, tenantId);
    } else {
      const ref = await addTenantItem(COLLECTION, nota, tenantId);
      final = { ...nota, firebaseId: ref.id };
    }

    actualizarNotaLocal(final);
    return final;
  };

  const crearNota = async (datos) => {
    const nuevaNota = {
      id: Date.now(),
      folio: generarFolio(notas),
      ...datos,
      conceptos: datos.conceptos || [],
      estado: "abierta",
      estadoPago: "Pendiente",
      fechaCreacion: datos.fechaCreacion || fechaActual(),
      horaCreacion: datos.horaCreacion || horaActual(),
      abono: Number(datos.abono || 0),
    };

    try {
      const ref = await addTenantItem(COLLECTION, nuevaNota, tenantId);

      const final = {
        ...nuevaNota,
        firebaseId: ref.id,
      };

      const actualizadas = [final, ...notas];

      setNotas(actualizadas);
      guardarNotasLocales(actualizadas);
      setNotaSeleccionada(final);
      setVista("activas");
      setModalOpen(false);
    } catch (error) {
      console.error("Error creando nota:", error);
      alert("No se pudo guardar la nota en Firebase.");
    }
  };

  const actualizarNota = async (actualizada) => {
    try {
      return await guardarNotaFirebase(actualizada);
    } catch (error) {
      console.error("Error actualizando nota:", error);
      alert("No se pudo actualizar la nota en Firebase.");
      return null;
    }
  };

  const cancelarNota = async (nota) => {
    const confirmar = window.confirm("¿Cancelar esta nota?");
    if (!confirmar) return;

    await actualizarNota({
      ...nota,
      estado: "cancelada",
      fechaCancelacion: fechaActual(),
      horaCancelacion: horaActual(),
    });

    setVista("historial");
  };

  const reabrirNota = async (nota) => {
    const confirmar = window.confirm("¿Reabrir esta nota?");
    if (!confirmar) return;

    const actualizada = await actualizarNota({
      ...nota,
      estado: "abierta",
      estadoPago:
        normalizar(nota.estadoPago) === "pagado" ? "Pendiente" : nota.estadoPago,
      fechaReapertura: fechaActual(),
      horaReapertura: horaActual(),
    });

    if (actualizada) setVista("activas");
  };

  const marcarPagada = async (nota) => {
    await actualizarNota({
      ...nota,
      estadoPago: "Pagado",
      abono: totalNota(nota),
      fechaPago: fechaActual(),
      horaPago: horaActual(),
    });
  };

  const guardarNota = async () => {
    await actualizarNota({
      ...notaSeleccionada,
      fechaUltimaEdicion: fechaActual(),
      horaUltimaEdicion: horaActual(),
    });

    alert("Nota guardada.");
  };

  const finalizarYDescargarPDF = async () => {
    await generarPDFDesdeElemento(
      receiptRef.current,
      `${notaSeleccionada.folio}-nota.pdf`
    );

    await actualizarNota({
      ...notaSeleccionada,
      estado: "cerrada",
      estadoPago:
        normalizar(notaSeleccionada.estadoPago) === "pagado"
          ? "Pagado"
          : notaSeleccionada.estadoPago || "Pendiente",
      fechaCierre: fechaActual(),
      horaCierre: horaActual(),
    });

    setVista("historial");
    alert("Nota finalizada y PDF generado.");
  };

  return (
    <section className="nr-page">
      <div className="module-header">
        <div>
          <h2>Notas rápidas</h2>
          <p>Ventas, ajustes y cobros rápidos.</p>
        </div>
      </div>

      <div className="search-box">
        <input
          type="text"
          placeholder="Buscar por cliente, folio, concepto o pago..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="sus-tabs">
        <button
          type="button"
          className={vista === "activas" ? "active" : ""}
          onClick={() => setVista("activas")}
        >
          Activas
        </button>

        <button
          type="button"
          className={vista === "historial" ? "active" : ""}
          onClick={() => setVista("historial")}
        >
          Historial
        </button>
      </div>

      {cargando && <div className="empty-state">Cargando notas...</div>}

      {!cargando && listaVisible.length > 0 && (
        <div className="nr-grid">
          {listaVisible.map((nota) => {
            const activa = esNotaActiva(nota);

            return (
              <article
                className="nr-card"
                key={nota.firebaseId || nota.id || nota.folio}
              >
                <div className="nr-card-top">
                  <span>{nota.folio}</span>
                  <strong className={`nr-status ${normalizar(nota.estadoPago)}`}>
                    {estadoVisual(nota)}
                  </strong>
                </div>

                <h3>{nota.cliente || "Cliente general"}</h3>

                <p className="nr-small">
                  {nota.fechaCreacion} · {nota.horaCreacion}
                </p>

                <p className="nr-small">
                  {nota.metodoPago || "Sin método"} ·{" "}
                  {nota.estadoPago || "Pendiente"}
                </p>

                <div className="nr-card-total">
                  ${totalNota(nota).toFixed(2)}
                </div>

                <div className="service-card-actions">
                  <button onClick={() => setNotaSeleccionada(nota)}>
                    Abrir
                  </button>

                  {activa ? (
                    <button
                      className="cancel-service-button"
                      onClick={() => cancelarNota(nota)}
                    >
                      Cancelar
                    </button>
                  ) : (
                    <button
                      className="reopen-button"
                      onClick={() => reabrirNota(nota)}
                    >
                      Reabrir
                    </button>
                  )}
                </div>

                {activa && normalizar(nota.estadoPago) !== "pagado" && (
                  <button
                    className="nr-paid-button"
                    onClick={() => marcarPagada(nota)}
                  >
                    Marcar pagado
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}

      {!cargando && listaVisible.length === 0 && (
        <div className="empty-state">
          {vista === "activas"
            ? "No hay notas activas."
            : "No hay notas en historial."}
        </div>
      )}

      <button className="floating-action" onClick={() => setModalOpen(true)}>
        +
      </button>

      {modalOpen && (
        <NuevaNotaModal
          onClose={() => setModalOpen(false)}
          onCreate={crearNota}
        />
      )}

      {notaSeleccionada && (
        <div className="modal-backdrop">
          <div className="nr-modal nr-detail-modal">
            <div className="modal-header">
              <div>
                <h2>{notaSeleccionada.folio}</h2>
                <p>{notaSeleccionada.cliente || "Cliente general"}</p>
              </div>

              <button
                className="modal-close"
                onClick={() => setNotaSeleccionada(null)}
              >
                ×
              </button>
            </div>

            {!esNotaActiva(notaSeleccionada) && (
              <div className="empty-state">
                Esta nota está en historial. Puedes descargar su PDF o reabrirla.
              </div>
            )}

            <NotaReceipt nota={notaSeleccionada} receiptRef={receiptRef} />

            <div className="nr-actions">
              {esNotaActiva(notaSeleccionada) && (
                <>
                  <button
                    className="nr-sign-button"
                    onClick={() => setFirmaModal(true)}
                  >
                    Firmar cliente
                  </button>

                  {normalizar(notaSeleccionada.estadoPago) !== "pagado" && (
                    <button
                      className="nr-paid-button"
                      onClick={() => marcarPagada(notaSeleccionada)}
                    >
                      Marcar pagado
                    </button>
                  )}

                  <button className="secondary-button" onClick={guardarNota}>
                    Guardar
                  </button>

                  <button
                    className="cancel-service-button"
                    onClick={() => cancelarNota(notaSeleccionada)}
                  >
                    Cancelar nota
                  </button>

                  <button
                    className="primary-button"
                    onClick={finalizarYDescargarPDF}
                  >
                    Finalizar y descargar PDF
                  </button>
                </>
              )}

              {!esNotaActiva(notaSeleccionada) && (
                <>
                  <button
                    className="reopen-button"
                    onClick={() => reabrirNota(notaSeleccionada)}
                  >
                    Reabrir nota
                  </button>

                  <button
                    className="primary-button"
                    onClick={() =>
                      generarPDFDesdeElemento(
                        receiptRef.current,
                        `${notaSeleccionada.folio}-nota.pdf`
                      )
                    }
                  >
                    Descargar PDF
                  </button>
                </>
              )}
            </div>
          </div>

          {firmaModal && (
            <SignatureModal
              title="Firma del cliente"
              onClose={() => setFirmaModal(false)}
              onSave={async (firma) => {
                await actualizarNota({
                  ...notaSeleccionada,
                  firmaCliente: firma,
                });

                setFirmaModal(false);
              }}
            />
          )}
        </div>
      )}
    </section>
  );
}

export default NotasRapidas;