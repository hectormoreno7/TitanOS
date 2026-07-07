import html2canvas from "html2canvas";
import jsPDF from "jspdf";

function cargarImagen(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function normalizarImagenes(contenedor) {
  const imagenes = Array.from(contenedor.querySelectorAll("img"));

  for (const img of imagenes) {
    try {
      const src = img.getAttribute("src");
      if (!src) continue;

      const original = await cargarImagen(src);

      const boxW = 900;
      const boxH = 560;
      const canvas = document.createElement("canvas");
      canvas.width = boxW;
      canvas.height = boxH;

      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#f3f4f6";
      ctx.fillRect(0, 0, boxW, boxH);

      const scale = Math.min(boxW / original.width, boxH / original.height);
      const drawW = original.width * scale;
      const drawH = original.height * scale;
      const x = (boxW - drawW) / 2;
      const y = (boxH - drawH) / 2;

      ctx.drawImage(original, x, y, drawW, drawH);

      img.src = canvas.toDataURL("image/jpeg", 0.92);
      img.style.width = "100%";
      img.style.height = "auto";
      img.style.objectFit = "contain";
      img.style.display = "block";
      img.style.background = "#f3f4f6";
    } catch {
      // Si una imagen falla, continúa con las demás.
    }
  }
}

function agregarCanvasAlPDF(pdf, canvas, margin, usableWidth, pageHeight) {
  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  const imgHeight = (canvas.height * usableWidth) / canvas.width;

  let remainingHeight = imgHeight;
  let position = margin;

  pdf.addImage(imgData, "JPEG", margin, position, usableWidth, imgHeight);
  remainingHeight -= pageHeight - margin * 2;

  while (remainingHeight > 0) {
    pdf.addPage();
    position = remainingHeight - imgHeight + margin;
    pdf.addImage(imgData, "JPEG", margin, position, usableWidth, imgHeight);
    remainingHeight -= pageHeight - margin * 2;
  }
}

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
  clon.classList.add("pdf-export-mode");

  document.body.appendChild(clon);

  await normalizarImagenes(clon);
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

  agregarCanvasAlPDF(pdf, canvas, margin, usableWidth, pageHeight);

  document.body.removeChild(clon);

  pdf.save(nombreArchivo);
}