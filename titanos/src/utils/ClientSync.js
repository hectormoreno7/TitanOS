import { addTenantItem, updateTenantItem } from "../firebase/firestore";

const CLIENTS_KEY = "titanos_clientes_v1";

function cargarClientesLocales() {
  try {
    return JSON.parse(localStorage.getItem(CLIENTS_KEY)) || [];
  } catch {
    return [];
  }
}

function guardarClientesLocales(clientes) {
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(clientes));
}

export async function crearOActualizarClienteDesdeModulo({
  tenantId,
  clienteId = "",
  nombre = "",
  telefono = "",
  whatsapp = "",
  correo = "",
  direccion = "",
  googleMaps = "",
  notas = "",
  bicicleta = null,
}) {
  const clientes = cargarClientesLocales();
  const nombreLimpio = String(nombre || "").trim();
  const telefonoLimpio = String(telefono || "").trim();

  if (!nombreLimpio) {
    return { clienteId: "", bicicletaId: "" };
  }

  let clienteExistente =
    clientes.find((item) => String(item.id) === String(clienteId)) ||
    clientes.find((item) => {
      const mismoTelefono =
        telefonoLimpio &&
        String(item.telefono || "").trim() === telefonoLimpio;

      const mismoNombre =
        String(item.nombre || "").trim().toLowerCase() ===
        nombreLimpio.toLowerCase();

      return mismoTelefono || mismoNombre;
    });

  let bicicletaId = bicicleta?.id || "";

  if (clienteExistente) {
    let clienteActualizado = {
      ...clienteExistente,
      nombre: clienteExistente.nombre || nombreLimpio,
      telefono: clienteExistente.telefono || telefonoLimpio,
      whatsapp: clienteExistente.whatsapp || whatsapp,
      correo: clienteExistente.correo || correo,
      direccion: clienteExistente.direccion || direccion,
      googleMaps: clienteExistente.googleMaps || googleMaps,
      notas: clienteExistente.notas || notas,
    };

    if (bicicleta && !bicicleta.id) {
      const yaExisteBici = (clienteActualizado.bicicletas || []).some((bike) => {
        const mismaSerie =
          bicicleta.numeroSerie &&
          bike.numeroSerie &&
          String(bike.numeroSerie).trim().toLowerCase() ===
            String(bicicleta.numeroSerie).trim().toLowerCase();

        const mismoNombre =
          `${bike.marca || ""} ${bike.modelo || ""} ${bike.color || ""}`
            .trim()
            .toLowerCase() ===
          `${bicicleta.marca || ""} ${bicicleta.modelo || ""} ${
            bicicleta.color || ""
          }`
            .trim()
            .toLowerCase();

        return mismaSerie || mismoNombre;
      });

      if (!yaExisteBici && (bicicleta.marca || bicicleta.modelo)) {
        bicicletaId = Date.now() + Math.random();

        clienteActualizado = {
          ...clienteActualizado,
          bicicletas: [
            ...(clienteActualizado.bicicletas || []),
            {
              ...bicicleta,
              id: bicicletaId,
            },
          ],
        };
      }
    }

    if (clienteActualizado.firebaseId) {
      await updateTenantItem(
        "clientes",
        clienteActualizado.firebaseId,
        clienteActualizado,
        tenantId
      );
    }

    const actualizados = clientes.map((item) =>
      String(item.id) === String(clienteActualizado.id)
        ? clienteActualizado
        : item
    );

    guardarClientesLocales(actualizados);

    return {
      clienteId: clienteActualizado.id,
      bicicletaId,
    };
  }

  bicicletaId = bicicleta?.id || "";

  const nuevoCliente = {
    id: Date.now(),
    nombre: nombreLimpio,
    telefono: telefonoLimpio,
    whatsapp,
    correo,
    direccion,
    googleMaps,
    notas,
    estado: "activo",
    fechaAlta: new Date().toLocaleDateString("es-MX"),
    bicicletas:
      bicicleta && (bicicleta.marca || bicicleta.modelo)
        ? [
            {
              ...bicicleta,
              id: bicicletaId || Date.now() + Math.random(),
            },
          ]
        : [],
  };

  if (nuevoCliente.bicicletas.length > 0) {
    bicicletaId = nuevoCliente.bicicletas[0].id;
  }

  const ref = await addTenantItem("clientes", nuevoCliente, tenantId);

  const clienteFinal = {
    ...nuevoCliente,
    firebaseId: ref.id,
  };

  guardarClientesLocales([clienteFinal, ...clientes]);

  return {
    clienteId: clienteFinal.id,
    bicicletaId,
  };
}