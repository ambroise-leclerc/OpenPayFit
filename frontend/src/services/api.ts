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

export async function registerUser(userData: RegisterUserData): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    let errorMessage = 'Échec de l\'inscription';
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
      errorMessage = response.statusText || 'Échec de l\'inscription';
    }
    throw new Error(errorMessage);
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
    let errorMessage = 'Échec de la connexion';
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
      errorMessage = response.statusText || 'Échec de la connexion';
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
