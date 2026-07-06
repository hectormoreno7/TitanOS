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

function NuevaNotaModal({ onClose, onCreate }) {
  const clientes = useMemo(() => cargarClientes(), []);
  const [clienteId, setClienteId] = useState("");
  const { tenantId } = useAuth();

  const [formData, setFormData] = useState({
    cliente: "",
    telefono: "",
    estadoPago: "Pagado",
    metodoPago: "Efectivo",
    abono: "",
    observaciones: "",
  });

  const [conceptos, setConceptos] = useState([]);
  const [nuevoConcepto, setNuevoConcepto] = useState({
    descripcion: "",
    cantidad: 1,
    precio: "",
  });

  const actualizarCampo = (campo, valor) => {
    setFormData((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const seleccionarCliente = (id) => {
    setClienteId(id);

    const cliente = clientes.find((item) => String(item.id) === String(id));
    if (!cliente) return;

    setFormData((prev) => ({
      ...prev,
      cliente: cliente.nombre || "",
      telefono: cliente.telefono || "",
    }));
  };

  const agregarConcepto = () => {
    if (!nuevoConcepto.descripcion.trim()) {
      alert("Falta la descripción del concepto.");
      return;
    }

    setConceptos((prev) => [
      ...prev,
      {
        id: Date.now(),
        descripcion: nuevoConcepto.descripcion,
        cantidad: Number(nuevoConcepto.cantidad || 1),
        precio: Number(nuevoConcepto.precio || 0),
      },
    ]);

    setNuevoConcepto({
      descripcion: "",
      cantidad: 1,
      precio: "",
    });
  };

  const eliminarConcepto = (id) => {
    setConceptos((prev) => prev.filter((item) => item.id !== id));
  };

  const crearNota = async () => {
    if (conceptos.length === 0) {
      alert("Agrega al menos un concepto.");
      return;
    }
    const clienteGuardado = await crearOActualizarClienteDesdeModulo({
  tenantId,
  clienteId,
  nombre: formData.cliente,
  telefono: formData.telefono,
});

    onCreate({
      clienteId: clienteGuardado.clienteId,
      ...formData,
      conceptos,
      fechaCreacion: fechaActual(),
      horaCreacion: horaActual(),
      estado: "abierta",
      firmaCliente: "",
    });
  };

  const total = conceptos.reduce((acc, item) => {
    return acc + Number(item.cantidad || 0) * Number(item.precio || 0);
  }, 0);

  return (
    <div className="modal-backdrop">
      <div className="nr-modal">
        <div className="modal-header">
          <div>
            <h2>Nueva nota rápida</h2>
            <p>Venta, ajuste o cobro rápido.</p>
          </div>

          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <section className="form-section">
          <h3>Cliente</h3>

          <div className="form-grid">
            <label>
              Cliente existente
              <select
                value={clienteId}
                onChange={(event) => seleccionarCliente(event.target.value)}
              >
                <option value="">Cliente general / escribir abajo</option>

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
                placeholder="Cliente general"
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

        <section className="form-section">
          <h3>Conceptos</h3>

          <div className="nr-concept-form">
            <input
              type="text"
              placeholder="Concepto"
              value={nuevoConcepto.descripcion}
              onChange={(event) =>
                setNuevoConcepto({
                  ...nuevoConcepto,
                  descripcion: event.target.value,
                })
              }
            />

            <input
              type="number"
              placeholder="Cant."
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

          <div className="nr-concept-list">
            {conceptos.length === 0 && (
              <p className="form-note">Aún no hay conceptos agregados.</p>
            )}

            {conceptos.map((item) => (
              <div className="nr-concept-row" key={item.id}>
                <span>{item.descripcion}</span>
                <span>{item.cantidad}</span>
                <span>${Number(item.precio || 0).toFixed(2)}</span>
                <strong>
                  ${(Number(item.cantidad || 0) * Number(item.precio || 0)).toFixed(2)}
                </strong>
                <button onClick={() => eliminarConcepto(item.id)}>×</button>
              </div>
            ))}
          </div>

          <div className="nr-total-box">
            <span>Total</span>
            <strong>${total.toFixed(2)}</strong>
          </div>
        </section>

        <section className="form-section">
          <h3>Pago</h3>

          <div className="form-grid">
            <label>
              Estado de pago
              <select
                value={formData.estadoPago}
                onChange={(event) => actualizarCampo("estadoPago", event.target.value)}
              >
                <option>Pagado</option>
                <option>Parcial</option>
                <option>Pendiente</option>
              </select>
            </label>

            <label>
              Método de pago
              <select
                value={formData.metodoPago}
                onChange={(event) => actualizarCampo("metodoPago", event.target.value)}
              >
                <option>Efectivo</option>
                <option>Transferencia</option>
                <option>Tarjeta</option>
                <option>Mixto</option>
                <option>Sin definir</option>
              </select>
            </label>

            {formData.estadoPago === "Parcial" && (
              <label>
                Abono
                <input
                  type="number"
                  value={formData.abono}
                  onChange={(event) => actualizarCampo("abono", event.target.value)}
                />
              </label>
            )}
          </div>

          <label className="full-label">
            Observaciones
            <textarea
              value={formData.observaciones}
              onChange={(event) => actualizarCampo("observaciones", event.target.value)}
            />
          </label>
        </section>

        <div className="nr-actions">
          <button className="secondary-button" onClick={onClose}>
            Cancelar
          </button>

          <button className="primary-button" onClick={crearNota}>
            Crear nota
          </button>
        </div>
      </div>
    </div>
  );
}

export default NuevaNotaModal;
