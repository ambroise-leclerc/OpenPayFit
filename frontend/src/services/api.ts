// Utiliser la variable d'environnement pour l'URL de l'API, repli sur localhost pour le développement
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Classe d'erreur personnalisée avec code de statut HTTP
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Définir l'interface des données d'inscription
export interface RegisterUserData {
  name: string;
  email: string;
  password: string;
}

// Définir l'interface des identifiants de connexion
export interface LoginCredentials {
  email: string;
  password: string;
}

// Définir les interfaces de réponse API
export interface AuthResponse {
  token: string;
}

// Fonction utilitaire pour la gestion des erreurs
async function handleErrorResponse(response: Response, fallbackMessage: string): Promise<never> {
  let errorMessage = fallbackMessage;
  try {
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      const errorData = await response.json();
      if (errorData && errorData.error) {
        errorMessage = errorData.error;
      }
    } else {
      const text = await response.text();
      if (text) errorMessage = response.statusText || text;
    }
  } catch {
    // Utiliser le message de repli si l'analyse échoue
    errorMessage = response.statusText || fallbackMessage;
  }
  throw new ApiError(errorMessage, response.status);
}

export async function registerUser(userData: RegisterUserData): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de l\'inscription');
  }

  return response.json();
}

export async function loginUser(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la connexion');
  }

  return response.json();
}

// --- Gestion des Entreprises et Employés ---

// Interfaces de données basées sur le schéma Prisma
export interface Company {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  grossSalary: number;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyData {
  name: string;
}

export interface CreateEmployeeData {
  firstName: string;
  lastName: string;
  email: string;
  grossSalary: number;
}

export type UpdateEmployeeData = Partial<CreateEmployeeData>;

// Fonction utilitaire pour obtenir les en-têtes avec le token d'authentification
function getAuthHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

// --- Fonctions API ---

// Entreprises
export async function getCompanies(token: string): Promise<Company[]> {
  const response = await fetch(`${API_URL}/companies`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la récupération des entreprises');
  }
  return response.json();
}

export async function createCompany(companyData: CreateCompanyData, token: string): Promise<Company> {
  const response = await fetch(`${API_URL}/companies`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(companyData),
  });
  if (!response.ok) {
    await handleErrorResponse(response, "Échec de la création de l'entreprise");
  }
  return response.json();
}

// Employés
export async function getEmployees(companyId: string, token: string): Promise<Employee[]> {
  const response = await fetch(`${API_URL}/companies/${companyId}/employees`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la récupération des employés');
  }
  return response.json();
}

export async function createEmployee(
  companyId: string,
  employeeData: CreateEmployeeData,
  token: string
): Promise<Employee> {
  const response = await fetch(`${API_URL}/companies/${companyId}/employees`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(employeeData),
  });
  if (!response.ok) {
    await handleErrorResponse(response, "Échec de la création de l'employé");
  }
  return response.json();
}

