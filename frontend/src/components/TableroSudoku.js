import React, { useState, useEffect } from 'react';

export default function TableroSudoku({ sala, socket }) {
  const [board, setBoard] = useState(null);
  const [selected, setSelected] = useState({ row: null, col: null });
  const [selecciones, setSelecciones] = useState([]);
  const [errores, setErrores] = useState({});
  const [tiempoInicio, setTiempoInicio] = useState(null);
  const [tiempoFinal, setTiempoFinal] = useState(null);
  const [finJuego, setFinJuego] = useState(null);

  // Recibe actualizaciones del tablero
  useEffect(() => {
    const handleTablero = (nuevoTablero) => {
      setBoard(nuevoTablero);
    };
    socket.on('tableroActualizado', handleTablero);
    // Solicita el tablero actual al entrar
    socket.emit('solicitarTablero', { codigo: sala.codigo });
    return () => {
      socket.off('tableroActualizado', handleTablero);
    };
  }, [socket, sala.codigo]);

  // Estado para celdas seleccionadas por otros jugadores
  useEffect(() => {
    const handleSeleccion = ({ row, col, color, nombre }) => {
      if (nombre === sala.nombre) return; // No mostrar mi propia selección
      setSelecciones([{ row, col, color, nombre }]);
    };
    socket.on('celdaSeleccionada', handleSeleccion);
    return () => {
      socket.off('celdaSeleccionada', handleSeleccion);
    };
  }, [socket, sala.nombre]);

  // Actualiza y muestra el número de errores
  useEffect(() => {
    const handleErrores = (err) => setErrores(err);
    socket.on('erroresActualizados', handleErrores);
    return () => {
      socket.off('erroresActualizados', handleErrores);
    };
  }, [socket]);

  useEffect(() => {
    const handleTemp = (data) => setTiempoInicio(data.inicio);
    socket.on('temporizador', handleTemp);
    return () => {
      socket.off('temporizador', handleTemp);
    };
  }, [socket]);

  useEffect(() => {
    const handleFin = (data) => {
      setFinJuego(data);
      if (data.tiempo) setTiempoFinal(data.tiempo);
    };
    socket.on('finJuego', handleFin);
    return () => {
      socket.off('finJuego', handleFin);
    };
  }, [socket]);

  // Temporizador en pantalla
  const [tiempo, setTiempo] = useState(0);
  useEffect(() => {
    if (!tiempoInicio || finJuego) return;
    const interval = setInterval(() => {
      setTiempo(Date.now() - tiempoInicio);
    }, 1000);
    return () => clearInterval(interval);
  }, [tiempoInicio, finJuego]);

  function format(ms) {
    if (!ms) return '00:00';
    const s = Math.floor(ms / 1000);
    const min = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  }

  // Al seleccionar una celda, notificar a la sala
  const handleFocus = (row, col) => {
    setSelected({ row, col });
    socket.emit('seleccionarCelda', { codigo: sala.codigo, row, col });
  };

  // Enviar cambios al backend
  const handleInput = (row, col, value) => {
    if (!board) return;
    const celda = board[row][col];
    if (celda.fixed) return;
    if (!/^[1-9]$/.test(value)) return;
    // Toggle: si ya hay un número, solo se borra si es el mismo
    let nuevo;
    if (celda.value === value) {
      nuevo = board.map((fila, r) =>
        fila.map((c, cidx) =>
          r === row && cidx === col
            ? { ...c, value: '', color: null }
            : c
        )
      );
    } else if (celda.value === '') {
      nuevo = board.map((fila, r) =>
        fila.map((c, cidx) =>
          r === row && cidx === col
            ? { ...c, value, color: sala.color }
            : c
        )
      );
    } else {
      return; // No permite reemplazar
    }
    setBoard(nuevo);
    socket.emit('actualizarTablero', { codigo: sala.codigo, board: nuevo });
  };

  // Botones del 1 al 9
  const handleButton = (num) => {
    if (selected.row === null || selected.col === null) return;
    handleInput(selected.row, selected.col, num.toString());
  };

  // Borrar celda
  const handleClear = () => {
    if (selected.row === null || selected.col === null) return;
    const celda = board[selected.row][selected.col];
    if (celda.fixed || celda.value === '') return;
    handleInput(selected.row, selected.col, celda.value); // toggle para borrar
  };

  if (!board) return <div>Cargando tablero...</div>;

  if (finJuego) {
    return (
      <div style={{ textAlign: 'center', marginTop: 40 }}>
        <h3>Tiempo final: {format(tiempoFinal)}</h3>
        {finJuego.motivo === 'victoria' ? (
          <h2 style={{ color: 'green' }}>¡Felicidades, completaron el Sudoku!</h2>
        ) : (
          <h2 style={{ color: 'red' }}>¡Juego terminado por errores!</h2>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'inline-block', border: '2px solid #333', marginTop: 24 }}>
      <div style={{ marginBottom: 8, textAlign: 'center' }}>
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} onClick={() => handleButton(n)} style={{ width: 36, height: 36, margin: 2, fontSize: 18 }}>{n}</button>
        ))}
        <button onClick={handleClear} style={{ width: 36, height: 36, margin: 2, fontSize: 18 }}>⟲</button>
      </div>
      <div style={{ marginBottom: 8, textAlign: 'center' }}>
        {Object.entries(errores).map(([nombre, err]) => (
          <span key={nombre} style={{ margin: 8, color: nombre === sala.nombre ? sala.color : '#333' }}>
            {nombre}: {err} errores
          </span>
        ))}
      </div>
      <div style={{ marginBottom: 8, textAlign: 'center', fontWeight: 'bold', fontSize: 18 }}>
        Tiempo: {format(tiempo)}
      </div>
      {board.map((fila, r) => (
        <div key={r} style={{ display: 'flex' }}>
          {fila.map((celda, c) => (
            <input
              key={c}
              value={celda.value}
              maxLength={1}
              disabled={celda.fixed}
              onFocus={() => handleFocus(r, c)}
              onChange={e => {
                const val = e.target.value.replace(/[^1-9]/, '');
                if (!val) return;
                handleInput(r, c, val);
              }}
              onKeyDown={e => {
                if (/^[1-9]$/.test(e.key)) {
                  e.preventDefault();
                  handleInput(r, c, e.key);
                } else if (e.key === 'Backspace' || e.key === 'Delete') {
                  e.preventDefault();
                  if (!celda.fixed && celda.value !== '') handleInput(r, c, celda.value);
                }
              }}
              style={{
                width: 36,
                height: 36,
                textAlign: 'center',
                fontSize: 20,
                border: selected.row === r && selected.col === c ? `2.5px solid ${sala.color}` :
                  (selecciones.some(s => s.row === r && s.col === c) ? `2px solid ${selecciones.find(s => s.row === r && s.col === c).color}` : '1px solid #aaa'),
                background: celda.fixed ? '#eee' : (celda.color || '#fff'),
                outline: 'none',
                fontWeight: celda.fixed ? 'bold' : 'normal',
                cursor: celda.fixed ? 'not-allowed' : 'pointer',
              }}
              readOnly={false}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
