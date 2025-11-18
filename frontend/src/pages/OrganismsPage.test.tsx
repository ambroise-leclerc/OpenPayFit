/**
 * Tests pour la page de gestion des organismes collecteurs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import OrganismsPage from './OrganismsPage';
import * as api from '../services/api';
import type { Company } from '../services/api';

// Mock du module API
vi.mock('../services/api');

describe('OrganismsPage', () => {
  const mockToken = 'fake-token';

  const mockAuthContext = {
    token: mockToken,
    login: vi.fn(),
    logout: vi.fn(),
  };

  const mockCompanies: Company[] = [
    {
      id: 'company-1',
      name: 'Entreprise A',
      ownerId: 'user-1',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    },
  ];

  const mockOrganisms = [
    {
      id: 'org-1',
      code: 'URSSAF',
      nom: 'URSSAF',
      typeOrganisme: 'URSSAF' as const,
      description: 'Organisme collecteur principal',
      estGlobal: true,
      telephone: '3957',
      siteWeb: 'https://www.urssaf.fr',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    },
    {
      id: 'org-2',
      code: 'AG2R',
      nom: 'AG2R LA MONDIALE',
      typeOrganisme: 'RETRAITE' as const,
      description: 'Caisse de retraite complémentaire',
      estGlobal: false,
      compagnieId: 'company-1',
      compagnie: {
        id: 'company-1',
        nom: 'Entreprise A',
      },
      telephone: '0123456789',
      email: 'contact@ag2r.fr',
      siteWeb: 'https://www.ag2rlamondiale.fr',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    },
  ];

  const renderWithAuth = (ui: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          {ui}
        </AuthContext.Provider>
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the page with loading state initially', () => {
    vi.mocked(api.getAllOrganisms).mockImplementation(() => new Promise(() => {}));
    vi.mocked(api.getCompanies).mockImplementation(() => new Promise(() => {}));

    renderWithAuth(<OrganismsPage />);

    expect(screen.getByText('Organismes Collecteurs')).toBeInTheDocument();
    expect(screen.getByText('Chargement...')).toBeInTheDocument();
  });

  it('should display organisms after loading', async () => {
    vi.mocked(api.getAllOrganisms).mockResolvedValue(mockOrganisms);
    vi.mocked(api.getCompanies).mockResolvedValue(mockCompanies);

    renderWithAuth(<OrganismsPage />);

    await waitFor(() => {
      expect(screen.getByText('Organismes Globaux (Obligatoires)')).toBeInTheDocument();
    });

    // Vérifier que l'organisme global est affiché (vérifier plusieurs occurrences de URSSAF)
    const urssafElements = screen.getAllByText('URSSAF');
    expect(urssafElements.length).toBeGreaterThan(0);
    expect(screen.getByText(/Organisme collecteur principal/)).toBeInTheDocument();

    // Vérifier que l'organisme spécifique est affiché
    expect(screen.getByText('AG2R LA MONDIALE')).toBeInTheDocument();
    expect(screen.getByText(/Caisse de retraite complémentaire/)).toBeInTheDocument();
    expect(screen.getByText('Entreprise A')).toBeInTheDocument();
  });

  it('should show "Ajouter un organisme" button', async () => {
    vi.mocked(api.getAllOrganisms).mockResolvedValue(mockOrganisms);
    vi.mocked(api.getCompanies).mockResolvedValue(mockCompanies);

    renderWithAuth(<OrganismsPage />);

    await waitFor(() => {
      expect(screen.getByText('+ Ajouter un organisme')).toBeInTheDocument();
    });
  });

  it('should display error message when API call fails', async () => {
    const errorMessage = 'Erreur réseau';
    vi.mocked(api.getAllOrganisms).mockRejectedValue(new Error(errorMessage));
    vi.mocked(api.getCompanies).mockResolvedValue(mockCompanies);

    renderWithAuth(<OrganismsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Erreur :/)).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should show message when no specific organisms exist', async () => {
    const globalOnlyOrganisms = mockOrganisms.filter((o) => o.estGlobal);
    vi.mocked(api.getAllOrganisms).mockResolvedValue(globalOnlyOrganisms);
    vi.mocked(api.getCompanies).mockResolvedValue(mockCompanies);

    renderWithAuth(<OrganismsPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/Aucun organisme spécifique/)
      ).toBeInTheDocument();
    });
  });

  it('should display action buttons for specific organisms only', async () => {
    vi.mocked(api.getAllOrganisms).mockResolvedValue(mockOrganisms);
    vi.mocked(api.getCompanies).mockResolvedValue(mockCompanies);

    renderWithAuth(<OrganismsPage />);

    await waitFor(() => {
      // Les organismes spécifiques doivent avoir des boutons d'action
      const modifierButtons = screen.getAllByText(/Modifier/);
      const supprimerButtons = screen.getAllByText(/Supprimer/);

      // Seulement 1 organisme spécifique dans nos mocks
      expect(modifierButtons).toHaveLength(1);
      expect(supprimerButtons).toHaveLength(1);
    });
  });
});
