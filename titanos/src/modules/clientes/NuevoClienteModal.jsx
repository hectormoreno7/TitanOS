import { useState } from "react";

function NuevoClienteModal({ onClose, onCreate }) {
  const [cliente, setCliente] = useState({
    nombre: "",
    telefono: "",
    whatsapp: "",
    correo: "",
    direccion: "",
    googleMaps: "",
    notas: "",
  });

  const actualizarCampo = (campo, valor) => {
    setCliente({
      ...cliente,
      [campo]: valor,
    });
  };

  const crearCliente = () => {
    if (!cliente.nombre.trim()) {
      alert("Falta el nombre del cliente.");
      return;
    }

    if (!cliente.telefono.trim()) {
      alert("Falta el teléfono del cliente.");
      return;
    }

    onCreate(cliente);
  };

  return (
    <div className="modal-backdrop">
      <div className="client-modal">
        <div className="modal-header">
          <div>
            <h2>Nuevo cliente</h2>
            <p>Registro general del cliente.</p>
          </div>

          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="form-section">
          <h3>Datos del cliente</h3>

          <div className="form-grid">
            <label>
              Nombre completo
              <input
                type="text"
                placeholder="Ej. Juan Pérez"
                value={cliente.nombre}
                onChange={(event) =>
                  actualizarCampo("nombre", event.target.value)
                }
              />
            </label>

            <label>
              Teléfono
              <input
                type="tel"
                placeholder="Ej. 2281234567"
                value={cliente.telefono}
                onChange={(event) =>
                  actualizarCampo("telefono", event.target.value)
                }
              />
            </label>

            <label>
              WhatsApp
              <input
                type="tel"
                placeholder="Opcional"
                value={cliente.whatsapp}
                onChange={(event) =>
                  actualizarCampo("whatsapp", event.target.value)
                }
              />
            </label>

            <label>
              Correo
              <input
                type="email"
                placeholder="Opcional"
                value={cliente.correo}
                onChange={(event) =>
                  actualizarCampo("correo", event.target.value)
                }
              />
            </label>

            <label>
              Dirección
              <input
                type="text"
                placeholder="Opcional"
                value={cliente.direccion}
                onChange={(event) =>
                  actualizarCampo("direccion", event.target.value)
                }
              />
            </label>

            <label>
              Google Maps
              <input
                type="text"
                placeholder="Link de ubicación"
                value={cliente.googleMaps}
                onChange={(event) =>
                  actualizarCampo("googleMaps", event.target.value)
                }
              />
            </label>
          </div>

          <label className="full-label">
            Notas
            <textarea
              placeholder="Notas internas del cliente..."
              value={cliente.notas}
              onChange={(event) => actualizarCampo("notas", event.target.value)}
            />
          </label>
        </div>

        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>
            Cancelar
          </button>

          <button className="primary-button" onClick={crearCliente}>
            Guardar cliente
          </button>
        </div>
      </div>
    </div>
  );
}

export default NuevoClienteModal;