export async function updateEmployee(
  employeeId: string,
  employeeData: UpdateEmployeeData,
  token: string
): Promise<Employee> {
  const response = await fetch(`${API_URL}/employees/${employeeId}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(employeeData),
  });
  if (!response.ok) {
    await handleErrorResponse(response, "Échec de la mise à jour de l'employé");
  }
  return response.json();
}

export async function deleteEmployee(employeeId: string, token: string): Promise<void> {
  const response = await fetch(`${API_URL}/employees/${employeeId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    await handleErrorResponse(response, "Échec de la suppression de l'employé");
  }
}

// --- Gestion de la Paie ---

// Interfaces de données de paie
export interface Payslip {
  id: string;
  payPeriod: string;
  grossSalary: number;
  deductions: number;
  netSalary: number;
  employeeId: string;
  employeeFirstName?: string;
  employeeLastName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RunPayrollData {
  companyId: string;
  period: string; // Format : YYYY-MM
}

export interface PayrollRunResult {
  status: 'success' | 'error';
  payslipsGenerated: number;
  errors?: string[];
}

// --- Fonctions API de Paie ---

/**
 * Lance le calcul de paie pour une entreprise et une période donnée
 */
export async function runPayroll(data: RunPayrollData, token: string): Promise<PayrollRunResult> {
  const response = await fetch(`${API_URL}/payslips/run`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec du calcul de paie');
  }

  return response.json();
}

/**
 * Récupère les fiches de paie d'une entreprise
 * @param companyId - ID de l'entreprise
 * @param period - (Optionnel) Période au format YYYY-MM pour filtrer les résultats
 * @param token - Token d'authentification
 */
export async function getPayslips(
  companyId: string,
  period: string | null,
  token: string
): Promise<Payslip[]> {
  const params = new URLSearchParams({ companyId });
  if (period) {
    params.append('period', period);
  }

  const response = await fetch(`${API_URL}/payslips?${params.toString()}`, {
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la récupération des fiches de paie');
  }

  return response.json();
}

/**
 * Récupère une fiche de paie par son ID
 */
export async function getPayslipById(payslipId: string, token: string): Promise<Payslip> {
  const response = await fetch(`${API_URL}/payslips/${payslipId}`, {
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la récupération de la fiche de paie');
  }

  return response.json();
}

/**
 * Télécharge le PDF d'une fiche de paie
 * @param payslipId - ID de la fiche de paie
 * @param token - Token d'authentification
 */
export async function downloadPayslipPDF(payslipId: string, token: string): Promise<void> {
  const response = await fetch(`${API_URL}/payslips/${payslipId}/pdf`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec du téléchargement du PDF');
  }

  // Récupérer le nom du fichier depuis les headers
  const contentDisposition = response.headers.get('Content-Disposition');
  let filename = 'fiche-paie.pdf';

  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="(.+)"/);
    if (filenameMatch) {
      filename = filenameMatch[1];
    }
  }

  // Créer un blob à partir de la réponse
  const blob = await response.blob();

  // Créer un lien de téléchargement et le déclencher
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  // Nettoyer
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// --- Gestion des Cotisations (Règles de Cotisation) ---

// Énumérations
export type TypeCotisation = 'COTISATION_SALARIALE' | 'COTISATION_PATRONALE' | 'CHARGE_FISCALE';
export type TypeCalcul = 'POURCENTAGE' | 'MONTANT_FIXE' | 'TRANCHES';
export type TypeAssiette = 'SALAIRE_BRUT' | 'SALAIRE_NET' | 'SALAIRE_PLAFONNE';

// Interfaces de données
export interface CategorieCotisation {
  id: string;
  code: string;
  nom: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type TypeOrganisme = 'URSSAF' | 'RETRAITE' | 'CHOMAGE' | 'PREVOYANCE' | 'MUTUELLE' | 'FORMATION' | 'AUTRE';

export interface OrganismeCotisation {
  id: string;
  code: string;
  nom: string;
  typeOrganisme: TypeOrganisme;
  description?: string;
  estGlobal: boolean;
  adresse?: string;
  codePostal?: string;
  ville?: string;
  telephone?: string;
  email?: string;
  siteWeb?: string;
  numeroSiret?: string;
  compagnieId?: string;
  compagnie?: {
    id: string;
    nom: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TauxCotisation {
  id: string;
  regleId: string;
  taux: number;
  dateDebut: string;
  dateFin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegleComptable {
  id: string;
  regleId: string;
  compteDebit: string;
  compteCredit: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegleCotisation {
  id: string;
  code: string;
  nom: string;
  description?: string;
  categorieId: string;
  categorie?: CategorieCotisation;
  organismeId: string;
  organisme?: OrganismeCotisation;
  typeCotisation: TypeCotisation;
  typeCalcul: TypeCalcul;
  typeAssiette: TypeAssiette;
  plancher?: number;
  plafond?: number;
  taux?: TauxCotisation[];
  reglesComptables?: RegleComptable[];
  estActif: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRegleData {
  code: string;
  nom: string;
  description?: string;
  categorieId: string;
  organismeId: string;
  typeCotisation: TypeCotisation;
  typeCalcul: TypeCalcul;
  typeAssiette: TypeAssiette;
  plancher?: number;
  plafond?: number;
  estActif?: boolean;
}

export type UpdateRegleData = Partial<CreateRegleData>;

export interface SimulationResult {
  salaireBrut: number;
  dateSimulation: string;
  cotisationsSalariales: number;
  cotisationsPatronales: number;
  chargesFiscales: number;
  salaireNet: number;
  coutTotal: number;
  details: {
    code: string;
    nom: string;
    categorie: string;
    organisme: string;
    typeCotisation: TypeCotisation;
    assiette: number;
    taux: number;
    montant: number;
  }[];
}

// --- Fonctions API des Catégories ---

export async function getCategories(token: string): Promise<CategorieCotisation[]> {
  const response = await fetch(`${API_URL}/cotisations/categories`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la récupération des catégories');
  }
  return response.json();
}

export async function getCategoryById(id: string, token: string): Promise<CategorieCotisation> {
  const response = await fetch(`${API_URL}/cotisations/categories/${id}`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la récupération de la catégorie');
  }
  return response.json();
}

// --- Fonctions API des Organismes ---

export async function getOrganismes(token: string): Promise<OrganismeCotisation[]> {
  const response = await fetch(`${API_URL}/cotisations/organismes`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la récupération des organismes');
  }
  return response.json();
}

export async function getOrganismeById(id: string, token: string): Promise<OrganismeCotisation> {
  const response = await fetch(`${API_URL}/cotisations/organismes/${id}`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la récupération de l\'organisme');
  }
  return response.json();
}

// --- Gestion des Organismes Collecteurs (Nouvelle API dédiée) ---

// Interfaces de données pour les organismes collecteurs
export interface CreateOrganismData {
  code: string;
  nom: string;
  typeOrganisme: TypeOrganisme;
  description?: string;
  compagnieId: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;
  telephone?: string;
  email?: string;
  siteWeb?: string;
  numeroSiret?: string;
}

export type UpdateOrganismData = Omit<Partial<CreateOrganismData>, 'code' | 'compagnieId'>;

// --- Fonctions API des Organismes Collecteurs ---

/**
 * Récupère tous les organismes collecteurs (globaux + spécifiques à l'utilisateur)
 * @param token - Token d'authentification
 */
export async function getAllOrganisms(token: string): Promise<OrganismeCotisation[]> {
  const response = await fetch(`${API_URL}/organisms`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la récupération des organismes collecteurs');
  }
  return response.json();
}

/**
 * Récupère uniquement les organismes globaux (obligatoires)
 */
export async function getGlobalOrganisms(): Promise<OrganismeCotisation[]> {
  const response = await fetch(`${API_URL}/organisms/global`);
  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la récupération des organismes globaux');
  }
  return response.json();
}

/**
 * Récupère un organisme collecteur spécifique par son ID
 * @param id - ID de l'organisme
 * @param token - Token d'authentification
 */
export async function getOrganismById(id: string, token: string): Promise<OrganismeCotisation> {
  const response = await fetch(`${API_URL}/organisms/${id}`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la récupération de l\'organisme');
  }
  return response.json();
}

/**
 * Crée un nouvel organisme collecteur spécifique à une entreprise
 * @param organismData - Données de l'organisme
 * @param token - Token d'authentification
 */
export async function createOrganism(
  organismData: CreateOrganismData,
  token: string
): Promise<OrganismeCotisation> {
  const response = await fetch(`${API_URL}/organisms`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(organismData),
  });
  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la création de l\'organisme');
  }
  return response.json();
}

/**
 * Met à jour un organisme collecteur spécifique
 * Les organismes globaux ne peuvent pas être modifiés
 * @param id - ID de l'organisme
 * @param organismData - Données à mettre à jour
 * @param token - Token d'authentification
 */
export async function updateOrganism(
  id: string,
  organismData: UpdateOrganismData,
  token: string
): Promise<OrganismeCotisation> {
  const response = await fetch(`${API_URL}/organisms/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(organismData),
  });
  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la mise à jour de l\'organisme');
  }
  return response.json();
}

/**
 * Supprime un organisme collecteur spécifique
 * Les organismes globaux ne peuvent pas être supprimés
 * @param id - ID de l'organisme
 * @param token - Token d'authentification
 */
export async function deleteOrganism(id: string, token: string): Promise<void> {
  const response = await fetch(`${API_URL}/organisms/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la suppression de l\'organisme');
  }
}

// --- Fonctions API des Règles de Cotisation ---

export async function getRegles(token: string): Promise<RegleCotisation[]> {
  const response = await fetch(`${API_URL}/cotisations/regles`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la récupération des règles');
  }
  return response.json();
}

export async function getRegleById(id: string, token: string): Promise<RegleCotisation> {
  const response = await fetch(`${API_URL}/cotisations/regles/${id}`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la récupération de la règle');
  }
  return response.json();
}

export async function createRegle(data: CreateRegleData, token: string): Promise<RegleCotisation> {
  const response = await fetch(`${API_URL}/cotisations/regles`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la création de la règle');
  }
  return response.json();
}

export async function updateRegle(
  id: string,
  data: UpdateRegleData,
  token: string
): Promise<RegleCotisation> {
  const response = await fetch(`${API_URL}/cotisations/regles/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la mise à jour de la règle');
  }
  return response.json();
}

export async function deleteRegle(id: string, token: string): Promise<void> {
  const response = await fetch(`${API_URL}/cotisations/regles/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la suppression de la règle');
  }
}

// --- Fonctions API des Taux de Cotisation ---

export async function createTaux(
  regleId: string,
  data: { taux: number; dateDebut: string; dateFin?: string },
  token: string
): Promise<TauxCotisation> {
  const response = await fetch(`${API_URL}/cotisations/regles/${regleId}/taux`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la création du taux');
  }
  return response.json();
}

export async function updateTaux(
  id: string,
  data: { taux?: number; dateDebut?: string; dateFin?: string },
  token: string
): Promise<TauxCotisation> {
  const response = await fetch(`${API_URL}/cotisations/taux/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la mise à jour du taux');
  }
  return response.json();
}

export async function deleteTaux(id: string, token: string): Promise<void> {
  const response = await fetch(`${API_URL}/cotisations/taux/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la suppression du taux');
  }
}

// --- Fonction API de Simulation ---

export async function simulateCotisations(
  salaireBrut: number,
  date: string,
  token: string
): Promise<SimulationResult> {
  const response = await fetch(`${API_URL}/cotisations/simulation`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ salaireBrut, date }),
  });
  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la simulation');
  }
  return response.json();
}

