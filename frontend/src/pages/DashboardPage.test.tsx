import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DashboardPage from './DashboardPage';
import { AuthContext } from '../contexts/AuthContext';
import * as api from '../services/api';
import type { Company, Employee } from '../services/api';

// Simuler le module api
vi.mock('../services/api');

const mockCompanies: Company[] = [
  { id: '1', name: 'Company A', ownerId: 'user1', createdAt: '', updatedAt: '' },
  { id: '2', name: 'Company B', ownerId: 'user1', createdAt: '', updatedAt: '' },
];

const mockEmployees: Employee[] = [
  { id: '101', firstName: 'Alice', lastName: 'Smith', email: 'alice@companya.com', grossSalary: 50000, companyId: '1', createdAt: '', updatedAt: '' },
  { id: '102', firstName: 'Bob', lastName: 'Johnson', email: 'bob@companya.com', grossSalary: 60000, companyId: '1', createdAt: '', updatedAt: '' },
];

describe('DashboardPage', () => {
  const renderWithAuth = (ui: React.ReactElement) => {
    return render(
      <AuthContext.Provider value={{ token: 'fake-token', login: vi.fn(), logout: vi.fn() }}>
        {ui}
      </AuthContext.Provider>
    );
  };

  it('devrait afficher correctement les entreprises et les employés', async () => {
    // Configurer les mocks
    vi.mocked(api.getCompanies).mockResolvedValue(mockCompanies);
    vi.mocked(api.getEmployees).mockResolvedValue(mockEmployees);
    vi.mocked(api.getLeaves).mockResolvedValue([]);
    vi.mocked(api.getLeaveBalances).mockResolvedValue([]);

    renderWithAuth(<DashboardPage />);

    // 1. Vérifier l'état de chargement initialement (optionnel, mais bonne pratique)
    expect(screen.getByText(/chargement/i)).toBeInTheDocument();

    // 2. Attendre que les entreprises soient chargées et affichées
    await waitFor(() => {
      expect(screen.getByText('Company A')).toBeInTheDocument();
      expect(screen.getByText('Company B')).toBeInTheDocument();
    });

    // 3. La sélection par défaut devrait déclencher la récupération des employés
    await waitFor(() => {
      // Les noms sont dans des cellules différentes, on les recherche donc séparément
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Johnson')).toBeInTheDocument();
    });

    // 4. Simuler la sélection d'une autre entreprise par l'utilisateur (supposons qu'elle n'a pas d'employés)
    vi.mocked(api.getEmployees).mockResolvedValue([]); // Réponse mock pour la deuxième entreprise
    // Utiliser getAllByRole pour obtenir le premier combobox (sélecteur d'entreprise)
    const [companySelect] = screen.getAllByRole('combobox');
    fireEvent.change(companySelect, { target: { value: '2' } });

    await waitFor(() => {
        expect(screen.getByText(/Cette entreprise n'a pas encore d'employé./i)).toBeInTheDocument();
    });

  });
});
