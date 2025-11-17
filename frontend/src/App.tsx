import { useState, useEffect } from 'react';
import reactLogo from './assets/react.svg';
import './App.css';

function App() {
  const [message, setMessage] = useState('Chargement...');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('http://localhost:3000/')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Erreur HTTP! statut: ${response.status}`);
        }
        return response.text();
      })
      .then(data => setMessage(data))
      .catch(error => {
        console.error('Erreur lors de la récupération des données:', error);
        setError('Échec de la récupération du message depuis le backend. Assurez-vous que le backend est en cours d\'exécution sur http://localhost:3000 et que CORS est activé.');
        setMessage(''); // Effacer le message de chargement
      });
  }, []); // Tableau vide signifie que cet effet s'exécute une fois au montage

  return (
    <>
      <div>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>OpenPayFit</h1>
      <div className="card">
        <h2>Message du Backend :</h2>
        {error ? <p style={{ color: 'red' }}>{error}</p> : <p>{message}</p>}
      </div>
    </>
  );
}

export default App;