// --- Fonctions API d'Import/Export ---

export async function exportCotisations(
  format: 'yaml' | 'json',
  token: string
): Promise<Blob> {
  const response = await fetch(`${API_URL}/cotisations/export?format=${format}`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de l\'exportation');
  }
  return response.blob();
}

export async function importCotisations(
  format: 'yaml' | 'json',
  data: string,
  token: string
): Promise<{ categoriesCreated: number; organismesCreated: number; reglesCreated: number; tauxCreated: number; errors: string[] }> {
  const response = await fetch(`${API_URL}/cotisations/import`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ format, data }),
  });
  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de l\'importation');
  }
  return response.json();
}

// --- Gestion des Analytics (Indicateurs RH) ---

// Interfaces pour les données analytics
export interface DonneesMasseSalariale {
  periode: string;
  totalBrut: number;
  totalNet: number;
  coutTotal: number;
  nombre: number;
}

export interface DonneesEffectifs {
  departement: string;
  nombre: number;
}

export interface StatistiquesConges {
  totalJours: number;
  tauxAbsence: number;
  parType: Record<string, number>;
  parStatut: Record<string, number>;
}

export interface DepenseTop {
  id: string;
  nomEmploye: string;
  categorie: string;
  montant: number;
  date: string;
  description: string;
  statut: string;
}

export interface StatistiquesDepenses {
  montantTotal: number;
  parCategorie: Record<string, number>;
  parStatut: Record<string, number>;
  topDepenses: DepenseTop[];
}

// Paramètres de filtrage par période
export interface ParamsPeriode {
  period?: 'month' | 'quarter' | 'year';
  year?: string;
  month?: string;
  quarter?: string;
}

// --- Fonctions API Analytics ---

/**
 * Récupère les données de masse salariale (payroll) pour une entreprise
 * @param companyId - ID de l'entreprise
 * @param params - Paramètres de filtrage par période (optionnel)
 * @param token - Token d'authentification
 */
export async function getAnalyticsMasseSalariale(
  companyId: string,
  params: ParamsPeriode = {},
  token: string
): Promise<DonneesMasseSalariale[]> {
  const queryParams = new URLSearchParams();
  if (params.period) queryParams.append('period', params.period);
  if (params.year) queryParams.append('year', params.year);
  if (params.month) queryParams.append('month', params.month);
  if (params.quarter) queryParams.append('quarter', params.quarter);

  const queryString = queryParams.toString();
  const url = `${API_URL}/companies/${companyId}/analytics/payroll${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la récupération des analytics de masse salariale');
  }

  return response.json();
}

/**
 * Récupère les données de répartition des effectifs par département
 * @param companyId - ID de l'entreprise
 * @param token - Token d'authentification
 */
export async function getAnalyticsEffectifs(
  companyId: string,
  token: string
): Promise<DonneesEffectifs[]> {
  const response = await fetch(`${API_URL}/companies/${companyId}/analytics/headcount`, {
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la récupération des analytics d\'effectifs');
  }

  return response.json();
}

/**
 * Récupère les statistiques de congés pour une entreprise
 * @param companyId - ID de l'entreprise
 * @param params - Paramètres de filtrage par période (optionnel)
 * @param token - Token d'authentification
 */
export async function getAnalyticsConges(
  companyId: string,
  params: ParamsPeriode = {},
  token: string
): Promise<StatistiquesConges> {
  const queryParams = new URLSearchParams();
  if (params.period) queryParams.append('period', params.period);
  if (params.year) queryParams.append('year', params.year);
  if (params.month) queryParams.append('month', params.month);
  if (params.quarter) queryParams.append('quarter', params.quarter);

  const queryString = queryParams.toString();
  const url = `${API_URL}/companies/${companyId}/analytics/leaves${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la récupération des analytics de congés');
  }

  return response.json();
}

/**
 * Récupère les statistiques de notes de frais pour une entreprise
 * @param companyId - ID de l'entreprise
 * @param params - Paramètres de filtrage par période (optionnel)
 * @param limit - Limite du nombre de résultats pour topDepenses (optionnel)
 * @param token - Token d'authentification
 */
export async function getAnalyticsDepenses(
  companyId: string,
  params: ParamsPeriode,
  token: string,
  limit?: number
): Promise<StatistiquesDepenses> {
  const queryParams = new URLSearchParams();
  if (params.period) queryParams.append('period', params.period);
  if (params.year) queryParams.append('year', params.year);
  if (params.month) queryParams.append('month', params.month);
  if (params.quarter) queryParams.append('quarter', params.quarter);
  if (limit) queryParams.append('limit', limit.toString());

  const queryString = queryParams.toString();
  const url = `${API_URL}/companies/${companyId}/analytics/expenses${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la récupération des analytics de dépenses');
  }

  return response.json();
}

// --- Gestion des Congés ---

// Enums pour les congés
export type LeaveType = 'PAID_LEAVE' | 'SICK_LEAVE' | 'UNPAID_LEAVE' | 'PARENTAL_LEAVE' | 'OTHER';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

// Interfaces pour les congés
export interface Leave {
  id: string;
  employeeId: string;
  type: LeaveType;
  status: LeaveStatus;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  type: LeaveType;
  year: number;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveData {
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
}

export interface UpdateLeaveData {
  status?: LeaveStatus;
  type?: LeaveType;
  startDate?: string;
  endDate?: string;
  days?: number;
  reason?: string;
}

// --- Fonctions API des Congés ---

/**
 * Récupère toutes les demandes de congés d'un employé
 * @param companyId - ID de l'entreprise
 * @param employeeId - ID de l'employé
 * @param token - Token d'authentification
 */
export async function getLeaves(
  companyId: string,
  employeeId: string,
  token: string
): Promise<Leave[]> {
  const response = await fetch(
    `${API_URL}/companies/${companyId}/employees/${employeeId}/leaves`,
    {
      headers: getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la récupération des demandes de congés');
  }

  return response.json();
}

/**
 * Crée une nouvelle demande de congé
 * @param companyId - ID de l'entreprise
 * @param employeeId - ID de l'employé
 * @param leaveData - Données de la demande de congé
 * @param token - Token d'authentification
 */
export async function createLeave(
  companyId: string,
  employeeId: string,
  leaveData: CreateLeaveData,
  token: string
): Promise<Leave> {
  const response = await fetch(
    `${API_URL}/companies/${companyId}/employees/${employeeId}/leaves`,
    {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(leaveData),
    }
  );

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la création de la demande de congé');
  }

  return response.json();
}

/**
 * Met à jour une demande de congé (principalement pour changer le statut)
 * @param companyId - ID de l'entreprise
 * @param employeeId - ID de l'employé
 * @param leaveId - ID de la demande de congé
 * @param leaveData - Données à mettre à jour
 * @param token - Token d'authentification
 */
export async function updateLeave(
  companyId: string,
  employeeId: string,
  leaveId: string,
  leaveData: UpdateLeaveData,
  token: string
): Promise<Leave> {
  const response = await fetch(
    `${API_URL}/companies/${companyId}/employees/${employeeId}/leaves/${leaveId}`,
    {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify(leaveData),
    }
  );

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la mise à jour de la demande de congé');
  }

  return response.json();
}

/**
 * Supprime une demande de congé
 * @param companyId - ID de l'entreprise
 * @param employeeId - ID de l'employé
 * @param leaveId - ID de la demande de congé
 * @param token - Token d'authentification
 */
export async function deleteLeave(
  companyId: string,
  employeeId: string,
  leaveId: string,
  token: string
): Promise<void> {
  const response = await fetch(
    `${API_URL}/companies/${companyId}/employees/${employeeId}/leaves/${leaveId}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la suppression de la demande de congé');
  }
}

