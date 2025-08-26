// Use environment variable for API URL, fallback to localhost for development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
  throw new Error(errorMessage);
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