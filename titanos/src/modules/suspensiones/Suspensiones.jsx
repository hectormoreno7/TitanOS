import { useEffect, useMemo, useRef, useState } from "react";
import NuevaSuspensionModal from "./NuevaSuspensionModal";
import SuspensionReceipt from "./SuspensionReceipt";
import SignatureModal from "../servicios/SignatureModal";
import ImageAnnotatorModal from "../servicios/ImageAnnotatorModal";
import { generarPDFSuspension } from "../servicios/pdfGenerator";
import { useAuth } from "../../context/AuthContext";
import {
  getTenantItems,
  addTenantItem,
  updateTenantItem,
} from "../../firebase/firestore";

const STORAGE_KEY = "titanos_suspensiones_v2";
const ER_KEY = "titanos_recoleccion_entrega_v8";

const COLLECTION = "suspensiones";
const ER_COLLECTION = "recoleccionEntrega";

function cargarSuspensionesLocales() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function guardarSuspensionesLocales(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    console.warn("No se pudieron guardar suspensiones en localStorage.");
  }
}

function cargarEntregas() {
  try {
    return JSON.parse(localStorage.getItem(ER_KEY)) || [];
  } catch {
    return [];
  }
}

function guardarEntregas(data) {
  try {
    localStorage.setItem(ER_KEY, JSON.stringify(data));
  } catch {
    console.warn("No se pudieron guardar entregas en localStorage.");
  }
}

function generarFolio(consecutivo) {
  const fecha = new Date();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const año = String(fecha.getFullYear()).slice(-2);

  return `TBW-SUS-${mes}${año}-${String(consecutivo).padStart(5, "0")}`;
}

