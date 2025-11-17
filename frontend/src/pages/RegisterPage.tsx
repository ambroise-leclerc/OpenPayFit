import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { registerUser } from '../services/api';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const auth = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const data = await registerUser({ name, email, password });
      auth.login(data.token);
      navigate('/dashboard');
    } catch (err: unknown) {
      // Essayer d'extraire un message d'erreur convivial en utilisant les codes d'erreur quand c'est possible
      let message = 'Échec de l\'inscription. Veuillez vérifier vos informations.';

      // Vérifier la réponse d'erreur structurée avec des codes d'erreur
      const errorCode =
        // Vérifier si l'erreur a une propriété code
        (typeof err === 'object' && err !== null && 'code' in err && (err as Record<string, unknown>).code) ||
        null;

      switch (errorCode) {
        case 'EMAIL_EXISTS':
        case 'P2002': // Erreur de contrainte d'unicité Prisma
          message = 'Cette adresse email est déjà utilisée.';
          break;
        case 'REQUIRED_FIELDS':
          message = 'Tous les champs sont requis.';
          break;
        case 'INVALID_DATA':
          message = 'Informations invalides. Veuillez vérifier vos données.';
          break;
        default:
          // Se rabattre sur l'analyse du message pour la rétrocompatibilité
          if (err instanceof Error) {
            if (err.message.includes('already exists') || err.message.includes('existe déjà')) {
              message = 'Cette adresse email est déjà utilisée.';
            } else if (err.message.includes('required') || err.message.includes('requis')) {
              message = 'Tous les champs sont requis.';
            } else if (err.message.includes('invalid') || err.message.includes('invalide')) {
              message = 'Informations invalides. Veuillez vérifier vos données.';
            } else if (err.message.length < 100 && !err.message.includes('fetch')) {
              message = err.message;
            }
          }
          break;
      }
      
      setError(message);
    }
  };

  return (
    <div>
      <h2>Inscription</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Nom:</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label>Email:</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label>Mot de passe:</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit">S'inscrire</button>
      </form>
    </div>
  );
}
