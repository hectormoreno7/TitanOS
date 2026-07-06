import { useEffect, useMemo, useState } from "react";
import ClienteDetail from "./ClienteDetail";
import { useAuth } from "../../context/AuthContext";
import {
  getTenantItems,
  addTenantItem,
  updateTenantItem,
  deleteTenantItem,
} from "../../firebase/firestore";

const CLIENTS_KEY = "titanos_clientes_v1";
const COLLECTION = "clientes";

function getLocalClientes() {
  try {
    return JSON.parse(localStorage.getItem(CLIENTS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveLocalClientes(clientes) {
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(clientes));
}

function Clientes() {
  const { tenantId } = useAuth();

  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [modalNuevo, setModalNuevo] = useState(false);
  const [cargando, setCargando] = useState(true);

  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: "",
    telefono: "",
    whatsapp: "",
    correo: "",
    direccion: "",
    googleMaps: "",
    notas: "",
    estado: "activo",
    bicicletas: [],
  });

  useEffect(() => {
    async function cargarClientes() {
      setCargando(true);

      try {
        const firebaseClientes = await getTenantItems(COLLECTION, tenantId);

        if (firebaseClientes.length > 0) {
          setClientes(firebaseClientes);
          saveLocalClientes(firebaseClientes);
        } else {
          const locales = getLocalClientes();

          if (locales.length > 0) {
            const migrados = [];

            for (const cliente of locales) {
              const ref = await addTenantItem(
                COLLECTION,
                {
                  ...cliente,
                  estado: cliente.estado || "activo",
                  bicicletas: cliente.bicicletas || [],
                },
                tenantId
              );

              migrados.push({
                ...cliente,
                firebaseId: ref.id,
                estado: cliente.estado || "activo",
                bicicletas: cliente.bicicletas || [],
              });
            }

            setClientes(migrados);
            saveLocalClientes(migrados);
          } else {
            setClientes([]);
          }
        }
      } catch (error) {
        console.error("Error cargando clientes:", error);
        setClientes(getLocalClientes());
      } finally {
        setCargando(false);
      }
    }

    cargarClientes();
  }, [tenantId]);

  const clientesFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();

    return clientes.filter((cliente) => {
      const texto = `
        ${cliente.nombre}
        ${cliente.telefono}
        ${cliente.whatsapp}
        ${cliente.correo}
        ${cliente.direccion}
      `.toLowerCase();

      return texto.includes(q);
    });
  }, [clientes, busqueda]);

  const actualizarCampoNuevo = (campo, valor) => {
    setNuevoCliente((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const guardarNuevoCliente = async () => {
    if (!nuevoCliente.nombre.trim()) {
      alert("Falta el nombre del cliente.");
      return;
    }

    const cliente = {
      id: Date.now(),
      ...nuevoCliente,
      nombre: nuevoCliente.nombre.trim(),
      telefono: nuevoCliente.telefono.trim(),
      fechaAlta: new Date().toLocaleDateString("es-MX"),
      estado: "activo",
      bicicletas: [],
    };

    try {
      const ref = await addTenantItem(COLLECTION, cliente, tenantId);

      const clienteFinal = {
        ...cliente,
        firebaseId: ref.id,
      };

      const actualizados = [clienteFinal, ...clientes];

      setClientes(actualizados);
      saveLocalClientes(actualizados);

      setNuevoCliente({
        nombre: "",
        telefono: "",
        whatsapp: "",
        correo: "",
        direccion: "",
        googleMaps: "",
        notas: "",
        estado: "activo",
        bicicletas: [],
      });

      setModalNuevo(false);
    } catch (error) {
      console.error("Error guardando cliente:", error);
      alert("No se pudo guardar en Firebase.");
    }
  };

  const actualizarCliente = async (clienteActualizado) => {
    let clienteFinal = clienteActualizado;

    try {
      if (clienteActualizado.firebaseId) {
        await updateTenantItem(
          COLLECTION,
          clienteActualizado.firebaseId,
          clienteActualizado,
          tenantId
        );
      } else {
        const ref = await addTenantItem(COLLECTION, clienteActualizado, tenantId);

        clienteFinal = {
          ...clienteActualizado,
          firebaseId: ref.id,
        };
      }

      const actualizados = clientes.map((cliente) =>
        String(cliente.id) === String(clienteFinal.id) ? clienteFinal : cliente
      );

      setClientes(actualizados);
      saveLocalClientes(actualizados);
      setClienteSeleccionado(clienteFinal);
    } catch (error) {
      console.error("Error actualizando cliente:", error);
      alert("No se pudo actualizar el cliente.");
    }
  };

  const eliminarCliente = async (cliente) => {
    const confirmar = window.confirm(
      `¿Eliminar definitivamente a ${cliente.nombre}?`
    );

    if (!confirmar) return;

    try {
      if (cliente.firebaseId) {
        await deleteTenantItem(COLLECTION, cliente.firebaseId, tenantId);
      }

      const actualizados = clientes.filter(
        (item) => String(item.id) !== String(cliente.id)
      );

      setClientes(actualizados);
      saveLocalClientes(actualizados);

      if (
        clienteSeleccionado &&
        String(clienteSeleccionado.id) === String(cliente.id)
      ) {
        setClienteSeleccionado(null);
      }
    } catch (error) {
      console.error("Error eliminando cliente:", error);
      alert("No se pudo eliminar el cliente.");
    }
  };

  return (
    <section className="clients-page">
      <div className="module-header">
        <div>
          <h2>Clientes</h2>
          <p>Base de clientes sincronizada con Firebase.</p>
        </div>
      </div>

      <div className="search-box">
        <input
          value={busqueda}
          placeholder="Buscar cliente, teléfono, correo o dirección..."
          onChange={(event) => setBusqueda(event.target.value)}
        />
      </div>

      {cargando && <div className="empty-state">Cargando clientes...</div>}

      {!cargando && (
        <div className="clients-grid">
          {clientesFiltrados.map((cliente) => (
            <article className="client-card" key={cliente.id}>
              <div>
                <h3>{cliente.nombre}</h3>
                <p>{cliente.telefono || "Sin teléfono"}</p>
                <p>{cliente.correo || "Sin correo"}</p>
              </div>

              <div className="client-card-stats">
                <span>{(cliente.bicicletas || []).length} bicicletas</span>
                <span>{cliente.estado || "activo"}</span>
              </div>

              <div className="client-card-actions">
                <button
                  className="primary-button"
                  onClick={() => setClienteSeleccionado(cliente)}
                >
                  Ver detalles
                </button>

                <button
                  className="delete-client-button"
                  onClick={() => eliminarCliente(cliente)}
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {!cargando && clientesFiltrados.length === 0 && (
        <div className="empty-state">No hay clientes registrados.</div>
      )}

      <button className="floating-action" onClick={() => setModalNuevo(true)}>
        +
      </button>

      {modalNuevo && (
        <div className="modal-backdrop">
          <div className="client-modal">
            <div className="modal-header">
              <div>
                <h2>Nuevo cliente</h2>
                <p>Registro básico del cliente.</p>
              </div>

              <button
                className="modal-close"
                onClick={() => setModalNuevo(false)}
              >
                ×
              </button>
            </div>

            <section className="form-section">
              <h3>Datos del cliente</h3>

              <div className="form-grid">
                <label>
                  Nombre
                  <input
                    value={nuevoCliente.nombre}
                    onChange={(event) =>
                      actualizarCampoNuevo("nombre", event.target.value)
                    }
                  />
                </label>

                <label>
                  Teléfono
                  <input
                    value={nuevoCliente.telefono}
                    onChange={(event) =>
                      actualizarCampoNuevo("telefono", event.target.value)
                    }
                  />
                </label>

                <label>
                  WhatsApp
                  <input
                    value={nuevoCliente.whatsapp}
                    onChange={(event) =>
                      actualizarCampoNuevo("whatsapp", event.target.value)
                    }
                  />
                </label>

                <label>
                  Correo
                  <input
                    value={nuevoCliente.correo}
                    onChange={(event) =>
                      actualizarCampoNuevo("correo", event.target.value)
                    }
                  />
                </label>

                <label className="full-width-field">
                  Dirección
                  <input
                    value={nuevoCliente.direccion}
                    onChange={(event) =>
                      actualizarCampoNuevo("direccion", event.target.value)
                    }
                  />
                </label>

                <label className="full-width-field">
                  Google Maps
                  <input
                    value={nuevoCliente.googleMaps}
                    onChange={(event) =>
                      actualizarCampoNuevo("googleMaps", event.target.value)
                    }
                  />
                </label>

                <label className="full-width-field">
                  Notas
                  <textarea
                    value={nuevoCliente.notas}
                    onChange={(event) =>
                      actualizarCampoNuevo("notas", event.target.value)
                    }
                  />
                </label>
              </div>
            </section>

            <div className="modal-actions">
              <button
                className="secondary-button"
                onClick={() => setModalNuevo(false)}
              >
                Cancelar
              </button>

              <button className="primary-button" onClick={guardarNuevoCliente}>
                Guardar cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {clienteSeleccionado && (
        <ClienteDetail
          cliente={clienteSeleccionado}
          onClose={() => setClienteSeleccionado(null)}
          onUpdate={actualizarCliente}
        />
      )}
    </section>
  );
}

export default Clientes;