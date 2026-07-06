import tbwLogo from "../../assets/logos/tbw-logo.png";
import { getWorkshopConfig } from "../../utils/workshopConfig";

const deslinde = [
  "El cliente autoriza el traslado del artículo descrito en este recibo.",
  "Titan Bike Works tomará medidas razonables para asegurar el artículo durante el trayecto.",
  "Titan Bike Works no será responsable por daños, pérdidas o afectaciones derivadas de accidentes ocasionados por terceros, robo con violencia, vandalismo, fenómenos naturales, caso fortuito, fuerza mayor, condiciones de vialidad ajenas al taller o cualquier circunstancia externa fuera de su control razonable.",
  "Las fotografías adjuntas forman parte del registro visual de las condiciones observables al momento de la recolección o entrega.",
  "La firma del cliente confirma la autorización del traslado y la aceptación del presente deslinde.",
];

function FotoGrid({ titulo, fotos }) {
  if (!fotos?.lateral1 && !fotos?.lateral2) return null;

  return (
    <section className="er2-block">
      <h3>{titulo}</h3>

      <div className="er2-photo-grid">
        {fotos?.lateral1 && (
          <div>
            <img src={fotos.lateral1} alt={`${titulo} 1`} />
            <span>Foto 1</span>
          </div>
        )}

        {fotos?.lateral2 && (
          <div>
            <img src={fotos.lateral2} alt={`${titulo} 2`} />
            <span>Foto 2</span>
          </div>
        )}
      </div>
    </section>
  );
}

function FirmaBox({ titulo, firma }) {
  return (
    <section className="er2-signature">
      <div>
        {firma ? <img src={firma} alt={titulo} /> : <span>Sin firma</span>}
        <strong>{titulo}</strong>
      </div>
    </section>
  );
}

function MovimientoReceipt({ movimiento, receiptRef }) {
  const config = getWorkshopConfig();

  const esRecoleccion =
    movimiento.tipo === "Recolección" ||
    movimiento.tipo === "Recolección y entrega";

  const esEntrega =
    movimiento.tipo === "Entrega" ||
    movimiento.tipo === "Recolección y entrega";

  const tipoArticulo =
    movimiento.tipoItem === "suspension" ? "Suspensión" : "Bicicleta";

  const articulo =
    movimiento.tipoItem === "suspension"
      ? movimiento.suspension || movimiento.itemNombre
      : movimiento.bicicleta || movimiento.itemNombre;

  return (
    <section className="er2-receipt" ref={receiptRef}>
      <header className="er2-receipt-header">
        <img src={config.logo || tbwLogo} alt={config.nombre} />

        <div>
          <span>RECIBO RECOLECCIÓN / ENTREGA</span>
          <strong>{movimiento.folio}</strong>
        </div>
      </header>

      <div className="er2-accent-line" />

      <section className="er2-block">
        <h3>Datos generales</h3>

        <div className="er2-data-grid">
          <p><b>Tipo:</b> {movimiento.tipo}</p>
          <p><b>Artículo:</b> {tipoArticulo}</p>
          <p><b>Fecha:</b> {movimiento.fechaCreacion}</p>
          <p><b>Hora:</b> {movimiento.horaCreacion}</p>
          <p><b>Cliente:</b> {movimiento.cliente}</p>
          <p><b>Teléfono:</b> {movimiento.telefono || "Sin registro"}</p>
          <p className="er2-full"><b>{tipoArticulo}:</b> {articulo}</p>
          <p className="er2-full">
            <b>Dirección:</b> {movimiento.direccion || "Sin registro"}
          </p>
        </div>
      </section>

      {movimiento.observaciones && (
        <section className="er2-block">
          <h3>Observaciones de recolección</h3>
          <p>{movimiento.observaciones}</p>
        </section>
      )}

      {movimiento.observacionesEntrega && (
        <section className="er2-block">
          <h3>Observaciones de entrega</h3>
          <p>{movimiento.observacionesEntrega}</p>
        </section>
      )}

      {esRecoleccion && (
        <FotoGrid
          titulo="Fotografías de recolección"
          fotos={movimiento.fotosRecoleccion}
        />
      )}

      {esRecoleccion && (
        <FirmaBox
          titulo="Firma de recolección"
          firma={movimiento.firmaRecoleccion}
        />
      )}

      {esEntrega && (
        <FotoGrid
          titulo="Fotografías de entrega"
          fotos={movimiento.fotosEntrega}
        />
      )}

      {esEntrega && (
        <FirmaBox
          titulo="Firma de entrega"
          firma={movimiento.firmaEntrega}
        />
      )}

      <section className="er2-block">
        <h3>Deslinde de responsabilidad</h3>
        <ol className="er2-legal">
          {deslinde.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ol>
      </section>
    </section>
  );
}

export default MovimientoReceipt;