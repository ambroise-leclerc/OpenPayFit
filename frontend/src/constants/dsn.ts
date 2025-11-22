import type { TypeEvenementDSN } from '../services/api';

export interface EventTypeOption {
  value: TypeEvenementDSN;
  label: string;
}

export const DSN_EVENT_TYPES: EventTypeOption[] = [
  { value: 'EMBAUCHE', label: 'Embauche' },
  { value: 'FIN_CONTRAT', label: 'Fin de contrat' },
  { value: 'ARRET_MALADIE', label: 'Arrêt maladie' },
  { value: 'CONGE_MATERNITE', label: 'Congé maternité' },
  { value: 'CONGE_PATERNITE', label: 'Congé paternité' },
  { value: 'CHANGEMENT_CONTRAT', label: 'Changement de contrat' },
  { value: 'AUTRE', label: 'Autre' },
];

export const DSN_EVENT_TYPE_LABELS: Record<TypeEvenementDSN, string> = {
  EMBAUCHE: 'Embauche',
  FIN_CONTRAT: 'Fin de contrat',
  ARRET_MALADIE: 'Arrêt maladie',
  CONGE_MATERNITE: 'Congé maternité',
  CONGE_PATERNITE: 'Congé paternité',
  CHANGEMENT_CONTRAT: 'Changement de contrat',
  AUTRE: 'Autre',
};
