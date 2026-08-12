import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

const CHECK_INTERVAL_MS = 60 * 1000;

function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      const checkForUpdate = () => registration.update().catch(() => {});
      const intervalId = window.setInterval(checkForUpdate, CHECK_INTERVAL_MS);

      window.addEventListener("focus", checkForUpdate);
      window.addEventListener("online", checkForUpdate);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkForUpdate();
      });

      // El registro vive durante toda la sesión de la aplicación.
      window.addEventListener("beforeunload", () => window.clearInterval(intervalId), {
        once: true,
      });
    },
    onRegisterError(error) {
      console.error("No se pudo registrar el actualizador de TitanOS:", error);
    },
  });

  useEffect(() => {
    if (!needRefresh) return undefined;

    const previousTitle = document.title;
    document.title = "Actualización disponible • TitanOS";

    return () => {
      document.title = previousTitle;
    };
  }, [needRefresh]);

  if (!needRefresh) return null;

  return (
    <aside className="update-prompt" role="alert" aria-live="assertive">
      <div>
        <strong>Nueva versión disponible</strong>
        <span>Actualiza TitanOS para aplicar los últimos cambios.</span>
      </div>
      <div className="update-prompt-actions">
        <button type="button" onClick={() => setNeedRefresh(false)}>
          Después
        </button>
        <button
          type="button"
          className="update-prompt-primary"
          onClick={() => updateServiceWorker(true)}
        >
          Actualizar ahora
        </button>
      </div>
    </aside>
  );
}

export default UpdatePrompt;
