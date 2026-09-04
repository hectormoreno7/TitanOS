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

function guardarServiciosLocales(servicios) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(servicios));
  } catch {
    console.warn("No se pudo guardar servicios en localStorage.");
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

function esServicioActivo(servicio) {
  const estado = String(servicio.estado || "activo").trim().toLowerCase();

  if (!["activo", "abierto", "abierta", "en proceso", "en_proceso", "pendiente"].includes(estado)) {
    return false;
  }

  if (servicio.fechaEntrega) return false;
  if (servicio.fechaCierre) return false;
  if (servicio.fechaCancelacion) return false;

  return true;
}

function totalConceptos(conceptos = []) {
  return conceptos.reduce((acc, item) => {
    const normalizarNumero = (valor) => {
      if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
      return Number(String(valor || "").replace(/[$,\s]/g, "")) || 0;
    };

    return acc + normalizarNumero(item.cantidad) * normalizarNumero(item.precio);
  }, 0);
}

function totalServicio(servicio = {}) {
  const totalConceptosRegistrados = totalConceptos(servicio.conceptos || []);
  return totalConceptosRegistrados || Number(servicio.total || 0);
}

function uniqueByFirebaseId(items) {
  const map = new Map();

  items.forEach((item) => {
    const key = item.firebaseId || item.id || item.folio;
    if (!map.has(key)) map.set(key, item);
  });

  return Array.from(map.values());
}

function generarFolioServicio(servicios) {
  const fecha = new Date();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const año = String(fecha.getFullYear()).slice(-2);
  const prefijo = `TBW-S-${mes}${año}-`;

  const numeros = servicios
    .map((s) => String(s.folio || ""))
    .filter((folio) => folio.startsWith(prefijo))
    .map((folio) => Number(folio.replace(prefijo, "")))
    .filter((num) => !Number.isNaN(num));

  const siguiente = numeros.length > 0 ? Math.max(...numeros) + 1 : 1;

  return `${prefijo}${String(siguiente).padStart(5, "0")}`;
}

function Servicios() {
  const { tenantId } = useAuth();

  const [vista, setVista] = useState("activos");
  const [search, setSearch] = useState("");
  const [servicios, setServicios] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cargarServicios = async () => {
    setCargando(true);

    try {
      const firebaseServicios = await getTenantItems(COLLECTION, tenantId);
      const unicos = uniqueByFirebaseId(firebaseServicios);

      setServicios(unicos);
      guardarServiciosLocales(unicos);
    } catch (error) {
      console.error("Error cargando servicios:", error);
      setServicios([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarServicios();
  }, [tenantId]);

  useEffect(() => {
    const pendiente = localStorage.getItem(PENDING_SERVICE_KEY);
    if (pendiente) setIsModalOpen(true);
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

  const serviciosActivos = useMemo(() => {
    return serviciosFiltrados.filter(esServicioActivo);
  }, [serviciosFiltrados]);

  const serviciosHistorial = useMemo(() => {
    return serviciosFiltrados.filter((servicio) => !esServicioActivo(servicio));
  }, [serviciosFiltrados]);

  const listaVisible =
    vista === "activos" ? serviciosActivos : serviciosHistorial;

  const crearServicio = async (datosServicio) => {
    const nuevoServicio = {
      id: Date.now(),
      folio: generarFolioServicio(servicios),

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

      fechaIngreso: fechaActual(),
      horaIngreso: horaActual(),
      fechaEntrega: "",

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
        String(item.firebaseId || item.id) === String(servicioFinal.firebaseId || servicioFinal.id)
          ? servicioFinal
          : item
      );

      setServicios(actualizados);
      guardarServiciosLocales(actualizados);
      setServicioSeleccionado(servicioFinal);
    } catch (error) {
      console.error("Error actualizando servicio:", error);
      alert("No se pudo actualizar el servicio en Firebase.");
    }
  };

  const finalizarServicioRapido = async (servicio) => {
    const confirmar = window.confirm(
      "¿Mover este servicio al historial como finalizado?"
    );

    if (!confirmar) return;

    await actualizarServicio({
      ...servicio,
      estado: "finalizado",
      fechaEntrega: servicio.fechaEntrega || fechaActual(),
      horaEntrega: servicio.horaEntrega || horaActual(),
      total: Number(servicio.total || totalConceptos(servicio.conceptos)),
    });

    setVista("historial");
  };

  const cancelarServicio = async (servicio) => {
    const confirmar = window.confirm("¿Cancelar este servicio?");
    if (!confirmar) return;

    await actualizarServicio({
      ...servicio,
      estado: "cancelado",
      fechaCancelacion: fechaActual(),
      horaCancelacion: horaActual(),
    });

    setVista("historial");
  };

  const reabrirServicio = async (servicio) => {
    const confirmar = window.confirm("¿Reabrir este servicio?");
    if (!confirmar) return;

    await actualizarServicio({
      ...servicio,
      estado: "activo",
      fechaEntrega: "",
      fechaCierre: "",
      fechaCancelacion: "",
      fechaReapertura: fechaActual(),
      horaReapertura: horaActual(),
    });

    setVista("activos");
  };

  const cerrarModalServicio = () => {
    localStorage.removeItem(PENDING_SERVICE_KEY);
    setIsModalOpen(false);
  };

  return (
    <section className="servicios-page">
      <div className="module-header">
        <div>
          <h2>Servicios</h2>
          <p>Servicios activos e historial de hojas de servicio.</p>
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

      <div className="sus-tabs">
        <button
          type="button"
          className={vista === "activos" ? "active" : ""}
          onClick={() => setVista("activos")}
        >
          Activos
        </button>

        <button
          type="button"
          className={vista === "historial" ? "active" : ""}
          onClick={() => setVista("historial")}
        >
          Historial
        </button>
      </div>

      {cargando && <div className="empty-state">Cargando servicios...</div>}

      {!cargando && listaVisible.length > 0 && (
        <div className="services-grid">
          {listaVisible.map((servicio) => {
            const activo = esServicioActivo(servicio);

            return (
              <article className="service-card" key={servicio.firebaseId || servicio.id}>
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
                  <span>Estado: {servicio.estado || "activo"}</span>
                </div>

                <div className="service-footer">
                  <strong>${totalServicio(servicio).toFixed(2)}</strong>

                  <button onClick={() => setServicioSeleccionado(servicio)}>
                    Ver servicio
                  </button>
                </div>

                {activo ? (
                  <div className="service-card-actions">
                    <button
                      className="primary-button"
                      onClick={() => finalizarServicioRapido(servicio)}
                    >
                      Finalizar
                    </button>

                    <button
                      className="cancel-service-button"
                      onClick={() => cancelarServicio(servicio)}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="service-card-actions">
                    <button
                      className="reopen-button"
                      onClick={() => reabrirServicio(servicio)}
                    >
                      Reabrir
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {!cargando && listaVisible.length === 0 && (
        <div className="empty-state">
          {vista === "activos"
            ? "No se encontraron servicios activos."
            : "No hay servicios en historial."}
        </div>
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