/**
 * Récupère les soldes de congés d'un employé
 * @param companyId - ID de l'entreprise
 * @param employeeId - ID de l'employé
 * @param token - Token d'authentification
 */
export async function getLeaveBalances(
  companyId: string,
  employeeId: string,
  token: string
): Promise<LeaveBalance[]> {
  const response = await fetch(
    `${API_URL}/companies/${companyId}/employees/${employeeId}/leaves/balances`,
    {
      headers: getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la récupération des soldes de congés');
  }

  return response.json();
}

// --- Gestion des Notes de Frais ---

// Enums pour les notes de frais
export type ExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
export type ExpenseCategory = 'TRANSPORT' | 'MEAL' | 'ACCOMMODATION' | 'EQUIPMENT' | 'OTHER';

// Interfaces pour les notes de frais
export interface ExpenseItem {
  id: string;
  reportId: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  description: string;
  receiptPath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseReport {
  id: string;
  employeeId: string;
  title: string;
  status: ExpenseStatus;
  totalAmount: number;
  items?: ExpenseItem[];
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseReportData {
  employeeId: string;
  title: string;
  items?: {
    category: ExpenseCategory;
    amount: number;
    date: string;
    description: string;
    receiptPath?: string;
  }[];
}

export interface UpdateExpenseReportData {
  title?: string;
  status?: ExpenseStatus;
}

export interface CreateExpenseItemData {
  category: ExpenseCategory;
  amount: number;
  date: string;
  description: string;
  receiptPath?: string;
}

export interface UpdateExpenseItemData {
  category?: ExpenseCategory;
  amount?: number;
  date?: string;
  description?: string;
  receiptPath?: string;
}

// --- Fonctions API des Notes de Frais ---

/**
 * Récupère tous les rapports de notes de frais d'une entreprise
 * @param companyId - ID de l'entreprise
 * @param params - Paramètres de filtrage (status, employeeId)
 * @param token - Token d'authentification
 */
export async function getExpenseReports(
  companyId: string,
  params: { status?: ExpenseStatus; employeeId?: string } = {},
  token: string
): Promise<ExpenseReport[]> {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);
  if (params.employeeId) queryParams.append('employeeId', params.employeeId);

  const queryString = queryParams.toString();
  const url = `${API_URL}/companies/${companyId}/expense-reports${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la récupération des notes de frais');
  }

  return response.json();
}

/**
 * Récupère un rapport de notes de frais spécifique
 * @param companyId - ID de l'entreprise
 * @param reportId - ID du rapport
 * @param token - Token d'authentification
 */
export async function getExpenseReport(
  companyId: string,
  reportId: string,
  token: string
): Promise<ExpenseReport> {
  const response = await fetch(
    `${API_URL}/companies/${companyId}/expense-reports/${reportId}`,
    {
      headers: getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la récupération du rapport de notes de frais');
  }

  return response.json();
}

/**
 * Crée un nouveau rapport de notes de frais
 * @param companyId - ID de l'entreprise
 * @param reportData - Données du rapport
 * @param token - Token d'authentification
 */
export async function createExpenseReport(
  companyId: string,
  reportData: CreateExpenseReportData,
  token: string
): Promise<ExpenseReport> {
  const response = await fetch(
    `${API_URL}/companies/${companyId}/expense-reports`,
    {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(reportData),
    }
  );

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la création du rapport de notes de frais');
  }

  return response.json();
}

/**
 * Met à jour un rapport de notes de frais
 * @param companyId - ID de l'entreprise
 * @param reportId - ID du rapport
 * @param reportData - Données à mettre à jour
 * @param token - Token d'authentification
 */
export async function updateExpenseReport(
  companyId: string,
  reportId: string,
  reportData: UpdateExpenseReportData,
  token: string
): Promise<ExpenseReport> {
  const response = await fetch(
    `${API_URL}/companies/${companyId}/expense-reports/${reportId}`,
    {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify(reportData),
    }
  );

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la mise à jour du rapport de notes de frais');
  }

  return response.json();
}

/**
 * Supprime un rapport de notes de frais
 * @param companyId - ID de l'entreprise
 * @param reportId - ID du rapport
 * @param token - Token d'authentification
 */
export async function deleteExpenseReport(
  companyId: string,
  reportId: string,
  token: string
): Promise<void> {
  const response = await fetch(
    `${API_URL}/companies/${companyId}/expense-reports/${reportId}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la suppression du rapport de notes de frais');
  }
}

/**
 * Ajoute un item à un rapport de notes de frais
 * @param companyId - ID de l'entreprise
 * @param reportId - ID du rapport
 * @param itemData - Données de l'item
 * @param token - Token d'authentification
 */
export async function addExpenseItem(
  companyId: string,
  reportId: string,
  itemData: CreateExpenseItemData,
  token: string
): Promise<ExpenseItem> {
  const response = await fetch(
    `${API_URL}/companies/${companyId}/expense-reports/${reportId}/items`,
    {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(itemData),
    }
  );

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de l\'ajout de la ligne de dépense');
  }

  return response.json();
}

/**
 * Met à jour un item d'un rapport de notes de frais
 * @param companyId - ID de l'entreprise
 * @param reportId - ID du rapport
 * @param itemId - ID de l'item
 * @param itemData - Données à mettre à jour
 * @param token - Token d'authentification
 */
export async function updateExpenseItem(
  companyId: string,
  reportId: string,
  itemId: string,
  itemData: UpdateExpenseItemData,
  token: string
): Promise<ExpenseItem> {
  const response = await fetch(
    `${API_URL}/companies/${companyId}/expense-reports/${reportId}/items/${itemId}`,
    {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify(itemData),
    }
  );

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la mise à jour de la ligne de dépense');
  }

  return response.json();
}

/**
 * Supprime un item d'un rapport de notes de frais
 * @param companyId - ID de l'entreprise
 * @param reportId - ID du rapport
 * @param itemId - ID de l'item
 * @param token - Token d'authentification
 */
