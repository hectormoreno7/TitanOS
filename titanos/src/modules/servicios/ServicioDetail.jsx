import { useMemo, useRef, useState } from "react";
import ImageAnnotatorModal from "./ImageAnnotatorModal";
import PreviewSection from "./PreviewSection";
import { generarPDFServicio } from "./pdfGenerator";

const ER_KEY = "titanos_recoleccion_entrega_v8";

const tiposGrasaPorPunto = {
  "Grasa de ensamble": ["Maxima Assembly"],
  "Trinquetes":[
    "Motorex 2000",
    "Ride it Smooth"
  ],
  "Grasa de ensamble de carbono-carbono": [
    "Carbono Finish Line",
    "Maxima Assembly",
  ],
};

const tiposGrasaGenerales = [
  "Maxima Waterproof",
  "Motorex 2000",
  "Ceramic Grease Finish Line",
  "WPL",
];

const puntosGrasa = [
  "Maza trasera (balines o baleros sellados)",
  "Trinquetes",
  "Centro / Bottom bracket",
  "Maza delantera",
  "Grasa de ensamble",
  "Grasa de ensamble de carbono-carbono",
  "Dirección",
  "Núcleo (mazas con balas)",
];

const checklistFinal = [
  "Frenos",
  "Llantas",
  "Cambios",
  "Rines",
  "Potencia",
  "Poste de asiento",
  "Aceite",
  "Torque de tornillería",
  "Prueba dinámica realizada por mecánico",
  "Bielas",
  "Ejes",
  "Pedales",
  "Rotores",
  "Silicon protector",
];

function cargarRecoleccionesEntregas() {
  try {
    return JSON.parse(localStorage.getItem(ER_KEY)) || [];
  } catch {
    return [];
  }
}

