import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import tbwLogo from "../../assets/logos/tbw-logo.png";
import { getWorkshopConfig } from "../../utils/workshopConfig";

const puntosGrasa = [
  "Maza trasera (balines o baleros sellados)",
  "Trinquetes",
  "Centro / Bottom bracket",
  "Maza delantera",
  "Grasa de ensamble",
  "Grasa de ensamble de carbono-carbono",
  "Dirección",
  "Núcleo (mazas con balas)",
];

const checklistFinal = [
  "Frenos",
  "Llantas",
  "Cambios",
  "Rines",
  "Potencia",
  "Poste de asiento",
  "Aceite",
  "Torque de tornillería",
  "Prueba dinámica realizada por mecánico",
  "Bielas",
  "Ejes",
  "Pedales",
  "Rotores",
  "Silicon protector",
];

function fechaActual() {
  return new Date().toLocaleDateString("es-MX");
}

function formatoMXN(valor) {
  return `$${Number(valor || 0).toFixed(2)}`;
}

function safeText(value) {
  return String(value || "Sin registro");
}

function cargarImagen(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error("Sin imagen"));
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function imageToDataUrl(src, quality = 0.92, tipo = "jpeg") {
  const img = await cargarImagen(src);

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;

  const ctx = canvas.getContext("2d");

  if (tipo === "jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(img, 0, 0);

  if (tipo === "png") {
    return canvas.toDataURL("image/png");
  }

  return canvas.toDataURL("image/jpeg", quality);
}

async function addImageContain(pdf, src, x, y, w, h, options = {}) {
  const {
    background = [243, 244, 246],
    border = true,
    quality = 0.92,
  } = options;

  try {
    const dataUrl = await imageToDataUrl(src, quality, options.tipo || "jpeg");
    const props = pdf.getImageProperties(dataUrl);

    const ratio = props.width / props.height;
    let drawW = w;
    let drawH = w / ratio;

    if (drawH > h) {
      drawH = h;
      drawW = h * ratio;
    }

    const drawX = x + (w - drawW) / 2;
    const drawY = y + (h - drawH) / 2;

    pdf.setFillColor(...background);
    pdf.roundedRect(x, y, w, h, 2, 2, "F");

    if (border) {
      pdf.setDrawColor(229, 231, 235);
      pdf.roundedRect(x, y, w, h, 2, 2, "S");
    }

    const imageFormat =
  options.tipo === "png" || dataUrl.startsWith("data:image/png")
    ? "PNG"
    : "JPEG";

pdf.addImage(dataUrl, imageFormat, drawX, drawY, drawW, drawH);
  } catch (error) {
    pdf.setFillColor(...background);
    pdf.roundedRect(x, y, w, h, 2, 2, "F");
    pdf.setTextColor(120, 120, 120);
    pdf.setFontSize(8);
    pdf.text("Imagen no disponible", x + 4, y + h / 2);
  }
}

function addWrappedText(pdf, text, x, y, maxWidth, lineHeight = 5) {
  const lines = pdf.splitTextToSize(safeText(text), maxWidth);
  pdf.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function generarListaFotosRecepcion(formData) {
  const fotos = [];

  if (formData?.fotosRecepcion?.lateral1) {
    fotos.push({
      src: formData.fotosRecepcion.lateral1,
      label: "Lateral 1",
      description: "",
    });
  }

  if (formData?.fotosRecepcion?.lateral2) {
    fotos.push({
      src: formData.fotosRecepcion.lateral2,
      label: "Lateral 2",
      description: "",
    });
  }

  return fotos;
}

function generarListaEvidencias(evidencias = []) {
  return evidencias
    .map((foto, index) => ({
      src: foto.annotatedSrc || foto.originalSrc || foto.src || "",
      label: `Evidencia ${index + 1}`,
      description: foto.description || "",
    }))
    .filter((foto) => foto.src);
}

export async function generarPDFServicio({
  formData,
  evidencias = [],
  checklist = {},
  grasas = {},
  mediciones = {},
  observacionesFinales = "",
  firmaCliente = "",
  firmaTaller = "",
  totalServicio = 0,
  nombreArchivo = "servicio.pdf",
}) {
  const config = getWorkshopConfig();

  const pdf = new jsPDF("p", "mm", "a4");

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 10;
  const contentWidth = pageWidth - margin * 2;

  let y = margin;

  const orange = [241, 90, 36];
  const dark = [17, 17, 17];
  const muted = [107, 114, 128];
  const border = [229, 231, 235];
  const light = [249, 250, 251];

  async function addHeader() {
const logoSrc = tbwLogo;
await addImageContain(pdf, logoSrc, margin, y, 70, 28, {
  background: [255, 255, 255],
  border: false,
  quality: 0.95,
  tipo: "png",
});

    pdf.setDrawColor(...border);
    pdf.roundedRect(pageWidth - margin - 62, y, 62, 24, 3, 3, "S");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(...muted);
    pdf.text("HOJA DE SERVICIO", pageWidth - margin - 58, y + 8);

    pdf.setFontSize(10);
    pdf.setTextColor(...orange);
    pdf.text(safeText(formData.folio), pageWidth - margin - 58, y + 16);

    y += 30;

    pdf.setDrawColor(...orange);
    pdf.setLineWidth(1);
    pdf.line(margin, y, pageWidth - margin, y);

    y += 7;
  }

  function addFooter() {
    const page = pdf.internal.getNumberOfPages();

    pdf.setFontSize(7);
    pdf.setTextColor(...muted);
    pdf.text(
`Titan Bike Works · ${fechaActual()} · Página ${page}`,
      margin,
      pageHeight - 5
    );
  }

  async function newPage() {
    addFooter();
    pdf.addPage();
    y = margin;
    await addHeader();
  }

  async function ensureSpace(requiredHeight) {
    if (y + requiredHeight > pageHeight - margin - 8) {
      await newPage();
    }
  }

  async function sectionTitle(title) {
    await ensureSpace(12);

    pdf.setFillColor(...dark);
    pdf.roundedRect(margin, y, contentWidth, 8, 2, 2, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    pdf.text(title.toUpperCase(), margin + 4, y + 5.5);

    y += 11;
  }

  async function keyValueGrid(items, columns = 2) {
    const colGap = 5;
    const colWidth = (contentWidth - colGap * (columns - 1)) / columns;
    const lineHeight = 5;

    for (let i = 0; i < items.length; i += columns) {
      const row = items.slice(i, i + columns);
      let rowHeight = 9;

      row.forEach((item) => {
        const valueLines = pdf.splitTextToSize(
          safeText(item.value),
          colWidth - 6
        );
        rowHeight = Math.max(rowHeight, 6 + valueLines.length * lineHeight);
      });

      await ensureSpace(rowHeight + 2);

      row.forEach((item, index) => {
        const x = margin + index * (colWidth + colGap);

        pdf.setFillColor(...light);
        pdf.setDrawColor(...border);
        pdf.roundedRect(x, y, colWidth, rowHeight, 2, 2, "FD");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);
        pdf.setTextColor(...orange);
        pdf.text(item.label, x + 3, y + 4.5);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(...dark);

        const valueLines = pdf.splitTextToSize(
          safeText(item.value),
          colWidth - 6
        );
        pdf.text(valueLines, x + 3, y + 8.5);
      });

      y += rowHeight + 3;
    }
  }

  async function paragraph(text) {
    await ensureSpace(14);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...dark);

    const lines = pdf.splitTextToSize(safeText(text), contentWidth - 6);
    const h = lines.length * 4.5 + 7;

    await ensureSpace(h);

    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(...border);
    pdf.roundedRect(margin, y, contentWidth, h, 2, 2, "S");

    pdf.text(lines, margin + 3, y + 5);

    y += h + 4;
  }

  async function photoGrid(title, photos = []) {
    await sectionTitle(title);

    if (!photos.length) {
      await paragraph("Sin fotografías registradas.");
      return;
    }

    const gap = 5;
    const boxW = (contentWidth - gap) / 2;
    const boxH = 63;
    const captionH = 11;
    const cardH = boxH + captionH + 5;

    for (let i = 0; i < photos.length; i += 2) {
      await ensureSpace(cardH + 4);

      const row = photos.slice(i, i + 2);

      for (let index = 0; index < row.length; index++) {
        const foto = row[index];
        const x = margin + index * (boxW + gap);

        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(...border);
        pdf.roundedRect(x, y, boxW, cardH, 2, 2, "S");

        await addImageContain(pdf, foto.src, x + 3, y + 3, boxW - 6, boxH, {
          background: [243, 244, 246],
          border: false,
          quality: 0.95,
        });

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);
        pdf.setTextColor(...dark);
        pdf.text(foto.label, x + 3, y + boxH + 7);

        if (foto.description) {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7);
          pdf.setTextColor(...muted);
          const desc = pdf.splitTextToSize(foto.description, boxW - 6);
          pdf.text(desc.slice(0, 2), x + 3, y + boxH + 10);
        }
      }

      y += cardH + 5;
    }
  }

  async function checklistSection() {
    await sectionTitle("Checklist final");

    const columns = 3;
    const gap = 3;
    const boxW = (contentWidth - gap * (columns - 1)) / columns;
    const boxH = 8;

    for (let i = 0; i < checklistFinal.length; i += columns) {
      await ensureSpace(boxH + 3);

      const row = checklistFinal.slice(i, i + columns);

      row.forEach((item, index) => {
        const x = margin + index * (boxW + gap);
        const marcado = checklist[item] ? "SI" : "NO";

        pdf.setFillColor(...light);
        pdf.setDrawColor(...border);
        pdf.roundedRect(x, y, boxW, boxH, 2, 2, "FD");

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6.7);
        pdf.setTextColor(...dark);

        const label = pdf.splitTextToSize(item, boxW - 14);
        pdf.text(label.slice(0, 1), x + 2, y + 5);

        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...orange);
        pdf.text(marcado, x + boxW - 10, y + 5);
      });

      y += boxH + 3;
    }

    y += 2;
  }

  async function conceptsSection() {
    await sectionTitle("Conceptos y costos");

    const conceptos = formData.conceptos || [];

    if (!conceptos.length) {
      await paragraph("Sin conceptos agregados.");
    } else {
      for (const item of conceptos) {
        await ensureSpace(9);

        const importe =
          Number(item.cantidad || 0) * Number(item.precio || 0);

        pdf.setDrawColor(...border);
        pdf.line(margin, y, pageWidth - margin, y);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(...dark);

        const desc = `${item.cantidad} × ${item.descripcion}`;
        pdf.text(pdf.splitTextToSize(desc, 130), margin, y + 5);

        pdf.setFont("helvetica", "bold");
        pdf.text(formatoMXN(importe), pageWidth - margin - 30, y + 5);

        y += 9;
      }
    }

    await ensureSpace(14);

    pdf.setFillColor(...dark);
    pdf.roundedRect(margin, y, contentWidth, 11, 2, 2, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255);
    pdf.text("TOTAL", margin + 4, y + 7);
    pdf.text(formatoMXN(totalServicio), pageWidth - margin - 35, y + 7);

    y += 16;
  }

  async function firmasSection() {
    if (!firmaCliente && !firmaTaller) return;

    await sectionTitle("Firmas");

    const boxW = (contentWidth - 8) / 2;
    const boxH = 28;

    await ensureSpace(boxH + 8);

    const firmas = [
      {
        label: "Firma del cliente",
        src: firmaCliente,
      },
      {
        label: "Firma del mecánico / taller",
        src: firmaTaller,
      },
    ];

    for (let i = 0; i < firmas.length; i++) {
      const x = margin + i * (boxW + 8);

      pdf.setDrawColor(...border);
      pdf.roundedRect(x, y, boxW, boxH, 2, 2, "S");

      if (firmas[i].src) {
        await addImageContain(pdf, firmas[i].src, x + 4, y + 3, boxW - 8, 14, {
          background: [255, 255, 255],
          border: false,
          quality: 0.95,
        });
      } else {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(...muted);
        pdf.text("Sin firma", x + 4, y + 12);
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.setTextColor(...dark);
      pdf.text(firmas[i].label, x + 4, y + boxH - 4);
    }

    y += boxH + 5;
  }

  await addHeader();

  await sectionTitle("Cliente y bicicleta");
  await keyValueGrid([
    { label: "Cliente", value: formData.cliente },
    { label: "Teléfono", value: formData.telefono },
    {
      label: "Marca / modelo",
      value: `${formData.marca || ""} ${formData.modelo || ""}`.trim(),
    },
    { label: "Color", value: formData.color },
    { label: "Tipo", value: formData.tipo },
    { label: "Rodada", value: formData.rodada },
    { label: "Material", value: formData.material },
    { label: "Serie", value: formData.numeroSerie },
  ]);

  await sectionTitle("Recepción");
  await keyValueGrid([
    { label: "Fecha", value: formData.fechaIngreso },
    { label: "Servicio", value: formData.tipoServicio },
    { label: "Accesorios", value: formData.accesorios },
    { label: "Transmisión", value: formData.transmision },
  ]);

  await paragraph(`Estado mecánico de ingreso: ${formData.estadoMecanico || "Sin observaciones"}`);

  await photoGrid("Fotos de recepción", generarListaFotosRecepcion(formData));
  await photoGrid("Evidencias fotográficas", generarListaEvidencias(evidencias));

  await checklistSection();

  await sectionTitle("Mediciones y consumibles");
  await keyValueGrid([
    { label: "Rotor delantero", value: mediciones.rotorDelantero },
    { label: "Rotor trasero", value: mediciones.rotorTrasero },
    { label: "Balatas delanteras", value: mediciones.balatasDelanteras },
    { label: "Balatas traseras", value: mediciones.balatasTraseras },
    { label: "Cadena", value: mediciones.cadena },
    { label: "Lubricante", value: mediciones.lubricanteCadena },
  ]);

  await sectionTitle("Grasas utilizadas");
  await keyValueGrid(
    puntosGrasa.map((punto) => ({
      label: punto,
      value: grasas[punto] || "No aplica / sin registro",
    })),
    1
  );

  await sectionTitle("Observaciones después del mantenimiento");
  await paragraph(observacionesFinales || "Sin observaciones finales registradas.");

  await conceptsSection();

  await firmasSection();

  addFooter();

  pdf.save(nombreArchivo);
}