export async function deleteExpenseItem(
  companyId: string,
  reportId: string,
  itemId: string,
  token: string
): Promise<void> {
  const response = await fetch(
    `${API_URL}/companies/${companyId}/expense-reports/${reportId}/items/${itemId}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la suppression de la ligne de dépense');
  }
}

/**
 * Upload un fichier de reçu pour un rapport de notes de frais
 * @param companyId - ID de l'entreprise
 * @param reportId - ID du rapport
 * @param file - Fichier à uploader
 * @param token - Token d'authentification
 * @returns Le chemin du fichier uploadé
 */
export async function uploadReceipt(
  companyId: string,
  reportId: string,
  file: File,
  token: string
): Promise<{ receiptPath: string }> {
  const formData = new FormData();
  formData.append('receipt', file);

  const response = await fetch(
    `${API_URL}/companies/${companyId}/expense-reports/${reportId}/upload-receipt`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de l\'upload du reçu');
  }

  return response.json();
}

// --- Gestion des Intégrations Comptables ---

// Enums pour les intégrations comptables
export type AccountingIntegrationType = 'SAGE' | 'QUICKBOOKS';
export type AccountingIntegrationStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR';
export type ExportStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'RETRYING';

// Interfaces pour les intégrations comptables
export interface AccountingIntegration {
  id: string;
  companyId: string;
  type: AccountingIntegrationType;
  status: AccountingIntegrationStatus;
  configuration: string; // Masqué côté API (retourne '***')
  lastSyncAt?: string;
  lastError?: string;
  exportLogs?: AccountingExportLog[];
  createdAt: string;
  updatedAt: string;
}

export interface AccountingExportLog {
  id: string;
  integrationId: string;
  status: ExportStatus;
  payPeriod?: string;
  recordCount: number;
  filePath?: string;
  errorMessage?: string;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SageConfig {
  formatType: 'TRA' | 'PNM';
  accountMapping: {
    salaryExpense: string;
    socialCharges: string;
    socialDebt: string;
    employeeDebt: string;
    taxCharges: string;
  };
  exportPath?: string;
  journalCode?: string;
}

export interface QuickBooksConfig {
  clientId: string;
  clientSecret: string;
  realmId: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: number;
  accountMapping: {
    salaryExpense: string;
    socialCharges: string;
    socialDebt: string;
    employeeDebt: string;
  };
  sandbox?: boolean;
}

export interface CreateIntegrationData {
  type: AccountingIntegrationType;
  configuration: SageConfig | QuickBooksConfig;
}

export interface UpdateIntegrationData {
  configuration?: SageConfig | QuickBooksConfig;
  status?: AccountingIntegrationStatus;
}

export interface ExportPayrollData {
  payPeriod: string; // Format YYYY-MM
}

export interface ExportPayrollResult {
  success: boolean;
  recordCount: number;
  filePath?: string;
}

export interface QuickBooksAuthUrl {
  url: string;
  state: string;
}

export interface QuickBooksTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  realmId: string;
}

// --- Fonctions API des Intégrations Comptables ---

/**
 * Récupère toutes les intégrations comptables d'une entreprise
 * @param companyId - ID de l'entreprise
 * @param token - Token d'authentification
 */
export async function getAccountingIntegrations(
  companyId: string,
  token: string
): Promise<AccountingIntegration[]> {
  const response = await fetch(
    `${API_URL}/companies/${companyId}/integrations`,
    {
      headers: getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la récupération des intégrations comptables');
  }

  return response.json();
}

/**
 * Crée une nouvelle intégration comptable
 * @param companyId - ID de l'entreprise
 * @param integrationData - Données de l'intégration
 * @param token - Token d'authentification
 */
export async function createAccountingIntegration(
  companyId: string,
  integrationData: CreateIntegrationData,
  token: string
): Promise<AccountingIntegration> {
  const response = await fetch(
    `${API_URL}/companies/${companyId}/integrations`,
    {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(integrationData),
    }
  );

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la création de l\'intégration comptable');
  }

  return response.json();
}

/**
 * Met à jour une intégration comptable
 * @param companyId - ID de l'entreprise
 * @param integrationId - ID de l'intégration
 * @param integrationData - Données à mettre à jour
 * @param token - Token d'authentification
 */
export async function updateAccountingIntegration(
  companyId: string,
  integrationId: string,
  integrationData: UpdateIntegrationData,
  token: string
): Promise<AccountingIntegration> {
  const response = await fetch(
    `${API_URL}/companies/${companyId}/integrations/${integrationId}`,
    {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify(integrationData),
    }
  );

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la mise à jour de l\'intégration comptable');
  }

  return response.json();
}

/**
 * Supprime une intégration comptable
 * @param companyId - ID de l'entreprise
 * @param integrationId - ID de l'intégration
 * @param token - Token d'authentification
 */
export async function deleteAccountingIntegration(
  companyId: string,
  integrationId: string,
  token: string
): Promise<void> {
  const response = await fetch(
    `${API_URL}/companies/${companyId}/integrations/${integrationId}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la suppression de l\'intégration comptable');
  }
}

/**
 * Exporte les données de paie vers le logiciel comptable
 * @param companyId - ID de l'entreprise
 * @param integrationId - ID de l'intégration
 * @param exportData - Données d'export (période de paie)
 * @param token - Token d'authentification
 */
export async function exportPayrollToAccounting(
  companyId: string,
  integrationId: string,
  exportData: ExportPayrollData,
  token: string
): Promise<ExportPayrollResult> {
  const response = await fetch(
    `${API_URL}/companies/${companyId}/integrations/${integrationId}/export`,
    {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(exportData),
    }
  );

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de l\'export vers le logiciel comptable');
  }

  return response.json();
}

/**
 * Récupère l'historique des exports pour une intégration
 * @param companyId - ID de l'entreprise
 * @param integrationId - ID de l'intégration
 * @param limit - Nombre maximum de logs à récupérer
 * @param token - Token d'authentification
 */
export async function getAccountingExportLogs(
  companyId: string,
  integrationId: string,
  limit: number = 50,
  token: string
): Promise<AccountingExportLog[]> {
  const response = await fetch(
    `${API_URL}/companies/${companyId}/integrations/${integrationId}/logs?limit=${limit}`,
    {
      headers: getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la récupération des logs d\'export');
  }

  return response.json();
}

/**
 * Génère l'URL d'autorisation OAuth 2.0 pour QuickBooks
 * @param clientId - Client ID QuickBooks
 * @param redirectUri - URI de redirection
 * @param sandbox - Utiliser l'environnement sandbox
 * @param token - Token d'authentification
 */
export async function getQuickBooksAuthUrl(
  clientId: string,
  redirectUri: string,
  sandbox: boolean = false,
  token: string
): Promise<QuickBooksAuthUrl> {
  const queryParams = new URLSearchParams({
    clientId,
    redirectUri,
    sandbox: sandbox.toString(),
  });

  const response = await fetch(
    `${API_URL}/integrations/quickbooks/auth-url?${queryParams.toString()}`,
    {
      headers: getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la génération de l\'URL d\'autorisation QuickBooks');
  }

  return response.json();
}

