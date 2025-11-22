declare namespace Express {
  export interface Request {
    userId?: string;
    company?: {
      id: string;
      proprietaireId: string;
    };
  }
}
