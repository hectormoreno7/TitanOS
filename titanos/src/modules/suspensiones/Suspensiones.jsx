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
import {
  actualizarFotoSuspension,
  comprimirArchivoImagen,
  comprimirDataUrlImagen,
  crearFotoSuspension,
  eliminarFotoSuspensionFirestore,
  normalizarFotoFirestore,
  obtenerFotosSuspensiones,
} from "../../utils/suspensionImageFirestore";

const STORAGE_KEY = "titanos_suspensiones_v2";
const ER_KEY = "titanos_recoleccion_entrega_v8";

const COLLECTION = "suspensiones";
const ER_COLLECTION = "recoleccionEntrega";

const GRUPOS_FOTOS = [
  "fotosBicicleta",
  "fotosSuspensionRecepcion",
  "fotosDanos",
  "fotosEvidencia",
];

const MAX_FOTOS_POR_GRUPO = 6;

function quitarFotos(item = {}) {
  const copia = { ...item };

  GRUPOS_FOTOS.forEach((grupo) => {
    delete copia[grupo];
  });

  return copia;
}

function cargarSuspensionesLocales() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function guardarSuspensionesLocales(data) {
  try {
    const ligeras = data.map(quitarFotos);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ligeras));
  } catch {
    console.warn(
      "No se pudieron guardar suspensiones en localStorage."
    );
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
    console.warn(
      "No se pudieron guardar entregas en localStorage."
    );
  }
}

function generarFolio(consecutivo) {
  const fecha = new Date();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const año = String(fecha.getFullYear()).slice(-2);

  return `TBW-SUS-${mes}${año}-${String(consecutivo).padStart(
    5,
    "0"
  )}`;
}

function generarFolioEntrega(consecutivo) {
  const fecha = new Date();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const año = String(fecha.getFullYear()).slice(-2);

  return `TBW-ER-${mes}${año}-${String(consecutivo).padStart(
    5,
    "0"
  )}`;
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
  return (item.conceptos || []).reduce(
    (acc, concepto) =>
      acc +
      Number(concepto.cantidad || 0) *
        Number(concepto.precio || 0),
    0
  );
}

function normalizarEstado(estado) {
  return String(estado || "abierta")
    .trim()
    .toLowerCase();
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

    if (!map.has(key)) {
      map.set(key, item);
    }
  });

  return Array.from(map.values());
}

function hidratarSuspensiones(suspensiones, fotos) {
  return suspensiones.map((suspension) => {
    const resultado = {
      ...suspension,
    };

    GRUPOS_FOTOS.forEach((grupo) => {
      const externas = fotos
        .filter(
          (foto) =>
            foto.grupo === grupo &&
            (String(foto.suspensionFirebaseId || "") ===
              String(suspension.firebaseId || "") ||
              String(foto.suspensionId || "") ===
                String(suspension.id || ""))
        )
        .map(normalizarFotoFirestore);

      const embebidas = (suspension[grupo] || []).map(
        normalizarFotoFirestore
      );

      resultado[grupo] =
        externas.length > 0 ? externas : embebidas;
    });

    return resultado;
  });
}

