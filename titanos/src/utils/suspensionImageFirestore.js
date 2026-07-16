import {
  addTenantItem,
  deleteTenantItem,
  getTenantItems,
  updateTenantItem,
} from "../firebase/firestore";

const COLLECTION = "suspensionFotos";

const MAX_IMAGE_SIDE = 720;
const JPEG_QUALITY = 0.5;

function crearId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cargarImagenDesdeSrc(src) {
  return new Promise((resolve, reject) => {
    const imagen = new Image();

    imagen.onload = () => resolve(imagen);
    imagen.onerror = () =>
      reject(new Error("No se pudo procesar la imagen seleccionada."));

    imagen.src = src;
  });
}

function leerArchivoComoDataUrl(archivo) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () =>
      reject(new Error("No se pudo leer el archivo seleccionado."));

    reader.readAsDataURL(archivo);
  });
}

async function comprimirSrc(src) {
  const imagen = await cargarImagenDesdeSrc(src);

  const anchoOriginal = imagen.naturalWidth || imagen.width;
  const altoOriginal = imagen.naturalHeight || imagen.height;

  if (!anchoOriginal || !altoOriginal) {
    throw new Error("La imagen no tiene dimensiones válidas.");
  }

  const escala = Math.min(
    MAX_IMAGE_SIDE / anchoOriginal,
    MAX_IMAGE_SIDE / altoOriginal,
    1
  );

  const ancho = Math.max(1, Math.round(anchoOriginal * escala));
  const alto = Math.max(1, Math.round(altoOriginal * escala));

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;

  const context = canvas.getContext("2d", {
    alpha: false,
  });

  if (!context) {
    throw new Error("El navegador no pudo preparar la imagen.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, ancho, alto);
  context.drawImage(imagen, 0, 0, ancho, alto);

  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

export async function comprimirArchivoImagen(archivo) {
  if (!archivo) {
    throw new Error("No se recibió una imagen.");
  }

  const src = await leerArchivoComoDataUrl(archivo);
  return comprimirSrc(src);
}

export async function comprimirDataUrlImagen(src) {
  if (!src) {
    throw new Error("No se recibió una imagen.");
  }

  if (!String(src).startsWith("data:image/")) {
    return src;
  }

  return comprimirSrc(src);
}

export async function obtenerFotosSuspensiones(tenantId) {
  return getTenantItems(COLLECTION, tenantId);
}

export async function crearFotoSuspension({
  tenantId,
  suspensionFirebaseId,
  suspensionId,
  grupo,
  src,
  description = "",
  id = crearId(),
}) {
  const data = {
    id,
    suspensionFirebaseId: suspensionFirebaseId || "",
    suspensionId: suspensionId || "",
    grupo,
    src,
    description,
  };

  const ref = await addTenantItem(COLLECTION, data, tenantId);

  return {
    ...data,
    firebaseId: ref.id,
    originalSrc: src,
    annotatedSrc: src,
  };
}

export async function actualizarFotoSuspension({
  tenantId,
  foto,
  suspensionFirebaseId,
  suspensionId,
  grupo,
}) {
  const src =
    foto.src ||
    foto.annotatedSrc ||
    foto.originalSrc ||
    "";

  const data = {
    id: foto.id || crearId(),
    suspensionFirebaseId: suspensionFirebaseId || "",
    suspensionId: suspensionId || "",
    grupo,
    src,
    description: foto.description || "",
  };

  if (foto.firebaseId) {
    await updateTenantItem(
      COLLECTION,
      foto.firebaseId,
      data,
      tenantId
    );

    return {
      ...foto,
      ...data,
      originalSrc: src,
      annotatedSrc: src,
    };
  }

  return crearFotoSuspension({
    tenantId,
    ...data,
  });
}

export async function eliminarFotoSuspensionFirestore({
  tenantId,
  firebaseId,
}) {
  if (!firebaseId) return;

  await deleteTenantItem(COLLECTION, firebaseId, tenantId);
}

export function normalizarFotoFirestore(foto) {
  const src =
    foto.src ||
    foto.annotatedSrc ||
    foto.originalSrc ||
    "";

  return {
    ...foto,
    id: foto.id || crearId(),
    src,
    originalSrc: src,
    annotatedSrc: src,
    description: foto.description || "",
  };
}