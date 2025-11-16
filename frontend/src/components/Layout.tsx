import { Link, Outlet } from 'react-router-dom';
import styles from './Layout.module.css';

export default function Layout() {
  return (
    <div>
      <header className={styles.header}>
        <nav className={styles.nav} aria-label="Navigation principale">
          <ul className={styles.navList}>
            <li><Link to="/">Accueil</Link></li>
            <li><Link to="/login">Connexion</Link></li>
            <li><Link to="/register">Inscription</Link></li>
            <li><Link to="/dashboard">Tableau de Bord</Link></li>
            <li><Link to="/payroll">Paie</Link></li>
            <li><Link to="/admin/cotisations/regles">Règles Cotisations</Link></li>
            <li><Link to="/admin/cotisations/simulateur">Simulateur</Link></li>
          </ul>
        </nav>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
