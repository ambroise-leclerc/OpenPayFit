// Simple JWT token validation utilities
export function isTokenExpired(token: string): boolean {
  try {
    // JWT tokens have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    // Decode the payload (second part)
    const payload = JSON.parse(atob(parts[1]));
    
    // Check if token has expiration time
    if (!payload.exp) return false;
    
    // Check if token is expired (exp is in seconds, Date.now() is in milliseconds)
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch {
    // If we can't parse the token, consider it invalid
    return true;
  }
}

export function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  if (token.length < 10) return false; // Basic length check
  if (!token.includes('.')) return false; // Should have dots
  return !isTokenExpired(token);
}