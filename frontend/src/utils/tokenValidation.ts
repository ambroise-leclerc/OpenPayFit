// Fonction de décodage base64url pour JWT
function base64UrlDecode(str: string): string {
  // Remplacer les caractères URL-safe et ajouter le padding si nécessaire
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

// Utilitaires de validation de token JWT simples
export function isTokenExpired(token: string): boolean {
  try {
    // Les tokens JWT ont 3 parties séparées par des points
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    // Décoder le payload (deuxième partie) en utilisant le décodage base64url
    const payload = JSON.parse(base64UrlDecode(parts[1]));

    // Vérifier si le token a une date d'expiration
    if (!payload.exp) return false;

    // Vérifier si le token est expiré (exp est en secondes, Date.now() est en millisecondes)
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch {
    // Si on ne peut pas parser le token, le considérer comme invalide
    return true;
  }
}

export function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  if (!token.includes('.')) return false; // Devrait avoir des points pour la structure JWT
  return !isTokenExpired(token);
}