/**
 * Échange le code d'autorisation OAuth contre des tokens QuickBooks
 * @param clientId - Client ID QuickBooks
 * @param clientSecret - Client Secret QuickBooks
 * @param code - Code d'autorisation reçu
 * @param redirectUri - URI de redirection
 * @param token - Token d'authentification
 */
export async function exchangeQuickBooksToken(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string,
  token: string
): Promise<QuickBooksTokens> {
  const response = await fetch(
    `${API_URL}/integrations/quickbooks/exchange-token`,
    {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({
        clientId,
        clientSecret,
        code,
        redirectUri,
      }),
    }
  );

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de l\'échange du code d\'autorisation QuickBooks');
  }

  return response.json();
}

// --- Gestion des DSN (Déclarations Sociales Nominatives) ---

// Enums pour les DSN
export type TypeDeclarationDSN = 'MENSUELLE' | 'EVENEMENTIELLE';
export type StatutDSN = 'BROUILLON' | 'VALIDEE' | 'TRANSMISE' | 'ERREUR';
export type TypeMessageValidation = 'ERREUR' | 'AVERTISSEMENT' | 'INFORMATION';

// Interfaces pour les DSN
export interface DSNDeclaration {
  id: string;
  companyId: string;
  periodeDeclaration: string;
  typeDeclaration: TypeDeclarationDSN;
  statut: StatutDSN;
  contenuXml?: string;
  messagesValidation?: string;
  numeroDeclaration?: string;
  dateGeneration?: string;
  dateTransmission?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageValidation {
  type: TypeMessageValidation;
  code: string;
  message: string;
  champ?: string;
}

export interface ResultatValidation {
  valide: boolean;
  messages: MessageValidation[];
}

export interface GenerateDSNData {
  periode: string; // Format YYYY-MM
}

export interface GenerateDSNResult {
  declaration: DSNDeclaration;
  validation: ResultatValidation;
}

// --- Fonctions API des DSN ---

/**
 * Récupère toutes les déclarations DSN d'une entreprise
 * @param companyId - ID de l'entreprise
 * @param token - Token d'authentification
 */
export async function getDSNDeclarations(
  companyId: string,
  token: string
): Promise<DSNDeclaration[]> {
  const response = await fetch(`${API_URL}/companies/${companyId}/dsn`, {
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la récupération des déclarations DSN');
  }

  return response.json();
}

/**
 * Génère une nouvelle déclaration DSN pour une période donnée
 * @param companyId - ID de l'entreprise
 * @param data - Données de génération (période)
 * @param token - Token d'authentification
 */
export async function generateDSN(
  companyId: string,
  data: GenerateDSNData,
  token: string
): Promise<GenerateDSNResult> {
  const response = await fetch(`${API_URL}/companies/${companyId}/dsn/generate`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la génération de la DSN');
  }

  return response.json();
}

/**
 * Récupère les détails d'une déclaration DSN
 * @param companyId - ID de l'entreprise
 * @param dsnId - ID de la déclaration DSN
 * @param token - Token d'authentification
 */
export async function getDSNDeclaration(
  companyId: string,
  dsnId: string,
  token: string
): Promise<DSNDeclaration> {
  const response = await fetch(`${API_URL}/companies/${companyId}/dsn/${dsnId}`, {
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la récupération de la déclaration DSN');
  }

  return response.json();
}

/**
 * Télécharge le fichier XML d'une déclaration DSN
 * @param companyId - ID de l'entreprise
 * @param dsnId - ID de la déclaration DSN
 * @param token - Token d'authentification
 */
export async function downloadDSN(companyId: string, dsnId: string, token: string): Promise<void> {
  const response = await fetch(`${API_URL}/companies/${companyId}/dsn/${dsnId}/download`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec du téléchargement de la DSN');
  }

  // Récupérer le nom du fichier depuis les headers
  const contentDisposition = response.headers.get('Content-Disposition');
  let filename = 'dsn.xml';

  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="(.+)"/);
    if (filenameMatch) {
      filename = filenameMatch[1];
    }
  }

  // Créer un blob à partir de la réponse
  const blob = await response.blob();

  // Créer un lien de téléchargement et le déclencher
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  // Nettoyer
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Valide une déclaration DSN
 * @param companyId - ID de l'entreprise
 * @param dsnId - ID de la déclaration DSN
 * @param token - Token d'authentification
 */
export async function validateDSN(
  companyId: string,
  dsnId: string,
  token: string
): Promise<ResultatValidation> {
  const response = await fetch(`${API_URL}/companies/${companyId}/dsn/${dsnId}/validate`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la validation de la DSN');
  }

  return response.json();
}

/**
 * Supprime une déclaration DSN (uniquement si elle est en brouillon)
 * @param companyId - ID de l'entreprise
 * @param dsnId - ID de la déclaration DSN
 * @param token - Token d'authentification
 */
export async function deleteDSN(companyId: string, dsnId: string, token: string): Promise<void> {
  const response = await fetch(`${API_URL}/companies/${companyId}/dsn/${dsnId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la suppression de la DSN');
  }
}

// ========== API de transmission automatique DSN ==========

/**
 * Type pour le statut de transmission
 */
export type StatutTransmission =
  | 'EN_ATTENTE'
  | 'EN_COURS'
  | 'TRANSMISE'
  | 'ACCUSE_RECEPTION'
  | 'ERREUR'
  | 'REJETEE';

/**
 * Interface pour une transmission DSN
 */
export interface TransmissionDSN {
  id: string;
  declarationId: string;
  statut: StatutTransmission;
  dateTransmission: string | null;
  dateAccuseReception: string | null;
  dateDerniereVerification: string | null;
  idTransmission: string | null;
  numeroProtocole: string | null;
  codeRetour: string | null;
  messagesRetour: string | null;
  nombreTentatives: number;
  derniereErreur: string | null;
  prochaineTentative: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Interface pour le résultat de transmission
 */
export interface ResultatTransmission {
  succes: boolean;
  idTransmission?: string;
  numeroProtocole?: string;
  codeRetour?: string;
  messages?: string[];
  erreur?: string;
}

/**
 * Transmet automatiquement une DSN vers net-entreprises.fr
 * @param companyId - ID de l'entreprise
 * @param dsnId - ID de la déclaration DSN à transmettre
 * @param token - Token d'authentification
 * @returns Résultat de la transmission
 */
export async function transmettreDSN(
  companyId: string,
  dsnId: string,
  token: string
): Promise<{ message: string; transmission: ResultatTransmission }> {
  const response = await fetch(`${API_URL}/companies/${companyId}/dsn/${dsnId}/transmit`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la transmission de la DSN');
  }

  return response.json();
}

/**
 * Récupère le statut de transmission d'une DSN
 * @param companyId - ID de l'entreprise
 * @param dsnId - ID de la déclaration DSN
 * @param token - Token d'authentification
 * @returns Historique des transmissions
 */
export async function getTransmissionStatus(
  companyId: string,
  dsnId: string,
  token: string
): Promise<{ transmissions: TransmissionDSN[]; derniere: TransmissionDSN }> {
  const response = await fetch(
    `${API_URL}/companies/${companyId}/dsn/${dsnId}/transmission-status`,
    {
      method: 'GET',
      headers: getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la récupération du statut de transmission');
  }

  return response.json();
}

/**
 * Retente une transmission échouée
 * @param companyId - ID de l'entreprise
 * @param dsnId - ID de la déclaration DSN
 * @param transmissionId - ID de la transmission à retenter
 * @param token - Token d'authentification
 * @returns Résultat de la nouvelle tentative
 */
export async function retryTransmission(
  companyId: string,
  dsnId: string,
  transmissionId: string,
  token: string
): Promise<{ message: string; transmission: ResultatTransmission }> {
  const response = await fetch(
    `${API_URL}/companies/${companyId}/dsn/${dsnId}/transmission/${transmissionId}/retry`,
    {
      method: 'POST',
      headers: getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la nouvelle tentative de transmission');
  }

  return response.json();
}

// ========== API de configuration Net-Entreprises ==========

/**
 * Interface pour la configuration Net-Entreprises
 */
export interface ConfigurationNetEntreprises {
  id: string;
  siretDeclarant: string;
  numeroAdhesion: string | null;
  urlApi: string;
  modeTest: boolean;
  estActif: boolean;
  derniereVerification: string | null;
  derniereErreur: string | null;
  dateCreation: string;
  dateModification: string;
}

/**
 * Interface pour les données de configuration
 */
export interface ConfigurationNetEntreprisesData {
  siretDeclarant: string;
  numeroAdhesion?: string;
  certificat?: string;
  clePrivee?: string;
  motDePasseCertificat?: string;
  modeTest?: boolean;
}

/**
 * Récupère la configuration Net-Entreprises d'une entreprise
 * @param companyId - ID de l'entreprise
 * @param token - Token d'authentification
 * @returns Configuration Net-Entreprises
 */
export async function getNetEntreprisesConfig(
  companyId: string,
  token: string
): Promise<ConfigurationNetEntreprises> {
  const response = await fetch(`${API_URL}/companies/${companyId}/net-entreprises/config`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Configuration non trouvée');
    }
    await handleErrorResponse(response, 'Échec de la récupération de la configuration');
  }

  return response.json();
}

/**
 * Crée ou met à jour la configuration Net-Entreprises
 * @param companyId - ID de l'entreprise
 * @param data - Données de configuration
 * @param token - Token d'authentification
 * @returns Configuration créée/mise à jour
 */
export async function saveNetEntreprisesConfig(
  companyId: string,
  data: ConfigurationNetEntreprisesData,
  token: string
): Promise<{ message: string; config: ConfigurationNetEntreprises }> {
  const response = await fetch(`${API_URL}/companies/${companyId}/net-entreprises/config`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la sauvegarde de la configuration');
  }

  return response.json();
}

/**
 * Teste la configuration Net-Entreprises
 * @param companyId - ID de l'entreprise
 * @param token - Token d'authentification
 * @returns Résultat du test
 */
export async function testNetEntreprisesConfig(
  companyId: string,
  token: string
): Promise<{ message: string; valide: boolean; erreur?: string }> {
  const response = await fetch(`${API_URL}/companies/${companyId}/net-entreprises/config/test`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      message: 'Test échoué',
      valide: false,
      erreur: data.erreur || data.message || 'Erreur inconnue'
    };
  }

  return data;
}

/**
 * Active ou désactive la configuration Net-Entreprises
 * @param companyId - ID de l'entreprise
 * @param estActif - true pour activer, false pour désactiver
 * @param token - Token d'authentification
 * @returns Configuration mise à jour
 */
export async function toggleNetEntreprisesConfig(
  companyId: string,
  estActif: boolean,
  token: string
): Promise<{ message: string; config: ConfigurationNetEntreprises }> {
  const response = await fetch(`${API_URL}/companies/${companyId}/net-entreprises/config/toggle`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ estActif }),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la modification du statut');
  }

  return response.json();
}

// ========== Événements DSN ==========

// Types pour les événements DSN
export type TypeEvenementDSN =
  | 'EMBAUCHE'
  | 'FIN_CONTRAT'
  | 'ARRET_MALADIE'
  | 'CONGE_MATERNITE'
  | 'CONGE_PATERNITE'
  | 'CHANGEMENT_CONTRAT'
  | 'AUTRE';

export type StatutEvenementDSN = 'BROUILLON' | 'VALIDE' | 'DECLARE' | 'ERREUR';

// Interfaces pour les événements DSN
export interface DSNEvent {
  id: string;
  companyId: string;
  employeeId: string;
  typeEvenement: TypeEvenementDSN;
  statut: StatutEvenementDSN;
  dateEvenement: string;
  dateDeclaration?: string;
  donneesSpecifiques?: string;
  motif?: string;
  commentaires?: string;
  declarationId?: string;
  createdAt: string;
  updatedAt: string;
  employe?: {
    id: string;
    prenom: string;
    nom: string;
    email: string;
    numeroSecuriteSociale?: string;
    dateNaissance?: string;
    typeContrat?: string;
    dateEmbauche?: string;
  };
  declaration?: {
    id: string;
    periodeDeclaration: string;
    statut: string;
    numeroDeclaration?: string;
  };
}

export interface CreateDSNEventData {
  employeId: string;
  typeEvenement: TypeEvenementDSN;
  dateEvenement: string;
  motif?: string;
  commentaires?: string;
  donneesSpecifiques?: Record<string, unknown>;
}

export interface UpdateDSNEventData {
  typeEvenement?: TypeEvenementDSN;
  dateEvenement?: string;
  motif?: string;
  commentaires?: string;
  donneesSpecifiques?: Record<string, unknown>;
}

export interface ValidateDSNEventResult {
  message: string;
  evenement: DSNEvent;
}

// --- Fonctions API des événements DSN ---

/**
 * Récupère tous les événements DSN d'une entreprise
 * @param companyId - ID de l'entreprise
 * @param token - Token d'authentification
 */
export async function getDSNEvents(companyId: string, token: string): Promise<DSNEvent[]> {
  const response = await fetch(`${API_URL}/companies/${companyId}/dsn-events`, {
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la récupération des événements DSN');
  }

  return response.json();
}

/**
 * Crée un nouvel événement DSN
 * @param companyId - ID de l'entreprise
 * @param data - Données de l'événement
 * @param token - Token d'authentification
 */
export async function createDSNEvent(
  companyId: string,
  data: CreateDSNEventData,
  token: string
): Promise<DSNEvent> {
  const response = await fetch(`${API_URL}/companies/${companyId}/dsn-events`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la création de l\'événement DSN');
  }

  return response.json();
}

/**
 * Récupère les détails d'un événement DSN
 * @param companyId - ID de l'entreprise
 * @param eventId - ID de l'événement
 * @param token - Token d'authentification
 */
export async function getDSNEvent(
  companyId: string,
  eventId: string,
  token: string
): Promise<DSNEvent> {
  const response = await fetch(`${API_URL}/companies/${companyId}/dsn-events/${eventId}`, {
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la récupération de l\'événement DSN');
  }

  return response.json();
}

/**
 * Modifie un événement DSN (uniquement si statut = BROUILLON)
 * @param companyId - ID de l'entreprise
 * @param eventId - ID de l'événement
 * @param data - Données à modifier
 * @param token - Token d'authentification
 */
export async function updateDSNEvent(
  companyId: string,
  eventId: string,
  data: UpdateDSNEventData,
  token: string
): Promise<DSNEvent> {
  const response = await fetch(`${API_URL}/companies/${companyId}/dsn-events/${eventId}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la modification de l\'événement DSN');
  }

  return response.json();
}

/**
 * Supprime un événement DSN (uniquement si statut = BROUILLON ou ERREUR)
 * @param companyId - ID de l'entreprise
 * @param eventId - ID de l'événement
 * @param token - Token d'authentification
 */
export async function deleteDSNEvent(
  companyId: string,
  eventId: string,
  token: string
): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/companies/${companyId}/dsn-events/${eventId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la suppression de l\'événement DSN');
  }

  return response.json();
}

