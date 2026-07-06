import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  defaultWorkshopConfig,
  getWorkshopConfig,
  saveWorkshopConfig,
  applyWorkshopTheme,
  loadWorkshopConfigFromFirebase,
} from "../../utils/workshopConfig";

function Configuracion() {
  const { tenantId } = useAuth();

  const [config, setConfig] = useState(getWorkshopConfig);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargarConfig() {
      const configFirebase = await loadWorkshopConfigFromFirebase(tenantId);
      setConfig(configFirebase);
      setCargando(false);
    }

    cargarConfig();
  }, [tenantId]);

  useEffect(() => {
    applyWorkshopTheme(config);
  }, [config.colorPrincipal, config.colorSecundario, config.modoOscuro]);

  const actualizarCampo = (campo, valor) => {
    setConfig((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const cargarLogo = (archivo) => {
    if (!archivo) return;

    const reader = new FileReader();

    reader.onload = () => {
      actualizarCampo("logo", reader.result);
    };

    reader.readAsDataURL(archivo);
  };

  const guardar = async () => {
    setGuardando(true);
    await saveWorkshopConfig(config, tenantId);
    setGuardando(false);
    alert("Configuración guardada.");
  };

  const restaurar = async () => {
    const confirmar = window.confirm("¿Restaurar configuración por defecto?");
    if (!confirmar) return;

    setConfig(defaultWorkshopConfig);
    await saveWorkshopConfig(defaultWorkshopConfig, tenantId);
    applyWorkshopTheme(defaultWorkshopConfig);
  };

  if (cargando) {
    return <div className="empty-state">Cargando configuración...</div>;
  }

  return (
    <section className="config-page">
      <div className="module-header">
        <div>
          <h2>Configuración</h2>
          <p>Personalización del taller, logo, colores y datos comerciales.</p>
        </div>
      </div>

      <div className="config-layout">
        <section className="form-section">
          <h3>Identidad del taller</h3>

          <div className="form-grid">
            <label>
              Nombre del taller
              <input
                value={config.nombre}
                onChange={(event) =>
                  actualizarCampo("nombre", event.target.value)
                }
              />
            </label>

            <label>
              Teléfono
              <input
                value={config.telefono}
                onChange={(event) =>
                  actualizarCampo("telefono", event.target.value)
                }
              />
            </label>

            <label>
              WhatsApp
              <input
                value={config.whatsapp}
                onChange={(event) =>
                  actualizarCampo("whatsapp", event.target.value)
                }
              />
            </label>

            <label>
              Correo
              <input
                value={config.correo}
                onChange={(event) =>
                  actualizarCampo("correo", event.target.value)
                }
              />
            </label>

            <label className="full-width-field">
              Dirección
              <input
                value={config.direccion}
                onChange={(event) =>
                  actualizarCampo("direccion", event.target.value)
                }
              />
            </label>

            <label className="full-width-field">
              Google Maps
              <input
                value={config.googleMaps}
                onChange={(event) =>
                  actualizarCampo("googleMaps", event.target.value)
                }
              />
            </label>
          </div>
        </section>

        <section className="form-section">
          <h3>Logo y colores</h3>

          <label className="config-switch-row">
            <span>Modo oscuro</span>

            <button
              type="button"
              className={`ios-switch ${config.modoOscuro ? "active" : ""}`}
              onClick={() => actualizarCampo("modoOscuro", !config.modoOscuro)}
            >
              <span />
            </button>
          </label>

          <div className="config-brand-grid">
            <div className="config-logo-box">
              {config.logo ? (
                <img src={config.logo} alt="Logo del taller" />
              ) : (
                <span>Sin logo</span>
              )}
            </div>

            <div className="config-logo-actions">
              <label className="config-upload-button">
                Cargar logo
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => cargarLogo(event.target.files?.[0])}
                />
              </label>

              <button
                className="secondary-button"
                onClick={() => actualizarCampo("logo", "")}
              >
                Quitar logo
              </button>
            </div>
          </div>

          <div className="form-grid">
            <label className="config-color-field">
              Color principal
              <div className="config-color-control">
                <input
                  type="color"
                  value={config.colorPrincipal}
                  onChange={(event) =>
                    actualizarCampo("colorPrincipal", event.target.value)
                  }
                />
                <span>{config.colorPrincipal}</span>
              </div>
            </label>

            <label className="config-color-field">
              Color secundario
              <div className="config-color-control">
                <input
                  type="color"
                  value={config.colorSecundario}
                  onChange={(event) =>
                    actualizarCampo("colorSecundario", event.target.value)
                  }
                />
                <span>{config.colorSecundario}</span>
              </div>
            </label>
          </div>
        </section>

        <section className="form-section">
          <h3>Texto legal / notas del taller</h3>

          <label className="full-label">
            Texto legal adicional
            <textarea
              value={config.textoLegal}
              onChange={(event) =>
                actualizarCampo("textoLegal", event.target.value)
              }
              placeholder="Condiciones, avisos, garantía, política interna..."
            />
          </label>
        </section>

        <section className="config-preview">
          <h3>Vista previa</h3>

          <div className="config-preview-card">
            {config.logo && <img src={config.logo} alt="Logo preview" />}

            <h2>{config.nombre || "Nombre del taller"}</h2>
            <p>{config.telefono || "Teléfono no registrado"}</p>
            <p>{config.correo || "Correo no registrado"}</p>

            <div className="config-preview-bars">
              <div
                className="config-color-bar"
                style={{ background: config.colorPrincipal }}
              />
              <div
                className="config-color-bar secondary"
                style={{ background: config.colorSecundario }}
              />
            </div>
          </div>
        </section>

        <div className="config-actions">
          <button className="secondary-button" onClick={restaurar}>
            Restaurar
          </button>

          <button
            className="primary-button"
            onClick={guardar}
            disabled={guardando}
          >
            {guardando ? "Guardando..." : "Guardar configuración"}
          </button>
        </div>
      </div>
    </section>
  );
}

export default Configuracion;