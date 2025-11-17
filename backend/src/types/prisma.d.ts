/**
 * Définitions de types pour les modèles Prisma
 * Utilisé comme solution de contournement lorsque le client Prisma ne peut pas être généré
 */

declare module '@prisma/client' {
  export interface Utilisateur {
    id: string;
    email: string;
    nom: string | null;
    motDePasse: string;
    role: Role;
    dateCreation: Date;
    dateModification: Date;
  }

  export interface Compagnie {
    id: string;
    nom: string;
    proprietaireId: string;
    dateCreation: Date;
    dateModification: Date;
  }

  export interface Employe {
    id: string;
    prenom: string;
    nom: string;
    email: string;
    salaireBrut: number;
    departement?: string;
    compagnieId: string;
    dateCreation: Date;
    dateModification: Date;
  }

  export interface FichePaie {
    id: string;
    periodeVersement: string;
    salaireBrut: number;
    prelevements: number;
    salaireNet: number;
    totalCotisationsSalariales?: number;
    totalCotisationsPatronales?: number;
    totalChargesFiscales?: number;
    coutTotal?: number;
    employeId: string;
    dateCreation: Date;
    dateModification: Date;
  }

  // Alias pour compatibilité avec le code existant
  export type User = Utilisateur;
  export type Company = Compagnie;
  export type Employee = Employe;
  export type Payslip = FichePaie;

  export enum Role {
    USER = 'USER',
    ADMIN = 'ADMIN'
  }

  export namespace Prisma {
    export class PrismaClientKnownRequestError extends Error {
      code: string;
      meta?: Record<string, any>;
      clientVersion: string;
      constructor(message: string, { code, clientVersion, meta }: { code: string; clientVersion: string; meta?: Record<string, any> });
    }
  }

  export class PrismaClient {
    utilisateur: any;
    compagnie: any;
    employe: any;
    fichePaie: any;
    $disconnect(): Promise<void>;
    $connect(): Promise<void>;
  }
}
