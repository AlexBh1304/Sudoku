import React, { useState, useEffect } from 'react';

export default function TableroSudoku({ sala, socket }) {
  const [board, setBoard] = useState(null);
  const [selected, setSelected] = useState({ row: null, col: null });

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

  // Enviar cambios al backend
  const handleInput = (row, col, value) => {
    if (!board) return;
    const nuevo = board.map((fila, r) =>
      fila.map((celda, c) =>
        r === row && c === col
          ? { value, color: sala.color }
          : celda
      )
    );
    setBoard(nuevo);
    socket.emit('actualizarTablero', { codigo: sala.codigo, board: nuevo });
  };

  if (!board) return <div>Cargando tablero...</div>;

  return (
    <div style={{ display: 'inline-block', border: '2px solid #333', marginTop: 24 }}>
      {board.map((fila, r) => (
        <div key={r} style={{ display: 'flex' }}>
          {fila.map((celda, c) => (
            <input
              key={c}
              value={celda.value}
              maxLength={1}
              disabled={celda.fixed}
              onFocus={() => setSelected({ row: r, col: c })}
              onChange={e => {
                const val = e.target.value.replace(/[^1-9]/, '');
                handleInput(r, c, val);
              }}
              style={{
                width: 36,
                height: 36,
                textAlign: 'center',
                fontSize: 20,
                border: selected.row === r && selected.col === c ? '2px solid #000' : '1px solid #aaa',
                background: celda.fixed ? '#eee' : (celda.color || '#fff'),
                outline: 'none',
                fontWeight: celda.fixed ? 'bold' : 'normal',
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
