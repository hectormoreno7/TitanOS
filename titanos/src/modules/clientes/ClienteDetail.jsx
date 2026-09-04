import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ServicioDetail from "../servicios/ServicioDetail";
import SuspensionReceipt from "../suspensiones/SuspensionReceipt";
import MovimientoReceipt from "../recoleccionEntrega/MovimientoReceipt";
import NotaReceipt from "../notasRapidas/NotaReceipt";
import { generarPDFDesdeElemento } from "../servicios/pdfGenerator";

const SERVICES_KEY = "titanos_servicios_v3";
const SUSPENSIONES_KEY = "titanos_suspensiones_v2";
const ER_KEY = "titanos_recoleccion_entrega_v8";
const NOTAS_KEY = "titanos_notas_rapidas_v1";
const PENDING_SERVICE_KEY = "titanos_pending_service";

function getStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function totalConceptos(conceptos = []) {
  return conceptos.reduce((acc, item) => {
    const numero = (valor) => Number(String(valor || "").replace(/[$,\s]/g, "")) || 0;
    return acc + numero(item.cantidad) * numero(item.precio);
  }, 0);
}

function totalServicio(servicio = {}) {
  return totalConceptos(servicio.conceptos || []) || Number(servicio.total || 0);
}

function ClienteDetail({ cliente, onClose, onUpdate }) {
  const navigate = useNavigate();
  const receiptRef = useRef(null);

  const [formData, setFormData] = useState(cliente);
  const [editando, setEditando] = useState(false);

  const [servicios, setServicios] = useState(() => getStorage(SERVICES_KEY));
  const [suspensiones] = useState(() => getStorage(SUSPENSIONES_KEY));
  const [movimientos] = useState(() => getStorage(ER_KEY));
  const [notas] = useState(() => getStorage(NOTAS_KEY));

  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState(null);

  const [nuevaBicicleta, setNuevaBicicleta] = useState({
    marca: "",
    modelo: "",
    color: "",
    tipo: "",
    rodada: "",
    material: "",
    numeroSerie: "",
    transmision: "",
    notas: "",
  });

  const serviciosCliente = useMemo(() => {
    return servicios.filter(
      (item) => String(item.clienteId) === String(formData.id)
    );
  }, [servicios, formData.id]);

  const suspensionesCliente = useMemo(() => {
    return suspensiones.filter(
      (item) => String(item.clienteId) === String(formData.id)
    );
  }, [suspensiones, formData.id]);

  const movimientosCliente = useMemo(() => {
    return movimientos.filter(
      (item) => String(item.clienteId) === String(formData.id)
    );
  }, [movimientos, formData.id]);

  const notasCliente = useMemo(() => {
    return notas.filter(
      (item) => String(item.clienteId) === String(formData.id)
    );
  }, [notas, formData.id]);

  const actualizarCampo = (campo, valor) => {
    setFormData((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const actualizarBicicleta = (campo, valor) => {
    setNuevaBicicleta((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const guardarCliente = () => {
    onUpdate(formData);
    setEditando(false);
  };

  const agregarBicicleta = () => {
    if (!nuevaBicicleta.marca.trim() && !nuevaBicicleta.modelo.trim()) {
      alert("Agrega al menos marca o modelo de la bicicleta.");
      return;
    }

    const bicicleta = {
      id: Date.now(),
      ...nuevaBicicleta,
    };

    const actualizado = {
      ...formData,
      bicicletas: [...(formData.bicicletas || []), bicicleta],
    };

    setFormData(actualizado);
    onUpdate(actualizado);

    setNuevaBicicleta({
      marca: "",
      modelo: "",
      color: "",
      tipo: "",
      rodada: "",
      material: "",
      numeroSerie: "",
      transmision: "",
      notas: "",
    });
  };

  const eliminarBicicleta = (id) => {
    const confirmar = window.confirm("¿Eliminar esta bicicleta?");
    if (!confirmar) return;

    const actualizado = {
      ...formData,
      bicicletas: (formData.bicicletas || []).filter((item) => item.id !== id),
    };

    setFormData(actualizado);
    onUpdate(actualizado);
  };

  const crearServicioDesdeCliente = (bicicleta = null) => {
    localStorage.setItem(
      PENDING_SERVICE_KEY,
      JSON.stringify({
        clienteId: formData.id,
        bicicletaId: bicicleta?.id || "",
      })
    );

    onClose();
    navigate("/servicios");
  };

  const actualizarServicioDesdeHistorial = (servicioActualizado) => {
    const serviciosActualizados = servicios.map((servicio) =>
      servicio.id === servicioActualizado.id ? servicioActualizado : servicio
    );

    setServicios(serviciosActualizados);
    localStorage.setItem(SERVICES_KEY, JSON.stringify(serviciosActualizados));
    setServicioSeleccionado(servicioActualizado);
  };

  const descargarDocumentoPDF = async () => {
    if (!documentoSeleccionado) return;

    await generarPDFDesdeElemento(
      receiptRef.current,
      `${documentoSeleccionado.folio || "documento"}.pdf`
    );
  };

  const renderDocumento = () => {
    if (!documentoSeleccionado) return null;

    if (documentoSeleccionado.tipoDocumento === "suspension") {
      return (
        <SuspensionReceipt
          suspension={documentoSeleccionado}
          receiptRef={receiptRef}
        />
      );
    }

    if (documentoSeleccionado.tipoDocumento === "movimiento") {
      return (
        <MovimientoReceipt
          movimiento={documentoSeleccionado}
          receiptRef={receiptRef}
        />
      );
    }

    if (documentoSeleccionado.tipoDocumento === "nota") {
      return <NotaReceipt nota={documentoSeleccionado} receiptRef={receiptRef} />;
    }

    return null;
  };

  return (
    <>
      <div className="modal-backdrop">
        <div className="client-modal detail-modal">
          <div className="modal-header">
            <div>
              <h2>{formData.nombre}</h2>
              <p>{formData.telefono}</p>
            </div>

            <button className="modal-close" onClick={onClose}>
              ×
            </button>
          </div>

          <section className="form-section">
            <div className="section-title-row">
              <h3>Datos del cliente</h3>

              {!editando ? (
                <button
                  className="secondary-button"
                  onClick={() => setEditando(true)}
                >
                  Editar cliente
                </button>
              ) : (
                <button className="primary-button" onClick={guardarCliente}>
                  Guardar cambios
                </button>
              )}
            </div>

            {!editando ? (
              <div className="client-info-grid">
                <p><strong>Nombre:</strong> {formData.nombre}</p>
                <p><strong>Teléfono:</strong> {formData.telefono}</p>
                <p><strong>WhatsApp:</strong> {formData.whatsapp || "Sin registro"}</p>
                <p><strong>Correo:</strong> {formData.correo || "Sin registro"}</p>
                <p><strong>Dirección:</strong> {formData.direccion || "Sin registro"}</p>
                <p>
                  <strong>Google Maps:</strong>{" "}
                  {formData.googleMaps ? (
                    <a href={formData.googleMaps} target="_blank" rel="noreferrer">
                      Abrir ubicación
                    </a>
                  ) : (
                    "Sin registro"
                  )}
                </p>
                <p className="full-width-field">
                  <strong>Notas:</strong> {formData.notas || "Sin notas"}
                </p>
              </div>
            ) : (
              <div className="form-grid">
                <label>
                  Nombre
                  <input
                    value={formData.nombre || ""}
                    onChange={(e) => actualizarCampo("nombre", e.target.value)}
                  />
                </label>

                <label>
                  Teléfono
                  <input
                    value={formData.telefono || ""}
                    onChange={(e) => actualizarCampo("telefono", e.target.value)}
                  />
                </label>

                <label>
                  WhatsApp
                  <input
                    value={formData.whatsapp || ""}
                    onChange={(e) => actualizarCampo("whatsapp", e.target.value)}
                  />
                </label>

                <label>
                  Correo
                  <input
                    value={formData.correo || ""}
                    onChange={(e) => actualizarCampo("correo", e.target.value)}
                  />
                </label>

                <label>
                  Dirección
                  <input
                    value={formData.direccion || ""}
                    onChange={(e) => actualizarCampo("direccion", e.target.value)}
                  />
                </label>

                <label>
                  Google Maps
                  <input
                    value={formData.googleMaps || ""}
                    onChange={(e) => actualizarCampo("googleMaps", e.target.value)}
                  />
                </label>

                <label className="full-width-field">
                  Notas
                  <textarea
                    value={formData.notas || ""}
                    onChange={(e) => actualizarCampo("notas", e.target.value)}
                  />
                </label>
              </div>
            )}
          </section>

          <section className="form-section">
            <div className="section-title-row">
              <h3>Bicicletas</h3>

              <button
                className="primary-button"
                onClick={() => crearServicioDesdeCliente()}
              >
                Crear servicio
              </button>
            </div>

            {(formData.bicicletas || []).length === 0 && (
              <p className="form-note">Este cliente aún no tiene bicicletas.</p>
            )}

            <div className="bike-list">
              {(formData.bicicletas || []).map((bike) => (
                <article className="bike-card" key={bike.id}>
                  <div>
                    <h4>{bike.marca || "Sin marca"} {bike.modelo || ""}</h4>
                    <p>{bike.color || "Sin color"} · {bike.rodada || "Sin rodada"}</p>
                    <p><strong>Tipo:</strong> {bike.tipo || "Sin registro"}</p>
                    <p><strong>Serie:</strong> {bike.numeroSerie || "Sin registro"}</p>
                    <p><strong>Transmisión:</strong> {bike.transmision || "Sin registro"}</p>
                  </div>

                  <div className="bike-actions">
                    <button onClick={() => crearServicioDesdeCliente(bike)}>
                      Crear servicio
                    </button>

                    <button onClick={() => eliminarBicicleta(bike.id)}>
                      Eliminar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="form-section">
            <h3>Agregar bicicleta</h3>

            <div className="form-grid">
              {[
                ["marca", "Marca"],
                ["modelo", "Modelo"],
                ["color", "Color"],
                ["tipo", "Tipo"],
                ["rodada", "Rodada"],
                ["material", "Material"],
                ["numeroSerie", "Número de serie"],
                ["transmision", "Transmisión"],
              ].map(([campo, label]) => (
                <label key={campo}>
                  {label}
                  <input
                    value={nuevaBicicleta[campo]}
                    onChange={(e) => actualizarBicicleta(campo, e.target.value)}
                  />
                </label>
              ))}
            </div>

            <label className="full-label">
              Notas de bicicleta
              <textarea
                value={nuevaBicicleta.notas}
                onChange={(e) => actualizarBicicleta("notas", e.target.value)}
              />
            </label>

            <div className="modal-actions">
              <button className="primary-button" onClick={agregarBicicleta}>
                Agregar bicicleta
              </button>
            </div>
          </section>

          <section className="form-section">
            <h3>Historial del cliente</h3>

            <div className="client-service-history">
              {serviciosCliente.map((item) => (
                <article className="history-card" key={`servicio-${item.id}`}>
                  <div>
                    <span>{item.folio}</span>
                    <div className="history-title-row">
                      <h4>Servicio</h4>
                      <em className={`history-status ${item.estado || "activo"}`}>
                        {item.estado || "activo"}
                      </em>
                    </div>
                    <p>{item.bicicleta} · {item.fechaIngreso}</p>
                  </div>

                  <div className="history-actions">
                    <strong>${totalServicio(item).toFixed(2)}</strong>
                    <button onClick={() => setServicioSeleccionado(item)}>
                      Ver hoja
                    </button>
                  </div>
                </article>
              ))}

              {suspensionesCliente.map((item) => (
                <article className="history-card" key={`suspension-${item.id}`}>
                  <div>
                    <span>{item.folio}</span>
                    <div className="history-title-row">
                      <h4>Suspensión</h4>
                      <em className={`history-status ${item.estado || "abierta"}`}>
                        {item.estado || "abierta"}
                      </em>
                    </div>
                    <p>{item.marca} {item.modelo} · {item.fechaCreacion}</p>
                  </div>

                  <div className="history-actions">
                    <strong>${totalConceptos(item.conceptos).toFixed(2)}</strong>
                    <button
                      onClick={() =>
                        setDocumentoSeleccionado({
                          ...item,
                          tipoDocumento: "suspension",
                        })
                      }
                    >
                      Ver hoja
                    </button>
                  </div>
                </article>
              ))}

              {movimientosCliente.map((item) => (
                <article className="history-card" key={`movimiento-${item.id}`}>
                  <div>
                    <span>{item.folio}</span>
                    <div className="history-title-row">
                      <h4>Recolección / Entrega</h4>
                      <em className={`history-status ${item.estado || "programada"}`}>
                        {item.estado || "programada"}
                      </em>
                    </div>
                    <p>{item.tipo} · {item.fechaCreacion || item.fechaProgramada}</p>
                  </div>

                  <div className="history-actions">
                    <strong>-</strong>
                    <button
                      onClick={() =>
                        setDocumentoSeleccionado({
                          ...item,
                          tipoDocumento: "movimiento",
                        })
                      }
                    >
                      Ver hoja
                    </button>
                  </div>
                </article>
              ))}

              {notasCliente.map((item) => (
                <article className="history-card" key={`nota-${item.id}`}>
                  <div>
                    <span>{item.folio}</span>
                    <div className="history-title-row">
                      <h4>Nota rápida</h4>
                      <em className={`history-status ${item.estadoPago || "abierta"}`}>
                        {item.estadoPago || "abierta"}
                      </em>
                    </div>
                    <p>{item.fechaCreacion}</p>
                  </div>

                  <div className="history-actions">
                    <strong>${totalConceptos(item.conceptos).toFixed(2)}</strong>
                    <button
                      onClick={() =>
                        setDocumentoSeleccionado({
                          ...item,
                          tipoDocumento: "nota",
                        })
                      }
                    >
                      Ver hoja
                    </button>
                  </div>
                </article>
              ))}

              {serviciosCliente.length === 0 &&
                suspensionesCliente.length === 0 &&
                movimientosCliente.length === 0 &&
                notasCliente.length === 0 && (
                  <p className="form-note">Este cliente aún no tiene historial.</p>
                )}
            </div>
          </section>
        </div>
      </div>

      {servicioSeleccionado && (
        <ServicioDetail
          servicio={servicioSeleccionado}
          onClose={() => setServicioSeleccionado(null)}
          onUpdate={actualizarServicioDesdeHistorial}
        />
      )}

      {documentoSeleccionado && (
        <div className="modal-backdrop">
          <div className="client-modal detail-modal">
            <div className="modal-header">
              <div>
                <h2>{documentoSeleccionado.folio}</h2>
                <p>{documentoSeleccionado.cliente}</p>
              </div>

              <button
                className="modal-close"
                onClick={() => setDocumentoSeleccionado(null)}
              >
                ×
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>{renderDocumento()}</div>

            <div className="modal-actions">
              <button className="primary-button" onClick={descargarDocumentoPDF}>
                Descargar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ClienteDetail;
