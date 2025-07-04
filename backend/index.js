const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { crearSala, unirseSala, getSala, setJugadorId, getOrCreateTablero } = require('./sala/salaManager');
const { generarSudoku } = require('./sudoku/sudokuGenerator');
const { checkMove } = require('./sudoku/sudokuChecker');
const { eliminarNotasTablero } = require('./sudoku/utilsNotas');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

// Estructura básica de salas en memoria
const salas = {};

io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado:', socket.id);

  // Crear sala
  socket.on('crearSala', ({ nombre, color, dificultad }, callback) => {
    const codigo = crearSala(nombre, dificultad);
    setJugadorId(codigo, nombre, socket.id);
    const sala = getSala(codigo);
    if (sala && sala.jugadores.length > 0) sala.jugadores[0].color = color;
    sala.dificultad = dificultad;
    // Generar tablero y solución
    const { tablero, solucion } = generarSudoku(dificultad);
    sala.tablero = tablero;
    sala.solucion = solucion;
    sala.colores = [color];
    sala.tiempoInicio = Date.now();
    socket.join(codigo);
    callback({ exito: true, codigo });
    io.to(codigo).emit('salaActualizada', getSala(codigo));
    io.to(codigo).emit('tableroActualizado', sala.tablero);
    io.to(codigo).emit('temporizador', { inicio: sala.tiempoInicio });
  });

  // Unirse a sala
  socket.on('unirseSala', ({ codigo, nombre, color }, callback) => {
    const sala = getSala(codigo);
    if (sala && sala.colores && sala.colores.includes(color)) {
      callback({ exito: false, mensaje: 'Color ya usado, elige otro' });
      return;
    }
    const resultado = unirseSala(codigo, nombre);
    if (resultado.exito) {
      setJugadorId(codigo, nombre, socket.id);
      if (sala && sala.jugadores.length > 1) sala.jugadores[1].color = color;
      if (sala && sala.colores) sala.colores.push(color);
      socket.join(codigo);
      callback({ exito: true });
      io.to(codigo).emit('salaActualizada', getSala(codigo));
      const tablero = sala.tablero;
      io.to(codigo).emit('tableroActualizado', tablero);
      if (sala.tiempoInicio) io.to(codigo).emit('temporizador', { inicio: sala.tiempoInicio });
    } else {
      callback(resultado);
    }
  });

  // Actualizar tablero y contar errores
  socket.on('actualizarTablero', ({ codigo, board }) => {
    const sala = getSala(codigo);
    if (sala) {
      let row = -1, col = -1, value = '';
      if (sala.tablero) {
        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            if (sala.tablero[r][c].value !== board[r][c].value) {
              row = r; col = c; value = board[r][c].value;
            }
          }
        }
      }
      let error = false;
      let gameOver = false;
      let victoria = false;
      let nuevoTablero = JSON.parse(JSON.stringify(board)); // deep copy para evitar referencias
      if (value && row !== -1 && col !== -1 && sala.solucion) {
        const correcto = sala.solucion[row][col].toString() === value;
        const unico = checkMove(board, row, col, value);
        error = !correcto || !unico;
        if (!sala.errores) sala.errores = {};
        const jugador = sala.jugadores.find(j => j.id === socket.id);
        if (jugador) {
          if (!sala.errores[jugador.nombre]) sala.errores[jugador.nombre] = 0;
          if (error) sala.errores[jugador.nombre]++;
          if (sala.errores[jugador.nombre] >= 3) gameOver = true;
        }
        // Si es correcto y único, elimina notas en todo el tablero
        if (correcto && !error) {
          nuevoTablero = eliminarNotasTablero(nuevoTablero, row, col, value);
        }
        // --- BLOQUEO DE FILA, COLUMNA Y BLOQUE COMPLETOS ---
        if (!error && correcto) {
          // Fila
          const filaCompleta = nuevoTablero[row].every((c, idx) => c.value === sala.solucion[row][idx].toString());
          if (filaCompleta) {
            nuevoTablero[row] = nuevoTablero[row].map(c => ({ ...c, fixed: true }));
          }
          // Columna
          const colCompleta = nuevoTablero.every((f, ridx) => f[col].value === sala.solucion[ridx][col].toString());
          if (colCompleta) {
            for (let r = 0; r < 9; r++) {
              nuevoTablero[r][col] = { ...nuevoTablero[r][col], fixed: true };
            }
          }
          // Bloque
          const startRow = row - row % 3, startCol = col - col % 3;
          let bloqueCompleto = true;
          for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
            const r = startRow + i, c = startCol + j;
            if (nuevoTablero[r][c].value !== sala.solucion[r][c].toString()) bloqueCompleto = false;
          }
          if (bloqueCompleto) {
            for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
              const r = startRow + i, c = startCol + j;
              nuevoTablero[r][c] = { ...nuevoTablero[r][c], fixed: true };
            }
          }
        }
        // --- FIN BLOQUEO ---
      }
      sala.tablero = nuevoTablero;
      if (sala.solucion && nuevoTablero.every((fila, r) => fila.every((celda, c) => celda.value === sala.solucion[r][c].toString()))) {
        victoria = true;
      }
      io.to(codigo).emit('tableroActualizado', nuevoTablero);
      io.to(codigo).emit('erroresActualizados', sala.errores || {});
      if (gameOver) {
        sala.tiempoFin = Date.now();
        io.to(codigo).emit('finJuego', { motivo: 'errores', tiempo: sala.tiempoFin - sala.tiempoInicio });
      } else if (victoria) {
        sala.tiempoFin = Date.now();
        io.to(codigo).emit('finJuego', { motivo: 'victoria', tiempo: sala.tiempoFin - sala.tiempoInicio });
      }
    }
  });

  // Permite a un cliente solicitar el tablero actual
  socket.on('solicitarTablero', ({ codigo }) => {
    const sala = getSala(codigo);
    if (sala && sala.tablero) {
      socket.emit('tableroActualizado', sala.tablero);
    } else if (sala) {
      // Si no existe, inicializa y envía
      const { getOrCreateTablero } = require('./sala/salaManager');
      const tablero = getOrCreateTablero(codigo);
      socket.emit('tableroActualizado', tablero);
    }
  });

  // Sincronizar selección de celda
  socket.on('seleccionarCelda', ({ codigo, row, col }) => {
    const sala = getSala(codigo);
    if (!sala) return;
    const jugador = sala.jugadores.find(j => j.id === socket.id);
    if (!jugador) return;
    io.to(codigo).emit('celdaSeleccionada', { row, col, color: jugador.color, nombre: jugador.nombre });
  });

  // Nuevo: reiniciar partida en la misma sala
  socket.on('reiniciarPartida', ({ codigo, dificultad }) => {
    const sala = getSala(codigo);
    if (!sala) return;
    const { tablero, solucion } = generarSudoku(dificultad);
    sala.tablero = tablero;
    sala.solucion = solucion;
    sala.dificultad = dificultad;
    sala.errores = {};
    sala.tiempoInicio = Date.now();
    sala.tiempoFin = null;
    io.to(codigo).emit('tableroActualizado', sala.tablero);
    io.to(codigo).emit('erroresActualizados', sala.errores);
    io.to(codigo).emit('temporizador', { inicio: sala.tiempoInicio });
    io.to(codigo).emit('partidaReiniciada', { dificultad });
  });

  // Permitir que el frontend solicite la info de la sala
  socket.on('solicitarSala', ({ codigo }) => {
    const sala = getSala(codigo);
    if (sala) {
      io.to(codigo).emit('salaActualizada', sala);
    }
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
    // Aquí irá la lógica para limpiar salas si es necesario
  });
});

server.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});
