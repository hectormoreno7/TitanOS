import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import titanosLogo from "../../assets/logos/titanos-logo.png";
import titanosIcon from "../../assets/logos/titanos-icon.png";

function Sidebar({ sidebarOpen, closeSidebar }) {
  const { logout } = useAuth();

  return (
    <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
      <div className="brand">
        <img src={titanosLogo} alt="TitanOS" className="brand-logo-full" />
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" onClick={closeSidebar}>
          Dashboard
        </NavLink>

        <NavLink to="/clientes" onClick={closeSidebar}>
          Clientes
        </NavLink>

        <NavLink to="/servicios" onClick={closeSidebar}>
          Servicios
        </NavLink>

        <NavLink to="/suspensiones" onClick={closeSidebar}>
          Suspensiones
        </NavLink>

        <NavLink to="/recoleccion-entrega" onClick={closeSidebar}>
          Recolección / Entrega
        </NavLink>

        <NavLink to="/notas" onClick={closeSidebar}>
          Notas rápidas
        </NavLink>

        <NavLink to="/historial" onClick={closeSidebar}>
          Historial
        </NavLink>
      </nav>

      <div className="sidebar-bottom">
        <NavLink
          to="/contacto"
          onClick={closeSidebar}
          className="sidebar-bottom-link"
        >
          Contacto
        </NavLink>

        <NavLink
          to="/configuracion"
          onClick={closeSidebar}
          className="sidebar-bottom-link"
        >
          Configuración
        </NavLink>

        <button
          type="button"
          className="sidebar-bottom-link sidebar-logout"
          onClick={logout}
        >
          Cerrar sesión
        </button>
      </div>

      <div className="sidebar-footer">
        <img src={titanosIcon} alt="TitanOS icon" className="sidebar-icon" />
      </div>
    </aside>
  );
}

export default Sidebar;