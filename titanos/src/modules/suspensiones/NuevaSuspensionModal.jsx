import { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { crearOActualizarClienteDesdeModulo } from "../../utils/clientSync";
import { comprimirArchivoImagen } from "../../utils/suspensionImageFirestore";

const CLIENTS_KEY = "titanos_clientes_v1";
const MAX_FOTOS_POR_GRUPO = 6;

function cargarClientes() {
  try {
    return JSON.parse(localStorage.getItem(CLIENTS_KEY)) || [];
  } catch {
    return [];
  }
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

function crearNombreBicicleta(bike) {
  return `${bike.marca || ""} ${bike.modelo || ""} ${
    bike.color || ""
  }`.trim();
}

function crearIdFoto() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function NuevaSuspensionModal({ onClose, onCreate }) {
  const clientes = useMemo(() => cargarClientes(), []);
  const { tenantId } = useAuth();

  const [clienteId, setClienteId] = useState("");
  const [bicicletaId, setBicicletaId] = useState("");
  const [vieneConBicicleta, setVieneConBicicleta] = useState(false);
  const [procesandoFotos, setProcesandoFotos] = useState(false);
  const [creando, setCreando] = useState(false);

  const [data, setData] = useState({
    cliente: "",
    telefono: "",

    bicicleta: "",
    bikeMarca: "",
    bikeModelo: "",
    bikeColor: "",
    bikeRodada: "",
    accesoriosBicicleta: "",

    tipoSuspension: "Suspensión delantera",
    marca: "",
    modelo: "",
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

    detallesAntes: "",

    fotosBicicleta: [],
    fotosSuspensionRecepcion: [],
    fotosDanos: [],
  });

  const clienteActual = clientes.find(
    (cliente) => String(cliente.id) === String(clienteId)
  );

  const bicicletasCliente = clienteActual?.bicicletas || [];

  const actualizar = (campo, valor) => {
    setData((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const seleccionarCliente = (id) => {
    setClienteId(id);
    setBicicletaId("");

    const cliente = clientes.find(
      (item) => String(item.id) === String(id)
    );

    if (!cliente) return;

    setData((prev) => ({
      ...prev,
      cliente: cliente.nombre || "",
      telefono: cliente.telefono || "",
      bicicleta: "",
      bikeMarca: "",
      bikeModelo: "",
      bikeColor: "",
      bikeRodada: "",
    }));
  };

  const seleccionarBicicleta = (id) => {
    setBicicletaId(id);

    const bike = bicicletasCliente.find(
      (item) => String(item.id) === String(id)
    );

    if (!bike) return;

    setData((prev) => ({
      ...prev,
      bicicleta: crearNombreBicicleta(bike),
      bikeMarca: bike.marca || "",
      bikeModelo: bike.modelo || "",
      bikeColor: bike.color || "",
      bikeRodada: bike.rodada || "",
    }));
  };

  const cargarFotos = async (grupo, archivos) => {
    const actuales = data[grupo] || [];
    const disponibles = MAX_FOTOS_POR_GRUPO - actuales.length;

    if (disponibles <= 0) {
      alert(
        `Sólo se permiten ${MAX_FOTOS_POR_GRUPO} fotografías en esta sección.`
      );
      return;
    }

    const files = Array.from(archivos || []).slice(0, disponibles);

    if (files.length === 0) return;

    setProcesandoFotos(true);

    try {
      const nuevas = [];

      for (const archivo of files) {
        const src = await comprimirArchivoImagen(archivo);

        nuevas.push({
          id: crearIdFoto(),
          src,
          originalSrc: src,
          annotatedSrc: src,
          description: "",
        });
      }

      setData((prev) => ({
        ...prev,
        [grupo]: [...(prev[grupo] || []), ...nuevas],
      }));
    } catch (error) {
      console.error("Error procesando fotografías:", error);
      alert(
        "No se pudo procesar una de las fotografías. Intenta agregar menos imágenes."
      );
    } finally {
      setProcesandoFotos(false);
    }
  };

  const eliminarFoto = (grupo, id) => {
    setData((prev) => ({
      ...prev,
      [grupo]: (prev[grupo] || []).filter(
        (foto) => String(foto.id) !== String(id)
      ),
    }));
  };

  const actualizarDescripcionFoto = (
    grupo,
    id,
    description
  ) => {
    setData((prev) => ({
      ...prev,
      [grupo]: (prev[grupo] || []).map((foto) =>
        String(foto.id) === String(id)
          ? {
              ...foto,
              description,
            }
          : foto
      ),
    }));
  };

  const crear = async () => {
    if (creando || procesandoFotos) return;

    if (!data.cliente.trim()) {
      alert("Falta el cliente.");
      return;
    }

    if (!data.marca.trim() || !data.modelo.trim()) {
      alert("Falta marca y modelo de la suspensión.");
      return;
    }

    setCreando(true);

    try {
      const clienteGuardado =
        await crearOActualizarClienteDesdeModulo({
          tenantId,
          clienteId,
          nombre: data.cliente,
          telefono: data.telefono,
        });

      await onCreate({
        ...data,
        clienteId: clienteGuardado.clienteId,
        bicicletaId,
        vieneConBicicleta,
        estado: "abierta",
        fechaCreacion: fechaActual(),
        horaCreacion: horaActual(),
        conceptos: [],
        tipoMantenimiento: "",
        insumos: "",
        observacionesFinales: "",
        fotosEvidencia: [],
        firmaCliente: "",
        entregaDomicilio: false,
        fechaEntregaDomicilio: "",
        recoleccionEntregaId: "",
      });
    } catch (error) {
      console.error("Error creando suspensión:", error);
      alert("No se pudo generar la suspensión.");
    } finally {
      setCreando(false);
    }
  };

  const renderFotos = (grupo, titulo) => (
    <div className="sus-live-photo-section">
      <h4>{titulo}</h4>

      <label className="sus-upload">
        {procesandoFotos
          ? "Procesando fotografías..."
          : "+ Agregar fotos"}

        <input
          type="file"
          accept="image/*"
          multiple
          disabled={procesandoFotos || creando}
          onChange={(event) => {
            cargarFotos(grupo, event.target.files);
            event.target.value = "";
          }}
        />
      </label>

      <p className="form-note">
        Máximo {MAX_FOTOS_POR_GRUPO} fotografías por sección.
      </p>

      <div className="sus-live-photo-grid">
        {(data[grupo] || []).map((foto) => (
          <article
            className="sus-live-photo-card"
            key={foto.id}
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
              value={foto.description || ""}
              onChange={(event) =>
                actualizarDescripcionFoto(
                  grupo,
                  foto.id,
                  event.target.value
                )
              }
            />

            <button
              type="button"
              className="cancel-service-button"
              onClick={() => eliminarFoto(grupo, foto.id)}
            >
              Eliminar
            </button>
          </article>
        ))}
      </div>
    </div>
  );

  return (
    <div className="modal-backdrop">
      <div className="sus-modal">
        <div className="modal-header">
          <div>
            <h2>Nueva suspensión</h2>
            <p>Recepción inicial de suspensión.</p>
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <section className="form-section">
          <h3>Cliente</h3>

          <div className="form-grid">
            <label>
              Cliente existente
              <select
                value={clienteId}
                onChange={(event) =>
                  seleccionarCliente(event.target.value)
                }
              >
                <option value="">
                  Selecciona o escribe abajo
                </option>

                {clientes.map((cliente) => (
                  <option
                    key={cliente.id}
                    value={cliente.id}
                  >
                    {cliente.nombre} · {cliente.telefono}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Cliente
              <input
                value={data.cliente}
                onChange={(event) =>
                  actualizar("cliente", event.target.value)
                }
              />
            </label>

            <label>
              Teléfono
              <input
                value={data.telefono}
                onChange={(event) =>
                  actualizar("telefono", event.target.value)
                }
              />
            </label>
          </div>
        </section>

        <section className="form-section">
          <h3>Bicicleta recibida</h3>

          <label className="check-item">
            <input
              type="checkbox"
              checked={vieneConBicicleta}
              onChange={(event) =>
                setVieneConBicicleta(event.target.checked)
              }
            />
            Viene con bicicleta completa
          </label>

          {vieneConBicicleta && (
            <>
              <div className="form-grid">
                <label className="full-width-field">
                  Bicicleta registrada

                  <select
                    value={bicicletaId}
                    disabled={!clienteId}
                    onChange={(event) =>
                      seleccionarBicicleta(
                        event.target.value
                      )
                    }
                  >
                    <option value="">
                      Selecciona o escribe manual
                    </option>

                    {bicicletasCliente.map((bike) => (
                      <option
                        key={bike.id}
                        value={bike.id}
                      >
                        {bike.marca} {bike.modelo} ·{" "}
                        {bike.color}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Marca
                  <input
                    value={data.bikeMarca}
                    onChange={(event) =>
                      actualizar(
                        "bikeMarca",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label>
                  Modelo
                  <input
                    value={data.bikeModelo}
                    onChange={(event) =>
                      actualizar(
                        "bikeModelo",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label>
                  Color
                  <input
                    value={data.bikeColor}
                    onChange={(event) =>
                      actualizar(
                        "bikeColor",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label>
                  Rodada
                  <input
                    value={data.bikeRodada}
                    onChange={(event) =>
                      actualizar(
                        "bikeRodada",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="full-width-field">
                  Accesorios recibidos
                  <input
                    value={data.accesoriosBicicleta}
                    onChange={(event) =>
                      actualizar(
                        "accesoriosBicicleta",
                        event.target.value
                      )
                    }
                  />
                </label>
              </div>

              {renderFotos(
                "fotosBicicleta",
                "Fotos laterales de bicicleta"
              )}
            </>
          )}
        </section>

        <section className="form-section">
          <h3>Datos de suspensión</h3>

          <div className="form-grid">
            <label>
              Tipo de suspensión

              <select
                value={data.tipoSuspension}
                onChange={(event) =>
                  actualizar(
                    "tipoSuspension",
                    event.target.value
                  )
                }
              >
                <option>Suspensión delantera</option>
                <option>Suspensión trasera</option>
              </select>
            </label>

            {[
              ["marca", "Marca"],
              ["modelo", "Modelo"],
              ["numeroSerie", "Número de serie"],
              ["identificador", "ID"],
              ["color", "Color"],
              ["tipo", "Tipo"],
              ["acabado", "Acabado"],
              ["bloqueo", "Bloqueo"],
              ["rebote", "Rebote"],
              ["tubo", "Tubo"],
              ["ejeMontura", "Eje / Tipo de montura"],
              ["rodada", "Rodada / Medida"],
              ["psiAntes", "PSI antes del servicio"],
              [
                "bloqueoAntes",
                "¿Bloqueo funcionando antes?",
              ],
              [
                "reboteAntes",
                "¿Rebote funcionando antes?",
              ],
            ].map(([campo, label]) => (
              <label key={campo}>
                {label}

                <input
                  value={data[campo] || ""}
                  onChange={(event) =>
                    actualizar(campo, event.target.value)
                  }
                />
              </label>
            ))}
          </div>
        </section>

        <section className="form-section">
          <h3>Recepción visual</h3>

          {renderFotos(
            "fotosSuspensionRecepcion",
            "Fotos de suspensión al recibir"
          )}

          {renderFotos(
            "fotosDanos",
            "Marcas o daños al recibir"
          )}

          <label className="full-label">
            Detalles antes del mantenimiento

            <textarea
              value={data.detallesAntes}
              onChange={(event) =>
                actualizar(
                  "detallesAntes",
                  event.target.value
                )
              }
            />
          </label>
        </section>

        <div className="sus-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
            disabled={procesandoFotos || creando}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={crear}
            disabled={procesandoFotos || creando}
          >
            {creando
              ? "Guardando suspensión..."
              : procesandoFotos
              ? "Procesando fotos..."
              : "Generar suspensión"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NuevaSuspensionModal;