function Suspensiones() {
  const { tenantId } = useAuth();
  const receiptRef = useRef(null);

  const [vista, setVista] = useState("activas");
  const [search, setSearch] = useState("");
  const [suspensiones, setSuspensiones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [procesandoFotos, setProcesandoFotos] =
    useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [seleccionada, setSeleccionada] =
    useState(null);
  const [firmaModal, setFirmaModal] = useState(false);
  const [fotoEditando, setFotoEditando] =
    useState(null);

  const [nuevoConcepto, setNuevoConcepto] = useState({
    descripcion: "",
    cantidad: 1,
    precio: "",
  });

  useEffect(() => {
    async function cargarSuspensiones() {
      setCargando(true);

      try {
        const [firebaseSuspensiones, firebaseFotos] =
          await Promise.all([
            getTenantItems(COLLECTION, tenantId),
            obtenerFotosSuspensiones(tenantId),
          ]);

        const unicas = uniqueByFirebaseId(
          firebaseSuspensiones
        );

        const hidratadas = hidratarSuspensiones(
          unicas,
          firebaseFotos
        );

        setSuspensiones(hidratadas);
        guardarSuspensionesLocales(hidratadas);
      } catch (error) {
        console.error(
          "Error cargando suspensiones:",
          error
        );

        const locales = cargarSuspensionesLocales();

        setSuspensiones(
          locales.map((item) => ({
            ...item,
            fotosBicicleta: [],
            fotosSuspensionRecepcion: [],
            fotosDanos: [],
            fotosEvidencia: [],
          }))
        );
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

  const suspensionesActivas = useMemo(
    () => filtradas.filter(esSuspensionActiva),
    [filtradas]
  );

  const suspensionesHistorial = useMemo(
    () =>
      filtradas.filter(
        (item) => !esSuspensionActiva(item)
      ),
    [filtradas]
  );

  const listaVisible =
    vista === "activas"
      ? suspensionesActivas
      : suspensionesHistorial;

  const actualizarLocal = (actualizada) => {
    setSuspensiones((prev) =>
      prev.map((item) =>
        String(item.firebaseId || item.id) ===
        String(
          actualizada.firebaseId || actualizada.id
        )
          ? actualizada
          : item
      )
    );

    setSeleccionada(actualizada);
  };

  const guardarEnFirebase = async (suspension) => {
    let final = suspension;
    const dataSinFotos = quitarFotos(suspension);

    if (suspension.firebaseId) {
      await updateTenantItem(
        COLLECTION,
        suspension.firebaseId,
        dataSinFotos,
        tenantId
      );
    } else {
      const ref = await addTenantItem(
        COLLECTION,
        dataSinFotos,
        tenantId
      );

      final = {
        ...suspension,
        firebaseId: ref.id,
      };
    }

    actualizarLocal(final);
    return final;
  };

  const guardarFotosIniciales = async (
    suspension,
    data
  ) => {
    const resultado = {};

    for (const grupo of GRUPOS_FOTOS) {
      resultado[grupo] = [];

      for (const foto of data[grupo] || []) {
        const src =
          foto.src ||
          foto.annotatedSrc ||
          foto.originalSrc;

        if (!src) continue;

        const guardada = await crearFotoSuspension({
          tenantId,
          suspensionFirebaseId:
            suspension.firebaseId,
          suspensionId: suspension.id,
          grupo,
          src,
          description: foto.description || "",
          id: foto.id,
        });

        resultado[grupo].push(guardada);
      }
    }

    return resultado;
  };

  const crear = async (data) => {
    setGuardando(true);

    try {
      const nueva = {
        id: Date.now(),
        folio: generarFolio(
          suspensiones.length + 1
        ),
        ...quitarFotos(data),
        estado: data.estado || "abierta",
        conceptos: data.conceptos || [],
      };

      const ref = await addTenantItem(
        COLLECTION,
        nueva,
        tenantId
      );

      const base = {
        ...nueva,
        firebaseId: ref.id,
      };

      const fotos = await guardarFotosIniciales(
        base,
        data
      );

      const final = {
        ...base,
        ...fotos,
      };

      const actualizadas = [
        final,
        ...suspensiones,
      ];

      setSuspensiones(actualizadas);
      guardarSuspensionesLocales(actualizadas);
      setSeleccionada(final);
      setModalOpen(false);
    } catch (error) {
      console.error(
        "Error creando suspensión:",
        error
      );

      alert(
        "No se pudo guardar la suspensión. Intenta usar menos fotografías."
      );
    } finally {
      setGuardando(false);
    }
  };

  const sincronizarFotos = async (suspension) => {
    const actualizada = {
      ...suspension,
    };

    for (const grupo of GRUPOS_FOTOS) {
      const guardadas = [];

      for (const foto of suspension[grupo] || []) {
        const normalizada =
          await actualizarFotoSuspension({
            tenantId,
            foto,
            suspensionFirebaseId:
              suspension.firebaseId,
            suspensionId: suspension.id,
            grupo,
          });

        guardadas.push(normalizada);
      }

      actualizada[grupo] = guardadas;
    }

    actualizarLocal(actualizada);
    return actualizada;
  };

  const crearEntregaDomicilio = async (
    suspensionBase
  ) => {
    if (!suspensionBase.entregaDomicilio) {
      return {
        movimientoId:
          suspensionBase.recoleccionEntregaId || "",
        movimientoFirebaseId:
          suspensionBase
            .recoleccionEntregaFirebaseId || "",
      };
    }

    const movimientosFirebase =
      await getTenantItems(
        ER_COLLECTION,
        tenantId
      );

    const entregasLocales = cargarEntregas();

    const nombreSuspension = `${
      suspensionBase.marca || ""
    } ${suspensionBase.modelo || ""}`.trim();

    const movimientoExistente =
      movimientosFirebase.find(
        (item) =>
          item.firebaseId ===
          suspensionBase
            .recoleccionEntregaFirebaseId
      ) ||
      movimientosFirebase.find(
        (item) =>
          String(item.suspensionId || "") ===
          String(suspensionBase.id || "")
      ) ||
      null;

    const movimientoBase = {
      id: movimientoExistente?.id || Date.now(),
      folio:
        movimientoExistente?.folio ||
        generarFolioEntrega(
          movimientosFirebase.length + 1
        ),

      modo: "programada",
      tipo: "Entrega",
      estado: "programada",
      fase: "simple",

      tipoItem: "suspension",
      origen: "suspension",
      suspensionId: suspensionBase.id,
      suspensionFirebaseId:
        suspensionBase.firebaseId || "",
      suspension: nombreSuspension,
      itemNombre: nombreSuspension,

      clienteId:
        suspensionBase.clienteId || "",
      bicicletaId: "",

      cliente: suspensionBase.cliente || "",
      telefono: suspensionBase.telefono || "",
      bicicleta: "",
      direccion: suspensionBase.direccion || "",
      googleMaps:
        suspensionBase.googleMaps || "",

      fechaProgramada:
        suspensionBase
          .fechaEntregaDomicilio || "",
      horaProgramada: "",

      observaciones: `Entrega a domicilio vinculada a suspensión ${suspensionBase.folio}`,
      observacionesEntrega: "",

      fotosRecoleccion:
        movimientoExistente?.fotosRecoleccion || {
          lateral1: "",
          lateral2: "",
        },

      fotosEntrega:
        movimientoExistente?.fotosEntrega || {
          lateral1: "",
          lateral2: "",
        },

      firmaRecoleccion:
        movimientoExistente?.firmaRecoleccion ||
        "",

      firmaEntrega:
        movimientoExistente?.firmaEntrega || "",

      fechaCreacion:
        movimientoExistente?.fechaCreacion ||
        fechaActual(),

      horaCreacion:
        movimientoExistente?.horaCreacion ||
        horaActual(),
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
        firebaseId:
          movimientoExistente.firebaseId,
      };
    } else {
      const ref = await addTenantItem(
        ER_COLLECTION,
        movimientoBase,
        tenantId
      );

      movimientoFinal = {
        ...movimientoBase,
        firebaseId: ref.id,
      };
    }

    const localesActualizados = [
      movimientoFinal,
      ...entregasLocales.filter(
        (item) =>
          String(item.id) !==
            String(movimientoFinal.id) &&
          String(item.suspensionId || "") !==
            String(suspensionBase.id || "")
      ),
    ];

    guardarEntregas(localesActualizados);

    return {
      movimientoId: movimientoFinal.id,
      movimientoFirebaseId:
        movimientoFinal.firebaseId,
    };
  };

  const cancelarSuspension = async (item) => {
    const confirmar = window.confirm(
      "¿Cancelar esta suspensión?"
    );

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
      console.error(
        "Error cancelando suspensión:",
        error
      );

      alert(
        "No se pudo cancelar la suspensión."
      );
    }
  };

  const reabrirSuspension = async (item) => {
    const confirmar = window.confirm(
      "¿Reabrir esta suspensión?"
    );

    if (!confirmar) return;

    try {
      const actualizada =
        await guardarEnFirebase({
          ...item,
          estado: "abierta",
          fechaReapertura: fechaActual(),
          horaReapertura: horaActual(),
        });

      setSeleccionada(actualizada);
      setVista("activas");
      alert("Suspensión reabierta.");
    } catch (error) {
      console.error(
        "Error reabriendo suspensión:",
        error
      );

      alert(
        "No se pudo reabrir la suspensión."
      );
    }
  };

  const actualizarCampo = (campo, valor) => {
    actualizarLocal({
      ...seleccionada,
      [campo]: valor,
    });
  };

  const guardarAvance = async () => {
    if (guardando || procesandoFotos) return;

    setGuardando(true);

    try {
      const conFotos =
        await sincronizarFotos(seleccionada);

      const entrega =
        await crearEntregaDomicilio(conFotos);

      await guardarEnFirebase({
        ...conFotos,
        estado: conFotos.estado || "abierta",
        recoleccionEntregaId:
          entrega.movimientoId ||
          conFotos.recoleccionEntregaId ||
          "",
        recoleccionEntregaFirebaseId:
          entrega.movimientoFirebaseId ||
          conFotos
            .recoleccionEntregaFirebaseId ||
          "",
        fechaUltimaEdicion: fechaActual(),
        horaUltimaEdicion: horaActual(),
        total: totalSuspension(conFotos),
      });

      alert("Avance guardado.");
    } catch (error) {
      console.error(
        "Error guardando suspensión:",
        error
      );

      alert(
        "No se pudo guardar la suspensión."
      );
    } finally {
      setGuardando(false);
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
          descripcion:
            nuevoConcepto.descripcion,
          cantidad: Number(
            nuevoConcepto.cantidad || 1
          ),
          precio: Number(
            nuevoConcepto.precio || 0
          ),
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
      conceptos: (
        seleccionada.conceptos || []
      ).filter((item) => item.id !== id),
    });
  };

  const cargarFotosSuspension = async (
    grupo,
    archivos
  ) => {
    const actuales =
      seleccionada?.[grupo] || [];

    const disponibles =
      MAX_FOTOS_POR_GRUPO - actuales.length;

    if (disponibles <= 0) {
      alert(
        `Sólo se permiten ${MAX_FOTOS_POR_GRUPO} fotografías en esta sección.`
      );
      return;
    }

    const files = Array.from(
      archivos || []
    ).slice(0, disponibles);

    if (files.length === 0) return;

    setProcesandoFotos(true);

    try {
      const nuevas = [];

      for (const archivo of files) {
        const src =
          await comprimirArchivoImagen(archivo);

        const guardada =
          await crearFotoSuspension({
            tenantId,
            suspensionFirebaseId:
              seleccionada.firebaseId,
            suspensionId: seleccionada.id,
            grupo,
            src,
            description: "",
          });

        nuevas.push(guardada);
      }

      actualizarLocal({
        ...seleccionada,
        [grupo]: [...actuales, ...nuevas],
      });
    } catch (error) {
      console.error(
        "Error cargando fotografías:",
        error
      );

      alert(
        "No se pudieron agregar las fotografías. Intenta seleccionar menos imágenes."
      );
    } finally {
      setProcesandoFotos(false);
    }
  };

  const eliminarFotoSuspension = async (
    grupo,
    id
  ) => {
    const foto = (
      seleccionada[grupo] || []
    ).find(
      (item) => String(item.id) === String(id)
    );

    try {
      if (foto?.firebaseId) {
        await eliminarFotoSuspensionFirestore({
          tenantId,
          firebaseId: foto.firebaseId,
        });
      }

      actualizarLocal({
        ...seleccionada,
        [grupo]: (
          seleccionada[grupo] || []
        ).filter(
          (item) =>
            String(item.id) !== String(id)
        ),
      });
    } catch (error) {
      console.error(
        "Error eliminando fotografía:",
        error
      );

      alert(
        "No se pudo eliminar la fotografía."
      );
    }
  };

  const actualizarDescripcionFotoSuspension = (
    grupo,
    id,
    description
  ) => {
    actualizarLocal({
      ...seleccionada,
      [grupo]: (
        seleccionada[grupo] || []
      ).map((foto) =>
        String(foto.id) === String(id)
          ? {
              ...foto,
              description,
            }
          : foto
      ),
    });
  };

  const guardarFotoEditadaSuspension = async (
    fotoActualizada
  ) => {
    setProcesandoFotos(true);

    try {
      const grupo = fotoActualizada.grupo;

      const srcOriginal =
        fotoActualizada.annotatedSrc ||
        fotoActualizada.src ||
        fotoActualizada.originalSrc;

      const src =
        await comprimirDataUrlImagen(srcOriginal);

      const guardada =
        await actualizarFotoSuspension({
          tenantId,
          foto: {
            ...fotoActualizada,
            src,
            originalSrc: src,
            annotatedSrc: src,
          },
          suspensionFirebaseId:
            seleccionada.firebaseId,
          suspensionId: seleccionada.id,
          grupo,
        });

      actualizarLocal({
        ...seleccionada,
        [grupo]: (
          seleccionada[grupo] || []
        ).map((foto) =>
          String(foto.id) ===
          String(guardada.id)
            ? guardada
            : foto
        ),
      });

      setFotoEditando(null);
    } catch (error) {
      console.error(
        "Error guardando anotación:",
        error
      );

      alert(
        "No se pudo guardar la anotación."
      );
    } finally {
      setProcesandoFotos(false);
    }
  };

  const descargarPDF = async () => {
    if (guardando || procesandoFotos) return;

    setGuardando(true);

    try {
      const conFotos =
        await sincronizarFotos(seleccionada);

      const entrega =
        await crearEntregaDomicilio(conFotos);

      const actualizada = {
        ...conFotos,
        estado: "cerrada",
        total: totalSuspension(conFotos),
        recoleccionEntregaId:
          entrega.movimientoId ||
          conFotos.recoleccionEntregaId ||
          "",
        recoleccionEntregaFirebaseId:
          entrega.movimientoFirebaseId ||
          conFotos
            .recoleccionEntregaFirebaseId ||
          "",
        fechaCierre: fechaActual(),
        horaCierre: horaActual(),
      };

      const final =
        await guardarEnFirebase(actualizada);

      await generarPDFSuspension({
        suspension: final,
        nombreArchivo: `${final.folio}-suspension.pdf`,
      });

      setVista("historial");

      alert(
        "PDF generado y suspensión guardada."
      );
    } catch (error) {
      console.error(
        "Error generando PDF:",
        error
      );

      alert(
        "No se pudo generar o guardar la suspensión."
      );
    } finally {
      setGuardando(false);
    }
  };

  const renderEditorFotos = (
    grupo,
    titulo
  ) => {
    const fotos = seleccionada?.[grupo] || [];
    const estaCerrada =
      !esSuspensionActiva(seleccionada);

    return (
      <section className="form-section">
        <h3>{titulo}</h3>

        {!estaCerrada && (
          <>
            <label className="sus-upload">
              {procesandoFotos
                ? "Procesando fotografías..."
                : "+ Agregar fotos"}

              <input
                type="file"
                accept="image/*"
                multiple
                disabled={
                  procesandoFotos || guardando
                }
                onChange={(event) => {
                  cargarFotosSuspension(
                    grupo,
                    event.target.files
                  );

                  event.target.value = "";
                }}
              />
            </label>

            <p className="form-note">
              Máximo {MAX_FOTOS_POR_GRUPO} fotografías.
            </p>
          </>
        )}

        {fotos.length === 0 && (
          <p className="form-note">
            No hay fotos registradas.
          </p>
        )}

        <div className="sus-live-photo-grid">
          {fotos.map((foto) => (
            <article
              className="sus-live-photo-card"
              key={
                foto.firebaseId ||
                foto.id
              }
            >
              <img
                src={
                  foto.src ||
                  foto.annotatedSrc ||
                  foto.originalSrc
                }
                alt={titulo}
              />

              <textarea
                placeholder="Nota de la foto..."
                disabled={estaCerrada}
                value={foto.description || ""}
                onChange={(event) =>
                  actualizarDescripcionFotoSuspension(
                    grupo,
                    foto.id,
                    event.target.value
                  )
                }
              />

              {!estaCerrada && (
                <div className="sus-photo-actions">
                  <button
                    type="button"
                    disabled={
                      procesandoFotos ||
                      guardando
                    }
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
                    disabled={
                      procesandoFotos ||
                      guardando
                    }
                    onClick={() =>
                      eliminarFotoSuspension(
                        grupo,
                        foto.id
                      )
                    }
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
          <p>
            Recepción, servicio, evidencia, costos y PDF.
          </p>
        </div>
      </div>

      <div className="search-box">
        <input
          value={search}
          placeholder="Buscar por cliente, folio, marca, modelo o serie..."
          onChange={(event) =>
            setSearch(event.target.value)
          }
        />
      </div>

      <div className="sus-tabs">
        <button
          type="button"
          className={
            vista === "activas" ? "active" : ""
          }
          onClick={() => setVista("activas")}
        >
          Activas
        </button>

        <button
          type="button"
          className={
            vista === "historial"
              ? "active"
              : ""
          }
          onClick={() => setVista("historial")}
        >
          Historial
        </button>
      </div>

      {cargando && (
        <div className="empty-state">
          Cargando suspensiones...
        </div>
      )}

      {!cargando &&
        listaVisible.length > 0 && (
          <div className="sus-grid">
            {listaVisible.map((item) => {
              const estado = normalizarEstado(
                item.estado
              );

              const esActiva =
                esSuspensionActiva(item);

              return (
                <article
                  className="sus-card"
                  key={
                    item.firebaseId ||
                    item.id ||
                    item.folio
                  }
                >
                  <div className="sus-card-top">
                    <span>{item.folio}</span>

                    <strong
                      className={`sus-status ${estado}`}
                    >
                      {item.estado || "abierta"}
                    </strong>
                  </div>

                  <h3>{item.cliente}</h3>

                  <p>
                    {item.marca} {item.modelo}
                  </p>

                  <p className="sus-small">
                    {item.fechaCreacion} ·{" "}
                    {item.tipoSuspension}
                  </p>

                  <div className="sus-card-total">
                    $
                    {totalSuspension(
                      item
                    ).toFixed(2)}
                  </div>

                  <div className="sus-card-actions">
                    <button
                      type="button"
                      onClick={() =>
                        setSeleccionada(item)
                      }
                    >
                      Abrir
                    </button>

                    {esActiva ? (
                      <button
                        type="button"
                        className="cancel-service-button"
                        onClick={() =>
                          cancelarSuspension(item)
                        }
                      >
                        Cancelar
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="reopen-button"
                        onClick={() =>
                          reabrirSuspension(item)
                        }
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

      {!cargando &&
        listaVisible.length === 0 && (
          <div className="empty-state">
            {vista === "activas"
              ? "No hay suspensiones activas."
              : "No hay suspensiones en historial."}
          </div>
        )}

      <button
        className="floating-action"
        onClick={() => setModalOpen(true)}
      >
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
                  {seleccionada.cliente} ·{" "}
                  {seleccionada.marca}{" "}
                  {seleccionada.modelo}
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() =>
                  setSeleccionada(null)
                }
              >
                ×
              </button>
            </div>

            {esSuspensionActiva(
              seleccionada
            ) && (
              <>
                <section className="form-section">
                  <h3>Editar recepción</h3>

                  <div className="form-grid">
                    {[
                      ["cliente", "Cliente"],
                      ["telefono", "Teléfono"],
                      [
                        "marca",
                        "Marca suspensión",
                      ],
                      [
                        "modelo",
                        "Modelo suspensión",
                      ],
                      ["numeroSerie", "Serie"],
                      ["identificador", "ID"],
                      ["color", "Color"],
                      ["tipo", "Tipo"],
                      ["acabado", "Acabado"],
                      ["bloqueo", "Bloqueo"],
                      ["rebote", "Rebote"],
                      ["tubo", "Tubo"],
                      [
                        "ejeMontura",
                        "Eje / montura",
                      ],
                      [
                        "rodada",
                        "Rodada / medida",
                      ],
                      [
                        "psiAntes",
                        "PSI antes",
                      ],
                      [
                        "bloqueoAntes",
                        "Bloqueo funcionando antes",
                      ],
                      [
                        "reboteAntes",
                        "Rebote funcionando antes",
                      ],
                    ].map(
                      ([campo, label]) => (
                        <label key={campo}>
                          {label}

                          <input
                            value={
                              seleccionada[
                                campo
                              ] || ""
                            }
                            onChange={(event) =>
                              actualizarCampo(
                                campo,
                                event.target
                                  .value
                              )
                            }
                          />
                        </label>
                      )
                    )}
                  </div>

                  <label className="full-label">
                    Detalles antes del mantenimiento

                    <textarea
                      value={
                        seleccionada.detallesAntes ||
                        ""
                      }
                      onChange={(event) =>
                        actualizarCampo(
                          "detallesAntes",
                          event.target.value
                        )
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

                {renderEditorFotos(
                  "fotosDanos",
                  "Marcas o daños al recibir"
                )}

                <section className="form-section">
                  <h3>
                    Servicio de suspensión
                  </h3>

                  <label className="full-label">
                    Tipo de mantenimiento

                    <textarea
                      value={
                        seleccionada.tipoMantenimiento ||
                        ""
                      }
                      onChange={(event) =>
                        actualizarCampo(
                          "tipoMantenimiento",
                          event.target.value
                        )
                      }
                    />
                  </label>

                  <label className="full-label">
                    Insumos y kits utilizados

                    <textarea
                      value={
                        seleccionada.insumos ||
                        ""
                      }
                      onChange={(event) =>
                        actualizarCampo(
                          "insumos",
                          event.target.value
                        )
                      }
                    />
                  </label>

                  <label className="full-label">
                    Observaciones después del mantenimiento

                    <textarea
                      value={
                        seleccionada.observacionesFinales ||
                        ""
                      }
                      onChange={(event) =>
                        actualizarCampo(
                          "observacionesFinales",
                          event.target.value
                        )
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
                      value={
                        nuevoConcepto.descripcion
                      }
                      onChange={(event) =>
                        setNuevoConcepto({
                          ...nuevoConcepto,
                          descripcion:
                            event.target.value,
                        })
                      }
                    />

                    <input
                      type="number"
                      placeholder="Cantidad"
                      value={
                        nuevoConcepto.cantidad
                      }
                      onChange={(event) =>
                        setNuevoConcepto({
                          ...nuevoConcepto,
                          cantidad:
                            event.target.value,
                        })
                      }
                    />

                    <input
                      type="number"
                      placeholder="Precio"
                      value={
                        nuevoConcepto.precio
                      }
                      onChange={(event) =>
                        setNuevoConcepto({
                          ...nuevoConcepto,
                          precio:
                            event.target.value,
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
                    {(
                      seleccionada.conceptos ||
                      []
                    ).map((item) => (
                      <div
                        className="sus-inline-concept-row"
                        key={item.id}
                      >
                        <span>
                          {item.descripcion}
                        </span>

                        <span>
                          {item.cantidad}
                        </span>

                        <span>
                          $
                          {Number(
                            item.precio || 0
                          ).toFixed(2)}
                        </span>

                        <strong>
                          $
                          {(
                            Number(
                              item.cantidad ||
                                0
                            ) *
                            Number(
                              item.precio || 0
                            )
                          ).toFixed(2)}
                        </strong>

                        <button
                          type="button"
                          className="cancel-service-button"
                          onClick={() =>
                            eliminarConcepto(
                              item.id
                            )
                          }
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="form-section">
                  <h3>
                    Entrega a domicilio
                  </h3>

                  <label className="check-item">
                    <input
                      type="checkbox"
                      checked={
                        seleccionada.entregaDomicilio ||
                        false
                      }
                      onChange={(event) =>
                        actualizarCampo(
                          "entregaDomicilio",
                          event.target.checked
                        )
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
                          value={
                            seleccionada.fechaEntregaDomicilio ||
                            ""
                          }
                          onChange={(event) =>
                            actualizarCampo(
                              "fechaEntregaDomicilio",
                              event.target.value
                            )
                          }
                        />
                      </label>
                    </div>
                  )}
                </section>
              </>
            )}

            {!esSuspensionActiva(
              seleccionada
            ) && (
              <div className="empty-state">
                Esta suspensión está en historial.
                Puedes descargar su PDF o reabrirla
                desde la tarjeta del historial.
              </div>
            )}

            <SuspensionReceipt
              suspension={seleccionada}
              receiptRef={receiptRef}
            />

            <div className="sus-actions">
              {esSuspensionActiva(
                seleccionada
              ) && (
                <>
                  <button
                    className="secondary-button"
                    onClick={guardarAvance}
                    disabled={
                      guardando ||
                      procesandoFotos
                    }
                  >
                    {guardando
                      ? "Guardando..."
                      : "Guardar"}
                  </button>

                  <button
                    className="secondary-button"
                    disabled={
                      guardando ||
                      procesandoFotos
                    }
                    onClick={() =>
                      setFirmaModal(true)
                    }
                  >
                    Firma opcional
                  </button>

                  <button
                    className="cancel-service-button"
                    disabled={
                      guardando ||
                      procesandoFotos
                    }
                    onClick={() =>
                      cancelarSuspension(
                        seleccionada
                      )
                    }
                  >
                    Cancelar suspensión
                  </button>
                </>
              )}

              {!esSuspensionActiva(
                seleccionada
              ) && (
                <button
                  className="reopen-button"
                  onClick={() =>
                    reabrirSuspension(
                      seleccionada
                    )
                  }
                >
                  Reabrir suspensión
                </button>
              )}

              <button
                className="primary-button"
                onClick={descargarPDF}
                disabled={
                  guardando ||
                  procesandoFotos
                }
              >
                {guardando
                  ? "Generando..."
                  : "Descargar PDF y guardar"}
              </button>
            </div>
          </div>

          {firmaModal && (
            <SignatureModal
              title="Firma del cliente"
              onClose={() =>
                setFirmaModal(false)
              }
              onSave={(firma) => {
                actualizarLocal({
                  ...seleccionada,
                  firmaCliente: firma,
                });

                setFirmaModal(false);
              }}
            />
          )}

          {fotoEditando && (
            <ImageAnnotatorModal
              image={fotoEditando}
              onClose={() =>
                setFotoEditando(null)
              }
              onSave={
                guardarFotoEditadaSuspension
              }
            />
          )}
        </div>
      )}
    </section>
  );
}

export default Suspensiones;