function guardarRecoleccionesEntregas(data) {
  localStorage.setItem(ER_KEY, JSON.stringify(data));
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

function ServicioDetail({ servicio, onClose, onUpdate }) {
  const previewRef = useRef(null);

  const [formData, setFormData] = useState({
    ...servicio,
    conceptos: servicio.conceptos || [],
  });

  const [editandoRecepcion, setEditandoRecepcion] = useState(false);
  const [mostrarPreview, setMostrarPreview] = useState(false);
  const [fotoEditando, setFotoEditando] = useState(null);

  const [evidencias, setEvidencias] = useState(servicio.evidencias || []);

  const [entregaDomicilio, setEntregaDomicilio] = useState(
    servicio.entregaDomicilio || false
  );

  const [fechaEntregaDomicilio, setFechaEntregaDomicilio] = useState(
    servicio.fechaEntregaDomicilio || ""
  );

  const [checklist, setChecklist] = useState(
    servicio.checklist ||
      checklistFinal.reduce((acc, item) => {
        acc[item] = false;
        return acc;
      }, {})
  );

  const [grasas, setGrasas] = useState(
    servicio.grasas ||
      puntosGrasa.reduce((acc, item) => {
        acc[item] = "";
        return acc;
      }, {})
  );

  const [mediciones, setMediciones] = useState(
    servicio.mediciones || {
      rotorDelantero: "",
      rotorTrasero: "",
      balatasDelanteras: "",
      balatasTraseras: "",
      cadena: "",
      lubricanteCadena: "",
    }
  );

  const [observacionesFinales, setObservacionesFinales] = useState(
    servicio.observacionesFinales || ""
  );

  const [nuevoConcepto, setNuevoConcepto] = useState({
    descripcion: "",
    cantidad: 1,
    precio: "",
  });

  const servicioFinalizado = formData.estado === "finalizado";

  const totalServicio = useMemo(() => {
    return (formData.conceptos || []).reduce((total, item) => {
      return total + Number(item.cantidad || 0) * Number(item.precio || 0);
    }, 0);
  }, [formData.conceptos]);

  const actualizarCampo = (campo, valor) => {
    setFormData((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const construirServicioActualizado = (extra = {}) => {
    return {
      ...formData,
      total: totalServicio,
      evidencias,
      checklist,
      grasas,
      mediciones,
      observacionesFinales,
      entregaDomicilio,
      fechaEntregaDomicilio,
      ...extra,
    };
  };

  const guardarAvance = () => {
    const actualizado = construirServicioActualizado();

    setFormData(actualizado);
    onUpdate(actualizado);
    alert("Avance guardado correctamente.");
  };

  const guardarCambiosRecepcion = () => {
    guardarAvance();
    setEditandoRecepcion(false);
  };

  const crearEntregaDomicilio = () => {
    if (!entregaDomicilio) return "";

    if (formData.recoleccionEntregaId) {
      return formData.recoleccionEntregaId;
    }

    const movimientos = cargarRecoleccionesEntregas();

    const nuevaEntrega = {
      id: Date.now(),
      folio: generarFolioEntrega(movimientos.length + 1),

      modo: "programada",
      tipo: "Entrega",
      estado: "programada",
      fase: "simple",

      clienteId: formData.clienteId || "",
      bicicletaId: formData.bicicletaId || "",

      cliente: formData.cliente || "",
      telefono: formData.telefono || "",
      bicicleta: formData.bicicleta || "",
      direccion: formData.direccion || "",
      googleMaps: formData.googleMaps || "",

      fechaProgramada: fechaEntregaDomicilio || "",
      horaProgramada: "",

      observaciones: `Entrega a domicilio vinculada al servicio ${formData.folio}`,
      observacionesEntrega: "",

      fotosRecoleccion: {
        lateral1: "",
        lateral2: "",
      },
      fotosEntrega: {
        lateral1: "",
        lateral2: "",
      },

      firmaRecoleccion: "",
      firmaEntrega: "",

      fechaCreacion: fechaActual(),
      horaCreacion: horaActual(),
    };

    guardarRecoleccionesEntregas([nuevaEntrega, ...movimientos]);

    return nuevaEntrega.id;
  };

  const finalizarServicio = () => {
    const confirmar = window.confirm(
      "¿Finalizar este servicio? Ya no aparecerá en servicios activos y quedará en historial."
    );

    if (!confirmar) return;

    const entregaId = crearEntregaDomicilio();

    const actualizado = construirServicioActualizado({
      estado: "finalizado",
      fechaEntrega: fechaActual(),
      recoleccionEntregaId: entregaId || formData.recoleccionEntregaId || "",
    });

    setFormData(actualizado);
    onUpdate(actualizado);

    if (entregaDomicilio) {
      alert("Servicio finalizado y entrega a domicilio agendada.");
    } else {
      alert("Servicio finalizado correctamente.");
    }

    onClose();
  };

  const comprimirImagen = (archivo) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const img = new Image();

        img.onload = () => {
          const maxWidth = 1000;
          const scale = Math.min(maxWidth / img.width, 1);

          const canvas = document.createElement("canvas");
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          resolve(canvas.toDataURL("image/jpeg", 0.65));
        };

        img.onerror = reject;
        img.src = reader.result;
      };

      reader.onerror = reject;
      reader.readAsDataURL(archivo);
    });
  };

  const agregarFotos = async (event) => {
    const files = Array.from(event.target.files || []);

    for (const file of files) {
      try {
        const imagenComprimida = await comprimirImagen(file);

        setEvidencias((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            originalSrc: imagenComprimida,
            annotatedSrc: imagenComprimida,
            description: "",
          },
        ]);
      } catch {
        alert("No se pudo cargar una imagen.");
      }
    }

    event.target.value = "";
  };

  const guardarFotoEditada = (fotoActualizada) => {
    setEvidencias((prev) =>
      prev.map((foto) =>
        foto.id === fotoActualizada.id ? fotoActualizada : foto
      )
    );

    setFotoEditando(null);
  };

  const eliminarFoto = (id) => {
    const confirmar = window.confirm("¿Eliminar esta fotografía?");
    if (!confirmar) return;

    setEvidencias((prev) => prev.filter((foto) => foto.id !== id));
  };

  const agregarConcepto = () => {
    if (!nuevoConcepto.descripcion.trim()) {
      alert("Falta la descripción del concepto.");
      return;
    }

    const concepto = {
      id: Date.now(),
      descripcion: nuevoConcepto.descripcion,
      cantidad: Number(nuevoConcepto.cantidad || 1),
      precio: Number(nuevoConcepto.precio || 0),
    };

    setFormData((prev) => ({
      ...prev,
      conceptos: [...(prev.conceptos || []), concepto],
    }));

    setNuevoConcepto({
      descripcion: "",
      cantidad: 1,
      precio: "",
    });
  };

  const eliminarConcepto = (id) => {
    setFormData((prev) => ({
      ...prev,
      conceptos: (prev.conceptos || []).filter((item) => item.id !== id),
    }));
  };

