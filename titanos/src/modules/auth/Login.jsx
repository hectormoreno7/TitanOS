import { useState } from "react";
import { loginWithEmail } from "../../firebase/auth";
import titanosLogo from "../../assets/logos/titanos-logo.png";

function EyeIcon({ hidden }) {
  if (hidden) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6A2 2 0 0 0 13.4 13.4" />
        <path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c7 0 11 8 11 8a17.3 17.3 0 0 1-3.1 4.4" />
        <path d="M6.1 6.1C2.8 8.3 1 12 1 12s4 8 11 8a10.8 10.8 0 0 0 5.9-1.7" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const ingresar = async (event) => {
    event.preventDefault();

    setError("");
    setCargando(true);

    try {
      await loginWithEmail(email, password);
    } catch {
      setError("Correo o contraseña incorrectos.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={ingresar}>
        <img src={titanosLogo} alt="TitanOS" />

        <h1>Acceso TitanOS</h1>

        <label>
          Correo
          <input
            type="email"
            value={email}
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label>
          Contraseña
          <div className="password-field">
            <input
              type={mostrarPassword ? "text" : "password"}
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
            />

            <button
              type="button"
              className="toggle-password"
              onClick={() => setMostrarPassword(!mostrarPassword)}
              aria-label={
                mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"
              }
            >
              <EyeIcon hidden={mostrarPassword} />
            </button>
          </div>
        </label>

        {error && <div className="login-error">{error}</div>}

        <button className="login-submit" type="submit" disabled={cargando}>
          {cargando ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </main>
  );
}

export default Login;