// Base64url decode function for JWT
function base64UrlDecode(str: string): string {
  // Replace URL-safe characters and add padding if necessary
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

// Simple JWT token validation utilities
export function isTokenExpired(token: string): boolean {
  try {
    // JWT tokens have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    // Decode the payload (second part) using base64url decoding
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    
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
  if (!token.includes('.')) return false; // Should have dots for JWT structure
  return !isTokenExpired(token);
}