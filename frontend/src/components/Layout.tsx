import { Link, Outlet } from 'react-router-dom';
import styles from './Layout.module.css';

export default function Layout() {
  return (
    <div>
      <header className={styles.header}>
        <Link to="/">Accueil</Link>
        <Link to="/login">Connexion</Link>
        <Link to="/register">Inscription</Link>
        <Link to="/dashboard">Tableau de Bord</Link>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