const descargarPDF = async () => {
  const confirmar = window.confirm(
    "¿Generar PDF y finalizar este servicio? El servicio pasará al historial."
  );

  if (!confirmar) return;

  const entregaId = crearEntregaDomicilio();

  const actualizado = construirServicioActualizado({
    estado: "finalizado",
    fechaEntrega: fechaActual(),
    horaEntrega: horaActual(),
    recoleccionEntregaId: entregaId || formData.recoleccionEntregaId || "",
  });

  setFormData(actualizado);
  await onUpdate(actualizado);

  await generarPDFServicio({
    formData: actualizado,
    evidencias,
    checklist,
    grasas,
    mediciones,
    observacionesFinales,
    firmaCliente: actualizado.firmaCliente || "",
    firmaTaller: actualizado.firmaTaller || "",
    totalServicio,
    nombreArchivo: `${actualizado.folio || "servicio"}-hoja-servicio.pdf`,
  });

  alert("PDF generado y servicio finalizado.");
  onClose();
};

  return (
    <div className="modal-backdrop">
      <div className="service-modal detail-modal">
        <div className="modal-header">
          <div>
            <h2>{formData.folio}</h2>
            <p>
              {formData.cliente} · {formData.bicicleta}
            </p>
          </div>

          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="service-detail-content">
          <section className="form-section">
            <div className="section-title-row">
              <h3>Recepción</h3>

              {!servicioFinalizado &&
                (!editandoRecepcion ? (
                  <button
                    className="secondary-button"
                    onClick={() => setEditandoRecepcion(true)}
                  >
                    Editar recepción
                  </button>
                ) : (
                  <button
                    className="primary-button"
                    onClick={guardarCambiosRecepcion}
                  >
                    Guardar recepción
                  </button>
                ))}
            </div>

            {!editandoRecepcion ? (
              <>
                <div className="detail-info-grid">
                  <p>
                    <strong>Cliente:</strong> {formData.cliente}
                  </p>
                  <p>
                    <strong>Teléfono:</strong> {formData.telefono}
                  </p>
                  <p>
                    <strong>Servicio:</strong> {formData.tipoServicio}
                  </p>
                  <p>
                    <strong>Accesorios de la bicicleta recibidos:</strong>{" "}
                    {formData.accesorios || "Sin registro"}
                  </p>
                  <p>
                    <strong>Transmisión:</strong>{" "}
                    {formData.transmision || "Sin registro"}
                  </p>
                  <p>
                    <strong>Fecha de ingreso:</strong> {formData.fechaIngreso}
                  </p>
                  <p className="full-width-field">
                    <strong>Estado mecánico:</strong>{" "}
                    {formData.estadoMecanico || "Sin registro"}
                  </p>
                </div>

                <div className="receipt-photo-grid compact-receipt-photos">
                  {formData.fotosRecepcion?.lateral1 && (
                    <div>
                      <img
                        src={formData.fotosRecepcion.lateral1}
                        alt="Foto lateral 1"
                      />
                      <span>Lateral 1</span>
                    </div>
                  )}

                  {formData.fotosRecepcion?.lateral2 && (
                    <div>
                      <img
                        src={formData.fotosRecepcion.lateral2}
                        alt="Foto lateral 2"
                      />
                      <span>Lateral 2</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="form-grid">
                <label>
                  Cliente
                  <input
                    value={formData.cliente || ""}
                    onChange={(e) => actualizarCampo("cliente", e.target.value)}
                  />
                </label>

                <label>
                  Teléfono
                  <input
                    value={formData.telefono || ""}
                    onChange={(e) =>
                      actualizarCampo("telefono", e.target.value)
                    }
                  />
                </label>

                <label>
                  Servicio solicitado
                  <input
                    value={formData.tipoServicio || ""}
                    onChange={(e) =>
                      actualizarCampo("tipoServicio", e.target.value)
                    }
                  />
                </label>

                <label>
                  Accesorios de la bicicleta recibidos
                  <input
                    value={formData.accesorios || ""}
                    onChange={(e) =>
                      actualizarCampo("accesorios", e.target.value)
                    }
                  />
                </label>

                <label>
                  Transmisión
                  <input
                    value={formData.transmision || ""}
                    onChange={(e) =>
                      actualizarCampo("transmision", e.target.value)
                    }
                  />
                </label>

                <label>
                  Marca
                  <input
                    value={formData.marca || ""}
                    onChange={(e) => actualizarCampo("marca", e.target.value)}
                  />
                </label>

                <label>
                  Modelo
                  <input
                    value={formData.modelo || ""}
                    onChange={(e) => actualizarCampo("modelo", e.target.value)}
                  />
                </label>

                <label>
                  Color
                  <input
                    value={formData.color || ""}
                    onChange={(e) => actualizarCampo("color", e.target.value)}
                  />
                </label>

                <label>
                  Rodada
                  <input
                    value={formData.rodada || ""}
                    onChange={(e) => actualizarCampo("rodada", e.target.value)}
                  />
                </label>

                <label>
                  Material
                  <input
                    value={formData.material || ""}
                    onChange={(e) =>
                      actualizarCampo("material", e.target.value)
                    }
                  />
                </label>

                <label>
                  Número de serie
                  <input
                    value={formData.numeroSerie || ""}
                    onChange={(e) =>
                      actualizarCampo("numeroSerie", e.target.value)
                    }
                  />
                </label>

                <label className="full-width-field">
                  Estado mecánico de ingreso
                  <textarea
                    value={formData.estadoMecanico || ""}
                    onChange={(e) =>
                      actualizarCampo("estadoMecanico", e.target.value)
                    }
                  />
                </label>
              </div>
            )}
          </section>

          <section className="form-section">
            <h3>Datos de bicicleta</h3>

            <div className="detail-info-grid">
              <p>
                <strong>Marca:</strong> {formData.marca || "Sin registro"}
              </p>
              <p>
                <strong>Modelo:</strong> {formData.modelo || "Sin registro"}
              </p>
              <p>
                <strong>Color:</strong> {formData.color || "Sin registro"}
              </p>
              <p>
                <strong>Tipo:</strong> {formData.tipo || "Sin registro"}
              </p>
              <p>
                <strong>Rodada:</strong> {formData.rodada || "Sin registro"}
              </p>
              <p>
                <strong>Material:</strong> {formData.material || "Sin registro"}
              </p>
              <p>
                <strong>Número de serie:</strong>{" "}
                {formData.numeroSerie || "Sin registro"}
              </p>
              <p>
                <strong>Peso:</strong> {formData.peso || "Sin registro"}
              </p>
            </div>
          </section>

          <section className="form-section">
            <h3>Evidencias fotográficas</h3>

            {!servicioFinalizado && (
              <label className="photo-upload-inline">
                + Agregar fotos
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={agregarFotos}
                />
              </label>
            )}

            <div className="evidence-grid">
              {evidencias.map((foto) => (
                <article className="evidence-card" key={foto.id}>
                  <img src={foto.annotatedSrc} alt="Evidencia del servicio" />

                  {foto.description && <p>{foto.description}</p>}

                  {!servicioFinalizado && (
                    <div className="evidence-actions">
                      <button onClick={() => setFotoEditando(foto)}>
                        Anotar
                      </button>
                      <button onClick={() => eliminarFoto(foto.id)}>
                        Eliminar
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>

            {evidencias.length === 0 && (
              <p className="form-note">Aún no hay fotografías agregadas.</p>
            )}
          </section>

          <section className="form-section">
            <h3>Checklist final</h3>

            <div className="checklist-grid">
              {checklistFinal.map((item) => (
                <label key={item} className="check-item">
                  <input
                    type="checkbox"
                    checked={checklist[item] || false}
                    disabled={servicioFinalizado}
                    onChange={(event) =>
                      setChecklist({
                        ...checklist,
                        [item]: event.target.checked,
                      })
                    }
                  />
                  {item}
                </label>
              ))}
            </div>
          </section>

          <section className="form-section">
            <h3>Mediciones y consumibles</h3>

            <div className="form-grid">
              <label>
                Rotor delantero (mm)
                <input
                  type="text"
                  value={mediciones.rotorDelantero}
                  disabled={servicioFinalizado}
                  onChange={(e) =>
                    setMediciones({
                      ...mediciones,
                      rotorDelantero: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                Rotor trasero (mm)
                <input
                  type="text"
                  value={mediciones.rotorTrasero}
                  disabled={servicioFinalizado}
                  onChange={(e) =>
                    setMediciones({
                      ...mediciones,
                      rotorTrasero: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                Balatas delanteras (%)
                <input
                  type="text"
                  value={mediciones.balatasDelanteras}
                  disabled={servicioFinalizado}
                  onChange={(e) =>
                    setMediciones({
                      ...mediciones,
                      balatasDelanteras: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                Balatas traseras (%)
                <input
                  type="text"
                  value={mediciones.balatasTraseras}
                  disabled={servicioFinalizado}
                  onChange={(e) =>
                    setMediciones({
                      ...mediciones,
                      balatasTraseras: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                Cadena
                <input
                  value={mediciones.cadena}
                  disabled={servicioFinalizado}
                  onChange={(e) =>
                    setMediciones({
                      ...mediciones,
                      cadena: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                Lubricante de cadena
                <input
                  value={mediciones.lubricanteCadena}
                  disabled={servicioFinalizado}
                  onChange={(e) =>
                    setMediciones({
                      ...mediciones,
                      lubricanteCadena: e.target.value,
                    })
                  }
                />
              </label>
            </div>
          </section>

          <section className="form-section">
            <h3>Grasas utilizadas</h3>

            <div className="grease-grid">
              {puntosGrasa.map((punto) => (
                <label key={punto} className="grease-item">
                  <span>{punto}</span>

                  <select
                    value={grasas[punto] || ""}
                    disabled={servicioFinalizado}
                    onChange={(event) =>
                      setGrasas({
                        ...grasas,
                        [punto]: event.target.value,
                      })
                    }
                  >
                    <option value="">No aplica / sin registro</option>
                    {(tiposGrasaPorPunto[punto] || tiposGrasaGenerales).map((grasa) => (
                      <option key={grasa} value={grasa}>
                        {grasa}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </section>

          <section className="form-section">
            <h3>Observaciones después del mantenimiento</h3>
            <textarea
              placeholder="Observaciones finales del mecánico..."
              value={observacionesFinales}
              disabled={servicioFinalizado}
              onChange={(event) => setObservacionesFinales(event.target.value)}
            />
          </section>

          <section className="form-section">
            <h3>Conceptos y costos</h3>

            {!servicioFinalizado && (
              <div className="concept-form">
                <input
                  type="text"
                  placeholder="Concepto o pieza"
                  value={nuevoConcepto.descripcion}
                  onChange={(event) =>
                    setNuevoConcepto({
                      ...nuevoConcepto,
                      descripcion: event.target.value,
                    })
                  }
                />

                <input
                  type="text"
                  placeholder="Cantidad"
                  value={nuevoConcepto.cantidad}
                  onChange={(event) =>
                    setNuevoConcepto({
                      ...nuevoConcepto,
                      cantidad: event.target.value,
                    })
                  }
                />

                <input
                  type="number"
                  placeholder="Precio"
                  value={nuevoConcepto.precio}
                  onChange={(event) =>
                    setNuevoConcepto({
                      ...nuevoConcepto,
                      precio: event.target.value,
                    })
                  }
                />

                <button className="primary-button" onClick={agregarConcepto}>
                  Agregar
                </button>
              </div>
            )}

            <div className="concept-list">
              {(formData.conceptos || []).length === 0 && (
                <p className="form-note">Aún no hay conceptos agregados.</p>
              )}

              {(formData.conceptos || []).map((item) => (
                <div className="concept-row" key={item.id}>
                  <span>{item.descripcion}</span>
                  <span>{item.cantidad}</span>
                  <span>${Number(item.precio).toFixed(2)}</span>
                  <strong>
                    ${(Number(item.cantidad) * Number(item.precio)).toFixed(2)}
                  </strong>

                  {!servicioFinalizado && (
                    <button onClick={() => eliminarConcepto(item.id)}>×</button>
                  )}
                </div>
              ))}
            </div>

            <div className="service-total">
              <span>Total del servicio</span>
              <strong>${Number(totalServicio).toFixed(2)}</strong>
            </div>
          </section>

          <section className="form-section">
            <h3>Entrega a domicilio</h3>

            <label className="check-item">
              <input
                type="checkbox"
                disabled={servicioFinalizado}
                checked={entregaDomicilio}
                onChange={(event) => setEntregaDomicilio(event.target.checked)}
              />
              Vincular con entrega a domicilio
            </label>

            {entregaDomicilio && (
              <div className="form-grid">
                <label>
                  Fecha de entrega
                  <input
                    type="date"
                    disabled={servicioFinalizado}
                    value={fechaEntregaDomicilio}
                    onChange={(event) =>
                      setFechaEntregaDomicilio(event.target.value)
                    }
                  />
                </label>
              </div>
            )}

            <div className="detail-actions-row">
              {!servicioFinalizado && (
                <>
                  <button className="secondary-button" onClick={guardarAvance}>
                    Guardar avance
                  </button>

                  <button className="danger-button" onClick={finalizarServicio}>
                    Finalizar servicio
                  </button>
                </>
              )}

              <button
                className="secondary-button"
                onClick={() => setMostrarPreview(!mostrarPreview)}
              >
                {mostrarPreview
                  ? "Ocultar previsualización"
                  : "Previsualizar hoja"}
              </button>

              <button className="primary-button" onClick={descargarPDF}>
                Descargar PDF
              </button>
            </div>
          </section>

<>
  <div className="hidden-pdf-preview">
    <PreviewSection
      previewRef={previewRef}
      formData={formData}
      evidencias={evidencias}
      checklist={checklist}
      grasas={grasas}
      mediciones={mediciones}
      observacionesFinales={observacionesFinales}
      totalServicio={totalServicio}
    />
  </div>

  {mostrarPreview && (
    <PreviewSection
      previewRef={null}
      formData={formData}
      evidencias={evidencias}
      checklist={checklist}
      grasas={grasas}
      mediciones={mediciones}
      observacionesFinales={observacionesFinales}
      totalServicio={totalServicio}
    />
  )}
</>
        </div>
      </div>

      {fotoEditando && (
        <ImageAnnotatorModal
          image={fotoEditando}
          onClose={() => setFotoEditando(null)}
          onSave={guardarFotoEditada}
        />
      )}
    </div>
  );
}

export default ServicioDetail;