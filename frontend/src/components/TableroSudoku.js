import React, { useState, useEffect, useRef } from 'react';
import './TableroSudoku.css';

export default function TableroSudoku({ sala, socket }) {
  // Estado para miembros conectados (debe ir antes de cualquier uso)
  const [miembros, setMiembros] = useState([]);
  const [board, setBoard] = useState(null);
  const [selected, setSelected] = useState({ row: null, col: null });
  const [selecciones, setSelecciones] = useState([]);
  const [modoNotas, setModoNotas] = useState(false);
  const [errores, setErrores] = useState({});
  const [tiempoInicio, setTiempoInicio] = useState(null);
  const [tiempoFinal, setTiempoFinal] = useState(null);
  const [finJuego, setFinJuego] = useState(null);
  const [historial, setHistorial] = useState([]); // Historial global de tableros
  const historialRef = useRef([]);

  // Estado local para la sala (sincroniza modo y dificultad)
  const [salaLocal, setSalaLocal] = useState(sala);

  // Sincroniza salaLocal si cambia la prop sala (por navegación o recarga)
  useEffect(() => {
    setSalaLocal(sala);
  }, [sala]);

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

  // Estado para temporizador contrarreloj
  const [tiempoLimite, setTiempoLimite] = useState(null);

  // Recibe el tiempo de inicio y límite del backend
  useEffect(() => {
    const handleTemp = (data) => {
      setTiempoInicio(data.inicio);
      setTiempoLimite(data.limite || null);
      // Si es modo clásico, activar temporizador visual siempre
      if ((salaLocal.modo === 'clasico' || data.limite === null)) {
        setTemporizadorActivo(true);
      }
    };
    socket.on('temporizador', handleTemp);
    return () => {
      socket.off('temporizador', handleTemp);
    };
  }, [socket, salaLocal.modo]);

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

  // Estado para saber si el temporizador ya inició
  const [temporizadorActivo, setTemporizadorActivo] = useState(false);

  // Saber si es anfitrión
  const esAnfitrion = miembros.length > 0 && miembros[0].nombre === sala.nombre;

  // Nuevo: escuchar evento de inicio de temporizador
  useEffect(() => {
    const handleStart = () => setTemporizadorActivo(true);
    socket.on('iniciarTemporizador', handleStart);
    return () => socket.off('iniciarTemporizador', handleStart);
  }, [socket]);

  // Cuando recibimos tiempoInicio, activamos el temporizador
  useEffect(() => {
    if (tiempoInicio) setTemporizadorActivo(true);
  }, [tiempoInicio]);

  // Temporizador en pantalla
  const [tiempo, setTiempo] = useState(0);
  useEffect(() => {
    if (!tiempoInicio || finJuego || !temporizadorActivo) return;
    const interval = setInterval(() => {
      setTiempo(Date.now() - tiempoInicio);
    }, 1000);
    return () => clearInterval(interval);
  }, [tiempoInicio, finJuego, temporizadorActivo]);

  // Calcula tiempo restante y porcentaje si es contrarreloj
  const esContrarreloj = salaLocal.modo === 'contrarreloj';
  const tiempoRestante = esContrarreloj && tiempoLimite ? Math.max(0, tiempoLimite - Date.now()) : null;
  const tiempoTotal = esContrarreloj && tiempoLimite && tiempoInicio ? tiempoLimite - tiempoInicio : null;
  const porcentaje = esContrarreloj && tiempoTotal ? Math.max(0, Math.min(100, 100 * (tiempoRestante / tiempoTotal))) : null;

  function format(ms) {
    if (!ms) return '00:00';
    const s = Math.floor(ms / 1000);
    const min = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  }

  // Estado para número seleccionado (para iluminar iguales)
  const [numeroSeleccionado, setNumeroSeleccionado] = useState(null);

  // Contar ocurrencias de cada número (para deshabilitar botones)
  const numerosCompletados = React.useMemo(() => {
    if (!board) return {};
    const counts = {};
    for (let n = 1; n <= 9; n++) counts[n] = 0;
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      const v = board[r][c].value;
      if (v && /^[1-9]$/.test(v)) counts[v]++;
    }
    return counts;
  }, [board]);

  // Estado para selección múltiple
  const [multiSelect, setMultiSelect] = useState([]); // [{row, col}]
  const [dragging, setDragging] = useState(false);

  // Iniciar selección múltiple
  const handleMouseDown = (row, col) => {
    if (!modoNotas) return;
    if (board[row][col].value) return; // No seleccionar si ya tiene número
    setDragging(true);
    setMultiSelect([{ row, col }]);
  };
  const handleMouseEnter = (row, col) => {
    if (!modoNotas || !dragging) return;
    if (board[row][col].value) return; // No seleccionar si ya tiene número
    setMultiSelect(prev => {
      if (prev.some(sel => sel.row === row && sel.col === col)) return prev;
      return [...prev, { row, col }];
    });
  };
  const handleMouseUp = () => {
    setDragging(false);
  };
  // Para móviles: tap para agregar/quitar de la selección
  const handleCellTap = (row, col) => {
    if (!modoNotas) return;
    if (board[row][col].value) return; // No seleccionar si ya tiene número
    setMultiSelect(prev => {
      if (prev.some(sel => sel.row === row && sel.col === col)) {
        return prev.filter(sel => !(sel.row === row && sel.col === col));
      } else {
        return [...prev, { row, col }];
      }
    });
  };
  // Limpiar selección múltiple al salir de modo notas o al input
  useEffect(() => { if (!modoNotas) setMultiSelect([]); }, [modoNotas]);

  // Modificar handleInput para bloquear input de números completados
  const handleInput = (row, col, value) => {
    if (!board) return;
    if (numerosCompletados[value] >= 9) return;
    const celda = board[row][col];
    if (celda.fixed) return;
    if (!/^[1-9]$/.test(value)) return;
    let nuevo;
    if (modoNotas && multiSelect.length > 1) {
      // Input en todas las seleccionadas
      nuevo = board.map((fila, r) =>
        fila.map((c, cidx) => {
          if (multiSelect.some(sel => sel.row === r && sel.col === cidx) && !c.fixed) {
            const notas = c.notas || [];
            const idx = notas.indexOf(value);
            const nuevasNotas = idx === -1 ? [...notas, value].sort() : notas.filter(n => n !== value);
            return { ...c, notas: nuevasNotas };
          }
          return c;
        })
      );
      guardarHistorial(board.map(fila => fila.map(c => ({ ...c }))));

      setMultiSelect([]);
    } else if (modoNotas) {
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
      guardarHistorial(board.map(fila => fila.map(c => ({ ...c }))));
    } else {
      // Modo normal: solo permite poner número si la celda está vacía o toggle
      if (celda.value === value) {
        guardarHistorial(board.map(fila => fila.map(c => ({ ...c }))));
        nuevo = board.map((fila, r) =>
          fila.map((c, cidx) =>
            r === row && cidx === col
              ? { ...c, value: '', color: null }
              : c
          )
        );
      } else if (celda.value === '') {
        guardarHistorial(board.map(fila => fila.map(c => ({ ...c }))));
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

  // Modificar handleFocus: siempre selecciona el número de la celda (si existe)
  const handleFocus = (row, col) => {
    setSelected({ row, col });
    const celda = board[row][col];
    if (celda.value) {
      setNumeroSeleccionado(celda.value);
    } else {
      setNumeroSeleccionado(null);
    }
    socket.emit('seleccionarCelda', { codigo: sala.codigo, row, col });
  };

  // Guardar en historial antes de cada cambio
  const guardarHistorial = (nuevoTablero) => {
    setHistorial(h => {
      const nuevo = [...h, board];
      historialRef.current = nuevo;
      return nuevo;
    });
  };

  // Deshacer último cambio
  const handleUndo = () => {
    if (historialRef.current.length === 0) return;
    const anterior = historialRef.current[historialRef.current.length - 1];
    setBoard(anterior);
    setHistorial(h => {
      const nuevo = h.slice(0, -1);
      historialRef.current = nuevo;
      return nuevo;
    });
    socket.emit('actualizarTablero', { codigo: sala.codigo, board: anterior });
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

  // Modificar handleButton para deseleccionar número
  const handleButton = (num) => {
    if (numerosCompletados[num] >= 9) return;
    if (selected.row === null || selected.col === null) return;
    handleInput(selected.row, selected.col, num.toString());
    setNumeroSeleccionado(null);
  };

  // Borrar celda
  const handleClear = () => {
    if (selected.row === null || selected.col === null) return;
    const celda = board[selected.row][selected.col];
    if (celda.fixed || celda.value === '') return;
    handleInput(selected.row, selected.col, celda.value); // toggle para borrar
  };

  // Manejar desplazamiento con flechas
  const handleArrow = (e, row, col) => {
    let newRow = row, newCol = col;
    if (e.key === 'ArrowUp') newRow = row > 0 ? row - 1 : row;
    if (e.key === 'ArrowDown') newRow = row < 8 ? row + 1 : row;
    if (e.key === 'ArrowLeft') newCol = col > 0 ? col - 1 : col;
    if (e.key === 'ArrowRight') newCol = col < 8 ? col + 1 : col;
    if (newRow !== row || newCol !== col) {
      e.preventDefault();
      const nextInput = document.getElementById(`celda-${newRow}-${newCol}`);
      if (modoNotas && e.shiftKey) {
        // Selección múltiple con shift
        if (!board[newRow][newCol].value) {
          setMultiSelect(prev => {
            if (prev.some(sel => sel.row === newRow && sel.col === newCol)) return prev;
            return [...prev, { row: newRow, col: newCol }];
          });
        }
      } else {
        setMultiSelect([]); // Limpiar selección múltiple si no hay shift
      }
      if (nextInput) nextInput.focus();
    }
  };

  // Shortcuts de teclado globales
  useEffect(() => {
    const handleGlobalKey = (e) => {
      if (finJuego) return;
      if (e.target.tagName !== 'INPUT') return;
      if (e.key === 'p' || e.key === 'P') {
        setModoNotas(m => !m);
        e.preventDefault();
      } else if (e.key === 'u' || e.key === 'U') {
        handleUndo();
        e.preventDefault();
      } else if (e.key === 'Escape') {
        setSelected({ row: null, col: null });
        setNumeroSeleccionado(null);
        e.preventDefault();
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleClear();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [finJuego, handleUndo, handleClear]);

  // Estado para dificultad actual (para mostrar en la esquina)
  const [dificultadActual, setDificultadActual] = useState(sala.dificultad || 'facil');
  useEffect(() => {
    setDificultadActual(salaLocal.dificultad || 'facil');
  }, [salaLocal.dificultad]);
  // Hooks para reinicio de partida (deben ir fuera de condicionales)
  const [dificultadNueva, setDificultadNueva] = useState(sala.dificultad || 'facil');
  const [reiniciando, setReiniciando] = useState(false);
  useEffect(() => {
    // Actualizar dificultad y modo al reiniciar partida
    const handler = ({ dificultad, modo }) => {
      setFinJuego(null);
      setTiempoFinal(null);
      setHistorial([]);
      setModoNotas(false);
      setMultiSelect([]);
      setDificultadNueva(dificultad);
      setDificultadActual(dificultad); // <-- actualizar dificultad visible
      setSalaLocal(prev => ({ ...prev, dificultad, modo })); // <-- actualizar ambos siempre
      setReiniciando(false);
      // Resetear temporizador
      setTemporizadorActivo(false);
      setTiempoInicio(null);
      setTiempoLimite(null);
      setTiempo(0);
      // --- FIX: Forzar temporizador activo en modo clásico tras reinicio ---
      if (modo === 'clasico') {
        setTemporizadorActivo(true);
      }
      // --- FIN FIX ---
      // --- FIX: Solicitar temporizador tras reinicio para sincronizar tiempoInicio ---
      socket.emit('solicitarTablero', { codigo: sala.codigo });
      // --- FIN FIX ---
    };
    socket.on('partidaReiniciada', handler);
    return () => socket.off('partidaReiniciada', handler);
  }, [socket]);

  // Estado para miembros conectados (debe ir antes de cualquier uso)
  // const [miembros, setMiembros] = useState([]); // Eliminado duplicado
  useEffect(() => {
    const handleSala = (salaActualizada) => {
      setMiembros(salaActualizada.jugadores || []);
      // Actualiza salaLocal con los datos más recientes (incluye modo y dificultad)
      setSalaLocal(prev => ({ ...prev, ...salaActualizada }));
    };
    socket.on('salaActualizada', handleSala);
    // Solicitar info de sala al entrar
    socket.emit('solicitarSala', { codigo: sala.codigo });
    return () => socket.off('salaActualizada', handleSala);
  }, [socket, sala.codigo]);

  if (!board) return <div>Cargando tablero...</div>;

  if (finJuego) {
    // Mostrar resumen y opción de reinicio si es anfitrión
    const esAnfitrion = miembros.length > 0 && miembros[0].nombre === sala.nombre;
    // Mostrar tiempos contrarreloj si aplica
    let tiempoUsado = null, tiempoRestante = null;
    if (salaLocal.modo === 'contrarreloj' && finJuego.tiempoUsado !== undefined) {
      tiempoUsado = finJuego.tiempoUsado;
      tiempoRestante = finJuego.tiempoRestante;
    }
    return (
      <div style={{ textAlign: 'center', marginTop: 40 }}>
        {salaLocal.modo === 'contrarreloj' && tiempoUsado !== null ? (
          <>
            <h3>¡Tiempo empleado: {format(tiempoUsado)}!</h3>
            <h4>Tiempo restante: {format(tiempoRestante)}</h4>
          </>
        ) : (
          <h3>Tiempo final: {format(tiempoFinal)}</h3>
        )}
        {finJuego.motivo === 'victoria' ? (
          <h2 style={{ color: 'green' }}>¡Felicidades, completaron el Sudoku!</h2>
        ) : finJuego.motivo === 'tiempo' ? (
          <h2 style={{ color: '#e65100' }}>¡Tiempo agotado! Se terminó la partida.</h2>
        ) : (
          <h2 style={{ color: 'red' }}>¡Juego terminado por errores!</h2>
        )}
        <div style={{ margin: '24px 0' }}>
          <h4>Resumen de la partida:</h4>
          <ul style={{ display: 'inline-block', textAlign: 'left' }}>
            {Object.entries(errores).map(([nombre, err]) => (
              <li key={nombre}>{nombre}: {err} errores</li>
            ))}
          </ul>
        </div>
        {esAnfitrion && (
          <div style={{ marginTop: 24 }}>
            <h4>¿Jugar otra partida en esta sala?</h4>
            <label>Dificultad: </label>
            <select value={dificultadNueva} onChange={e => setDificultadNueva(e.target.value)}>
              <option value="facil">Fácil</option>
              <option value="media">Media</option>
              <option value="dificil">Difícil</option>
            </select>
            <label style={{ marginLeft: 16 }}>Modo: </label>
            <select value={salaLocal.modo || 'clasico'} onChange={e => setSalaLocal(prev => ({ ...prev, modo: e.target.value }))}>
              <option value="clasico">Clásico</option>
              <option value="contrarreloj">Contrarreloj</option>
            </select>
            <button disabled={reiniciando} style={{ marginLeft: 12, padding: '6px 18px', fontWeight: 'bold', borderRadius: 6, background: '#4caf50', color: '#fff', border: 'none', fontSize: 16 }}
              onClick={() => {
                setReiniciando(true);
                socket.emit('reiniciarPartida', { codigo: sala.codigo, dificultad: dificultadNueva, modo: salaLocal.modo || 'clasico' });
              }}>
              Iniciar nueva partida
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'row' }}>
      {/* Esquina superior derecha: código de sala y modo */}
      <div style={{ position: 'fixed', top: 18, right: 24, zIndex: 10, background: '#fff', border: '2px solid #333', borderRadius: 8, padding: '8px 18px', boxShadow: '0 2px 8px #0002', fontSize: 15, fontWeight: 'bold', color: '#333', minWidth: 120, textAlign: 'right' }}>
        <div>Código: <span style={{ fontFamily: 'monospace', letterSpacing: 1 }}>{salaLocal.codigo}</span></div>
        <div>Dificultad: <span style={{ textTransform: 'capitalize' }}>{dificultadActual}</span></div>
        <div style={{ fontWeight: 400, fontSize: 14, marginTop: 4 }}>Modo: <span style={{ textTransform: 'capitalize' }}>{salaLocal.modo || 'clásico'}</span></div>
      </div>
      {/* Lateral de miembros */}
      <div style={{ minWidth: 180, borderRight: '2px solid #eee', padding: 16, background: '#fafafa', height: '100%' }}>
        <h4>Miembros</h4>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {miembros.map((j, idx) => (
            <li key={j.nombre} style={{ marginBottom: 8, fontWeight: salaLocal.jugadores?.[0]?.nombre === j.nombre ? 'bold' : 'normal', color: j.color || '#333', fontSize: 14 }}>
              {j.nombre} {idx === 0 ? <span style={{ fontSize: 12, color: '#888' }}>(anfitrión)</span> : ''}
              <div style={{ fontSize: 11, color: '#888', marginLeft: 4 }}>
                <span style={{ fontFamily: 'monospace' }}>id: {j.id || 'sin id'}</span>
              </div>
            </li>
          ))}
        </ul>
        <button
          onClick={() => {
            if (window.confirm('¿Seguro que quieres salir de la sala?')) {
              window.location.reload(); // O redirigir a la pantalla de inicio si existe
            }
          }}
          style={{ marginTop: 24, padding: '8px 18px', borderRadius: 6, background: '#e53935', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: 15, width: '100%' }}
        >
          Salir de la sala
        </button>
      </div>
      {/* Tablero y controles */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'inline-block', border: '3px solid #333', marginTop: 24, background: '#fafafa', borderRadius: 10, boxShadow: '0 2px 12px #0002', padding: 16 }}>
          <div style={{ marginBottom: 8, textAlign: 'center' }}>
            <button onClick={handleClear} style={{ width: 36, height: 36, margin: 2, fontSize: 18, borderRadius: 6, border: '1px solid #bbb', background: '#fff', boxShadow: '0 1px 2px #0001' }} title="Borrar (Backspace)">⌫</button>
            <button onClick={() => setModoNotas(m => !m)} style={{ marginRight: 8, background: modoNotas ? '#ffd54f' : '#eee', fontWeight: 'bold', borderRadius: 6, border: '1px solid #ccc', padding: '6px 12px' }} title="Modo Notas (P)">
              {modoNotas ? 'Modo Notas: ON' : 'Modo Notas: OFF'}
            </button>
            {[1,2,3,4,5,6,7,8,9].map(n => (
              <button key={n} onClick={() => handleButton(n)}
                disabled={numerosCompletados[n] >= 9}
                style={{ width: 36, height: 36, margin: 2, fontSize: 18, borderRadius: 6, border: '1px solid #bbb', background: numerosCompletados[n] >= 9 ? '#ccc' : '#fff', boxShadow: '0 1px 2px #0001', opacity: numerosCompletados[n] >= 9 ? 0.5 : 1 }}>
                {n}
              </button>
            ))}
            <button onClick={handleUndo} style={{ width: 36, height: 36, margin: 2, fontSize: 18, borderRadius: 6, border: '1px solid #bbb', background: '#fff', boxShadow: '0 1px 2px #0001' }} title="Deshacer (U)">⟲</button>
          </div>
          <div style={{ marginBottom: 8, textAlign: 'center', fontWeight: 'bold', fontSize: 18 }}>
            {esContrarreloj ? (
              <div style={{ position: 'relative', width: 220, margin: '0 auto' }}>
                {!temporizadorActivo && esAnfitrion && (
                  <button style={{ marginBottom: 8, background: '#4caf50', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: 6, padding: '6px 18px', fontSize: 16 }}
                    onClick={() => socket.emit('iniciarTemporizador', { codigo: sala.codigo })}>
                    Iniciar partida
                  </button>
                )}
                {!temporizadorActivo && !esAnfitrion && (
                  <div style={{ marginBottom: 8, color: '#888', fontWeight: 'normal' }}>
                    Esperando a que el anfitrión inicie la partida...
                  </div>
                )}
                {temporizadorActivo && (
                  <>
                    <div style={{ height: 18, background: '#eee', borderRadius: 8, overflow: 'hidden', border: '1.5px solid #bbb', marginBottom: 2 }}>
                      <div style={{
                        width: `${porcentaje}%`,
                        height: '100%',
                        background: porcentaje > 33 ? (porcentaje > 66 ? '#81c784' : '#ffd54f') : '#e57373',
                        transition: 'width 0.5s',
                      }} />
                    </div>
                    <span style={{ fontWeight: 'bold', color: porcentaje <= 20 ? '#e53935' : '#333' }}>
                      Tiempo restante: {format(tiempoRestante)} / {format(tiempoTotal)}
                    </span>
                  </>
                )}
              </div>
            ) : (
              <span style={{ color: '#1976d2' }}>Tiempo: {format(tiempo)}</span>
            )}
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
                    // Más oscuro para resaltado normal (no bloqueadas)
                    style.background = `${sala.color}55`;
                    style.boxShadow = `0 0 0 2px ${sala.color}44`;
                  }
                  // Iluminado de celdas con el mismo número seleccionado (si hay número seleccionado)
                  const isSameNumber = numeroSeleccionado && celda.value === numeroSeleccionado;
                  if (isSameNumber) {
                    style.background = '#b3e5fc';
                    style.boxShadow = '0 0 0 2px #0288d1';
                  }
                  if (selecciones.some(s => s.row === r && s.col === c)) {
                    const colorOtro = selecciones.find(s => s.row === r && s.col === c).color;
                    style.border = `2.5px solid ${colorOtro}`;
                    style.zIndex = 2;
                    style.boxShadow = `0 0 0 2px ${colorOtro}`;
                  }
                  return (
                    <div key={c} style={{ position: 'relative' }}
                      onMouseDown={() => handleMouseDown(r, c)}
                      onMouseEnter={() => handleMouseEnter(r, c)}
                      onMouseUp={handleMouseUp}
                      onTouchStart={() => handleCellTap(r, c)}
                      className={multiSelect.some(sel => sel.row === r && sel.col === c) ? 'multi-selected' : ''}
                    >
                      <input
                        value={celda.value}
                        maxLength={1}
                        id={`celda-${r}-${c}`}
                        disabled={false} // Permite focus/click en todas las celdas
                        onFocus={() => handleFocus(r, c)}
                        onChange={e => {
                          if (celda.fixed) return; // No permite modificar bloqueadas
                          const val = e.target.value.replace(/[^1-9]/, '');
                          if (!val) return;
                          handleInput(r, c, val);
                        }}
                        onKeyDown={e => {
                          if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
                            handleArrow(e, r, c);
                            return;
                          }
                          if (celda.fixed) {
                            e.preventDefault();
                            return;
                          }
                          if (/^[1-9]$/.test(e.key)) {
                            e.preventDefault();
                            handleInput(r, c, e.key);
                          } else if (e.key === 'Backspace' || e.key === 'Delete') {
                            e.preventDefault();
                            if (!celda.fixed && celda.value !== '') handleInput(r, c, celda.value);
                          }
                        }}
                        style={style}
                        readOnly={celda.fixed}
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
        {/* LOG VISUAL DE DEPURACIÓN DEL TEMPORIZADOR */}
        <div style={{
          background: '#f3f3f3',
          border: '1px dashed #1976d2',
          color: '#1976d2',
          fontSize: 13,
          padding: 6,
          margin: '8px 0',
          borderRadius: 6,
          maxWidth: 400,
          marginLeft: 'auto',
          marginRight: 'auto',
          textAlign: 'left',
          opacity: 0.85
        }}>
          <b>Debug temporizador:</b><br />
          <span>temporizadorActivo: <b>{String(temporizadorActivo)}</b></span><br />
          <span>tiempoInicio: <b>{tiempoInicio ? new Date(tiempoInicio).toLocaleTimeString() + ' (' + tiempoInicio + ')' : 'null'}</b></span><br />
          <span>tiempoLimite: <b>{tiempoLimite ? new Date(tiempoLimite).toLocaleTimeString() + ' (' + tiempoLimite + ')' : 'null'}</b></span><br />
          <span>tiempoFinal: <b>{tiempoFinal ? new Date(tiempoFinal).toLocaleTimeString() + ' (' + tiempoFinal + ')' : 'null'}</b></span><br />
          <span>finJuego: <b>{finJuego ? JSON.stringify(finJuego) : 'null'}</b></span>
        </div>
        {/* FIN LOG VISUAL DE DEPURACIÓN */}
      </div>
    </div>
  );
}

// CSS sugerido para multi-selected:
// .multi-selected input { background: #ffe082 !important; }