/**
 * Valide un événement DSN (passe de BROUILLON à VALIDE)
 * @param companyId - ID de l'entreprise
 * @param eventId - ID de l'événement
 * @param token - Token d'authentification
 */
export async function validateDSNEvent(
  companyId: string,
  eventId: string,
  token: string
): Promise<ValidateDSNEventResult> {
  const response = await fetch(`${API_URL}/companies/${companyId}/dsn-events/${eventId}/validate`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la validation de l\'événement DSN');
  }

  return response.json();
}

// ========== Historique des versions DSN ==========

// Types pour l'historique DSN
export type TypeModificationDSN = 'CREATION' | 'MODIFICATION' | 'REGENERATION' | 'RESTAURATION';

// Interfaces pour les versions DSN
export interface DSNVersion {
  id: string;
  declarationId: string;
  numeroVersion: number;
  typeModification: TypeModificationDSN;
  contenuXml?: string;
  messagesValidation?: string;
  statut: StatutDSN;
  auteurId: string;
  commentaire?: string;
  dateCreation: string;
  auteur: {
    id: string;
    nom: string | null;
    email: string;
  };
  declaration?: {
    id: string;
    periodeDeclaration: string;
    typeDeclaration: string;
    numeroDeclaration?: string;
  };
}

export interface VersionComparison {
  version1: DSNVersion;
  version2: DSNVersion;
  differences: {
    statut: boolean;
    contenuXml: boolean;
    messagesValidation: boolean;
    typeModification: {
      version1: string;
      version2: string;
    };
    auteur: {
      version1: string | null;
      version2: string | null;
    };
    dateCreation: {
      version1: string;
      version2: string;
    };
  };
}

