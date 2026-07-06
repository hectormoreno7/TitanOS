import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function generarPDFDesdeElemento(elemento, nombreArchivo) {
  if (!elemento) {
    alert("No se encontró la previsualización para generar el PDF.");
    return;
  }

  const pdf = new jsPDF("p", "mm", "a4");

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 8;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;

  const clon = elemento.cloneNode(true);
  clon.style.width = "794px";
  clon.style.maxWidth = "794px";
  clon.style.position = "fixed";
  clon.style.left = "-9999px";
  clon.style.top = "0";
  clon.style.background = "#ffffff";

  document.body.appendChild(clon);

  const sections = Array.from(clon.children);
  let currentY = margin;
  let isFirstPage = true;

  for (const section of sections) {
    const canvas = await html2canvas(section, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: 794,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const imgHeight = (canvas.height * usableWidth) / canvas.width;

    if (currentY + imgHeight > usableHeight + margin && !isFirstPage) {
      pdf.addPage();
      currentY = margin;
    }

    if (currentY + imgHeight > usableHeight + margin && isFirstPage) {
      pdf.addPage();
      currentY = margin;
      isFirstPage = false;
    }

    pdf.addImage(imgData, "JPEG", margin, currentY, usableWidth, imgHeight);
    currentY += imgHeight + 3;
    isFirstPage = false;
  }

  document.body.removeChild(clon);

  pdf.save(nombreArchivo);
}