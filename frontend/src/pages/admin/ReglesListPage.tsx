import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getRegles,
  getCategories,
  getOrganismes,
  deleteRegle,
  exportCotisations,
  type RegleCotisation,
  type CategorieCotisation,
  type OrganismeCotisation,
  type TypeCotisation,
} from '../../services/api';
import styles from './ReglesListPage.module.css';

function ReglesListPage() {
  const { token } = useAuth();
  const [regles, setRegles] = useState<RegleCotisation[]>([]);
  const [categories, setCategories] = useState<CategorieCotisation[]>([]);
  const [organismes, setOrganismes] = useState<OrganismeCotisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtres
  const [filterCategorie, setFilterCategorie] = useState('');
  const [filterOrganisme, setFilterOrganisme] = useState('');
  const [filterType, setFilterType] = useState<TypeCotisation | ''>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [token]);

  async function loadData() {
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const [reglesData, categoriesData, organismesData] = await Promise.all([
        getRegles(token),
        getCategories(token),
        getOrganismes(token),
      ]);

      setRegles(reglesData);
      setCategories(categoriesData);
      setOrganismes(organismesData);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, code: string) {
    if (!token) return;

    if (!confirm(`Êtes-vous sûr de vouloir supprimer la règle "${code}" ?`)) {
      return;
    }

    try {
      await deleteRegle(id, token);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression');
    }
  }

  async function handleExport(format: 'yaml' | 'json') {
    if (!token) return;

    try {
      const blob = await exportCotisations(format, token);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cotisations.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l\'exportation');
    }
  }

  // Filtrer les règles
  const filteredRegles = regles.filter((regle) => {
    // Filtre par catégorie
    if (filterCategorie && regle.categorieId !== filterCategorie) return false;

    // Filtre par organisme
    if (filterOrganisme && regle.organismeId !== filterOrganisme) return false;

    // Filtre par type
    if (filterType && regle.typeCotisation !== filterType) return false;

    // Filtre par statut
    if (filterStatus === 'active' && !regle.estActif) return false;
    if (filterStatus === 'inactive' && regle.estActif) return false;

    // Recherche textuelle
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        regle.code.toLowerCase().includes(term) ||
        regle.nom.toLowerCase().includes(term) ||
        (regle.description && regle.description.toLowerCase().includes(term))
      );
    }

    return true;
  });

  if (loading) {
    return <div className={styles.loading}>Chargement...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Règles de Cotisations</h1>
        <div className={styles.actions}>
          <button onClick={() => handleExport('yaml')} className={styles.btnSecondary}>
            Exporter YAML
          </button>
          <button onClick={() => handleExport('json')} className={styles.btnSecondary}>
            Exporter JSON
          </button>
          <Link to="/admin/cotisations/regles/new" className={styles.btnPrimary}>
            Nouvelle règle
          </Link>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Filtres */}
      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Rechercher (code, nom, description)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />

        <select value={filterCategorie} onChange={(e) => setFilterCategorie(e.target.value)}>
          <option value="">Toutes les catégories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.nom}
            </option>
          ))}
        </select>

        <select value={filterOrganisme} onChange={(e) => setFilterOrganisme(e.target.value)}>
          <option value="">Tous les organismes</option>
          {organismes.map((org) => (
            <option key={org.id} value={org.id}>
              {org.nom}
            </option>
          ))}
        </select>

        <select value={filterType} onChange={(e) => setFilterType(e.target.value as TypeCotisation | '')}>
          <option value="">Tous les types</option>
          <option value="COTISATION_SALARIALE">Salariale</option>
          <option value="COTISATION_PATRONALE">Patronale</option>
          <option value="CHARGE_FISCALE">Fiscale</option>
        </select>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
          <option value="all">Tous les statuts</option>
          <option value="active">Actives</option>
          <option value="inactive">Inactives</option>
        </select>
      </div>

      {/* Tableau */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Code</th>
              <th>Nom</th>
              <th>Type</th>
              <th>Taux actuel</th>
              <th>Organisme</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRegles.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.empty}>
                  Aucune règle trouvée
                </td>
              </tr>
            ) : (
              filteredRegles.map((regle) => {
                const tauxActuel = regle.taux && regle.taux.length > 0 ? regle.taux[0].taux : null;

                return (
                  <tr key={regle.id}>
                    <td>
                      <code>{regle.code}</code>
                    </td>
                    <td>{regle.nom}</td>
                    <td>
                      <span className={styles[`type-${regle.typeCotisation}`]}>
                        {regle.typeCotisation === 'COTISATION_SALARIALE' && 'Salariale'}
                        {regle.typeCotisation === 'COTISATION_PATRONALE' && 'Patronale'}
                        {regle.typeCotisation === 'CHARGE_FISCALE' && 'Fiscale'}
                      </span>
                    </td>
                    <td>
                      {tauxActuel !== null ? `${(tauxActuel * 100).toFixed(2)}%` : '-'}
                    </td>
                    <td>{regle.organisme?.nom || '-'}</td>
                    <td>
                      <span className={regle.estActif ? styles.statusActive : styles.statusInactive}>
                        {regle.estActif ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className={styles.actionsCell}>
                      <Link to={`/admin/cotisations/regles/${regle.id}`} className={styles.btnView}>
                        Voir
                      </Link>
                      <Link to={`/admin/cotisations/regles/${regle.id}/edit`} className={styles.btnEdit}>
                        Éditer
                      </Link>
                      <button
                        onClick={() => handleDelete(regle.id, regle.code)}
                        className={styles.btnDelete}
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.summary}>
        {filteredRegles.length} règle(s) affichée(s) sur {regles.length} au total
      </div>
    </div>
  );
}

export default ReglesListPage;
