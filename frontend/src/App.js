import React, { useState, useEffect } from 'react';
import logo from './logo.svg';
import './App.css';
import SalaForm from './components/SalaForm';

function App() {
  const [sala, setSala] = useState(null);

  // Detectar si hay ?sala= en la URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codigo = params.get('sala');
    if (codigo && !sala) {
      setSala({ codigo }); // Solo prellenar el código, no entrar aún
    }
  }, []);

  if (!sala || !sala.nombre) {
    // Si hay código en la URL, prellenar el campo en SalaForm
    return <SalaForm onSalaEntrar={setSala} codigoURL={sala?.codigo} />;
  }

  return (
    <div className="App">
      <h2>En sala: {sala.codigo}</h2>
      <p>Hola, {sala.nombre}!</p>
      <p>Comparte este link con tu amigo para que se una:</p>
      <input
        style={{ width: '80%' }}
        value={window.location.origin + '?sala=' + sala.codigo}
        readOnly
        onFocus={e => e.target.select()}
      />
      {/* Aquí irá el tablero y lógica de juego */}
    </div>
  );
}

export default App;
