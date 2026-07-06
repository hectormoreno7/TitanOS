import { getWorkshopConfig } from "../../utils/workshopConfig";
import titanosLogo from "../../assets/logos/titanos-logo.png";

function Contacto() {
  const config = getWorkshopConfig();

  const whatsappTaller = (config.whatsapp || config.telefono || "").replace(/\D/g, "");
  const telefonoDev = "2284055421";

  return (
    <section className="contact-page">
      <div className="module-header">
        <div>
          <h2>Contacto</h2>
          <p>Datos del taller y soporte de TitanOS.</p>
        </div>
      </div>

      <div className="contact-grid">
        <div className="contact-card">
          {config.logo && <img src={config.logo} alt={config.nombre} />}

          <h3>{config.nombre || "Taller"}</h3>

          <div className="contact-info">
            <p><strong>Teléfono:</strong> {config.telefono || "Sin registro"}</p>
            <p><strong>WhatsApp:</strong> {config.whatsapp || "Sin registro"}</p>
            <p><strong>Correo:</strong> {config.correo || "Sin registro"}</p>
            <p><strong>Dirección:</strong> {config.direccion || "Sin registro"}</p>
          </div>

          <div className="contact-actions">
            {config.telefono && <a href={`tel:${config.telefono}`} className="primary-button">Llamar</a>}

            {whatsappTaller && (
              <a href={`https://wa.me/52${whatsappTaller}`} target="_blank" rel="noreferrer" className="primary-button">
                WhatsApp
              </a>
            )}

            {config.correo && <a href={`mailto:${config.correo}`} className="secondary-button">Correo</a>}

            {config.googleMaps && (
              <a href={config.googleMaps} target="_blank" rel="noreferrer" className="secondary-button">
                Ubicación
              </a>
            )}
          </div>
        </div>

        <div className="contact-card developer-card">
          <img src={titanosLogo} alt="TitanOS" />

          <h3>Soporte TitanOS</h3>

          <div className="contact-info">
            <p><strong>Desarrollador:</strong> Héctor Zárate Moreno</p>
            <p><strong>Teléfono:</strong> {telefonoDev}</p>
            <p><strong>WhatsApp:</strong> {telefonoDev}</p>
          </div>

          <div className="contact-actions">
            <a href={`tel:${telefonoDev}`} className="primary-button">Llamar</a>

            <a
              href={`https://wa.me/52${telefonoDev}`}
              target="_blank"
              rel="noreferrer"
              className="primary-button"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Contacto;