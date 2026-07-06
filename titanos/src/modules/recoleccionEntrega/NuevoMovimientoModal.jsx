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

function NuevoMovimientoModal({ onClose, onCreate }) {
  const clientes = useMemo(() => cargarClientes(), []);
  const { tenantId } = useAuth();
  const [modo, setModo] = useState("momento");
  const [tipo, setTipo] = useState("Recolección");
  const [tipoItem, setTipoItem] = useState("bicicleta");
  const [clienteId, setClienteId] = useState("");
  const [bicicletaId, setBicicletaId] = useState("");

  const [formData, setFormData] = useState({
    cliente: "",
    telefono: "",
    direccion: "",
    googleMaps: "",
    bicicleta: "",
    suspension: "",
    fechaProgramada: "",
    horaProgramada: "",
    observaciones: "",
    fotosRecoleccion: {
      lateral1: "",
      lateral2: "",
    },
    fotosEntrega: {
      lateral1: "",
      lateral2: "",
    },
  });

  const clienteSeleccionado = clientes.find(
    (cliente) => String(cliente.id) === String(clienteId)
  );

  const bicicletasCliente = clienteSeleccionado?.bicicletas || [];

  const actualizarCampo = (campo, valor) => {
    setFormData((prev) => ({ ...prev, [campo]: valor }));
  };

  const seleccionarCliente = (id) => {
    setClienteId(id);
    setBicicletaId("");

    const cliente = clientes.find((item) => String(item.id) === String(id));
    if (!cliente) return;

    setFormData((prev) => ({
      ...prev,
      cliente: cliente.nombre || "",
      telefono: cliente.telefono || "",
      direccion: cliente.direccion || "",
      googleMaps: cliente.googleMaps || "",
      bicicleta: "",
      suspension: "",
    }));
  };

  const seleccionarBicicleta = (id) => {
    setBicicletaId(id);

    const bike = bicicletasCliente.find((item) => String(item.id) === String(id));
    if (!bike) return;

    const nombre = `${bike.marca || ""} ${bike.modelo || ""} ${bike.color || ""}`.trim();

    setFormData((prev) => ({
      ...prev,
      bicicleta: nombre,
    }));
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

      setFormData((prev) => ({
        ...prev,
        [grupo]: {
          ...prev[grupo],
          [campo]: imagen,
        },
      }));
    } catch {
      alert("No se pudo cargar la foto.");
    }
  };

  const requiereFotosRecoleccion =
    modo === "momento" &&
    (tipo === "Recolección" || tipo === "Recolección y entrega");

  const requiereFotosEntrega = modo === "momento" && tipo === "Entrega";

  const crearMovimiento = async () => {
    if (!formData.cliente.trim()) {
      alert("Falta el cliente.");
      return;
    }

    const itemNombre =
      tipoItem === "bicicleta" ? formData.bicicleta : formData.suspension;

    if (modo === "momento") {
      if (!itemNombre.trim()) {
        alert(
          tipoItem === "bicicleta"
            ? "Falta la bicicleta."
            : "Falta la suspensión."
        );
        return;
      }

      if (
        requiereFotosRecoleccion &&
        (!formData.fotosRecoleccion.lateral1 ||
          !formData.fotosRecoleccion.lateral2)
      ) {
        alert("Faltan las 2 fotos de recolección.");
        return;
      }

      if (
        requiereFotosEntrega &&
        (!formData.fotosEntrega.lateral1 || !formData.fotosEntrega.lateral2)
      ) {
        alert("Faltan las 2 fotos de entrega.");
        return;
      }
    }

    const clienteGuardado = await crearOActualizarClienteDesdeModulo({
  tenantId,
  clienteId,
  nombre: formData.cliente,
  telefono: formData.telefono,
  direccion: formData.direccion,
  googleMaps: formData.googleMaps,
});

    onCreate({
      modo,
      tipo,
      tipoItem,
      itemNombre,
      clienteId: clienteGuardado.clienteId,
      bicicletaId: tipoItem === "bicicleta" ? bicicletaId : "",
      ...formData,
      estado: modo === "programada" ? "programada" : "recibo",
      fase:
        tipo === "Recolección y entrega" && modo === "momento"
          ? "recoleccion"
          : "simple",
      fechaCreacion: fechaActual(),
      horaCreacion: horaActual(),
      firmaRecoleccion: "",
      firmaEntrega: "",
      servicioCreado: false,
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="er2-modal">
        <div className="modal-header">
          <div>
            <h2>Nueva recolección / entrega</h2>
            <p>Bicicleta o suspensión.</p>
          </div>

          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <section className="form-section">
          <h3>Modo</h3>

          <div className="er2-choice two">
            <button
              type="button"
              className={modo === "momento" ? "active" : ""}
              onClick={() => setModo("momento")}
            >
              Al momento
            </button>

            <button
              type="button"
              className={modo === "programada" ? "active" : ""}
              onClick={() => setModo("programada")}
            >
              Programada
            </button>
          </div>
        </section>

        <section className="form-section">
          <h3>Tipo de movimiento</h3>

          <div className="er2-choice three">
            {["Recolección", "Entrega", "Recolección y entrega"].map((item) => (
              <button
                type="button"
                key={item}
                className={tipo === item ? "active" : ""}
                onClick={() => setTipo(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="form-section">
          <h3>Artículo</h3>

          <div className="er2-choice two">
            <button
              type="button"
              className={tipoItem === "bicicleta" ? "active" : ""}
              onClick={() => setTipoItem("bicicleta")}
            >
              Bicicleta
            </button>

            <button
              type="button"
              className={tipoItem === "suspension" ? "active" : ""}
              onClick={() => setTipoItem("suspension")}
            >
              Suspensión
            </button>
          </div>
        </section>

        <section className="form-section">
          <h3>Cliente</h3>

          <div className="form-grid">
            <label>
              Cliente existente
              <select
                value={clienteId}
                onChange={(event) => seleccionarCliente(event.target.value)}
              >
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
              <input
                value={formData.cliente}
                onChange={(event) => actualizarCampo("cliente", event.target.value)}
              />
            </label>

            <label>
              Teléfono
              <input
                value={formData.telefono}
                onChange={(event) => actualizarCampo("telefono", event.target.value)}
              />
            </label>
          </div>
        </section>

        {tipoItem === "bicicleta" ? (
          <section className="form-section">
            <h3>Bicicleta</h3>

            <div className="form-grid">
              <label className="full-width-field">
                Bicicleta registrada
                <select
                  value={bicicletaId}
                  disabled={!clienteId}
                  onChange={(event) => seleccionarBicicleta(event.target.value)}
                >
                  <option value="">Selecciona o escribe abajo</option>

                  {bicicletasCliente.map((bike) => (
                    <option key={bike.id} value={bike.id}>
                      {bike.marca} {bike.modelo} · {bike.color}
                    </option>
                  ))}
                </select>
              </label>

              <label className="full-width-field">
                Bicicleta
                <input
                  value={formData.bicicleta}
                  placeholder="Ej. Trek Marlin roja"
                  onChange={(event) =>
                    actualizarCampo("bicicleta", event.target.value)
                  }
                />
              </label>
            </div>
          </section>
        ) : (
          <section className="form-section">
            <h3>Suspensión</h3>

            <label className="full-label">
              Suspensión
              <input
                value={formData.suspension}
                placeholder="Ej. FOX 34 Step Cast"
                onChange={(event) =>
                  actualizarCampo("suspension", event.target.value)
                }
              />
            </label>
          </section>
        )}

        <section className="form-section">
          <h3>Ubicación / agenda</h3>

          <div className="form-grid">
            <label>
              Google Maps
              <input
                value={formData.googleMaps}
                onChange={(event) => actualizarCampo("googleMaps", event.target.value)}
              />
            </label>

            <label>
              Dirección
              <input
                value={formData.direccion}
                onChange={(event) => actualizarCampo("direccion", event.target.value)}
              />
            </label>

            <label>
              Fecha programada
              <input
                type="date"
                value={formData.fechaProgramada}
                onChange={(event) =>
                  actualizarCampo("fechaProgramada", event.target.value)
                }
              />
            </label>

            <label>
              Hora programada
              <input
                type="time"
                value={formData.horaProgramada}
                onChange={(event) =>
                  actualizarCampo("horaProgramada", event.target.value)
                }
              />
            </label>
          </div>

          <label className="full-label">
            Observaciones
            <textarea
              value={formData.observaciones}
              onChange={(event) => actualizarCampo("observaciones", event.target.value)}
            />
          </label>
        </section>

        {requiereFotosRecoleccion && (
          <section className="form-section">
            <h3>Fotos de recolección</h3>

            <div className="er2-photo-input-grid">
              <label className="er2-photo-input">
                {formData.fotosRecoleccion.lateral1 ? (
                  <img src={formData.fotosRecoleccion.lateral1} alt="Recolección 1" />
                ) : (
                  <span>Foto recolección 1</span>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    cargarFoto("fotosRecoleccion", "lateral1", event.target.files?.[0])
                  }
                />
              </label>

              <label className="er2-photo-input">
                {formData.fotosRecoleccion.lateral2 ? (
                  <img src={formData.fotosRecoleccion.lateral2} alt="Recolección 2" />
                ) : (
                  <span>Foto recolección 2</span>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    cargarFoto("fotosRecoleccion", "lateral2", event.target.files?.[0])
                  }
                />
              </label>
            </div>
          </section>
        )}

        {requiereFotosEntrega && (
          <section className="form-section">
            <h3>Fotos de entrega</h3>

            <div className="er2-photo-input-grid">
              <label className="er2-photo-input">
                {formData.fotosEntrega.lateral1 ? (
                  <img src={formData.fotosEntrega.lateral1} alt="Entrega 1" />
                ) : (
                  <span>Foto entrega 1</span>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    cargarFoto("fotosEntrega", "lateral1", event.target.files?.[0])
                  }
                />
              </label>

              <label className="er2-photo-input">
                {formData.fotosEntrega.lateral2 ? (
                  <img src={formData.fotosEntrega.lateral2} alt="Entrega 2" />
                ) : (
                  <span>Foto entrega 2</span>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    cargarFoto("fotosEntrega", "lateral2", event.target.files?.[0])
                  }
                />
              </label>
            </div>
          </section>
        )}

        <div className="er2-actions">
          <button className="secondary-button" onClick={onClose}>
            Cancelar
          </button>

          <button className="primary-button" onClick={crearMovimiento}>
            {modo === "programada" ? "Guardar programada" : "Continuar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NuevoMovimientoModal;