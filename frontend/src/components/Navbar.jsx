import { BookOpen, Bookmark, LogOut, Menu, Moon, PenLine, Search, Settings, ShieldCheck, Sun, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  function closeMenu() { setOpen(false); }
  function signOut() { logout(); closeMenu(); navigate("/"); }

  useEffect(() => {
    closeMenu();
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!open) {
      document.body.classList.remove("mobile-menu-open");
      return undefined;
    }

    document.body.classList.add("mobile-menu-open");
    const closeOnEscape = (event) => {
      if (event.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.classList.remove("mobile-menu-open");
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <header className={`nav-shell ${user ? "authenticated-nav" : "guest-nav"}`}>
      <div className="nav-progress" />
      <div className="container nav-inner">
        <Link className="brand" to="/" onClick={closeMenu}>
          <span className="brand-icon"><BookOpen size={22} /></span><span>BlogVerse</span>
        </Link>

        <nav id="primary-navigation" className={`nav-links ${open ? "open" : ""}`} aria-label="Primary navigation">
          <NavLink to="/" onClick={closeMenu}>Home</NavLink>
          <NavLink to="/explore" onClick={closeMenu}>Explore</NavLink>
          <NavLink to="/communities" onClick={closeMenu}><Users size={15} /> Communities</NavLink>
          <NavLink to="/about" onClick={closeMenu}>About</NavLink>
          <NavLink to="/contact" onClick={closeMenu}>Contact</NavLink>
          {user && <NavLink className="mobile-nav-only" to="/write" onClick={closeMenu}><PenLine size={15} /> Write</NavLink>}
          {user && <NavLink to="/dashboard" onClick={closeMenu}>Dashboard</NavLink>}
          {user && <NavLink className="mobile-nav-only" to="/bookmarks" onClick={closeMenu}><Bookmark size={15} /> Bookmarks</NavLink>}
          {user && <NavLink className="mobile-nav-only" to={`/profile/${user.id}`} onClick={closeMenu}>Profile</NavLink>}
          {user && <NavLink to="/settings/account" onClick={closeMenu}><Settings size={15} /> Settings</NavLink>}
          {user?.role === "ADMIN" && <NavLink to="/admin" onClick={closeMenu}><ShieldCheck size={15} /> Admin</NavLink>}
        </nav>

        {open && <button className="nav-backdrop" type="button" aria-label="Close navigation" onClick={closeMenu} />}

        <div className="nav-actions">
          <Link className="icon-button nav-search-shortcut" to="/explore" aria-label="Search"><Search size={18} /></Link>
          <button
            className="icon-button theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            aria-pressed={isDark}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {user ? (
            <>
              <Link className="nav-user-pill desktop-profile-button" to={`/profile/${user.id}`} title="My profile">
                <span className="nav-user-avatar">{user.avatar ? <img src={user.avatar} alt="" /> : (user.name?.trim()?.[0]?.toUpperCase() || "U")}</span>
                <span className="nav-user-copy"><strong>{user.name?.split(" ")[0] || "Creator"}</strong><small>{user.role === "ADMIN" ? "Administrator" : "Creator"}</small></span>
              </Link>
              <Link className="button button-primary button-small nav-write-button" to="/write"><PenLine size={17} /> Write</Link>
              <button className="icon-button" type="button" onClick={signOut} title="Logout" aria-label="Logout"><LogOut size={18} /></button>
            </>
          ) : (
            <>
              <Link className="button button-ghost button-small desktop-only" to="/login">Sign in</Link>
              <Link className="button button-primary button-small" to="/register">Get started</Link>
            </>
          )}
          <button
            className="menu-button"
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="primary-navigation"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}