function normalizarFotosSuspension(fotos) {
  if (!fotos) return [];

  if (Array.isArray(fotos)) {
    return fotos
      .map((foto, index) => ({
        src: foto.annotatedSrc || foto.originalSrc || foto.src || "",
        label: foto.description || `Foto ${index + 1}`,
      }))
      .filter((foto) => foto.src);
  }

  return Object.values(fotos)
    .filter(Boolean)
    .map((src, index) => ({
      src,
      label: `Foto ${index + 1}`,
    }));
}

export async function generarPDFSuspension({
  suspension,
  nombreArchivo = "suspension.pdf",
}) {
  const pdf = new jsPDF("p", "mm", "a4");

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 10;
  const contentWidth = pageWidth - margin * 2;

  let y = margin;

  const orange = [241, 90, 36];
  const dark = [17, 17, 17];
  const muted = [107, 114, 128];
  const border = [229, 231, 235];
  const light = [249, 250, 251];

  const total = (suspension.conceptos || []).reduce((acc, item) => {
    return acc + Number(item.cantidad || 0) * Number(item.precio || 0);
  }, 0);

  async function addHeader() {
    await addImageContain(pdf, tbwLogo, margin, y, 70, 28, {
      background: [255, 255, 255],
      border: false,
      quality: 0.95,
      tipo: "png",
    });

    pdf.setDrawColor(...border);
    pdf.roundedRect(pageWidth - margin - 70, y, 70, 24, 3, 3, "S");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(...muted);
    pdf.text("SERVICIO DE SUSPENSIÓN", pageWidth - margin - 66, y + 8);

    pdf.setFontSize(10);
    pdf.setTextColor(...orange);
    pdf.text(safeText(suspension.folio), pageWidth - margin - 66, y + 16);

    y += 30;

    pdf.setDrawColor(...orange);
    pdf.setLineWidth(1);
    pdf.line(margin, y, pageWidth - margin, y);

    y += 7;
  }

  function addFooter() {
    const page = pdf.internal.getNumberOfPages();

    pdf.setFontSize(7);
    pdf.setTextColor(...muted);
    pdf.text(
      `Titan Bike Works · ${fechaActual()} · Página ${page}`,
      margin,
      pageHeight - 5
    );
  }

  async function newPage() {
    addFooter();
    pdf.addPage();
    y = margin;
    await addHeader();
  }

  async function ensureSpace(requiredHeight) {
    if (y + requiredHeight > pageHeight - margin - 8) {
      await newPage();
    }
  }

  async function sectionTitle(title) {
    await ensureSpace(12);

    pdf.setFillColor(...dark);
    pdf.roundedRect(margin, y, contentWidth, 8, 2, 2, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    pdf.text(title.toUpperCase(), margin + 4, y + 5.5);

    y += 11;
  }

  async function keyValueGrid(items, columns = 2) {
    const gap = 5;
    const colWidth = (contentWidth - gap * (columns - 1)) / columns;

    for (let i = 0; i < items.length; i += columns) {
      const row = items.slice(i, i + columns);
      let rowHeight = 10;

      row.forEach((item) => {
        const valueLines = pdf.splitTextToSize(
          safeText(item.value),
          colWidth - 6
        );
        rowHeight = Math.max(rowHeight, 7 + valueLines.length * 4.5);
      });

      await ensureSpace(rowHeight + 2);

      row.forEach((item, index) => {
        const x = margin + index * (colWidth + gap);

        pdf.setFillColor(...light);
        pdf.setDrawColor(...border);
        pdf.roundedRect(x, y, colWidth, rowHeight, 2, 2, "FD");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);
        pdf.setTextColor(...orange);
        pdf.text(item.label, x + 3, y + 4.5);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(...dark);

        const valueLines = pdf.splitTextToSize(
          safeText(item.value),
          colWidth - 6
        );

        pdf.text(valueLines, x + 3, y + 8.5);
      });

      y += rowHeight + 3;
    }
  }

  async function paragraph(text) {
    const lines = pdf.splitTextToSize(safeText(text), contentWidth - 6);
    const h = lines.length * 4.5 + 7;

    await ensureSpace(h);

    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(...border);
    pdf.roundedRect(margin, y, contentWidth, h, 2, 2, "S");

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...dark);
    pdf.text(lines, margin + 3, y + 5);

    y += h + 4;
  }

  async function photoGrid(title, photos = []) {
    await sectionTitle(title);

    if (!photos.length) {
      await paragraph("Sin fotografías registradas.");
      return;
    }

    const gap = 5;
    const boxW = (contentWidth - gap) / 2;
    const boxH = 63;
    const captionH = 11;
    const cardH = boxH + captionH + 5;

    for (let i = 0; i < photos.length; i += 2) {
      await ensureSpace(cardH + 4);

      const row = photos.slice(i, i + 2);

      for (let index = 0; index < row.length; index++) {
        const foto = row[index];
        const x = margin + index * (boxW + gap);

        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(...border);
        pdf.roundedRect(x, y, boxW, cardH, 2, 2, "S");

        await addImageContain(pdf, foto.src, x + 3, y + 3, boxW - 6, boxH, {
          background: [243, 244, 246],
          border: false,
          quality: 0.95,
        });

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);
        pdf.setTextColor(...dark);

        const label = pdf.splitTextToSize(foto.label, boxW - 6);
        pdf.text(label.slice(0, 2), x + 3, y + boxH + 7);
      }

      y += cardH + 5;
    }
  }

  async function conceptsSection() {
    await sectionTitle("Conceptos y costos");

    const conceptos = suspension.conceptos || [];

    if (!conceptos.length) {
      await paragraph("Sin conceptos registrados.");
    } else {
      for (const item of conceptos) {
        await ensureSpace(9);

        const importe =
          Number(item.cantidad || 0) * Number(item.precio || 0);

        pdf.setDrawColor(...border);
        pdf.line(margin, y, pageWidth - margin, y);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(...dark);

        const desc = `${item.cantidad} × ${item.descripcion}`;
        pdf.text(pdf.splitTextToSize(desc, 130), margin, y + 5);

        pdf.setFont("helvetica", "bold");
        pdf.text(formatoMXN(importe), pageWidth - margin - 30, y + 5);

        y += 9;
      }
    }

    await ensureSpace(14);

    pdf.setFillColor(...dark);
    pdf.roundedRect(margin, y, contentWidth, 11, 2, 2, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255);
    pdf.text("TOTAL", margin + 4, y + 7);
    pdf.text(formatoMXN(total), pageWidth - margin - 35, y + 7);

    y += 16;
  }

  async function firmaSection() {
    if (!suspension.firmaCliente) return;

    await sectionTitle("Firma");

    await ensureSpace(34);

    pdf.setDrawColor(...border);
    pdf.roundedRect(margin, y, contentWidth, 30, 2, 2, "S");

    await addImageContain(
      pdf,
      suspension.firmaCliente,
      margin + 4,
      y + 3,
      contentWidth - 8,
      16,
      {
        background: [255, 255, 255],
        border: false,
        quality: 0.95,
      }
    );

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(...dark);
    pdf.text("Firma del cliente", margin + 4, y + 26);

    y += 35;
  }

  await addHeader();

  await sectionTitle("Cliente");
  await keyValueGrid([
    { label: "Cliente", value: suspension.cliente },
    { label: "Teléfono", value: suspension.telefono },
    { label: "Fecha", value: suspension.fechaCreacion },
    { label: "Estado", value: suspension.estado || "abierta" },
  ]);

  if (suspension.vieneConBicicleta) {
    await sectionTitle("Bicicleta recibida");
    await keyValueGrid([
      { label: "Bicicleta", value: suspension.bicicleta },
      { label: "Marca", value: suspension.bikeMarca },
      { label: "Modelo", value: suspension.bikeModelo },
      { label: "Color", value: suspension.bikeColor },
      { label: "Rodada", value: suspension.bikeRodada },
      { label: "Accesorios", value: suspension.accesoriosBicicleta },
    ]);
  }

  await sectionTitle("Datos de suspensión");
  await keyValueGrid([
    { label: "Tipo suspensión", value: suspension.tipoSuspension },
    { label: "Marca", value: suspension.marca },
    { label: "Modelo", value: suspension.modelo },
    { label: "Serie", value: suspension.numeroSerie },
    { label: "ID", value: suspension.identificador },
    { label: "Color", value: suspension.color },
    { label: "Tipo", value: suspension.tipo },
    { label: "Acabado", value: suspension.acabado },
    { label: "Bloqueo", value: suspension.bloqueo },
    { label: "Rebote", value: suspension.rebote },
    { label: "Tubo", value: suspension.tubo },
    { label: "Eje / Montura", value: suspension.ejeMontura },
    { label: "Rodada / Medida", value: suspension.rodada },
    { label: "PSI antes", value: suspension.psiAntes },
    { label: "Bloqueo antes", value: suspension.bloqueoAntes },
    { label: "Rebote antes", value: suspension.reboteAntes },
  ]);

  await photoGrid(
    "Fotos laterales de bicicleta",
    normalizarFotosSuspension(suspension.fotosBicicleta)
  );

  await photoGrid(
    "Fotos de suspensión al recibir",
    normalizarFotosSuspension(suspension.fotosSuspensionRecepcion)
  );

  await photoGrid(
    "Marcas o daños al recibir",
    normalizarFotosSuspension(suspension.fotosDanos)
  );

  await sectionTitle("Detalles antes del mantenimiento");
  await paragraph(suspension.detallesAntes || "Sin observaciones.");

  await sectionTitle("Tipo de mantenimiento");
  await paragraph(suspension.tipoMantenimiento || "Sin registro.");

  await sectionTitle("Insumos y kits utilizados");
  await paragraph(suspension.insumos || "Sin registro.");

  await photoGrid(
    "Evidencia del mantenimiento",
    normalizarFotosSuspension(suspension.fotosEvidencia)
  );

  await sectionTitle("Observaciones después del mantenimiento");
  await paragraph(suspension.observacionesFinales || "Sin observaciones.");

  if (suspension.entregaDomicilio) {
    await sectionTitle("Entrega a domicilio");
    await paragraph(
      suspension.fechaEntregaDomicilio
        ? `Programada para ${suspension.fechaEntregaDomicilio}`
        : "Entrega a domicilio pendiente sin fecha."
    );
  }

  await conceptsSection();

  await firmaSection();

  addFooter();

  pdf.save(nombreArchivo);
}

