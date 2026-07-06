import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import NuevoMovimientoModal from "./NuevoMovimientoModal";
import MovimientoReceipt from "./MovimientoReceipt";
import SignatureModal from "../servicios/SignatureModal";
import { generarPDFDesdeElemento } from "../servicios/pdfGenerator";
import { useAuth } from "../../context/AuthContext";
import {
  getTenantItems,
  addTenantItem,
  updateTenantItem,
} from "../../firebase/firestore";

const STORAGE_KEY = "titanos_recoleccion_entrega_v8";
const PENDING_SERVICE_KEY = "titanos_pending_service";
const SUSPENSIONES_KEY = "titanos_suspensiones_v2";
const COLLECTION = "recoleccionEntrega";
const SUSPENSIONES_COLLECTION = "suspensiones";

function cargarMovimientosLocales() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function guardarMovimientosLocales(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function cargarSuspensionesLocales() {
  try {
    return JSON.parse(localStorage.getItem(SUSPENSIONES_KEY)) || [];
  } catch {
    return [];
  }
}

function guardarSuspensionesLocales(data) {
  localStorage.setItem(SUSPENSIONES_KEY, JSON.stringify(data));
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

function generarFolio(consecutivo) {
  const fecha = new Date();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const año = String(fecha.getFullYear()).slice(-2);

  return `TBW-ER-${mes}${año}-${String(consecutivo).padStart(5, "0")}`;
}

function generarFolioSuspension(consecutivo) {
  const fecha = new Date();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const año = String(fecha.getFullYear()).slice(-2);

  return `TBW-SUS-${mes}${año}-${String(consecutivo).padStart(5, "0")}`;
}

function estadoFinal(movimiento) {
  if (movimiento.tipo === "Recolección") return "recolectada";
  if (movimiento.tipo === "Entrega") return "entregada";
  return "recolectada / entregada";
}

function etiqueta(item) {
  if (item.estado === "programada") return "Programada";
  if (item.estado === "pendienteEntrega") return "Pendiente entrega";
  if (item.estado === "recibo") return "Pendiente firma";
  if (item.estado === "recolectada") return "Recolectada";
  if (item.estado === "entregada") return "Entregada";
  if (item.estado === "recolectada / entregada") return "Recolectada / Entregada";
  if (item.estado === "cancelada") return "Cancelada";
  return item.tipo;
}

function esSuspension(item) {
  return (
    item.tipoItem === "suspension" ||
    item.origen === "suspension" ||
    item.suspensionId
  );
}

function nombreArticulo(item) {
  if (esSuspension(item)) {
    return (
      item.suspension ||
      item.itemNombre ||
      `${item.marca || ""} ${item.modelo || ""}`.trim() ||
      "Suspensión sin datos"
    );
  }

  return item.bicicleta || item.itemNombre || "Bicicleta sin datos";
}

function RecoleccionEntrega() {
  const { tenantId } = useAuth();
  const navigate = useNavigate();
  const receiptRef = useRef(null);

  const [search, setSearch] = useState("");
  const [movimientos, setMovimientos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [movimientoSeleccionado, setMovimientoSeleccionado] = useState(null);
  const [firmaModal, setFirmaModal] = useState(null);

  useEffect(() => {
    async function cargarMovimientos() {
      setCargando(true);

      try {
        const firebaseMovimientos = await getTenantItems(COLLECTION, tenantId);

        if (firebaseMovimientos.length > 0) {
          setMovimientos(firebaseMovimientos);
          guardarMovimientosLocales(firebaseMovimientos);
        } else {
          const locales = cargarMovimientosLocales();

          if (locales.length > 0) {
            const migrados = [];

            for (const movimiento of locales) {
              const ref = await addTenantItem(COLLECTION, movimiento, tenantId);

              migrados.push({
                ...movimiento,
                firebaseId: ref.id,
              });
            }

            setMovimientos(migrados);
            guardarMovimientosLocales(migrados);
          } else {
            setMovimientos([]);
          }
        }
      } catch (error) {
        console.error("Error cargando recolección/entrega:", error);
        setMovimientos(cargarMovimientosLocales());
      } finally {
        setCargando(false);
      }
    }

    cargarMovimientos();
  }, [tenantId]);

  useEffect(() => {
    guardarMovimientosLocales(movimientos);
  }, [movimientos]);

  const movimientosFiltrados = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) return movimientos;

    return movimientos.filter((item) => {
      const texto = `
        ${item.folio}
        ${item.estado}
        ${item.tipo}
        ${item.tipoItem}
        ${item.cliente}
        ${item.telefono}
        ${item.bicicleta}
        ${item.suspension}
        ${item.itemNombre}
        ${item.fechaProgramada}
        ${item.fechaCreacion}
      `.toLowerCase();

      return texto.includes(query);
    });
  }, [search, movimientos]);

  const actualizarMovimientoLocal = (actualizado) => {
    setMovimientos((prev) =>
      prev.map((item) => (item.id === actualizado.id ? actualizado : item))
    );

    setMovimientoSeleccionado(actualizado);
  };

  const guardarMovimientoFirebase = async (movimiento) => {
    let final = movimiento;

    if (movimiento.firebaseId) {
      await updateTenantItem(
        COLLECTION,
        movimiento.firebaseId,
        movimiento,
        tenantId
      );
    } else {
      const ref = await addTenantItem(COLLECTION, movimiento, tenantId);

      final = {
        ...movimiento,
        firebaseId: ref.id,
      };
    }

    actualizarMovimientoLocal(final);
    return final;
  };

  const crearMovimiento = async (datos) => {
    const nuevo = {
      id: Date.now(),
      folio: generarFolio(movimientos.length + 1),
      ...datos,
    };

    try {
      const ref = await addTenantItem(COLLECTION, nuevo, tenantId);

      const final = {
        ...nuevo,
        firebaseId: ref.id,
      };

      const actualizados = [final, ...movimientos];

      setMovimientos(actualizados);
      guardarMovimientosLocales(actualizados);
      setMovimientoSeleccionado(final);
      setModalOpen(false);
    } catch (error) {
      console.error("Error creando movimiento:", error);
      alert("No se pudo guardar en Firebase.");
    }
  };

  const actualizarCampo = (campo, valor) => {
    actualizarMovimientoLocal({
      ...movimientoSeleccionado,
      [campo]: valor,
    });
  };

  const comprimirImagen = (archivo) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const img = new Image();

        img.onload = () => {
          const maxWidth = 850;
          const scale = Math.min(maxWidth / img.width, 1);

          const canvas = document.createElement("canvas");
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          resolve(canvas.toDataURL("image/jpeg", 0.58));
        };

        img.onerror = reject;
        img.src = reader.result;
      };

      reader.onerror = reject;
      reader.readAsDataURL(archivo);
    });
  };

  const cargarFoto = async (grupo, campo, archivo) => {
    if (!archivo) return;

    try {
      const imagen = await comprimirImagen(archivo);

      actualizarMovimientoLocal({
        ...movimientoSeleccionado,
        [grupo]: {
          ...movimientoSeleccionado[grupo],
          [campo]: imagen,
        },
      });
    } catch {
      alert("No se pudo cargar la foto.");
    }
  };

  const generarReciboProgramado = async () => {
    const item = nombreArticulo(movimientoSeleccionado);

    if (!item.trim()) {
      alert("Falta el artículo.");
      return;
    }

    const grupoFotos =
      movimientoSeleccionado.tipo === "Entrega"
        ? "fotosEntrega"
        : "fotosRecoleccion";

    if (
      !movimientoSeleccionado[grupoFotos]?.lateral1 ||
      !movimientoSeleccionado[grupoFotos]?.lateral2
    ) {
      alert("Faltan las 2 fotos.");
      return;
    }

    await guardarMovimientoFirebase({
      ...movimientoSeleccionado,
      estado: "recibo",
      fechaCreacion: fechaActual(),
      horaCreacion: horaActual(),
    });
  };

  const guardarFirma = async (firma) => {
    if (firmaModal === "recoleccion") {
      const actualizado = {
        ...movimientoSeleccionado,
        firmaRecoleccion: firma,
      };

      if (actualizado.tipo === "Recolección y entrega") {
        actualizado.estado = "pendienteEntrega";
        actualizado.fechaRecoleccion = fechaActual();
        actualizado.horaRecoleccion = horaActual();
      }

      await guardarMovimientoFirebase(actualizado);
    }

    if (firmaModal === "entrega") {
      const actualizado = {
        ...movimientoSeleccionado,
        firmaEntrega: firma,
      };

      if (actualizado.tipo === "Recolección y entrega") {
        actualizado.estado = "recibo";
        actualizado.fechaEntrega = fechaActual();
        actualizado.horaEntrega = horaActual();
      }

      await guardarMovimientoFirebase(actualizado);
    }

    setFirmaModal(null);
  };

  const descargarPDF = async () => {
    if (movimientoSeleccionado.tipo === "Recolección") {
      if (!movimientoSeleccionado.firmaRecoleccion) {
        alert("Falta la firma de recolección.");
        return;
      }
    }

    if (movimientoSeleccionado.tipo === "Entrega") {
      if (!movimientoSeleccionado.firmaEntrega) {
        alert("Falta la firma de entrega.");
        return;
      }
    }

    if (movimientoSeleccionado.tipo === "Recolección y entrega") {
      if (!movimientoSeleccionado.firmaRecoleccion) {
        alert("Falta la firma de recolección.");
        return;
      }

      if (!movimientoSeleccionado.firmaEntrega) {
        alert("Falta la firma de entrega.");
        return;
      }
    }

    await generarPDFDesdeElemento(
      receiptRef.current,
      `${movimientoSeleccionado.folio}-recibo.pdf`
    );

    await guardarMovimientoFirebase({
      ...movimientoSeleccionado,
      estado: estadoFinal(movimientoSeleccionado),
      fechaCierre: fechaActual(),
      horaCierre: horaActual(),
    });
  };

  const cancelarProgramada = async (item) => {
    const confirmar = window.confirm("¿Cancelar esta programada?");
    if (!confirmar) return;

    await guardarMovimientoFirebase({
      ...item,
      estado: "cancelada",
      fechaCancelacion: fechaActual(),
      horaCancelacion: horaActual(),
    });
  };

  const crearServicioDesdeMovimiento = async (movimiento) => {
    if (!esSuspension(movimiento)) {
      localStorage.setItem(
        PENDING_SERVICE_KEY,
        JSON.stringify({
          clienteId: movimiento.clienteId || "",
          bicicletaId: movimiento.bicicletaId || "",
          cliente: movimiento.cliente || "",
          telefono: movimiento.telefono || "",
          bicicleta: movimiento.bicicleta || movimiento.itemNombre || "",
          googleMaps: movimiento.googleMaps || "",
          direccion: movimiento.direccion || "",
          origenMovimientoId: movimiento.id,
        })
      );

      await guardarMovimientoFirebase({
        ...movimiento,
        servicioCreado: true,
      });

      navigate("/servicios");
      return;
    }

    const suspensionesLocales = cargarSuspensionesLocales();

    const nuevaSuspension = {
      id: Date.now(),
      folio: generarFolioSuspension(suspensionesLocales.length + 1),

      clienteId: movimiento.clienteId || "",
      bicicletaId: "",
      cliente: movimiento.cliente || "",
      telefono: movimiento.telefono || "",

      vieneConBicicleta: false,
      bicicleta: "",
      bikeMarca: "",
      bikeModelo: "",
      bikeColor: "",
      bikeRodada: "",
      accesoriosBicicleta: "",

      tipoSuspension: "Suspensión delantera",
      marca: "",
      modelo: movimiento.suspension || movimiento.itemNombre || "",
      numeroSerie: "",
      identificador: "",
      color: "",
      tipo: "",
      acabado: "",
      bloqueo: "",
      rebote: "",
      tubo: "",
      ejeMontura: "",
      rodada: "",
      psiAntes: "",
      bloqueoAntes: "",
      reboteAntes: "",

      detallesAntes: movimiento.observaciones || "",
      tipoMantenimiento: "",
      insumos: "",
      observacionesFinales: "",

      fotosBicicleta: [],
      fotosSuspensionRecepcion: Object.values(
        movimiento.fotosRecoleccion || {}
      )
        .filter(Boolean)
        .map((src) => ({
          id: Date.now() + Math.random(),
          originalSrc: src,
          annotatedSrc: src,
          description: "Foto de recolección",
        })),
      fotosDanos: [],
      fotosEvidencia: [],

      conceptos: [],
      firmaCliente: "",
      entregaDomicilio: false,
      fechaEntregaDomicilio: "",
      recoleccionEntregaId: movimiento.id,

      estado: "abierta",
      fechaCreacion: fechaActual(),
      horaCreacion: horaActual(),
    };

    try {
      const ref = await addTenantItem(
        SUSPENSIONES_COLLECTION,
        nuevaSuspension,
        tenantId
      );

      const suspensionFinal = {
        ...nuevaSuspension,
        firebaseId: ref.id,
      };

      guardarSuspensionesLocales([suspensionFinal, ...suspensionesLocales]);

      await guardarMovimientoFirebase({
        ...movimiento,
        servicioCreado: true,
        suspensionServicioId: nuevaSuspension.id,
      });

      navigate("/suspensiones");
    } catch (error) {
      console.error("Error creando suspensión desde movimiento:", error);
      alert("No se pudo crear el servicio de suspensión.");
    }
  };

  const programadas = movimientosFiltrados.filter(
    (item) => item.estado === "programada"
  );

  const pendientesEntrega = movimientosFiltrados.filter(
    (item) => item.estado === "pendienteEntrega"
  );

  const historial = movimientosFiltrados.filter(
    (item) => item.estado !== "programada" && item.estado !== "pendienteEntrega"
  );

  const renderCard = (item) => (
    <article className="er2-card" key={item.id}>
      <div className="er2-card-top">
        <span>{item.folio}</span>
        <strong>{etiqueta(item)}</strong>
      </div>

      <h3>{item.cliente}</h3>

      <p>
        {esSuspension(item) ? "Suspensión" : "Bicicleta"} ·{" "}
        {nombreArticulo(item)}
      </p>

      <p className="er2-small">
        {item.estado === "programada"
          ? `${item.fechaProgramada || "Sin fecha"} ${
              item.horaProgramada ? `· ${item.horaProgramada}` : ""
            }`
          : `${item.fechaCreacion} · ${item.horaCreacion}`}
      </p>

      <div className="er2-card-actions">
        <button onClick={() => setMovimientoSeleccionado(item)}>
          {item.estado === "programada"
            ? "Completar"
            : item.estado === "pendienteEntrega"
            ? "Registrar entrega"
            : "Abrir"}
        </button>

        {item.googleMaps && (
          <a href={item.googleMaps} target="_blank" rel="noreferrer">
            Maps
          </a>
        )}
      </div>

      {item.estado === "programada" && (
        <button
          className="cancel-service-button"
          onClick={() => cancelarProgramada(item)}
        >
          Cancelar
        </button>
      )}

      {(item.estado === "recolectada" ||
        item.estado === "recolectada / entregada") &&
        !item.servicioCreado && (
          <button
            className="primary-button er2-create-service-button"
            onClick={() => crearServicioDesdeMovimiento(item)}
          >
            {esSuspension(item)
              ? "Crear servicio de suspensión"
              : "Crear servicio de bicicleta"}
          </button>
        )}
    </article>
  );

  return (
    <section className="er2-page">
      <div className="module-header">
        <div>
          <h2>Recolección / Entrega</h2>
          <p>Agenda, registra evidencia, firma cliente y genera recibo.</p>
        </div>
      </div>

      <div className="search-box">
        <input
          type="text"
          placeholder="Buscar por cliente, folio, bicicleta o suspensión..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {cargando && <div className="empty-state">Cargando movimientos...</div>}

      {!cargando && (
        <>
          <h3 className="er2-title">Programadas</h3>
          <div className="er2-grid">{programadas.map(renderCard)}</div>

          <h3 className="er2-title">Pendientes de entrega</h3>
          <div className="er2-grid">{pendientesEntrega.map(renderCard)}</div>

          <h3 className="er2-title">Historial</h3>
          <div className="er2-grid">{historial.map(renderCard)}</div>
        </>
      )}

      <button className="floating-action" onClick={() => setModalOpen(true)}>
        +
      </button>

      {modalOpen && (
        <NuevoMovimientoModal
          onClose={() => setModalOpen(false)}
          onCreate={crearMovimiento}
        />
      )}

      {movimientoSeleccionado && (
        <div className="modal-backdrop">
          <div className="er2-modal er2-detail-modal">
            <div className="modal-header">
              <div>
                <h2>{movimientoSeleccionado.folio}</h2>
                <p>
                  {movimientoSeleccionado.tipo} ·{" "}
                  {movimientoSeleccionado.cliente}
                </p>
              </div>

              <button
                className="modal-close"
                onClick={() => setMovimientoSeleccionado(null)}
              >
                ×
              </button>
            </div>

            {movimientoSeleccionado.estado === "programada" && (
              <section className="form-section">
                <h3>Completar programada</h3>

                <div className="form-grid">
                  <label>
                    Cliente
                    <input
                      value={movimientoSeleccionado.cliente}
                      onChange={(event) =>
                        actualizarCampo("cliente", event.target.value)
                      }
                    />
                  </label>

                  <label>
                    Teléfono
                    <input
                      value={movimientoSeleccionado.telefono}
                      onChange={(event) =>
                        actualizarCampo("telefono", event.target.value)
                      }
                    />
                  </label>

                  <label className="full-width-field">
                    {esSuspension(movimientoSeleccionado)
                      ? "Suspensión"
                      : "Bicicleta"}
                    <input
                      value={nombreArticulo(movimientoSeleccionado)}
                      onChange={(event) =>
                        actualizarCampo(
                          esSuspension(movimientoSeleccionado)
                            ? "suspension"
                            : "bicicleta",
                          event.target.value
                        )
                      }
                    />
                  </label>
                </div>

                <label className="full-label">
                  Observaciones
                  <textarea
                    value={movimientoSeleccionado.observaciones}
                    onChange={(event) =>
                      actualizarCampo("observaciones", event.target.value)
                    }
                  />
                </label>

                <div className="er2-photo-input-grid">
                  <label className="er2-photo-input">
                    {movimientoSeleccionado.fotosRecoleccion?.lateral1 ||
                    movimientoSeleccionado.fotosEntrega?.lateral1 ? (
                      <img
                        src={
                          movimientoSeleccionado.tipo === "Entrega"
                            ? movimientoSeleccionado.fotosEntrega?.lateral1
                            : movimientoSeleccionado.fotosRecoleccion?.lateral1
                        }
                        alt="Foto 1"
                      />
                    ) : (
                      <span>Foto 1</span>
                    )}

                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        cargarFoto(
                          movimientoSeleccionado.tipo === "Entrega"
                            ? "fotosEntrega"
                            : "fotosRecoleccion",
                          "lateral1",
                          event.target.files?.[0]
                        )
                      }
                    />
                  </label>

                  <label className="er2-photo-input">
                    {movimientoSeleccionado.fotosRecoleccion?.lateral2 ||
                    movimientoSeleccionado.fotosEntrega?.lateral2 ? (
                      <img
                        src={
                          movimientoSeleccionado.tipo === "Entrega"
                            ? movimientoSeleccionado.fotosEntrega?.lateral2
                            : movimientoSeleccionado.fotosRecoleccion?.lateral2
                        }
                        alt="Foto 2"
                      />
                    ) : (
                      <span>Foto 2</span>
                    )}

                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        cargarFoto(
                          movimientoSeleccionado.tipo === "Entrega"
                            ? "fotosEntrega"
                            : "fotosRecoleccion",
                          "lateral2",
                          event.target.files?.[0]
                        )
                      }
                    />
                  </label>
                </div>

                <div className="er2-actions">
                  <button
                    className="primary-button"
                    onClick={generarReciboProgramado}
                  >
                    Generar recibo
                  </button>
                </div>
              </section>
            )}

            {movimientoSeleccionado.estado === "pendienteEntrega" && (
              <section className="form-section">
                <h3>Registrar entrega</h3>

                <label className="full-label">
                  Observaciones de entrega
                  <textarea
                    value={movimientoSeleccionado.observacionesEntrega || ""}
                    onChange={(event) =>
                      actualizarCampo("observacionesEntrega", event.target.value)
                    }
                  />
                </label>

                <div className="er2-photo-input-grid">
                  <label className="er2-photo-input">
                    {movimientoSeleccionado.fotosEntrega?.lateral1 ? (
                      <img
                        src={movimientoSeleccionado.fotosEntrega.lateral1}
                        alt="Entrega 1"
                      />
                    ) : (
                      <span>Foto entrega 1</span>
                    )}

                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        cargarFoto(
                          "fotosEntrega",
                          "lateral1",
                          event.target.files?.[0]
                        )
                      }
                    />
                  </label>

                  <label className="er2-photo-input">
                    {movimientoSeleccionado.fotosEntrega?.lateral2 ? (
                      <img
                        src={movimientoSeleccionado.fotosEntrega.lateral2}
                        alt="Entrega 2"
                      />
                    ) : (
                      <span>Foto entrega 2</span>
                    )}

                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        cargarFoto(
                          "fotosEntrega",
                          "lateral2",
                          event.target.files?.[0]
                        )
                      }
                    />
                  </label>
                </div>

                <div className="er2-actions">
                  <button
                    className="er2-sign-button"
                    onClick={() => setFirmaModal("entrega")}
                  >
                    Firmar entrega
                  </button>
                </div>
              </section>
            )}

            {movimientoSeleccionado.estado !== "programada" &&
              movimientoSeleccionado.estado !== "pendienteEntrega" && (
                <>
                  <MovimientoReceipt
                    movimiento={movimientoSeleccionado}
                    receiptRef={receiptRef}
                  />

                  <div className="er2-actions">
                    {movimientoSeleccionado.tipo !== "Entrega" &&
                      !movimientoSeleccionado.firmaRecoleccion && (
                        <button
                          className="er2-sign-button"
                          onClick={() => setFirmaModal("recoleccion")}
                        >
                          Firmar recolección
                        </button>
                      )}

                    {movimientoSeleccionado.tipo === "Entrega" &&
                      !movimientoSeleccionado.firmaEntrega && (
                        <button
                          className="er2-sign-button"
                          onClick={() => setFirmaModal("entrega")}
                        >
                          Firmar entrega
                        </button>
                      )}

                    <button className="primary-button" onClick={descargarPDF}>
                      Descargar PDF
                    </button>
                  </div>
                </>
              )}
          </div>

          {firmaModal && (
            <SignatureModal
              title={
                firmaModal === "recoleccion"
                  ? "Firma de recolección"
                  : "Firma de entrega"
              }
              onClose={() => setFirmaModal(null)}
              onSave={guardarFirma}
            />
          )}
        </div>
      )}
    </section>
  );
}

export default RecoleccionEntrega;