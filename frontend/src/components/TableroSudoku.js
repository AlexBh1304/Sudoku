import React, { useState, useEffect } from 'react';

export default function TableroSudoku({ sala, socket }) {
  const [board, setBoard] = useState(null);
  const [selected, setSelected] = useState({ row: null, col: null });
  const [selecciones, setSelecciones] = useState([]);
  const [modoNotas, setModoNotas] = useState(false);
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

  // Lógica de input: modo normal y modo notas
  const handleInput = (row, col, value) => {
    if (!board) return;
    const celda = board[row][col];
    if (celda.fixed) return;
    if (!/^[1-9]$/.test(value)) return;
    let nuevo;
    if (modoNotas) {
      // Modo notas: toggle el número en el array de notas
      const notas = celda.notas || [];
      const idx = notas.indexOf(value);
      const nuevasNotas = idx === -1 ? [...notas, value].sort() : notas.filter(n => n !== value);
      nuevo = board.map((fila, r) =>
        fila.map((c, cidx) =>
          r === row && cidx === col
            ? { ...c, notas: nuevasNotas }
            : c
        )
      );
    } else {
      // Modo normal: solo permite poner número si la celda está vacía o toggle
      if (celda.value === value) {
        nuevo = board.map((fila, r) =>
          fila.map((c, cidx) =>
            r === row && cidx === col
              ? { ...c, value: '', color: null }
              : c
          )
        );
      } else if (celda.value === '') {
        // Elimina notas solo si el movimiento es correcto Y no hay error en el backend
        const esCorrecto = sala.solucion && sala.solucion[row][col].toString() === value;
        nuevo = board.map((fila, r) =>
          fila.map((c, cidx) =>
            r === row && cidx === col
              ? { ...c, value, color: sala.color, notas: [] }
              : c
          )
        );
        // Espera confirmación del backend antes de eliminar notas
        setBoard(nuevo);
        socket.emit('actualizarTablero', { codigo: sala.codigo, board: nuevo, eliminarNotas: esCorrecto });
        return;
      } else {
        return;
      }
    }
    setBoard(nuevo);
    socket.emit('actualizarTablero', { codigo: sala.codigo, board: nuevo });
  };

  // Elimina el número de las notas de la fila, columna y bloque
  function eliminarNotas(tablero, row, col, value) {
    const nuevo = tablero.map(fila => fila.map(c => ({ ...c })));
    for (let i = 0; i < 9; i++) {
      if (nuevo[row][i].notas) nuevo[row][i].notas = nuevo[row][i].notas.filter(n => n !== value);
      if (nuevo[i][col].notas) nuevo[i][col].notas = nuevo[i][col].notas.filter(n => n !== value);
    }
    const startRow = row - row % 3, startCol = col - col % 3;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const r = startRow + i, c = startCol + j;
      if (nuevo[r][c].notas) nuevo[r][c].notas = nuevo[r][c].notas.filter(n => n !== value);
    }
    return nuevo;
  }

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
    <div style={{ display: 'inline-block', border: '3px solid #333', marginTop: 24, background: '#fafafa', borderRadius: 10, boxShadow: '0 2px 12px #0002', padding: 16 }}>
      <div style={{ marginBottom: 8, textAlign: 'center' }}>
        <button onClick={() => setModoNotas(m => !m)} style={{ marginRight: 8, background: modoNotas ? '#ffd54f' : '#eee', fontWeight: 'bold', borderRadius: 6, border: '1px solid #ccc', padding: '6px 12px' }}>
          {modoNotas ? 'Modo Notas: ON' : 'Modo Notas: OFF'}
        </button>
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} onClick={() => handleButton(n)} style={{ width: 36, height: 36, margin: 2, fontSize: 18, borderRadius: 6, border: '1px solid #bbb', background: '#fff', boxShadow: '0 1px 2px #0001' }}>{n}</button>
        ))}
        <button onClick={handleClear} style={{ width: 36, height: 36, margin: 2, fontSize: 18, borderRadius: 6, border: '1px solid #bbb', background: '#fff', boxShadow: '0 1px 2px #0001' }}>⟲</button>
      </div>
      <div style={{ marginBottom: 8, textAlign: 'center', fontWeight: 'bold', fontSize: 18 }}>
        Tiempo: {format(tiempo)}
      </div>
      <div style={{ marginBottom: 8, textAlign: 'center' }}>
        {Object.entries(errores).map(([nombre, err]) => (
          <span key={nombre} style={{ margin: 8, color: nombre === sala.nombre ? sala.color : '#333' }}>
            {nombre}: {err} errores
          </span>
        ))}
      </div>
      <div style={{ display: 'inline-block', border: '2px solid #333', borderRadius: 6, background: '#fff' }}>
        {board.map((fila, r) => (
          <div key={r} style={{ display: 'flex' }}>
            {fila.map((celda, c) => {
              // Bordes gruesos para bloques 3x3
              const isSelected = selected.row === r && selected.col === c;
              const isRow = selected.row === r;
              const isCol = selected.col === c;
              const startRow = selected.row !== null ? selected.row - selected.row % 3 : -1;
              const startCol = selected.col !== null ? selected.col - selected.col % 3 : -1;
              const isBlock = selected.row !== null && selected.col !== null &&
                r >= startRow && r < startRow + 3 && c >= startCol && c < startCol + 3;
              const isHighlighted = isRow || isCol || isBlock;
              // Nuevo: celda bloqueada y resaltada
              const isFixedAndHighlighted = isHighlighted && celda.fixed;
              const style = {
                width: 36,
                height: 36,
                textAlign: 'center',
                fontSize: 20,
                borderTop: r % 3 === 0 ? '2.5px solid #333' : '1px solid #bbb',
                borderLeft: c % 3 === 0 ? '2.5px solid #333' : '1px solid #bbb',
                borderRight: c === 8 ? '2.5px solid #333' : '',
                borderBottom: r === 8 ? '2.5px solid #333' : '',
                background: celda.fixed ? '#eee' : (celda.color || '#fff'),
                outline: 'none',
                fontWeight: celda.fixed ? 'bold' : 'normal',
                cursor: celda.fixed ? 'not-allowed' : 'pointer',
                borderRadius: 0,
                boxSizing: 'border-box',
                boxShadow: '',
                transition: 'background 0.2s',
              };
              if (isSelected) {
                style.border = `2.5px solid ${sala.color}`;
                style.zIndex = 2;
                style.boxShadow = `0 0 0 2px ${sala.color}`;
              } else if (isFixedAndHighlighted) {
                // Más opaco/intenso para bloqueadas resaltadas
                style.background = `${sala.color}cc`;
                style.boxShadow = `0 0 0 2px ${sala.color}99`;
              } else if (isHighlighted) {
                style.background = `${sala.color}22`;
                style.boxShadow = `0 0 0 2px ${sala.color}33`;
              }
              if (selecciones.some(s => s.row === r && s.col === c)) {
                const colorOtro = selecciones.find(s => s.row === r && s.col === c).color;
                style.border = `2.5px solid ${colorOtro}`;
                style.zIndex = 2;
                style.boxShadow = `0 0 0 2px ${colorOtro}`;
              }
              return (
                <div key={c} style={{ position: 'relative' }}>
                  <input
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
                    style={style}
                    readOnly={false}
                  />
                  {/* Notas en la celda */}
                  {!celda.value && celda.notas && celda.notas.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: 2,
                      left: 2,
                      width: 32,
                      height: 32,
                      fontSize: 10,
                      color: '#888',
                      display: 'flex',
                      flexWrap: 'wrap',
                      pointerEvents: 'none',
                    }}>
                      {Array(9).fill(0).map((_, i) => (
                        <div key={i} style={{ width: '33%', height: '33%', textAlign: 'center' }}>
                          {celda.notas.includes((i+1).toString()) ? (i+1) : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