export interface RestoreVersionResult {
  message: string;
  declaration: DSNDeclaration;
  nouvelleVersion: DSNVersion;
}

export interface HistoriqueExport {
  dsn: {
    id: string;
    periodeDeclaration: string;
    typeDeclaration: string;
    numeroDeclaration?: string;
    entreprise: {
      id: string;
      nom: string;
      siret?: string;
    };
  };
  historique: Array<{
    numeroVersion: number;
    typeModification: string;
    statut: string;
    auteur: string | null;
    email: string;
    commentaire?: string;
    dateCreation: string;
    aContenuXml: boolean;
  }>;
  dateExport: string;
  nombreVersions: number;
}

// --- Fonctions API de l'historique des versions DSN ---

/**
 * Récupère toutes les versions d'une déclaration DSN
 * @param companyId - ID de l'entreprise
 * @param dsnId - ID de la déclaration DSN
 * @param token - Token d'authentification
 */
export async function getDSNVersions(
  companyId: string,
  dsnId: string,
  token: string
): Promise<DSNVersion[]> {
  const response = await fetch(
    `${API_URL}/companies/${companyId}/dsn/${dsnId}/versions`,
    {
      headers: getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la récupération de l\'historique des versions');
  }

  return response.json();
}

/**
 * Récupère les détails d'une version spécifique
 * @param companyId - ID de l'entreprise
 * @param dsnId - ID de la déclaration DSN
 * @param versionId - ID de la version
 * @param token - Token d'authentification
 */
export async function getDSNVersion(
  companyId: string,
  dsnId: string,
  versionId: string,
  token: string
): Promise<DSNVersion> {
  const response = await fetch(
    `${API_URL}/companies/${companyId}/dsn/${dsnId}/versions/${versionId}`,
    {
      headers: getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la récupération de la version');
  }

  return response.json();
}

/**
 * Compare deux versions d'une DSN
 * @param companyId - ID de l'entreprise
 * @param dsnId - ID de la déclaration DSN
 * @param version1 - Numéro de la première version
 * @param version2 - Numéro de la deuxième version
 * @param token - Token d'authentification
 */
export async function compareDSNVersions(
  companyId: string,
  dsnId: string,
  version1: number,
  version2: number,
  token: string
): Promise<VersionComparison> {
  const response = await fetch(
    `${API_URL}/companies/${companyId}/dsn/${dsnId}/versions/compare?version1=${version1}&version2=${version2}`,
    {
      headers: getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la comparaison des versions');
  }

  return response.json();
}

/**
 * Restaure une version antérieure de la DSN
 * @param companyId - ID de l'entreprise
 * @param dsnId - ID de la déclaration DSN
 * @param versionId - ID de la version à restaurer
 * @param token - Token d'authentification
 */
export async function restoreDSNVersion(
  companyId: string,
  dsnId: string,
  versionId: string,
  token: string
): Promise<RestoreVersionResult> {
  const response = await fetch(
    `${API_URL}/companies/${companyId}/dsn/${dsnId}/versions/${versionId}/restore`,
    {
      method: 'POST',
      headers: getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de la restauration de la version');
  }

  return response.json();
}

/**
 * Exporte l'historique complet des versions au format JSON
 * @param companyId - ID de l'entreprise
 * @param dsnId - ID de la déclaration DSN
 * @param token - Token d'authentification
 */
export async function exportDSNHistory(
  companyId: string,
  dsnId: string,
  token: string
): Promise<void> {
  const response = await fetch(
    `${API_URL}/companies/${companyId}/dsn/${dsnId}/versions/export`,
    {
      headers: getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    await handleErrorResponse(response, 'Échec de l\'export de l\'historique');
  }

  // Récupérer le nom du fichier depuis les headers
  const contentDisposition = response.headers.get('Content-Disposition');
  let filename = 'dsn-historique.json';

  if (contentDisposition) {
    // Pattern sécurisé : éviter le regex greedy, limiter aux caractères non-guillemets
    const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
    if (filenameMatch) {
      filename = filenameMatch[1];
    }
  }

  // Créer un blob à partir de la réponse
  const blob = await response.blob();

  // Créer un lien de téléchargement et le déclencher
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  // Nettoyer
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}