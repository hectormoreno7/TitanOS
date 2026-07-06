import { getTenantConfig, saveTenantConfig } from "../firebase/firestore";

export const WORKSHOP_CONFIG_KEY = "titanos_workshop_config_v1";

export const defaultWorkshopConfig = {
  nombre: "TitanOS",
  telefono: "",
  whatsapp: "",
  correo: "",
  direccion: "",
  googleMaps: "",
  logo: "",
  colorPrincipal: "#f15a24",
  colorSecundario: "#111111",
  modoOscuro: false,
  textoLegal: "",
};

export function getWorkshopConfig() {
  try {
    const data = JSON.parse(localStorage.getItem(WORKSHOP_CONFIG_KEY));
    return data ? { ...defaultWorkshopConfig, ...data } : defaultWorkshopConfig;
  } catch {
    return defaultWorkshopConfig;
  }
}

export function applyWorkshopTheme(config = getWorkshopConfig()) {
  document.documentElement.style.setProperty(
    "--orange",
    config.colorPrincipal || defaultWorkshopConfig.colorPrincipal
  );

  document.documentElement.style.setProperty(
    "--brand-dark",
    config.colorSecundario || defaultWorkshopConfig.colorSecundario
  );

  document.body.classList.toggle("dark-mode", Boolean(config.modoOscuro));
}

export function saveWorkshopConfigLocal(config) {
  const finalConfig = { ...defaultWorkshopConfig, ...config };

  localStorage.setItem(WORKSHOP_CONFIG_KEY, JSON.stringify(finalConfig));

  window.dispatchEvent(
    new CustomEvent("workshop-config-updated", {
      detail: finalConfig,
    })
  );

  applyWorkshopTheme(finalConfig);

  return finalConfig;
}

export async function loadWorkshopConfigFromFirebase(tenantId) {
  try {
    const firebaseConfig = await getTenantConfig(tenantId);

    if (!firebaseConfig) {
      const localConfig = getWorkshopConfig();
      await saveTenantConfig(localConfig, tenantId);
      return saveWorkshopConfigLocal(localConfig);
    }

    return saveWorkshopConfigLocal(firebaseConfig);
  } catch (error) {
    console.error("Error cargando configuración desde Firebase:", error);
    return getWorkshopConfig();
  }
}

export async function saveWorkshopConfig(config, tenantId) {
  const finalConfig = saveWorkshopConfigLocal(config);

  try {
    await saveTenantConfig(finalConfig, tenantId);
  } catch (error) {
    console.error("Error guardando configuración en Firebase:", error);
  }

  return finalConfig;
}