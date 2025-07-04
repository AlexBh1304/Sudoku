import React, { useState, useEffect, useRef } from 'react';
import logo from './logo.svg';
import './App.css';
import SalaForm from './components/SalaForm';
import TableroSudoku from './components/TableroSudoku';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001'); // Socket global para toda la app

function App() {
  const [sala, setSala] = useState(null);
  const salaCreada = useRef(false);

  // Detectar si hay ?sala= en la URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codigo = params.get('sala');
    if (codigo && !sala) {
      setSala({ codigo }); // Solo prellenar el código, no entrar aún
    }
  }, []);

  // Wrapper para evitar doble creación
  const handleSalaEntrar = (data) => {
    if (salaCreada.current) return;
    salaCreada.current = true;
    setSala(data);
  };

  if (!sala || !sala.nombre) {
    // Si hay código en la URL, prellenar el campo en SalaForm
    return <SalaForm onSalaEntrar={handleSalaEntrar} codigoURL={sala?.codigo} socket={socket} />;
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
      <TableroSudoku sala={sala} socket={socket} />
    </div>
  );
}

export default App;
