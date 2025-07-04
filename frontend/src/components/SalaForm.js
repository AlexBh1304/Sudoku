import React, { useState } from 'react';

const colores = [
  '#e57373', // rojo
  '#64b5f6', // azul
  '#81c784', // verde
  '#ffd54f', // amarillo
  '#ba68c8', // morado
  '#ffb74d', // naranja
  '#ff69b4', // rosa
];

export default function SalaForm({ onSalaEntrar, codigoURL, socket }) {
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [color, setColor] = useState(colores[0]);
  const [modo, setModo] = useState('crear');
  const [mensaje, setMensaje] = useState('');
  const [dificultad, setDificultad] = useState('facil');
  const [modoJuego, setModoJuego] = useState('clasico');
  const [creando, setCreando] = useState(false);

  // Si recibimos un código por props, prellenar el campo y cambiar a modo unirse
  React.useEffect(() => {
    if (codigoURL) {
      setCodigo(codigoURL);
      setModo('unirse');
    }
  }, [codigoURL]);

  const handleCrear = (e) => {
    e.preventDefault();
    if (creando) return;
    setCreando(true);
    setMensaje('');
    if (!nombre) {
      setMensaje('Pon tu nombre');
      setCreando(false);
      return;
    }
    socket.emit('crearSala', { nombre, color, dificultad, modo: modoJuego }, (res) => {
      setCreando(false);
      if (res.exito) {
        onSalaEntrar({ codigo: res.codigo, nombre, color, dificultad, modo: modoJuego, socket });
      } else {
        setMensaje('Error al crear sala');
      }
    });
  };

  const handleUnirse = (e) => {
    e.preventDefault();
    if (!nombre || !codigo) return setMensaje('Pon tu nombre y código');
    socket.emit('unirseSala', { codigo: codigo.toUpperCase(), nombre, color }, (res) => {
      if (res.exito) {
        onSalaEntrar({ codigo: codigo.toUpperCase(), nombre, color, socket });
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
        <div style={{ marginBottom: 8 }}>
          <span>Color: </span>
          {colores.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              style={{
                background: c,
                border: color === c ? '3px solid #333' : '1px solid #ccc',
                width: 28,
                height: 28,
                marginRight: 4,
                borderRadius: '50%',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
        {modo === 'crear' && (
          <div style={{ marginBottom: 8 }}>
            <span>Dificultad: </span>
            <select value={dificultad} onChange={e => setDificultad(e.target.value)}>
              <option value="facil">Fácil</option>
              <option value="media">Media</option>
              <option value="dificil">Difícil</option>
            </select>
          </div>
        )}
        {modo === 'crear' && (
          <div style={{ marginBottom: 8 }}>
            <span>Modo: </span>
            <select value={modoJuego} onChange={e => setModoJuego(e.target.value)}>
              <option value="clasico">Clásico</option>
              <option value="contrarreloj">Contrarreloj</option>
            </select>
          </div>
        )}
        <button type="submit" style={{ width: '100%', marginBottom: 8 }} disabled={creando}>
          {modo === 'crear' ? (creando ? 'Creando...' : 'Crear y entrar') : 'Unirse'}
        </button>
      </form>
      <button onClick={() => { setModo(modo === 'crear' ? 'unirse' : 'crear'); setMensaje(''); setCreando(false); }} style={{ width: '100%' }}>
        {modo === 'crear' ? '¿Ya tienes código? Unirse' : '¿No tienes código? Crear sala'}
      </button>
      {mensaje && <div style={{ color: 'red', marginTop: 8 }}>{mensaje}</div>}
    </div>
  );
}
