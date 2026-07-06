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

function cargarNotasLocales() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function guardarNotasLocales(notas) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notas));
}

function generarFolio(consecutivo) {
  const fecha = new Date();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const año = String(fecha.getFullYear()).slice(-2);

  return `TBW-N-${mes}${año}-${String(consecutivo).padStart(5, "0")}`;
}

function totalNota(nota) {
  return (nota.conceptos || []).reduce((acc, item) => {
    return acc + Number(item.cantidad || 0) * Number(item.precio || 0);
  }, 0);
}

function estadoVisual(nota) {
  if (nota.estado === "cancelada") return "Cancelada";
  if (nota.estadoPago === "Pagado") return "Pagado";
  if (nota.estadoPago === "Parcial") return "Pago parcial";
  if (nota.estadoPago === "Pendiente") return "Falta de pago";
  return "Abierta";
}

function NotasRapidas() {
  const { tenantId } = useAuth();
  const receiptRef = useRef(null);

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

        if (firebaseNotas.length > 0) {
          setNotas(firebaseNotas);
          guardarNotasLocales(firebaseNotas);
        } else {
          const locales = cargarNotasLocales();

          if (locales.length > 0) {
            const migradas = [];

            for (const nota of locales) {
              const ref = await addTenantItem(
                COLLECTION,
                {
                  ...nota,
                  conceptos: nota.conceptos || [],
                  estado: nota.estado || "abierta",
                  estadoPago: nota.estadoPago || "Pendiente",
                },
                tenantId
              );

              migradas.push({
                ...nota,
                firebaseId: ref.id,
                conceptos: nota.conceptos || [],
                estado: nota.estado || "abierta",
                estadoPago: nota.estadoPago || "Pendiente",
              });
            }

            setNotas(migradas);
            guardarNotasLocales(migradas);
          } else {
            setNotas([]);
          }
        }
      } catch (error) {
        console.error("Error cargando notas:", error);
        setNotas(cargarNotasLocales());
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
        ${nota.estadoPago}
        ${nota.metodoPago}
        ${conceptosTexto}
      `.toLowerCase();

      return texto.includes(query);
    });
  }, [search, notas]);

  const actualizarNotaLocal = (actualizada) => {
    setNotas((prev) =>
      prev.map((item) => (item.id === actualizada.id ? actualizada : item))
    );

    setNotaSeleccionada(actualizada);
  };

  const guardarNotaFirebase = async (nota) => {
    let final = nota;

    if (nota.firebaseId) {
      await updateTenantItem(COLLECTION, nota.firebaseId, nota, tenantId);
    } else {
      const ref = await addTenantItem(COLLECTION, nota, tenantId);

      final = {
        ...nota,
        firebaseId: ref.id,
      };
    }

    actualizarNotaLocal(final);
    return final;
  };

  const crearNota = async (datos) => {
    const nuevaNota = {
      id: Date.now(),
      folio: generarFolio(notas.length + 1),
      ...datos,
      conceptos: datos.conceptos || [],
      estado: datos.estado || "abierta",
      estadoPago: datos.estadoPago || "Pendiente",
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
      setModalOpen(false);
    } catch (error) {
      console.error("Error creando nota:", error);
      alert("No se pudo guardar la nota en Firebase.");
    }
  };

  const actualizarNota = async (actualizada) => {
    try {
      await guardarNotaFirebase(actualizada);
    } catch (error) {
      console.error("Error actualizando nota:", error);
      alert("No se pudo actualizar la nota en Firebase.");
    }
  };

  const cancelarNota = async (nota) => {
    const confirmar = window.confirm("¿Cancelar esta nota?");
    if (!confirmar) return;

    await actualizarNota({
      ...nota,
      estado: "cancelada",
    });
  };

  const marcarPagada = async (nota) => {
    await actualizarNota({
      ...nota,
      estadoPago: "Pagado",
      estado: "cerrada",
      abono: totalNota(nota),
    });
  };

  const guardarNota = async () => {
    await actualizarNota(notaSeleccionada);
    alert("Nota guardada.");
  };

  const descargarPDF = async () => {
    await generarPDFDesdeElemento(
      receiptRef.current,
      `${notaSeleccionada.folio}-nota.pdf`
    );

    await actualizarNota({
      ...notaSeleccionada,
      estado: notaSeleccionada.estadoPago === "Pagado" ? "cerrada" : "abierta",
    });
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

      {cargando && <div className="empty-state">Cargando notas...</div>}

      {!cargando && (
        <div className="nr-grid">
          {notasFiltradas.map((nota) => {
            const pendiente =
              nota.estado !== "cancelada" && nota.estadoPago !== "Pagado";

            return (
              <article className="nr-card" key={nota.id}>
                <div className="nr-card-top">
                  <span>{nota.folio}</span>
                  <strong className={`nr-status ${nota.estadoPago}`}>
                    {estadoVisual(nota)}
                  </strong>
                </div>

                <h3>{nota.cliente || "Cliente general"}</h3>

                <p className="nr-small">
                  {nota.fechaCreacion} · {nota.horaCreacion}
                </p>

                <p className="nr-small">
                  {nota.metodoPago} · {nota.estadoPago}
                </p>

                <div className="nr-card-total">
                  ${totalNota(nota).toFixed(2)}
                </div>

                <div className="nr-card-actions">
                  <button onClick={() => setNotaSeleccionada(nota)}>
                    Abrir
                  </button>
                </div>

                {pendiente && (
                  <button
                    className="nr-paid-button"
                    onClick={() => marcarPagada(nota)}
                  >
                    Marcar pagado
                  </button>
                )}

                {nota.estado !== "cerrada" && nota.estado !== "cancelada" && (
                  <button
                    className="cancel-service-button"
                    onClick={() => cancelarNota(nota)}
                  >
                    Cancelar
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}

      {!cargando && notasFiltradas.length === 0 && (
        <div className="empty-state">No hay notas registradas.</div>
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

            <NotaReceipt nota={notaSeleccionada} receiptRef={receiptRef} />

            <div className="nr-actions">
              {notaSeleccionada.estado !== "cerrada" &&
                notaSeleccionada.estado !== "cancelada" && (
                  <button
                    className="nr-sign-button"
                    onClick={() => setFirmaModal(true)}
                  >
                    Firmar cliente
                  </button>
                )}

              {notaSeleccionada.estadoPago !== "Pagado" &&
                notaSeleccionada.estado !== "cancelada" && (
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

              <button className="primary-button" onClick={descargarPDF}>
                Descargar PDF
              </button>
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