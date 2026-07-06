import { useEffect, useMemo, useState } from "react";
import NuevoServicioModal from "./NuevoServicioModal";
import ServicioDetail from "./ServicioDetail";
import { useAuth } from "../../context/AuthContext";
import {
  getTenantItems,
  addTenantItem,
  updateTenantItem,
} from "../../firebase/firestore";

const STORAGE_KEY = "titanos_servicios_v3";
const PENDING_SERVICE_KEY = "titanos_pending_service";
const COLLECTION = "servicios";

function cargarServiciosLocales() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function guardarServiciosLocales(servicios) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(servicios));
}

function generarFolioServicio(consecutivo) {
  const fecha = new Date();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const año = String(fecha.getFullYear()).slice(-2);

  return `TBW-S-${mes}${año}-${String(consecutivo).padStart(5, "0")}`;
}

function Servicios() {
  const { tenantId } = useAuth();

  const [search, setSearch] = useState("");
  const [servicios, setServicios] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargarServicios() {
      setCargando(true);

      try {
        const firebaseServicios = await getTenantItems(COLLECTION, tenantId);

        if (firebaseServicios.length > 0) {
          setServicios(firebaseServicios);
          guardarServiciosLocales(firebaseServicios);
        } else {
          const locales = cargarServiciosLocales();

          if (locales.length > 0) {
            const migrados = [];

            for (const servicio of locales) {
              const ref = await addTenantItem(
                COLLECTION,
                {
                  ...servicio,
                  estado: servicio.estado || "activo",
                  conceptos: servicio.conceptos || [],
                },
                tenantId
              );

              migrados.push({
                ...servicio,
                firebaseId: ref.id,
                estado: servicio.estado || "activo",
                conceptos: servicio.conceptos || [],
              });
            }

            setServicios(migrados);
            guardarServiciosLocales(migrados);
          } else {
            setServicios([]);
          }
        }
      } catch (error) {
        console.error("Error cargando servicios:", error);
        setServicios(cargarServiciosLocales());
      } finally {
        setCargando(false);
      }
    }

    cargarServicios();
  }, [tenantId]);

  useEffect(() => {
    const pendiente = localStorage.getItem(PENDING_SERVICE_KEY);

    if (pendiente) {
      setIsModalOpen(true);
    }
  }, []);

  const serviciosFiltrados = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) return servicios;

    return servicios.filter((servicio) => {
      const texto = `
        ${servicio.folio}
        ${servicio.cliente}
        ${servicio.telefono}
        ${servicio.bicicleta}
        ${servicio.marca}
        ${servicio.modelo}
        ${servicio.color}
        ${servicio.tipo}
        ${servicio.rodada}
        ${servicio.material}
        ${servicio.transmision}
        ${servicio.tipoServicio}
        ${servicio.fechaIngreso}
        ${servicio.fechaEntrega}
        ${servicio.estado}
      `.toLowerCase();

      return texto.includes(query);
    });
  }, [search, servicios]);

  const crearServicio = async (datosServicio) => {
    const nuevoNumero = servicios.length + 1;

    const nuevoServicio = {
      id: Date.now(),
      folio: generarFolioServicio(nuevoNumero),

      clienteId: datosServicio.clienteId || "",
      bicicletaId: datosServicio.bicicletaId || "",

      cliente: datosServicio.cliente || "",
      telefono: datosServicio.telefono || "",
      googleMaps: datosServicio.googleMaps || "",
      direccion: datosServicio.direccion || "",

      bicicleta: datosServicio.bicicleta || "",
      marca: datosServicio.marca || "",
      modelo: datosServicio.modelo || "",
      color: datosServicio.color || "",
      tipo: datosServicio.tipo || "",
      rodada: datosServicio.rodada || "",
      material: datosServicio.material || "",
      numeroSerie: datosServicio.numeroSerie || "",
      peso: datosServicio.peso || "",
      tipoServicio: datosServicio.tipoServicio || "",
      transmision: datosServicio.transmision || "",

      fechaIngreso: new Date().toLocaleDateString("es-MX"),
      fechaEntrega: "",
      entrega: "",

      total: 0,
      accesorios: datosServicio.accesorios || "",
      estadoMecanico: datosServicio.estadoMecanico || "",
      fotosRecepcion: datosServicio.fotosRecepcion || {},
      conceptos: [],
      checklist: {},
      grasas: {},
      mediciones: {},
      evidencias: [],
      observacionesFinales: "",

      entregaDomicilio: false,
      fechaEntregaDomicilio: "",
      recoleccionEntregaId: datosServicio.origenMovimientoId || "",

      estado: "activo",
    };

    try {
      const ref = await addTenantItem(COLLECTION, nuevoServicio, tenantId);

      const servicioFinal = {
        ...nuevoServicio,
        firebaseId: ref.id,
      };

      const actualizados = [servicioFinal, ...servicios];

      localStorage.removeItem(PENDING_SERVICE_KEY);
      setServicios(actualizados);
      guardarServiciosLocales(actualizados);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error creando servicio:", error);
      alert("No se pudo guardar el servicio en Firebase.");
    }
  };

  const actualizarServicio = async (servicioActualizado) => {
    let servicioFinal = servicioActualizado;

    try {
      if (servicioActualizado.firebaseId) {
        await updateTenantItem(
          COLLECTION,
          servicioActualizado.firebaseId,
          servicioActualizado,
          tenantId
        );
      } else {
        const ref = await addTenantItem(COLLECTION, servicioActualizado, tenantId);

        servicioFinal = {
          ...servicioActualizado,
          firebaseId: ref.id,
        };
      }

      const actualizados = servicios.map((item) =>
        String(item.id) === String(servicioFinal.id) ? servicioFinal : item
      );

      setServicios(actualizados);
      guardarServiciosLocales(actualizados);
      setServicioSeleccionado(servicioFinal);
    } catch (error) {
      console.error("Error actualizando servicio:", error);
      alert("No se pudo actualizar el servicio en Firebase.");
    }
  };

  const cancelarServicio = async (servicio) => {
    const confirmar = window.confirm("¿Cancelar este servicio?");
    if (!confirmar) return;

    const actualizado = {
      ...servicio,
      estado: "cancelado",
      fechaCancelacion: new Date().toLocaleDateString("es-MX"),
    };

    await actualizarServicio(actualizado);
  };

  const cerrarModalServicio = () => {
    localStorage.removeItem(PENDING_SERVICE_KEY);
    setIsModalOpen(false);
  };

  const serviciosActivos = serviciosFiltrados.filter(
    (servicio) =>
      servicio.estado !== "cancelado" && servicio.estado !== "finalizado"
  );

  return (
    <section className="servicios-page">
      <div className="module-header">
        <div>
          <h2>Servicios</h2>
          <p>Servicios activos registrados en el taller.</p>
        </div>
      </div>

      <div className="search-box">
        <input
          type="text"
          placeholder="Buscar por cliente, bicicleta, color, teléfono, folio..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {cargando && <div className="empty-state">Cargando servicios...</div>}

      {!cargando && (
        <div className="services-grid">
          {serviciosActivos.map((servicio) => (
            <article className="service-card" key={servicio.id}>
              <div className="service-card-top">
                <span className="service-folio">{servicio.folio}</span>
              </div>

              <h3>{servicio.cliente}</h3>

              <p className="service-bike">
                {servicio.bicicleta} · {servicio.color}
              </p>

              <p className="service-type">{servicio.tipoServicio}</p>

              <div className="service-meta">
                <span>Recepción: {servicio.fechaIngreso}</span>
              </div>

              <div className="service-footer">
                <strong>${Number(servicio.total || 0).toFixed(2)}</strong>

                <button onClick={() => setServicioSeleccionado(servicio)}>
                  Ver servicio
                </button>
              </div>

              <button
                className="cancel-service-button"
                onClick={() => cancelarServicio(servicio)}
              >
                Cancelar
              </button>
            </article>
          ))}
        </div>
      )}

      {!cargando && serviciosActivos.length === 0 && (
        <div className="empty-state">No se encontraron servicios activos.</div>
      )}

      <button className="floating-action" onClick={() => setIsModalOpen(true)}>
        +
      </button>

      {isModalOpen && (
        <NuevoServicioModal
          onClose={cerrarModalServicio}
          onCreate={crearServicio}
        />
      )}

      {servicioSeleccionado && (
        <ServicioDetail
          servicio={servicioSeleccionado}
          onClose={() => setServicioSeleccionado(null)}
          onUpdate={actualizarServicio}
        />
      )}
    </section>
  );
}

export default Servicios;