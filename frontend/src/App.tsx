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
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then(data => setMessage(data))
      .catch(error => {
        console.error('Erreur lors de la récupération des données :', error);
        setError('Impossible de récupérer le message depuis le serveur. Assurez-vous que le serveur fonctionne sur http://localhost:3000 et que CORS est activé.');
        setMessage(''); // Effacer le message de chargement
      });
  }, []); // Tableau vide signifie que cet effet s'exécute une seule fois au montage

  return (
    <>
      <div>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="Logo React" />
        </a>
      </div>
      <h1>OpenPayFit</h1>
      <div className="card">
        <h2>Message du Serveur :</h2>
        {error ? <p style={{ color: 'red' }}>{error}</p> : <p>{message}</p>}
      </div>
    </>
  );
}

export default App;
