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
  return `${bike.marca || ""} ${bike.modelo || ""} ${bike.color || ""}`.trim();
}

function NuevaSuspensionModal({ onClose, onCreate }) {
  const clientes = useMemo(() => cargarClientes(), []);
  const { tenantId } = useAuth();
  const [clienteId, setClienteId] = useState("");
  const [bicicletaId, setBicicletaId] = useState("");
  const [vieneConBicicleta, setVieneConBicicleta] = useState(false);

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

  const clienteActual = clientes.find((c) => String(c.id) === String(clienteId));
  const bicicletasCliente = clienteActual?.bicicletas || [];

  const actualizar = (campo, valor) => {
    setData((prev) => ({ ...prev, [campo]: valor }));
  };

  const seleccionarCliente = (id) => {
    setClienteId(id);
    setBicicletaId("");

    const cliente = clientes.find((item) => String(item.id) === String(id));
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

    const bike = bicicletasCliente.find((item) => String(item.id) === String(id));
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

          resolve(canvas.toDataURL("image/jpeg", 0.62));
        };

        img.onerror = reject;
        img.src = reader.result;
      };

      reader.onerror = reject;
      reader.readAsDataURL(archivo);
    });
  };

  const cargarFotos = async (grupo, archivos) => {
    const files = Array.from(archivos || []);

    for (const file of files) {
      const imagen = await comprimirImagen(file);

      setData((prev) => ({
        ...prev,
        [grupo]: [
          ...(prev[grupo] || []),
          {
            id: Date.now() + Math.random(),
            originalSrc: imagen,
            annotatedSrc: imagen,
            description: "",
          },
        ],
      }));
    }
  };

  const eliminarFoto = (grupo, id) => {
    setData((prev) => ({
      ...prev,
      [grupo]: (prev[grupo] || []).filter((foto) => foto.id !== id),
    }));
  };

  const actualizarDescripcionFoto = (grupo, id, description) => {
    setData((prev) => ({
      ...prev,
      [grupo]: (prev[grupo] || []).map((foto) =>
        foto.id === id ? { ...foto, description } : foto
      ),
    }));
  };

  const crear = async () => {
    if (!data.cliente.trim()) {
      alert("Falta el cliente.");
      return;
    }

    if (!data.marca.trim() || !data.modelo.trim()) {
      alert("Falta marca y modelo de la suspensión.");
      return;
    }
    const clienteGuardado = await crearOActualizarClienteDesdeModulo({
  tenantId,
  clienteId,
  nombre: data.cliente,
  telefono: data.telefono,
});

    onCreate({
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
  };

  const renderFotos = (grupo, titulo) => (
    <div className="sus-live-photo-section">
      <h4>{titulo}</h4>

      <label className="sus-upload">
        + Agregar fotos
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => cargarFotos(grupo, e.target.files)}
        />
      </label>

      <div className="sus-live-photo-grid">
        {(data[grupo] || []).map((foto) => (
          <article className="sus-live-photo-card" key={foto.id}>
            <img src={foto.annotatedSrc} alt={titulo} />

            <textarea
              placeholder="Nota de la foto..."
              value={foto.description}
              onChange={(e) =>
                actualizarDescripcionFoto(grupo, foto.id, e.target.value)
              }
            />

            <button onClick={() => eliminarFoto(grupo, foto.id)}>
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

          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <section className="form-section">
          <h3>Cliente</h3>

          <div className="form-grid">
            <label>
              Cliente existente
              <select value={clienteId} onChange={(e) => seleccionarCliente(e.target.value)}>
                <option value="">Selecciona o escribe abajo</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre} · {cliente.telefono}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Cliente
              <input value={data.cliente} onChange={(e) => actualizar("cliente", e.target.value)} />
            </label>

            <label>
              Teléfono
              <input value={data.telefono} onChange={(e) => actualizar("telefono", e.target.value)} />
            </label>
          </div>
        </section>

        <section className="form-section">
          <h3>Bicicleta recibida</h3>

          <label className="check-item">
            <input
              type="checkbox"
              checked={vieneConBicicleta}
              onChange={(e) => setVieneConBicicleta(e.target.checked)}
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
                    onChange={(e) => seleccionarBicicleta(e.target.value)}
                  >
                    <option value="">Selecciona o escribe manual</option>
                    {bicicletasCliente.map((bike) => (
                      <option key={bike.id} value={bike.id}>
                        {bike.marca} {bike.modelo} · {bike.color}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Marca
                  <input value={data.bikeMarca} onChange={(e) => actualizar("bikeMarca", e.target.value)} />
                </label>

                <label>
                  Modelo
                  <input value={data.bikeModelo} onChange={(e) => actualizar("bikeModelo", e.target.value)} />
                </label>

                <label>
                  Color
                  <input value={data.bikeColor} onChange={(e) => actualizar("bikeColor", e.target.value)} />
                </label>

                <label>
                  Rodada
                  <input value={data.bikeRodada} onChange={(e) => actualizar("bikeRodada", e.target.value)} />
                </label>

                <label className="full-width-field">
                  Accesorios recibidos
                  <input value={data.accesoriosBicicleta} onChange={(e) => actualizar("accesoriosBicicleta", e.target.value)} />
                </label>
              </div>

              {renderFotos("fotosBicicleta", "Fotos laterales de bicicleta")}
            </>
          )}
        </section>

        <section className="form-section">
          <h3>Datos de suspensión</h3>

          <div className="form-grid">
            <label>
              Tipo de suspensión
              <select value={data.tipoSuspension} onChange={(e) => actualizar("tipoSuspension", e.target.value)}>
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
              ["bloqueoAntes", "¿Bloqueo funcionando antes?"],
              ["reboteAntes", "¿Rebote funcionando antes?"],
            ].map(([campo, label]) => (
              <label key={campo}>
                {label}
                <input value={data[campo]} onChange={(e) => actualizar(campo, e.target.value)} />
              </label>
            ))}
          </div>
        </section>

        <section className="form-section">
          <h3>Recepción visual</h3>

          {renderFotos("fotosSuspensionRecepcion", "Fotos de suspensión al recibir")}
          {renderFotos("fotosDanos", "Marcas o daños al recibir")}

          <label className="full-label">
            Detalles antes del mantenimiento
            <textarea value={data.detallesAntes} onChange={(e) => actualizar("detallesAntes", e.target.value)} />
          </label>
        </section>

        <div className="sus-actions">
          <button className="secondary-button" onClick={onClose}>Cancelar</button>
          <button className="primary-button" onClick={crear}>Generar suspensión</button>
        </div>
      </div>
    </div>
  );
}

export default NuevaSuspensionModal;