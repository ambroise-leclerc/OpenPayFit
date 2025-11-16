import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from './Layout.module.css';

export default function Layout() {
  const { token } = useAuth();

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
            <li><Link to="/analytics">Analytics</Link></li>
            {/* Les liens admin sont affichés uniquement pour les utilisateurs connectés.
                Note : Idéalement, on devrait vérifier le rôle ADMIN de l'utilisateur,
                mais cela nécessiterait de décoder le JWT ou de récupérer les infos
                utilisateur depuis l'API. Pour l'instant, les routes sont protégées
                côté backend avec le middleware requireAdmin. */}
            {token && (
              <>
                <li><Link to="/admin/cotisations/regles">Règles Cotisations</Link></li>
                <li><Link to="/admin/cotisations/simulateur">Simulateur</Link></li>
              </>
            )}
          </ul>
        </nav>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
