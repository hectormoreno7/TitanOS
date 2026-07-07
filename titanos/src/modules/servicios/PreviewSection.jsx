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

function PreviewSection({
  previewRef,
  formData,
  evidencias,
  checklist,
  grasas,
  mediciones,
  observacionesFinales,
  firmaCliente,
  firmaTaller,
  totalServicio,
}) {
  const config = getWorkshopConfig();
  return (
    <div className="preview-scroll">
      <section className="service-preview compact-preview" ref={previewRef}>
        <header className="preview-doc-header">
         <img
  src={config.logo || tbwLogo}
  alt={config.nombre}
  className="preview-doc-logo"
/>

          <div className="preview-doc-meta">
            <span>HOJA DE SERVICIO</span>
            <strong>{formData.folio}</strong>
          </div>
        </header>

        <div className="preview-accent-line" />

        <section className="preview-block two-columns">
          <div>
            <h3>Cliente</h3>
            <p><b>Nombre:</b> {formData.cliente}</p>
            <p><b>Teléfono:</b> {formData.telefono}</p>
          </div>

          <div>
            <h3>Bicicleta</h3>
            <p><b>Marca / modelo:</b> {formData.marca} {formData.modelo}</p>
            <p><b>Color:</b> {formData.color || "Sin registro"}</p>
            <p><b>Tipo:</b> {formData.tipo || "Sin registro"}</p>
            <p><b>Rodada:</b> {formData.rodada || "Sin registro"}</p>
            <p><b>Material:</b> {formData.material || "Sin registro"}</p>
            <p><b>Serie:</b> {formData.numeroSerie || "Sin registro"}</p>
          </div>
        </section>

        <section className="preview-block">
          <h3>Recepción</h3>

          <div className="preview-data-grid compact-data">
            <p><b>Fecha:</b> {formData.fechaIngreso}</p>
            <p><b>Servicio:</b> {formData.tipoServicio}</p>
            <p><b>Accesorios:</b> {formData.accesorios || "Sin registro"}</p>
            <p><b>Transmisión:</b> {formData.transmision || "Sin registro"}</p>
          </div>

          <p className="preview-long-text">
            <b>Estado mecánico de ingreso:</b> {formData.estadoMecanico || "Sin observaciones"}
          </p>

          <div className="preview-photo-grid compact-photos">
            {formData.fotosRecepcion?.lateral1 && (
              <div className="preview-photo-card">
                <img src={formData.fotosRecepcion.lateral1} alt="Lateral 1" />
                <p>Lateral 1</p>
              </div>
            )}

            {formData.fotosRecepcion?.lateral2 && (
              <div className="preview-photo-card">
                <img src={formData.fotosRecepcion.lateral2} alt="Lateral 2" />
                <p>Lateral 2</p>
              </div>
            )}
          </div>
        </section>

        <section className="preview-block">
          <h3>Evidencias fotográficas</h3>

          {evidencias.length === 0 && <p>Sin fotografías agregadas.</p>}

          <div className="preview-photo-grid compact-photos">
            {evidencias.map((foto) => (
              <div key={foto.id} className="preview-photo-card">
                <img src={foto.annotatedSrc} alt="Evidencia" />
                {foto.description && <p>{foto.description}</p>}
              </div>
            ))}
          </div>
        </section>

        <section className="preview-block">
          <h3>Checklist final</h3>

          <div className="preview-checklist compact-checklist">
            {checklistFinal.map((item) => (
              <div key={item} className="preview-check-item">
                <span>{item}</span>
                <strong>{checklist[item] ? "✓" : "✕"}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="preview-block two-columns">
          <div>
            <h3>Mediciones y consumibles</h3>
            <p><b>Rotor delantero:</b> {mediciones.rotorDelantero || "Sin registro"}</p>
            <p><b>Rotor trasero:</b> {mediciones.rotorTrasero || "Sin registro"}</p>
            <p><b>Balatas delanteras:</b> {mediciones.balatasDelanteras || "Sin registro"}</p>
            <p><b>Balatas traseras:</b> {mediciones.balatasTraseras || "Sin registro"}</p>
            <p><b>Cadena:</b> {mediciones.cadena || "Sin registro"}</p>
            <p><b>Lubricante:</b> {mediciones.lubricanteCadena || "Sin registro"}</p>
          </div>

          <div>
            <h3>Grasas utilizadas</h3>
            {puntosGrasa.map((punto) => (
              <p key={punto}>
                <b>{punto}:</b> {grasas[punto] || "No aplica / sin registro"}
              </p>
            ))}
          </div>
        </section>

        <section className="preview-block">
          <h3>Observaciones después del mantenimiento</h3>
          <p>{observacionesFinales || "Sin observaciones finales registradas."}</p>
        </section>

        <section className="preview-block">
          <h3>Conceptos y costos</h3>

          {formData.conceptos.length === 0 && <p>Sin conceptos agregados.</p>}

          {formData.conceptos.map((item) => (
            <div className="preview-concept compact-concept" key={item.id}>
              <span>{item.cantidad} × {item.descripcion}</span>
              <strong>${(Number(item.cantidad) * Number(item.precio)).toFixed(2)}</strong>
            </div>
          ))}

          <div className="preview-total compact-total">
            <span>Total</span>
            <strong>${Number(totalServicio).toFixed(2)}</strong>
          </div>
        </section>

<section className="preview-signatures compact-signatures">
  <div className="signature-box">
    {firmaCliente ? (
      <img src={firmaCliente} alt="Firma cliente" className="preview-signature-img" />
    ) : (
      <span>Sin firma</span>
    )}

    <strong>Firma del cliente</strong>
  </div>

  <div className="signature-box">
    {firmaTaller ? (
      <img src={firmaTaller} alt="Firma taller" className="preview-signature-img" />
    ) : (
      <span>Sin firma</span>
    )}

    <strong>Firma del mecánico / taller</strong>
  </div>
</section>
      </section>
    </div>
  );
}

export default PreviewSection;