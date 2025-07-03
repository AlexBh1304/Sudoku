import React, { useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001'); // Cambia la URL al desplegar

export default function SalaForm({ onSalaEntrar, codigoURL }) {
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [modo, setModo] = useState('crear');
  const [mensaje, setMensaje] = useState('');

  // Si recibimos un código por props, prellenar el campo y cambiar a modo unirse
  React.useEffect(() => {
    if (codigoURL) {
      setCodigo(codigoURL);
      setModo('unirse');
    }
  }, [codigoURL]);

  const handleCrear = (e) => {
    e.preventDefault();
    if (!nombre) return setMensaje('Pon tu nombre');
    socket.emit('crearSala', { nombre }, (res) => {
      if (res.exito) {
        onSalaEntrar({ codigo: res.codigo, nombre, socket });
      } else {
        setMensaje('Error al crear sala');
      }
    });
  };

  const handleUnirse = (e) => {
    e.preventDefault();
    if (!nombre || !codigo) return setMensaje('Pon tu nombre y código');
    socket.emit('unirseSala', { codigo: codigo.toUpperCase(), nombre }, (res) => {
      if (res.exito) {
        onSalaEntrar({ codigo: codigo.toUpperCase(), nombre, socket });
      } else {
        setMensaje(res.mensaje || 'No se pudo unir');
      }
    });
  };

  return (
    <div style={{ maxWidth: 400, margin: 'auto', padding: 20 }}>
      <h2>{modo === 'crear' ? 'Crear sala' : 'Unirse a sala'}</h2>
      <form onSubmit={modo === 'crear' ? handleCrear : handleUnirse}>
        <input
          type="text"
          placeholder="Tu nombre"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          style={{ width: '100%', marginBottom: 8 }}
        />
        {modo === 'unirse' && (
          <input
            type="text"
            placeholder="Código de sala"
            value={codigo}
            onChange={e => setCodigo(e.target.value)}
            style={{ width: '100%', marginBottom: 8 }}
          />
        )}
        <button type="submit" style={{ width: '100%', marginBottom: 8 }}>
          {modo === 'crear' ? 'Crear y entrar' : 'Unirse'}
        </button>
      </form>
      <button onClick={() => setModo(modo === 'crear' ? 'unirse' : 'crear')} style={{ width: '100%' }}>
        {modo === 'crear' ? '¿Ya tienes código? Unirse' : '¿No tienes código? Crear sala'}
      </button>
      {mensaje && <div style={{ color: 'red', marginTop: 8 }}>{mensaje}</div>}
    </div>
  );
}
