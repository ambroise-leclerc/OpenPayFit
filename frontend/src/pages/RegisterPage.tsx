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
      // Try to extract user-friendly error message
      let message = 'Échec de l\'inscription. Veuillez vérifier vos informations.';
      
      if (err instanceof Error) {
        // If it's a known validation error from our API, show it
        if (err.message.includes('already exists') || err.message.includes('existe déjà')) {
          message = 'Cette adresse email est déjà utilisée.';
        } else if (err.message.includes('required') || err.message.includes('requis')) {
          message = 'Tous les champs sont requis.';
        } else if (err.message.includes('invalid') || err.message.includes('invalide')) {
          message = 'Informations invalides. Veuillez vérifier vos données.';
        }
        // For other API errors, use the server message if it seems user-friendly
        else if (err.message.length < 100 && !err.message.includes('fetch')) {
          message = err.message;
        }
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
