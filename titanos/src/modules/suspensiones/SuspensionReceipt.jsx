import tbwLogo from "../../assets/logos/tbw-logo.png";
import { getWorkshopConfig } from "../../utils/workshopConfig";

function normalizarFotos(fotos) {
  if (!fotos) return [];

  if (Array.isArray(fotos)) {
    return fotos
      .map((foto) => ({
        src: foto.annotatedSrc || foto.originalSrc || foto.src || "",
        description: foto.description || "",
      }))
      .filter((foto) => foto.src);
  }

  return Object.values(fotos)
    .filter(Boolean)
    .map((src) => ({
      src,
      description: "",
    }));
}

function FotoGrid({ titulo, fotos }) {
  const lista = normalizarFotos(fotos);

  if (lista.length === 0) return null;

  return (
    <section className="sus-block">
      <h3>{titulo}</h3>

      <div className="sus-photo-grid">
        {lista.map((foto, index) => (
          <div key={index}>
            <img src={foto.src} alt={`${titulo} ${index + 1}`} />
            <span>{foto.description || `Foto ${index + 1}`}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SuspensionReceipt({ suspension, receiptRef }) {
  const config = getWorkshopConfig();

  const total = (suspension.conceptos || []).reduce((acc, item) => {
    return acc + Number(item.cantidad || 0) * Number(item.precio || 0);
  }, 0);

  return (
    <section className="sus-receipt" ref={receiptRef}>
      <header className="sus-receipt-header">
        <div className="sus-logo-frame">
          <img src={config.logo || tbwLogo} alt={config.nombre} />
        </div>

        <div>
          <span>HOJA DE SERVICIO DE SUSPENSIÓN</span>
          <strong>{suspension.folio}</strong>
        </div>
      </header>

      <div className="sus-accent-line" />

      <section className="sus-block">
        <h3>Cliente</h3>

        <div className="sus-data-grid">
          <p>
            <b>Cliente:</b> {suspension.cliente || "Sin registro"}
          </p>
          <p>
            <b>Teléfono:</b> {suspension.telefono || "Sin registro"}
          </p>
          <p>
            <b>Fecha:</b> {suspension.fechaCreacion || "Sin registro"}
          </p>
          <p>
            <b>Estado:</b> {suspension.estado || "abierta"}
          </p>
        </div>
      </section>

      {suspension.vieneConBicicleta && (
        <section className="sus-block">
          <h3>Bicicleta recibida</h3>

          <div className="sus-data-grid">
            <p>
              <b>Bicicleta:</b> {suspension.bicicleta || "Sin registro"}
            </p>
            <p>
              <b>Marca:</b> {suspension.bikeMarca || "Sin registro"}
            </p>
            <p>
              <b>Modelo:</b> {suspension.bikeModelo || "Sin registro"}
            </p>
            <p>
              <b>Color:</b> {suspension.bikeColor || "Sin registro"}
            </p>
            <p>
              <b>Rodada:</b> {suspension.bikeRodada || "Sin registro"}
            </p>
            <p className="sus-full">
              <b>Accesorios recibidos:</b>{" "}
              {suspension.accesoriosBicicleta || "Sin registro"}
            </p>
          </div>
        </section>
      )}

      <section className="sus-block">
        <h3>Datos de suspensión</h3>

        <div className="sus-data-grid">
          <p>
            <b>Tipo de suspensión:</b>{" "}
            {suspension.tipoSuspension || "Sin registro"}
          </p>
          <p>
            <b>Marca:</b> {suspension.marca || "Sin registro"}
          </p>
          <p>
            <b>Modelo:</b> {suspension.modelo || "Sin registro"}
          </p>
          <p>
            <b>Número de serie:</b>{" "}
            {suspension.numeroSerie || "Sin registro"}
          </p>
          <p>
            <b>ID:</b> {suspension.identificador || "Sin registro"}
          </p>
          <p>
            <b>Color:</b> {suspension.color || "Sin registro"}
          </p>
          <p>
            <b>Tipo:</b> {suspension.tipo || "Sin registro"}
          </p>
          <p>
            <b>Acabado:</b> {suspension.acabado || "Sin registro"}
          </p>
          <p>
            <b>Bloqueo:</b> {suspension.bloqueo || "Sin registro"}
          </p>
          <p>
            <b>Rebote:</b> {suspension.rebote || "Sin registro"}
          </p>
          <p>
            <b>Tubo:</b> {suspension.tubo || "Sin registro"}
          </p>
          <p>
            <b>Eje / Montura:</b>{" "}
            {suspension.ejeMontura || "Sin registro"}
          </p>
          <p>
            <b>Rodada / Medida:</b>{" "}
            {suspension.rodada || "Sin registro"}
          </p>
          <p>
            <b>PSI antes:</b> {suspension.psiAntes || "Sin registro"}
          </p>
          <p>
            <b>Bloqueo funcionando antes:</b>{" "}
            {suspension.bloqueoAntes || "Sin registro"}
          </p>
          <p>
            <b>Rebote funcionando antes:</b>{" "}
            {suspension.reboteAntes || "Sin registro"}
          </p>
        </div>
      </section>

      <FotoGrid
        titulo="Fotos laterales de bicicleta"
        fotos={suspension.fotosBicicleta}
      />

      <FotoGrid
        titulo="Fotos de suspensión al recibir"
        fotos={suspension.fotosSuspensionRecepcion}
      />

      <FotoGrid
        titulo="Marcas o daños al recibir"
        fotos={suspension.fotosDanos}
      />

      <section className="sus-block">
        <h3>Detalles antes del mantenimiento</h3>
        <p>{suspension.detallesAntes || "Sin observaciones."}</p>
      </section>

      <section className="sus-block">
        <h3>Tipo de mantenimiento</h3>
        <p>{suspension.tipoMantenimiento || "Sin registro."}</p>
      </section>

      <section className="sus-block">
        <h3>Insumos y kits utilizados</h3>
        <p>{suspension.insumos || "Sin registro."}</p>
      </section>

      <FotoGrid
        titulo="Evidencia del mantenimiento"
        fotos={suspension.fotosEvidencia}
      />

      <section className="sus-block">
        <h3>Observaciones después del mantenimiento</h3>
        <p>{suspension.observacionesFinales || "Sin observaciones."}</p>
      </section>

      <section className="sus-block">
        <h3>Conceptos</h3>

        <div className="sus-table">
          <div className="sus-table-head">
            <span>Descripción</span>
            <span>Cant.</span>
            <span>Precio</span>
            <span>Importe</span>
          </div>

          {(suspension.conceptos || []).length === 0 && (
            <div className="sus-table-row">
              <span>Sin conceptos registrados</span>
              <span>-</span>
              <span>-</span>
              <strong>$0.00</strong>
            </div>
          )}

          {(suspension.conceptos || []).map((item) => (
            <div className="sus-table-row" key={item.id}>
              <span>{item.descripcion}</span>
              <span>{item.cantidad}</span>
              <span>${Number(item.precio || 0).toFixed(2)}</span>
              <strong>
                $
                {(
                  Number(item.cantidad || 0) * Number(item.precio || 0)
                ).toFixed(2)}
              </strong>
            </div>
          ))}
        </div>

        <div className="sus-total">
          <span>Total</span>
          <strong>${total.toFixed(2)}</strong>
        </div>
      </section>

      {suspension.entregaDomicilio && (
        <section className="sus-block">
          <h3>Entrega a domicilio</h3>
          <p>
            {suspension.fechaEntregaDomicilio
              ? `Programada para ${suspension.fechaEntregaDomicilio}`
              : "Entrega a domicilio pendiente sin fecha."}
          </p>
        </section>
      )}

      {suspension.firmaCliente && (
        <section className="sus-signature">
          <div>
            <img src={suspension.firmaCliente} alt="Firma cliente" />
            <strong>Firma del cliente</strong>
          </div>
        </section>
      )}
    </section>
  );
}

export default SuspensionReceipt;