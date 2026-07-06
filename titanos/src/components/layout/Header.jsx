function Header({ openSidebar }) {
  return (
    <header className="mobile-header">
      <button className="menu-button" onClick={openSidebar}>
        ☰
      </button>

      <span>TitanOS</span>
    </header>
  );
}

export default Header;