import React, { useState, useEffect } from 'react';

export default function TableroSudoku({ sala, socket }) {
  const [board, setBoard] = useState(null);
  const [selected, setSelected] = useState({ row: null, col: null });
  const [selecciones, setSelecciones] = useState([]);

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

  return (
    <div style={{ display: 'inline-block', border: '2px solid #333', marginTop: 24 }}>
      <div style={{ marginBottom: 8, textAlign: 'center' }}>
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} onClick={() => handleButton(n)} style={{ width: 36, height: 36, margin: 2, fontSize: 18 }}>{n}</button>
        ))}
        <button onClick={handleClear} style={{ width: 36, height: 36, margin: 2, fontSize: 18 }}>⟲</button>
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
