import { useState, useEffect } from 'react';
import reactLogo from './assets/react.svg';
import './App.css';

function App() {
  const [message, setMessage] = useState('Loading...');
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
        console.error('Error fetching data:', error);
        setError('Failed to fetch message from backend. Make sure the backend is running on http://localhost:3000 and CORS is enabled.');
        setMessage(''); // Clear loading message
      });
  }, []); // Empty array means this effect runs once on mount

  return (
    <>
      <div>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>OpenPayFit</h1>
      <div className="card">
        <h2>Message from Backend:</h2>
        {error ? <p style={{ color: 'red' }}>{error}</p> : <p>{message}</p>}
      </div>
    </>
  );
}

export default App;
