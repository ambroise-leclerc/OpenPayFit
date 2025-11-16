import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import PayslipDetailPage from './PayslipDetailPage';
import { AuthContext } from '../contexts/AuthContext';
import * as api from '../services/api';

// Mock du module api
vi.mock('../services/api');

// Mock de useParams
const mockUseParams = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => mockUseParams(),
  };
});

describe('PayslipDetailPage', () => {
  const mockToken = 'fake-token';
  const mockLogout = vi.fn();

  const mockPayslip = {
    id: 'payslip-1',
    payPeriod: '2025-11',
    grossSalary: 4000,
    deductions: 1000,
    netSalary: 3000,
    employeeId: 'emp-1',
    employeeFirstName: 'Alice',
    employeeLastName: 'Martin',
    createdAt: '2025-11-15T10:00:00Z',
  };

  const renderWithAuth = (ui: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <AuthContext.Provider value={{ token: mockToken, login: vi.fn(), logout: mockLogout }}>
          {ui}
        </AuthContext.Provider>
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ id: 'payslip-1' });
  });

  it('should display payslip details correctly', async () => {
    vi.mocked(api.getPayslipById).mockResolvedValue(mockPayslip);

    renderWithAuth(<PayslipDetailPage />);

    // Attendre que les données soient chargées
    await waitFor(() => {
      expect(screen.getByText('Fiche de Paie')).toBeInTheDocument();
    });

    // Vérifier que les informations sont affichées
    expect(screen.getByText('Novembre 2025')).toBeInTheDocument();
    expect(screen.getByText('Alice Martin')).toBeInTheDocument();
    expect(screen.getByText('4 000,00 €')).toBeInTheDocument();
    expect(screen.getByText('3 000,00 €')).toBeInTheDocument();
  });

  it('should display loading state initially', () => {
    vi.mocked(api.getPayslipById).mockImplementation(
      () => new Promise(() => {}) // Promise qui ne se résout jamais
    );

    renderWithAuth(<PayslipDetailPage />);

    expect(screen.getByText('Chargement...')).toBeInTheDocument();
  });

  it('should display error when payslip is not found', async () => {
    vi.mocked(api.getPayslipById).mockRejectedValue(
      new api.ApiError('Fiche de paie non trouvée', 404)
    );

    renderWithAuth(<PayslipDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/Fiche de paie non trouvée|Erreur lors du chargement de la fiche de paie/)).toBeInTheDocument();
    });

    expect(screen.getByText('Retour à la liste')).toBeInTheDocument();
  });

  it('should call logout on 401 error', async () => {
    // Créer une erreur qui correspond à ApiError
    const error = new Error('Non autorisé') as Error & { status: number };
    error.status = 401;
    error.name = 'ApiError';

    // Modifier Object.prototype.constructor pour que instanceof fonctionne
    Object.setPrototypeOf(error, api.ApiError.prototype);

    vi.mocked(api.getPayslipById).mockRejectedValue(error);

    renderWithAuth(<PayslipDetailPage />);

    // Attendre que l'erreur soit affichée et que logout soit appelé
    await waitFor(() => {
      expect(screen.getByText(/Non autorisé|Erreur lors du chargement/)).toBeInTheDocument();
    });

    // Vérifier que logout a été appelé
    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('should have download PDF button', async () => {
    vi.mocked(api.getPayslipById).mockResolvedValue(mockPayslip);

    renderWithAuth(<PayslipDetailPage />);

    await waitFor(() => {
      const downloadButton = screen.getByText('📥 Télécharger PDF');
      expect(downloadButton).toBeInTheDocument();
    });
  });

  it('should have back to list link', async () => {
    vi.mocked(api.getPayslipById).mockResolvedValue(mockPayslip);

    renderWithAuth(<PayslipDetailPage />);

    await waitFor(() => {
      const backLink = screen.getByText('Retour à la liste');
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute('href', '/payroll');
    });
  });

  it('should display period in French format', async () => {
    const payslipWithDifferentPeriod = {
      ...mockPayslip,
      payPeriod: '2025-01',
    };
    vi.mocked(api.getPayslipById).mockResolvedValue(payslipWithDifferentPeriod);

    renderWithAuth(<PayslipDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Janvier 2025')).toBeInTheDocument();
    });
  });

  it('should display employee ID when name is not available', async () => {
    const payslipWithoutName: api.Payslip = {
      ...mockPayslip,
      employeeFirstName: undefined,
      employeeLastName: undefined,
    };
    vi.mocked(api.getPayslipById).mockResolvedValue(payslipWithoutName);

    renderWithAuth(<PayslipDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/ID: emp-1/)).toBeInTheDocument();
    });
  });
});