/* Se conserva para módulos que todavía usan html2canvas */
export async function generarPDFDesdeElemento(elemento, nombreArchivo) {
  if (!elemento) {
    alert("No se encontró la hoja para generar el PDF.");
    return;
  }

  const pdf = new jsPDF("p", "mm", "a4");

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 8;
  const usableWidth = pageWidth - margin * 2;

  const clon = elemento.cloneNode(true);

  clon.style.width = "794px";
  clon.style.maxWidth = "794px";
  clon.style.position = "fixed";
  clon.style.left = "-99999px";
  clon.style.top = "0";
  clon.style.background = "#ffffff";
  clon.style.overflow = "visible";

  document.body.appendChild(clon);

  await new Promise((resolve) => setTimeout(resolve, 300));

  const canvas = await html2canvas(clon, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    windowWidth: 794,
    scrollX: 0,
    scrollY: 0,
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  const imgHeight = (canvas.height * usableWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = margin;

  pdf.addImage(imgData, "JPEG", margin, position, usableWidth, imgHeight);
  heightLeft -= pageHeight - margin * 2;

  while (heightLeft > 0) {
    pdf.addPage();
    position = heightLeft - imgHeight + margin;
    pdf.addImage(imgData, "JPEG", margin, position, usableWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;
  }

  document.body.removeChild(clon);
  pdf.save(nombreArchivo);
}