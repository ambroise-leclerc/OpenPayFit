import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getAnalyticsMasseSalariale,
  getAnalyticsEffectifs,
  getAnalyticsConges,
  getAnalyticsDepenses,
  getCompanies,
  type Company,
  type DonneesMasseSalariale,
  type DonneesEffectifs,
  type StatistiquesConges,
  type StatistiquesDepenses,
  type ParamsPeriode,
} from '../services/api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import styles from './AnalyticsDashboard.module.css';

// Fonction utilitaire pour exporter en CSV
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function exporterVersCSV(donnees: any[], nomFichier: string) {
  if (!donnees || donnees.length === 0) {
    alert('Aucune donnée à exporter');
    return;
  }

  // Récupérer les en-têtes (clés du premier objet)
  const entetes = Object.keys(donnees[0]);

  // Créer le contenu CSV
  const lignesCSV = [
    entetes.join(','), // Ligne d'en-têtes
    ...donnees.map(ligne =>
      entetes.map(entete => {
        const valeur = ligne[entete];
        // Échapper les virgules et guillemets dans les valeurs
        if (typeof valeur === 'string' && (valeur.includes(',') || valeur.includes('"'))) {
          return `"${valeur.replace(/"/g, '""')}"`;
        }
        return valeur;
      }).join(',')
    ),
  ];

  // Ajouter le BOM UTF-8 pour assurer la compatibilité avec Excel
  const contenuCSV = '\uFEFF' + lignesCSV.join('\n');

  // Créer un blob et télécharger
  const blob = new Blob([contenuCSV], { type: 'text/csv;charset=utf-8;' });
  const lien = document.createElement('a');
  const url = URL.createObjectURL(blob);

  lien.href = url;
  lien.download = `${nomFichier}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);
  URL.revokeObjectURL(url);
}

// Couleurs pour les graphiques
const COULEURS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

// Interface pour les données de graphique en camembert
interface DonneesPie {
  nom: string;
  valeur: number;
}

const AnalyticsDashboard = () => {
  const { token } = useAuth();

  // États pour les entreprises
  const [entreprises, setEntreprises] = useState<Company[]>([]);
  const [entrepriseSelectionnee, setEntrepriseSelectionnee] = useState<string>('');
  const [chargement, setChargement] = useState<boolean>(true);
  const [erreur, setErreur] = useState<string | null>(null);

  // États pour les filtres de période
  const [periode, setPeriode] = useState<'month' | 'quarter' | 'year' | ''>('');
  const [annee, setAnnee] = useState<string>(new Date().getFullYear().toString());
  const [mois, setMois] = useState<string>('');
  const [trimestre, setTrimestre] = useState<string>('');

  // États pour les données analytics
  const [donneesMasseSalariale, setDonneesMasseSalariale] = useState<DonneesMasseSalariale[]>([]);
  const [donneesEffectifs, setDonneesEffectifs] = useState<DonneesEffectifs[]>([]);
  const [donneesConges, setDonneesConges] = useState<StatistiquesConges | null>(null);
  const [donneesDepenses, setDonneesDepenses] = useState<StatistiquesDepenses | null>(null);

  // Charger les entreprises au montage
  useEffect(() => {
    const chargerEntreprises = async () => {
      if (!token) return;

      try {
        const entreprisesData = await getCompanies(token);
        setEntreprises(entreprisesData);
        if (entreprisesData.length > 0) {
          setEntrepriseSelectionnee(entreprisesData[0].id);
        }
      } catch (err) {
        setErreur('Erreur lors du chargement des entreprises');
        console.error(err);
      } finally {
        setChargement(false);
      }
    };

    chargerEntreprises();
  }, [token]);

  // Charger les analytics quand l'entreprise ou les filtres changent
  useEffect(() => {
    if (!entrepriseSelectionnee || !token) return;

    const chargerAnalytics = async () => {
      setChargement(true);
      setErreur(null);

      try {
        // Construire les paramètres de période
        const paramsPeriode: ParamsPeriode = {};
        if (periode) {
          paramsPeriode.period = periode;
          paramsPeriode.year = annee;
          if (periode === 'month' && mois) {
            paramsPeriode.month = mois;
          }
          if (periode === 'quarter' && trimestre) {
            paramsPeriode.quarter = trimestre;
          }
        }

        // Charger toutes les analytics en parallèle
        const [masseSalariale, effectifs, conges, depenses] = await Promise.all([
          getAnalyticsMasseSalariale(entrepriseSelectionnee, paramsPeriode, token),
          getAnalyticsEffectifs(entrepriseSelectionnee, token),
          getAnalyticsConges(entrepriseSelectionnee, paramsPeriode, token),
          getAnalyticsDepenses(entrepriseSelectionnee, paramsPeriode, token, 10),
        ]);

        setDonneesMasseSalariale(masseSalariale);
        setDonneesEffectifs(effectifs);
        setDonneesConges(conges);
        setDonneesDepenses(depenses);
      } catch (err) {
        setErreur('Erreur lors du chargement des analytics');
        console.error(err);
      } finally {
        setChargement(false);
      }
    };

    chargerAnalytics();
  }, [entrepriseSelectionnee, periode, annee, mois, trimestre, token]);

  // Préparer les données pour les graphiques en camembert
  const donneesPieEffectifs = donneesEffectifs.map(d => ({
    nom: d.departement,
    valeur: d.nombre,
  }));

  const donneesPieConges = donneesConges
    ? Object.entries(donneesConges.parType).map(([type, jours]) => ({
        nom: type,
        valeur: jours,
      }))
    : [];

  const donneesPieDepenses = donneesDepenses
    ? Object.entries(donneesDepenses.parCategorie).map(([categorie, montant]) => ({
        nom: categorie,
        valeur: montant,
      }))
    : [];

  if (chargement && entreprises.length === 0) {
    return <div className={styles.chargement}>Chargement...</div>;
  }

  if (erreur) {
    return <div className={styles.erreur}>{erreur}</div>;
  }

  if (entreprises.length === 0) {
    return <div className={styles.message}>Aucune entreprise trouvée</div>;
  }

  return (
    <div className={styles.container}>
      <h1>Tableau de bord Analytics</h1>

      {/* Sélecteur d'entreprise et filtres */}
      <div className={styles.filtres}>
        <div className={styles.filtreGroupe}>
          <label htmlFor="entreprise">Entreprise :</label>
          <select
            id="entreprise"
            value={entrepriseSelectionnee}
            onChange={(e) => setEntrepriseSelectionnee(e.target.value)}
          >
            {entreprises.map((entreprise) => (
              <option key={entreprise.id} value={entreprise.id}>
                {entreprise.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filtreGroupe}>
          <label htmlFor="periode">Période :</label>
          <select
            id="periode"
            value={periode}
            onChange={(e) => {
              setPeriode(e.target.value as 'month' | 'quarter' | 'year' | '');
              setMois('');
              setTrimestre('');
            }}
          >
            <option value="">Par défaut (12 derniers mois)</option>
            <option value="month">Mois</option>
            <option value="quarter">Trimestre</option>
            <option value="year">Année</option>
          </select>
        </div>

        <div className={styles.filtreGroupe}>
          <label htmlFor="annee">Année :</label>
          <input
            type="number"
            id="annee"
            value={annee}
            onChange={(e) => setAnnee(e.target.value)}
            min="2020"
            max="2030"
          />
        </div>

        {periode === 'month' && (
          <div className={styles.filtreGroupe}>
            <label htmlFor="mois">Mois :</label>
            <select
              id="mois"
              value={mois}
              onChange={(e) => setMois(e.target.value)}
            >
              <option value="">Sélectionner</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={(i + 1).toString().padStart(2, '0')}>
                  {new Date(2000, i).toLocaleString('fr-FR', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
        )}

        {periode === 'quarter' && (
          <div className={styles.filtreGroupe}>
            <label htmlFor="trimestre">Trimestre :</label>
            <select
              id="trimestre"
              value={trimestre}
              onChange={(e) => setTrimestre(e.target.value)}
            >
              <option value="">Sélectionner</option>
              <option value="1">T1 (Jan-Mar)</option>
              <option value="2">T2 (Avr-Juin)</option>
              <option value="3">T3 (Juil-Sep)</option>
              <option value="4">T4 (Oct-Déc)</option>
            </select>
          </div>
        )}
      </div>

      {chargement ? (
        <div className={styles.chargement}>Chargement des analytics...</div>
      ) : (
        <div className={styles.widgets}>
          {/* Widget 1: Évolution de la masse salariale */}
          <div className={styles.widget}>
            <div className={styles.widgetHeader}>
              <h2>Masse Salariale</h2>
              <button
                onClick={() => exporterVersCSV(donneesMasseSalariale, 'masse_salariale')}
                className={styles.boutonExport}
              >
                Exporter CSV
              </button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={donneesMasseSalariale}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periode" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="totalBrut"
                  stroke="#8884d8"
                  name="Total Brut (€)"
                />
                <Line
                  type="monotone"
                  dataKey="totalNet"
                  stroke="#82ca9d"
                  name="Total Net (€)"
                />
                <Line
                  type="monotone"
                  dataKey="coutTotal"
                  stroke="#ffc658"
                  name="Coût Total (€)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Widget 2: Répartition des effectifs */}
          <div className={styles.widget}>
            <div className={styles.widgetHeader}>
              <h2>Effectifs par Département</h2>
              <button
                onClick={() => exporterVersCSV(donneesEffectifs, 'effectifs')}
                className={styles.boutonExport}
              >
                Exporter CSV
              </button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={donneesPieEffectifs}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => {
                    const donnee = entry as unknown as DonneesPie;
                    return `${donnee.nom}: ${donnee.valeur}`;
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="valeur"
                >
                  {donneesPieEffectifs.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COULEURS[index % COULEURS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Widget 3: Statistiques de congés */}
          <div className={styles.widget}>
            <div className={styles.widgetHeader}>
              <h2>Congés et Absences</h2>
              {donneesConges && (
                <button
                  onClick={() =>
                    exporterVersCSV(
                      [
                        { indicateur: 'Total jours', valeur: donneesConges.totalJours },
                        { indicateur: 'Taux absence (%)', valeur: donneesConges.tauxAbsence },
                      ],
                      'conges'
                    )
                  }
                  className={styles.boutonExport}
                >
                  Exporter CSV
                </button>
              )}
            </div>
            {donneesConges && (
              <>
                <div className={styles.statistiques}>
                  <div className={styles.stat}>
                    <div className={styles.statLabel}>Total jours de congés</div>
                    <div className={styles.statValeur}>{donneesConges.totalJours}</div>
                  </div>
                  <div className={styles.stat}>
                    <div className={styles.statLabel}>Taux d'absence</div>
                    <div className={styles.statValeur}>{donneesConges.tauxAbsence.toFixed(2)}%</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={donneesPieConges}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nom" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="valeur" fill="#82ca9d" name="Jours" />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </div>

          {/* Widget 4: Notes de frais */}
          <div className={styles.widget}>
            <div className={styles.widgetHeader}>
              <h2>Notes de Frais</h2>
              {donneesDepenses && (
                <button
                  onClick={() => exporterVersCSV(donneesDepenses.topDepenses, 'depenses')}
                  className={styles.boutonExport}
                >
                  Exporter CSV
                </button>
              )}
            </div>
            {donneesDepenses && (
              <>
                <div className={styles.statistiques}>
                  <div className={styles.stat}>
                    <div className={styles.statLabel}>Montant total</div>
                    <div className={styles.statValeur}>
                      {donneesDepenses.montantTotal.toFixed(2)} €
                    </div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={donneesPieDepenses}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => {
                        const donnee = entry as unknown as DonneesPie;
                        return `${donnee.nom}: ${donnee.valeur.toFixed(0)}€`;
                      }}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="valeur"
                    >
                      {donneesPieDepenses.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COULEURS[index % COULEURS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className={styles.tableau}>
                  <h3>Top 10 Dépenses</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Employé</th>
                        <th>Catégorie</th>
                        <th>Montant</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {donneesDepenses.topDepenses.map((depense) => (
                        <tr key={depense.id}>
                          <td>{depense.nomEmploye}</td>
                          <td>{depense.categorie}</td>
                          <td>{depense.montant.toFixed(2)} €</td>
                          <td>{new Date(depense.date).toLocaleDateString('fr-FR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
