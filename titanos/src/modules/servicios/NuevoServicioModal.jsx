import { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { crearOActualizarClienteDesdeModulo } from "../../utils/clientSync";

const CLIENTS_KEY = "titanos_clientes_v1";

function cargarClientes() {
  try {
    return JSON.parse(localStorage.getItem(CLIENTS_KEY)) || [];
  } catch {
    return [];
  }
}

function crearNombreBicicleta(bike) {
  return `${bike.marca || ""} ${bike.modelo || ""} ${bike.color || ""}`.trim();
}

function NuevoServicioModal({ onClose, onCreate }) {
  const { tenantId } = useAuth();

  const clientesIniciales = useMemo(() => cargarClientes(), []);
  const [clientes] = useState(clientesIniciales);

  const [tipoCliente, setTipoCliente] = useState("existente");
  const [clienteSeleccionado, setClienteSeleccionado] = useState("");
  const [bicicletaSeleccionada, setBicicletaSeleccionada] = useState("");

  const [clienteData, setClienteData] = useState({
    id: "",
    nombre: "",
    telefono: "",
    googleMaps: "",
    direccion: "",
  });

  const [bicicletaData, setBicicletaData] = useState({
    id: "",
    marca: "",
    modelo: "",
    color: "",
    tipo: "",
    rodada: "",
    material: "",
    numeroSerie: "",
    peso: "",
    transmision: "",
  });

  const [recepcionData, setRecepcionData] = useState({
    servicioSolicitado: "",
    accesorios: "",
    estadoMecanico: "",
  });

  const [fotosRecepcion, setFotosRecepcion] = useState({
    lateral1: "",
    lateral2: "",
  });

  const clienteActual = clientes.find(
    (cliente) => String(cliente.id) === String(clienteSeleccionado)
  );

  const bicicletasCliente = clienteActual?.bicicletas || [];

  const cambiarTipoCliente = (tipo) => {
    setTipoCliente(tipo);
    setClienteSeleccionado("");
    setBicicletaSeleccionada("");

    setClienteData({
      id: "",
      nombre: "",
      telefono: "",
      googleMaps: "",
      direccion: "",
    });

    setBicicletaData({
      id: "",
      marca: "",
      modelo: "",
      color: "",
      tipo: "",
      rodada: "",
      material: "",
      numeroSerie: "",
      peso: "",
      transmision: "",
    });
  };

  const seleccionarCliente = (id) => {
    setClienteSeleccionado(id);
    setBicicletaSeleccionada("");

    const cliente = clientes.find((item) => String(item.id) === String(id));
    if (!cliente) return;

    setClienteData({
      id: cliente.id,
      nombre: cliente.nombre || "",
      telefono: cliente.telefono || "",
      googleMaps: cliente.googleMaps || "",
      direccion: cliente.direccion || "",
    });

    setBicicletaData({
      id: "",
      marca: "",
      modelo: "",
      color: "",
      tipo: "",
      rodada: "",
      material: "",
      numeroSerie: "",
      peso: "",
      transmision: "",
    });
  };

  const seleccionarBicicleta = (id) => {
    setBicicletaSeleccionada(id);

    const bike = bicicletasCliente.find((item) => String(item.id) === String(id));
    if (!bike) return;

    setBicicletaData({
      id: bike.id || "",
      marca: bike.marca || "",
      modelo: bike.modelo || "",
      color: bike.color || "",
      tipo: bike.tipo || "",
      rodada: bike.rodada || "",
      material: bike.material || "",
      numeroSerie: bike.numeroSerie || "",
      peso: bike.peso || "",
      transmision: bike.transmision || "",
    });
  };

  const actualizarCliente = (campo, valor) => {
    setClienteData((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const actualizarBicicleta = (campo, valor) => {
    setBicicletaData((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const actualizarRecepcion = (campo, valor) => {
    setRecepcionData((prev) => ({
      ...prev,
      [campo]: valor,
    }));
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

          resolve(canvas.toDataURL("image/jpeg", 0.6));
        };

        img.onerror = reject;
        img.src = reader.result;
      };

      reader.onerror = reject;
      reader.readAsDataURL(archivo);
    });
  };

  const cargarFoto = async (campo, archivo) => {
    if (!archivo) return;

    try {
      const imagen = await comprimirImagen(archivo);

      setFotosRecepcion((prev) => ({
        ...prev,
        [campo]: imagen,
      }));
    } catch {
      alert("No se pudo cargar la foto. Intenta con otra imagen.");
    }
  };

  const crearServicio = async () => {
    if (!clienteData.nombre.trim()) {
      alert("Falta seleccionar o escribir el nombre del cliente.");
      return;
    }

    if (!recepcionData.servicioSolicitado.trim()) {
      alert("Falta capturar el servicio solicitado.");
      return;
    }

    if (!bicicletaData.marca.trim() && !bicicletaData.modelo.trim()) {
      alert("Falta capturar o seleccionar la bicicleta.");
      return;
    }

    try {
      const clienteGuardado = await crearOActualizarClienteDesdeModulo({
        tenantId,
        clienteId: clienteData.id || clienteSeleccionado || "",
        nombre: clienteData.nombre,
        telefono: clienteData.telefono,
        direccion: clienteData.direccion,
        googleMaps: clienteData.googleMaps,
        bicicleta: {
          id: bicicletaData.id || bicicletaSeleccionada || "",
          marca: bicicletaData.marca,
          modelo: bicicletaData.modelo,
          color: bicicletaData.color,
          tipo: bicicletaData.tipo,
          rodada: bicicletaData.rodada,
          material: bicicletaData.material,
          numeroSerie: bicicletaData.numeroSerie,
          peso: bicicletaData.peso,
          transmision: bicicletaData.transmision,
          notas: "",
        },
      });

      const bicicletaNombre =
        crearNombreBicicleta(bicicletaData) || "Bicicleta sin modelo";

      onCreate({
        clienteId: clienteGuardado.clienteId,
        bicicletaId: clienteGuardado.bicicletaId || bicicletaData.id || "",

        cliente: clienteData.nombre.trim(),
        telefono: clienteData.telefono.trim() || "Sin teléfono",
        googleMaps: clienteData.googleMaps || "",
        direccion: clienteData.direccion || "",

        bicicleta: bicicletaNombre,
        marca: bicicletaData.marca,
        modelo: bicicletaData.modelo,
        color: bicicletaData.color || "Sin color",
        tipo: bicicletaData.tipo,
        rodada: bicicletaData.rodada,
        material: bicicletaData.material,
        numeroSerie: bicicletaData.numeroSerie,
        peso: bicicletaData.peso,
        transmision: bicicletaData.transmision || "Sin registro",

        tipoServicio: recepcionData.servicioSolicitado,
        accesorios: recepcionData.accesorios || "Sin registro",
        estadoMecanico:
          recepcionData.estadoMecanico || "Sin observaciones de ingreso.",

        fotosRecepcion,

        conceptos: [],
        checklist: {},
        grasas: {},
        observacionesFinales: "",
        total: 0,
        entregaDomicilio: false,
        recoleccionEntregaId: "",
      });
    } catch (error) {
      console.error("Error creando cliente/servicio:", error);
      alert("No se pudo guardar el cliente o crear el servicio.");
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="service-modal">
        <div className="modal-header">
          <div>
            <h2>Nuevo servicio</h2>
            <p>Recepción inicial de bicicleta.</p>
          </div>

          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="form-section">
          <h3>Cliente</h3>

          <div className="client-toggle">
            <button
              type="button"
              className={tipoCliente === "existente" ? "active" : ""}
              onClick={() => cambiarTipoCliente("existente")}
            >
              Cliente existente
            </button>

            <button
              type="button"
              className={tipoCliente === "nuevo" ? "active" : ""}
              onClick={() => cambiarTipoCliente("nuevo")}
            >
              Cliente nuevo
            </button>
          </div>

          <div className="form-grid">
            {tipoCliente === "existente" && (
              <label>
                Seleccionar cliente
                <select
                  value={clienteSeleccionado}
                  onChange={(event) => seleccionarCliente(event.target.value)}
                >
                  <option value="">Selecciona un cliente</option>

                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre} · {cliente.telefono}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label>
              Nombre
              <input
                type="text"
                value={clienteData.nombre}
                readOnly={tipoCliente === "existente"}
                onChange={(event) => actualizarCliente("nombre", event.target.value)}
              />
            </label>

            <label>
              Teléfono
              <input
                type="tel"
                value={clienteData.telefono}
                readOnly={tipoCliente === "existente"}
                onChange={(event) => actualizarCliente("telefono", event.target.value)}
              />
            </label>

            <label>
              Google Maps
              <input
                type="text"
                value={clienteData.googleMaps}
                readOnly={tipoCliente === "existente"}
                placeholder="Sin ubicación registrada"
                onChange={(event) =>
                  actualizarCliente("googleMaps", event.target.value)
                }
              />
            </label>

            <label className="full-width-field">
              Dirección
              <input
                type="text"
                value={clienteData.direccion}
                readOnly={tipoCliente === "existente"}
                placeholder="Opcional"
                onChange={(event) => actualizarCliente("direccion", event.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="form-section">
          <h3>Bicicleta</h3>

          {tipoCliente === "existente" && (
            <div className="form-grid">
              <label className="full-width-field">
                Bicicleta registrada
                <select
                  value={bicicletaSeleccionada}
                  disabled={!clienteSeleccionado}
                  onChange={(event) => seleccionarBicicleta(event.target.value)}
                >
                  <option value="">Selecciona una bicicleta o captura una nueva</option>

                  {bicicletasCliente.map((bike) => (
                    <option key={bike.id} value={bike.id}>
                      {crearNombreBicicleta(bike) || "Bicicleta sin datos"} ·{" "}
                      {bike.rodada || "Sin rodada"}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <div className="form-grid">
            <label>
              Marca
              <input
                type="text"
                placeholder="Ej. Trek"
                value={bicicletaData.marca}
                onChange={(event) => actualizarBicicleta("marca", event.target.value)}
              />
            </label>

            <label>
              Modelo
              <input
                type="text"
                placeholder="Ej. Marlin 7"
                value={bicicletaData.modelo}
                onChange={(event) => actualizarBicicleta("modelo", event.target.value)}
              />
            </label>

            <label>
              Color
              <input
                type="text"
                placeholder="Ej. Roja"
                value={bicicletaData.color}
                onChange={(event) => actualizarBicicleta("color", event.target.value)}
              />
            </label>

            <label>
              Tipo
              <select
                value={bicicletaData.tipo}
                onChange={(event) => actualizarBicicleta("tipo", event.target.value)}
              >
                <option value="">Selecciona tipo</option>
                <option>MTB</option>
                <option>Ruta</option>
                <option>Gravel</option>
                <option>Urbana</option>
                <option>Eléctrica</option>
                <option>Infantil</option>
                <option>Otro</option>
              </select>
            </label>

            <label>
              Rodada
              <select
                value={bicicletaData.rodada}
                onChange={(event) => actualizarBicicleta("rodada", event.target.value)}
              >
                <option value="">Selecciona rodada</option>
                <option>12</option>
                <option>16</option>
                <option>20</option>
                <option>24</option>
                <option>26</option>
                <option>27.5</option>
                <option>29</option>
                <option>700c</option>
                <option>Otro</option>
              </select>
            </label>

            <label>
              Material
              <select
                value={bicicletaData.material}
                onChange={(event) =>
                  actualizarBicicleta("material", event.target.value)
                }
              >
                <option value="">Selecciona material</option>
                <option>Aluminio</option>
                <option>Carbono</option>
                <option>Acero</option>
                <option>Titanio</option>
                <option>Otro</option>
              </select>
            </label>

            <label>
              Número de serie
              <input
                type="text"
                placeholder="Opcional"
                value={bicicletaData.numeroSerie}
                onChange={(event) =>
                  actualizarBicicleta("numeroSerie", event.target.value)
                }
              />
            </label>

            <label>
              Peso
              <input
                type="text"
                placeholder="Opcional"
                value={bicicletaData.peso}
                onChange={(event) => actualizarBicicleta("peso", event.target.value)}
              />
            </label>

            <label className="full-width-field">
              Transmisión
              <input
                type="text"
                placeholder="Ej. Shimano Deore 1x12"
                value={bicicletaData.transmision}
                onChange={(event) =>
                  actualizarBicicleta("transmision", event.target.value)
                }
              />
            </label>
          </div>
        </div>

        <div className="form-section">
          <h3>Recepción</h3>

          <div className="form-grid">
            <label>
              Servicio solicitado
              <input
                type="text"
                placeholder="Ej. Servicio general"
                value={recepcionData.servicioSolicitado}
                onChange={(event) =>
                  actualizarRecepcion("servicioSolicitado", event.target.value)
                }
              />
            </label>

            <label className="full-width-field">
              Accesorios de la bicicleta recibidos
              <input
                type="text"
                placeholder="Luces, sensores, ánforas, pedales..."
                value={recepcionData.accesorios}
                onChange={(event) =>
                  actualizarRecepcion("accesorios", event.target.value)
                }
              />
            </label>
          </div>

          <div className="photo-grid reception-photo-grid">
            <label className="photo-upload-box">
              {fotosRecepcion.lateral1 ? (
                <img src={fotosRecepcion.lateral1} alt="Lateral 1" />
              ) : (
                <span>Foto lateral 1</span>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={(event) => cargarFoto("lateral1", event.target.files?.[0])}
              />
            </label>

            <label className="photo-upload-box">
              {fotosRecepcion.lateral2 ? (
                <img src={fotosRecepcion.lateral2} alt="Lateral 2" />
              ) : (
                <span>Foto lateral 2</span>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={(event) => cargarFoto("lateral2", event.target.files?.[0])}
              />
            </label>
          </div>

          <label className="full-label">
            Estado mecánico de ingreso
            <textarea
              placeholder="Describe cómo llega mecánicamente la bicicleta..."
              value={recepcionData.estadoMecanico}
              onChange={(event) =>
                actualizarRecepcion("estadoMecanico", event.target.value)
              }
            />
          </label>
        </div>

        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>
            Cancelar
          </button>

          <button className="primary-button" onClick={crearServicio}>
            Crear servicio
          </button>
        </div>
      </div>
    </div>
  );
}

export default NuevoServicioModal;