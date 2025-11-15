// Use environment variable for API URL, fallback to localhost for development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Custom error class with HTTP status code
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Define the registration data interface
export interface RegisterUserData {
  name: string;
  email: string;
  password: string;
}

// Define the login credentials interface
export interface LoginCredentials {
  email: string;
  password: string;
}

// Define API response interfaces
export interface AuthResponse {
  token: string;
}

// Helper function for error handling
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
    // Use fallback message if parsing fails
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

// --- Company and Employee Management ---

// Data Interfaces based on Prisma Schema
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

// Helper function to get headers with auth token
function getAuthHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

// --- API Functions ---

// Companies
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

// Employees
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

// --- Payroll Management ---

// Payroll Data Interfaces
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
  period: string; // Format: YYYY-MM
}

export interface PayrollRunResult {
  status: 'success' | 'error';
  payslipsGenerated: number;
  errors?: string[];
}

// --- Payroll API Functions ---

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