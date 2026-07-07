import tbwLogo from "../../assets/logos/tbw-logo.png";
import { getWorkshopConfig } from "../../utils/workshopConfig";

function totalNota(nota) {
  return (nota.conceptos || []).reduce((acc, item) => {
    return acc + Number(item.cantidad || 0) * Number(item.precio || 0);
  }, 0);
}

function NotaReceipt({ nota, receiptRef }) {
  const config = getWorkshopConfig();
  const total = totalNota(nota);
  const abono = Number(nota.abono || 0);
  const saldo = Math.max(total - abono, 0);

  return (
    <section className="nr-receipt" ref={receiptRef}>
      <header className="nr-receipt-header">
        <div className="nr-logo-frame">
          <img src={config.logo || tbwLogo} alt={config.nombre} />
        </div>

        <div>
          <span>NOTA RÁPIDA</span>
          <strong>{nota.folio}</strong>
        </div>
      </header>

      <div className="nr-accent-line" />

      <section className="nr-block">
        <h3>Datos generales</h3>

        <div className="nr-data-grid">
          <p>
            <b>Fecha:</b> {nota.fechaCreacion || "Sin registro"}
          </p>
          <p>
            <b>Hora:</b> {nota.horaCreacion || "Sin registro"}
          </p>
          <p>
            <b>Cliente:</b> {nota.cliente || "Cliente general"}
          </p>
          <p>
            <b>Teléfono:</b> {nota.telefono || "Sin registro"}
          </p>
          <p>
            <b>Estado:</b> {nota.estado || "abierta"}
          </p>
          <p>
            <b>Estado de pago:</b> {nota.estadoPago || "Pendiente"}
          </p>
          <p>
            <b>Método:</b> {nota.metodoPago || "Sin registro"}
          </p>
        </div>
      </section>

      <section className="nr-block">
        <h3>Conceptos</h3>

        <div className="nr-table">
          <div className="nr-table-head">
            <span>Descripción</span>
            <span>Cant.</span>
            <span>Precio</span>
            <span>Importe</span>
          </div>

          {(nota.conceptos || []).length === 0 && (
            <div className="nr-table-row">
              <span>Sin conceptos registrados</span>
              <span>-</span>
              <span>-</span>
              <strong>$0.00</strong>
            </div>
          )}

          {(nota.conceptos || []).map((item) => (
            <div className="nr-table-row" key={item.id}>
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

        <div className="nr-total">
          <span>Total</span>
          <strong>${total.toFixed(2)}</strong>
        </div>

        {(nota.estadoPago === "Parcial" || abono > 0) && (
          <div className="nr-payment-summary">
            <p>
              <b>Abono:</b> ${abono.toFixed(2)}
            </p>
            <p>
              <b>Saldo:</b> ${saldo.toFixed(2)}
            </p>
          </div>
        )}
      </section>

      {nota.observaciones && (
        <section className="nr-block">
          <h3>Observaciones</h3>
          <p>{nota.observaciones}</p>
        </section>
      )}

      <section className="nr-signature">
        <div>
          {nota.firmaCliente ? (
            <img src={nota.firmaCliente} alt="Firma cliente" />
          ) : (
            <span>Sin firma</span>
          )}

          <strong>Firma del cliente</strong>
        </div>
      </section>
    </section>
  );
}

export default NotaReceipt;