function generarFolioEntrega(consecutivo) {
  const fecha = new Date();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const año = String(fecha.getFullYear()).slice(-2);

  return `TBW-ER-${mes}${año}-${String(consecutivo).padStart(5, "0")}`;
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

function totalSuspension(item) {
  return (item.conceptos || []).reduce((acc, concepto) => {
    return acc + Number(concepto.cantidad || 0) * Number(concepto.precio || 0);
  }, 0);
}

function normalizarEstado(estado) {
  return String(estado || "abierta").trim().toLowerCase();
}

function esSuspensionActiva(item) {
  const estado = normalizarEstado(item?.estado);

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

function uniqueByFirebaseId(items) {
  const map = new Map();

  items.forEach((item) => {
    const key = item.firebaseId || item.id || item.folio;
    if (!map.has(key)) map.set(key, item);
  });

  return Array.from(map.values());
}

function Suspensiones() {
  const { tenantId } = useAuth();
  const receiptRef = useRef(null);

  const [vista, setVista] = useState("activas");
  const [search, setSearch] = useState("");
  const [suspensiones, setSuspensiones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [seleccionada, setSeleccionada] = useState(null);
  const [firmaModal, setFirmaModal] = useState(false);
  const [fotoEditando, setFotoEditando] = useState(null);

  const [nuevoConcepto, setNuevoConcepto] = useState({
    descripcion: "",
    cantidad: 1,
    precio: "",
  });

  useEffect(() => {
    async function cargarSuspensiones() {
      setCargando(true);

      try {
        const firebaseSuspensiones = await getTenantItems(COLLECTION, tenantId);
        const unicas = uniqueByFirebaseId(firebaseSuspensiones);

        if (unicas.length > 0) {
          setSuspensiones(unicas);
          guardarSuspensionesLocales(unicas);
        } else {
          const locales = cargarSuspensionesLocales();

          if (locales.length > 0) {
            const migradas = [];

            for (const suspension of locales) {
              const ref = await addTenantItem(
                COLLECTION,
                {
                  ...suspension,
                  estado: suspension.estado || "abierta",
                  conceptos: suspension.conceptos || [],
                  fotosBicicleta: suspension.fotosBicicleta || [],
                  fotosSuspensionRecepcion:
                    suspension.fotosSuspensionRecepcion || [],
                  fotosDanos: suspension.fotosDanos || [],
                  fotosEvidencia: suspension.fotosEvidencia || [],
                },
                tenantId
              );

              migradas.push({
                ...suspension,
                firebaseId: ref.id,
                estado: suspension.estado || "abierta",
                conceptos: suspension.conceptos || [],
                fotosBicicleta: suspension.fotosBicicleta || [],
                fotosSuspensionRecepcion:
                  suspension.fotosSuspensionRecepcion || [],
                fotosDanos: suspension.fotosDanos || [],
                fotosEvidencia: suspension.fotosEvidencia || [],
              });
            }

            setSuspensiones(migradas);
            guardarSuspensionesLocales(migradas);
          } else {
            setSuspensiones([]);
          }
        }
      } catch (error) {
        console.error("Error cargando suspensiones:", error);
        setSuspensiones(cargarSuspensionesLocales());
      } finally {
        setCargando(false);
      }
    }

    cargarSuspensiones();
  }, [tenantId]);

  useEffect(() => {
    guardarSuspensionesLocales(suspensiones);
  }, [suspensiones]);

  const filtradas = useMemo(() => {
    const q = search.toLowerCase().trim();

    if (!q) return suspensiones;

    return suspensiones.filter((item) => {
      const texto = `
        ${item.folio}
        ${item.estado}
        ${item.cliente}
        ${item.telefono}
        ${item.marca}
        ${item.modelo}
        ${item.numeroSerie}
      `.toLowerCase();

      return texto.includes(q);
    });
  }, [search, suspensiones]);

  const suspensionesActivas = useMemo(() => {
    return filtradas.filter(esSuspensionActiva);
  }, [filtradas]);

  const suspensionesHistorial = useMemo(() => {
    return filtradas.filter((item) => !esSuspensionActiva(item));
  }, [filtradas]);

  const listaVisible =
    vista === "activas" ? suspensionesActivas : suspensionesHistorial;

  const actualizarLocal = (actualizada) => {
    setSuspensiones((prev) =>
      prev.map((item) =>
        String(item.firebaseId || item.id) ===
        String(actualizada.firebaseId || actualizada.id)
          ? actualizada
          : item
      )
    );

    setSeleccionada(actualizada);
  };

  const guardarEnFirebase = async (suspension) => {
    let final = suspension;

    if (suspension.firebaseId) {
      await updateTenantItem(
        COLLECTION,
        suspension.firebaseId,
        suspension,
        tenantId
      );
    } else {
      const ref = await addTenantItem(COLLECTION, suspension, tenantId);

      final = {
        ...suspension,
        firebaseId: ref.id,
      };
    }

    actualizarLocal(final);
    return final;
  };

  const crear = async (data) => {
    const nueva = {
      id: Date.now(),
      folio: generarFolio(suspensiones.length + 1),
      ...data,
      estado: data.estado || "abierta",
      conceptos: data.conceptos || [],
      fotosBicicleta: data.fotosBicicleta || [],
      fotosSuspensionRecepcion: data.fotosSuspensionRecepcion || [],
      fotosDanos: data.fotosDanos || [],
      fotosEvidencia: data.fotosEvidencia || [],
    };

    try {
      const ref = await addTenantItem(COLLECTION, nueva, tenantId);

      const final = {
        ...nueva,
        firebaseId: ref.id,
      };

      const actualizadas = [final, ...suspensiones];

      setSuspensiones(actualizadas);
      guardarSuspensionesLocales(actualizadas);
      setSeleccionada(final);
      setModalOpen(false);
    } catch (error) {
      console.error("Error creando suspensión:", error);
      alert("No se pudo guardar la suspensión en Firebase.");
    }
  };

  const crearEntregaDomicilio = async (suspensionBase) => {
    if (!suspensionBase.entregaDomicilio) {
      return {
        movimientoId: suspensionBase.recoleccionEntregaId || "",
        movimientoFirebaseId: suspensionBase.recoleccionEntregaFirebaseId || "",
      };
    }

    const movimientosFirebase = await getTenantItems(ER_COLLECTION, tenantId);
    const entregasLocales = cargarEntregas();

    const nombreSuspension = `${suspensionBase.marca || ""} ${
      suspensionBase.modelo || ""
    }`.trim();

    const movimientoExistente =
      movimientosFirebase.find(
        (item) =>
          item.firebaseId === suspensionBase.recoleccionEntregaFirebaseId
      ) ||
      movimientosFirebase.find(
        (item) =>
          String(item.suspensionId || "") === String(suspensionBase.id || "")
      ) ||
      null;

    const movimientoBase = {
      id: movimientoExistente?.id || Date.now(),
      folio:
        movimientoExistente?.folio ||
        generarFolioEntrega(movimientosFirebase.length + 1),

      modo: "programada",
      tipo: "Entrega",
      estado: "programada",
      fase: "simple",

      tipoItem: "suspension",
      origen: "suspension",
      suspensionId: suspensionBase.id,
      suspensionFirebaseId: suspensionBase.firebaseId || "",
      suspension: nombreSuspension,
      itemNombre: nombreSuspension,

      clienteId: suspensionBase.clienteId || "",
      bicicletaId: "",

      cliente: suspensionBase.cliente || "",
      telefono: suspensionBase.telefono || "",
      bicicleta: "",
      direccion: suspensionBase.direccion || "",
      googleMaps: suspensionBase.googleMaps || "",

      fechaProgramada: suspensionBase.fechaEntregaDomicilio || "",
      horaProgramada: "",

      observaciones: `Entrega a domicilio vinculada a suspensión ${suspensionBase.folio}`,
      observacionesEntrega: "",

      fotosRecoleccion: movimientoExistente?.fotosRecoleccion || {
        lateral1: "",
        lateral2: "",
      },
      fotosEntrega: movimientoExistente?.fotosEntrega || {
        lateral1: "",
        lateral2: "",
      },

      firmaRecoleccion: movimientoExistente?.firmaRecoleccion || "",
      firmaEntrega: movimientoExistente?.firmaEntrega || "",

      fechaCreacion: movimientoExistente?.fechaCreacion || fechaActual(),
      horaCreacion: movimientoExistente?.horaCreacion || horaActual(),
    };

    let movimientoFinal = movimientoBase;

    if (movimientoExistente?.firebaseId) {
      await updateTenantItem(
        ER_COLLECTION,
        movimientoExistente.firebaseId,
        movimientoBase,
        tenantId
      );

      movimientoFinal = {
        ...movimientoBase,
        firebaseId: movimientoExistente.firebaseId,
      };
    } else {
      const ref = await addTenantItem(ER_COLLECTION, movimientoBase, tenantId);

      movimientoFinal = {
        ...movimientoBase,
        firebaseId: ref.id,
      };
    }

    const localesActualizados = [
      movimientoFinal,
      ...entregasLocales.filter(
        (item) =>
          String(item.id) !== String(movimientoFinal.id) &&
          String(item.suspensionId || "") !== String(suspensionBase.id || "")
      ),
    ];

    guardarEntregas(localesActualizados);

    return {
      movimientoId: movimientoFinal.id,
      movimientoFirebaseId: movimientoFinal.firebaseId,
    };
  };

  const cancelarSuspension = async (item) => {
    const confirmar = window.confirm("¿Cancelar esta suspensión?");
    if (!confirmar) return;

    try {
      await guardarEnFirebase({
        ...item,
        estado: "cancelada",
        fechaCancelacion: fechaActual(),
        horaCancelacion: horaActual(),
      });

      setSeleccionada(null);
      setVista("historial");
      alert("Suspensión cancelada.");
    } catch (error) {
      console.error("Error cancelando suspensión:", error);
      alert("No se pudo cancelar la suspensión.");
    }
  };

  const reabrirSuspension = async (item) => {
    const confirmar = window.confirm("¿Reabrir esta suspensión?");
    if (!confirmar) return;

    try {
      const actualizada = await guardarEnFirebase({
        ...item,
        estado: "abierta",
        fechaReapertura: fechaActual(),
        horaReapertura: horaActual(),
      });

      setSeleccionada(actualizada);
      setVista("activas");
      alert("Suspensión reabierta.");
    } catch (error) {
      console.error("Error reabriendo suspensión:", error);
      alert("No se pudo reabrir la suspensión.");
    }
  };

  const actualizarCampo = (campo, valor) => {
    actualizarLocal({
      ...seleccionada,
      [campo]: valor,
    });
  };

  const guardarAvance = async () => {
    try {
      const entrega = await crearEntregaDomicilio(seleccionada);

      await guardarEnFirebase({
        ...seleccionada,
        estado: seleccionada.estado || "abierta",
        recoleccionEntregaId:
          entrega.movimientoId || seleccionada.recoleccionEntregaId || "",
        recoleccionEntregaFirebaseId:
          entrega.movimientoFirebaseId ||
          seleccionada.recoleccionEntregaFirebaseId ||
          "",
        fechaUltimaEdicion: fechaActual(),
        horaUltimaEdicion: horaActual(),
        total: totalSuspension(seleccionada),
      });

      alert("Avance guardado.");
    } catch (error) {
      console.error("Error guardando suspensión:", error);
      alert("No se pudo guardar en Firebase.");
    }
  };

  const agregarConcepto = () => {
    if (!nuevoConcepto.descripcion.trim()) {
      alert("Falta descripción.");
      return;
    }

    actualizarLocal({
      ...seleccionada,
      conceptos: [
        ...(seleccionada.conceptos || []),
        {
          id: Date.now(),
          descripcion: nuevoConcepto.descripcion,
          cantidad: Number(nuevoConcepto.cantidad || 1),
          precio: Number(nuevoConcepto.precio || 0),
        },
      ],
    });

    setNuevoConcepto({
      descripcion: "",
      cantidad: 1,
      precio: "",
    });
  };

  const eliminarConcepto = (id) => {
    actualizarLocal({
      ...seleccionada,
      conceptos: (seleccionada.conceptos || []).filter(
        (item) => item.id !== id
      ),
    });
  };

  const comprimirImagen = (archivo) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const img = new Image();

        img.onload = () => {
          const maxWidth = 900;
          const scale = Math.min(maxWidth / img.width, 1);

          const canvas = document.createElement("canvas");
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          resolve(canvas.toDataURL("image/jpeg", 0.72));
        };

        img.onerror = reject;
        img.src = reader.result;
      };

      reader.onerror = reject;
      reader.readAsDataURL(archivo);
    });
  };

  const cargarFotosSuspension = async (grupo, archivos) => {
    const files = Array.from(archivos || []);
    const nuevas = [];

    for (const file of files) {
      const imagen = await comprimirImagen(file);

      nuevas.push({
        id: Date.now() + Math.random(),
        originalSrc: imagen,
        annotatedSrc: imagen,
        description: "",
      });
    }

    actualizarLocal({
      ...seleccionada,
      [grupo]: [...(seleccionada[grupo] || []), ...nuevas],
    });
  };

  const eliminarFotoSuspension = (grupo, id) => {
    actualizarLocal({
      ...seleccionada,
      [grupo]: (seleccionada[grupo] || []).filter((foto) => foto.id !== id),
    });
  };

  const actualizarDescripcionFotoSuspension = (grupo, id, description) => {
    actualizarLocal({
      ...seleccionada,
      [grupo]: (seleccionada[grupo] || []).map((foto) =>
        foto.id === id ? { ...foto, description } : foto
      ),
    });
  };

  const guardarFotoEditadaSuspension = (fotoActualizada) => {
    actualizarLocal({
      ...seleccionada,
      [fotoActualizada.grupo]: (seleccionada[fotoActualizada.grupo] || []).map(
        (foto) => (foto.id === fotoActualizada.id ? fotoActualizada : foto)
      ),
    });

    setFotoEditando(null);
  };

  const descargarPDF = async () => {
    try {
      const entrega = await crearEntregaDomicilio(seleccionada);

      const actualizada = {
        ...seleccionada,
        estado: "cerrada",
        total: totalSuspension(seleccionada),
        recoleccionEntregaId:
          entrega.movimientoId || seleccionada.recoleccionEntregaId || "",
        recoleccionEntregaFirebaseId:
          entrega.movimientoFirebaseId ||
          seleccionada.recoleccionEntregaFirebaseId ||
          "",
        fechaCierre: fechaActual(),
        horaCierre: horaActual(),
      };

      const final = await guardarEnFirebase(actualizada);

      await generarPDFSuspension({
        suspension: final,
        nombreArchivo: `${final.folio}-suspension.pdf`,
      });

      setVista("historial");
      alert("PDF generado y suspensión guardada.");
    } catch (error) {
      console.error("Error generando PDF:", error);
      alert("No se pudo generar o guardar la suspensión.");
    }
  };

  const renderEditorFotos = (grupo, titulo) => {
    const fotos = seleccionada?.[grupo] || [];
    const estaCerrada = !esSuspensionActiva(seleccionada);

    return (
      <section className="form-section">
        <h3>{titulo}</h3>

        {!estaCerrada && (
          <label className="sus-upload">
            + Agregar fotos
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => cargarFotosSuspension(grupo, e.target.files)}
            />
          </label>
        )}

        {fotos.length === 0 && (
          <p className="form-note">No hay fotos registradas.</p>
        )}

        <div className="sus-live-photo-grid">
          {fotos.map((foto) => (
            <article className="sus-live-photo-card" key={foto.id}>
              <img src={foto.annotatedSrc || foto.originalSrc} alt={titulo} />

              <textarea
                placeholder="Nota de la foto..."
                disabled={estaCerrada}
                value={foto.description || ""}
                onChange={(e) =>
                  actualizarDescripcionFotoSuspension(
                    grupo,
                    foto.id,
                    e.target.value
                  )
                }
              />

              {!estaCerrada && (
                <div className="sus-photo-actions">
                  <button
                    type="button"
                    onClick={() =>
                      setFotoEditando({
                        ...foto,
                        grupo,
                      })
                    }
                  >
                    Anotar
                  </button>

                  <button
                    type="button"
                    className="cancel-service-button"
                    onClick={() => eliminarFotoSuspension(grupo, foto.id)}
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    );
  };

  return (
    <section className="sus-page">
      <div className="module-header">
        <div>
          <h2>Suspensiones</h2>
          <p>Recepción, servicio, evidencia, costos y PDF.</p>
        </div>
      </div>

      <div className="search-box">
        <input
          value={search}
          placeholder="Buscar por cliente, folio, marca, modelo o serie..."
          onChange={(e) => setSearch(e.target.value)}
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

      {cargando && <div className="empty-state">Cargando suspensiones...</div>}

      {!cargando && listaVisible.length > 0 && (
        <div className="sus-grid">
          {listaVisible.map((item) => {
            const estado = normalizarEstado(item.estado);
            const esActiva = esSuspensionActiva(item);

            return (
              <article
                className="sus-card"
                key={item.firebaseId || item.id || item.folio}
              >
                <div className="sus-card-top">
                  <span>{item.folio}</span>
                  <strong className={`sus-status ${estado}`}>
                    {item.estado || "abierta"}
                  </strong>
                </div>

                <h3>{item.cliente}</h3>
                <p>
                  {item.marca} {item.modelo}
                </p>
                <p className="sus-small">
                  {item.fechaCreacion} · {item.tipoSuspension}
                </p>

                <div className="sus-card-total">
                  ${totalSuspension(item).toFixed(2)}
                </div>

                <div className="sus-card-actions">
                  <button type="button" onClick={() => setSeleccionada(item)}>
                    Abrir
                  </button>

                  {esActiva ? (
                    <button
                      type="button"
                      className="cancel-service-button"
                      onClick={() => cancelarSuspension(item)}
                    >
                      Cancelar
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="reopen-button"
                      onClick={() => reabrirSuspension(item)}
                    >
                      Reabrir
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!cargando && listaVisible.length === 0 && (
        <div className="empty-state">
          {vista === "activas"
            ? "No hay suspensiones activas."
            : "No hay suspensiones en historial."}
        </div>
      )}

      <button className="floating-action" onClick={() => setModalOpen(true)}>
        +
      </button>

      {modalOpen && (
        <NuevaSuspensionModal
          onClose={() => setModalOpen(false)}
          onCreate={crear}
        />
      )}

      {seleccionada && (
        <div className="modal-backdrop">
          <div className="sus-modal sus-detail-modal">
            <div className="modal-header">
              <div>
                <h2>{seleccionada.folio}</h2>
                <p>
                  {seleccionada.cliente} · {seleccionada.marca}{" "}
                  {seleccionada.modelo}
                </p>
              </div>

              <button
                className="modal-close"
                onClick={() => setSeleccionada(null)}
              >
                ×
              </button>
            </div>

            {esSuspensionActiva(seleccionada) && (
              <>
                <section className="form-section">
                  <h3>Editar recepción</h3>

                  <div className="form-grid">
                    {[
                      ["cliente", "Cliente"],
                      ["telefono", "Teléfono"],
                      ["marca", "Marca suspensión"],
                      ["modelo", "Modelo suspensión"],
                      ["numeroSerie", "Serie"],
                      ["identificador", "ID"],
                      ["color", "Color"],
                      ["tipo", "Tipo"],
                      ["acabado", "Acabado"],
                      ["bloqueo", "Bloqueo"],
                      ["rebote", "Rebote"],
                      ["tubo", "Tubo"],
                      ["ejeMontura", "Eje / montura"],
                      ["rodada", "Rodada / medida"],
                      ["psiAntes", "PSI antes"],
                      ["bloqueoAntes", "Bloqueo funcionando antes"],
                      ["reboteAntes", "Rebote funcionando antes"],
                    ].map(([campo, label]) => (
                      <label key={campo}>
                        {label}
                        <input
                          value={seleccionada[campo] || ""}
                          onChange={(e) =>
                            actualizarCampo(campo, e.target.value)
                          }
                        />
                      </label>
                    ))}
                  </div>

                  <label className="full-label">
                    Detalles antes del mantenimiento
                    <textarea
                      value={seleccionada.detallesAntes || ""}
                      onChange={(e) =>
                        actualizarCampo("detallesAntes", e.target.value)
                      }
                    />
                  </label>
                </section>

                {seleccionada.vieneConBicicleta &&
                  renderEditorFotos(
                    "fotosBicicleta",
                    "Fotos laterales de bicicleta"
                  )}

                {renderEditorFotos(
                  "fotosSuspensionRecepcion",
                  "Fotos de suspensión al recibir"
                )}

                {renderEditorFotos("fotosDanos", "Marcas o daños al recibir")}

                <section className="form-section">
                  <h3>Servicio de suspensión</h3>

                  <label className="full-label">
                    Tipo de mantenimiento
                    <textarea
                      value={seleccionada.tipoMantenimiento || ""}
                      onChange={(e) =>
                        actualizarCampo("tipoMantenimiento", e.target.value)
                      }
                    />
                  </label>

                  <label className="full-label">
                    Insumos y kits utilizados
                    <textarea
                      value={seleccionada.insumos || ""}
                      onChange={(e) =>
                        actualizarCampo("insumos", e.target.value)
                      }
                    />
                  </label>

                  <label className="full-label">
                    Observaciones después del mantenimiento
                    <textarea
                      value={seleccionada.observacionesFinales || ""}
                      onChange={(e) =>
                        actualizarCampo("observacionesFinales", e.target.value)
                      }
                    />
                  </label>
                </section>

                {renderEditorFotos(
                  "fotosEvidencia",
                  "Evidencia del mantenimiento"
                )}

                <section className="form-section">
                  <h3>Conceptos y costos</h3>

                  <div className="sus-concept-form">
                    <input
                      placeholder="Concepto"
                      value={nuevoConcepto.descripcion}
                      onChange={(e) =>
                        setNuevoConcepto({
                          ...nuevoConcepto,
                          descripcion: e.target.value,
                        })
                      }
                    />

                    <input
                      type="number"
                      placeholder="Cantidad"
                      value={nuevoConcepto.cantidad}
                      onChange={(e) =>
                        setNuevoConcepto({
                          ...nuevoConcepto,
                          cantidad: e.target.value,
                        })
                      }
                    />

                    <input
                      type="number"
                      placeholder="Precio"
                      value={nuevoConcepto.precio}
                      onChange={(e) =>
                        setNuevoConcepto({
                          ...nuevoConcepto,
                          precio: e.target.value,
                        })
                      }
                    />

                    <button
                      type="button"
                      className="primary-button"
                      onClick={agregarConcepto}
                    >
                      Agregar
                    </button>
                  </div>

                  <div className="sus-inline-concepts">
                    {(seleccionada.conceptos || []).map((item) => (
                      <div className="sus-inline-concept-row" key={item.id}>
                        <span>{item.descripcion}</span>
                        <span>{item.cantidad}</span>
                        <span>${Number(item.precio || 0).toFixed(2)}</span>
                        <strong>
                          $
                          {(
                            Number(item.cantidad || 0) *
                            Number(item.precio || 0)
                          ).toFixed(2)}
                        </strong>

                        <button
                          type="button"
                          className="cancel-service-button"
                          onClick={() => eliminarConcepto(item.id)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="form-section">
                  <h3>Entrega a domicilio</h3>

                  <label className="check-item">
                    <input
                      type="checkbox"
                      checked={seleccionada.entregaDomicilio || false}
                      onChange={(e) =>
                        actualizarCampo("entregaDomicilio", e.target.checked)
                      }
                    />
                    Vincular con entrega a domicilio
                  </label>

                  {seleccionada.entregaDomicilio && (
                    <div className="form-grid">
                      <label>
                        Fecha opcional
                        <input
                          type="date"
                          value={seleccionada.fechaEntregaDomicilio || ""}
                          onChange={(e) =>
                            actualizarCampo(
                              "fechaEntregaDomicilio",
                              e.target.value
                            )
                          }
                        />
                      </label>
                    </div>
                  )}
                </section>
              </>
            )}

            {!esSuspensionActiva(seleccionada) && (
              <div className="empty-state">
                Esta suspensión está en historial. Puedes descargar su PDF o
                reabrirla desde la tarjeta del historial.
              </div>
            )}

            <SuspensionReceipt
              suspension={seleccionada}
              receiptRef={receiptRef}
            />

            <div className="sus-actions">
              {esSuspensionActiva(seleccionada) && (
                <>
                  <button className="secondary-button" onClick={guardarAvance}>
                    Guardar
                  </button>

                  <button
                    className="secondary-button"
                    onClick={() => setFirmaModal(true)}
                  >
                    Firma opcional
                  </button>

                  <button
                    className="cancel-service-button"
                    onClick={() => cancelarSuspension(seleccionada)}
                  >
                    Cancelar suspensión
                  </button>
                </>
              )}

              {!esSuspensionActiva(seleccionada) && (
                <button
                  className="reopen-button"
                  onClick={() => reabrirSuspension(seleccionada)}
                >
                  Reabrir suspensión
                </button>
              )}

              <button className="primary-button" onClick={descargarPDF}>
                Descargar PDF y guardar
              </button>
            </div>
          </div>

          {firmaModal && (
            <SignatureModal
              title="Firma del cliente"
              onClose={() => setFirmaModal(false)}
              onSave={(firma) => {
                actualizarLocal({ ...seleccionada, firmaCliente: firma });
                setFirmaModal(false);
              }}
            />
          )}

          {fotoEditando && (
            <ImageAnnotatorModal
              image={fotoEditando}
              onClose={() => setFotoEditando(null)}
              onSave={guardarFotoEditadaSuspension}
            />
          )}
        </div>
      )}
    </section>
  );
}

export default Suspensiones;