const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { crearSala, unirseSala, getSala, setJugadorId, getOrCreateTablero } = require('./sala/salaManager');
const { generarSudoku } = require('./sudoku/sudokuGenerator');

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
  socket.on('crearSala', ({ nombre, color, dificultad, maxErrores }, callback) => {
    const codigo = crearSala(nombre, dificultad);
    setJugadorId(codigo, nombre, socket.id);
    const sala = getSala(codigo);
    if (sala && sala.jugadores.length > 0) sala.jugadores[0].color = color;
    sala.dificultad = dificultad;
    sala.colores = [color];
    sala.maxErrores = maxErrores === 'ilimitado' ? null : parseInt(maxErrores);
    sala.errores = {};
    // Generar tablero según dificultad
    sala.tablero = generarSudoku(dificultad);
    socket.join(codigo);
    callback({ exito: true, codigo });
    io.to(codigo).emit('salaActualizada', getSala(codigo));
    io.to(codigo).emit('tableroActualizado', sala.tablero);
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
      // Enviar tablero actual
      const tablero = getOrCreateTablero(codigo);
      io.to(codigo).emit('tableroActualizado', tablero);
    } else {
      callback(resultado);
    }
  });

  // Actualizar tablero
  socket.on('actualizarTablero', ({ codigo, board }) => {
    const sala = getSala(codigo);
    if (!sala) return;
    // Validar si el movimiento es correcto
    // Buscar la celda editada
    let row = -1, col = -1, valor = '';
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (sala.tablero && sala.tablero[r][c].value !== board[r][c].value && !sala.tablero[r][c].fixed) {
          row = r; col = c; valor = board[r][c].value;
        }
      }
    }
    // Si se editó una celda
    if (row !== -1 && valor) {
      // Obtener la solución
      if (!sala.solucion) {
        // Generar la solución al crear el tablero
        const { getSolucion } = require('./sudoku/sudokuGenerator');
        sala.solucion = getSolucion(sala.tablero);
      }
      const correcto = sala.solucion && sala.solucion[row][col] === valor;
      // Buscar jugador
      const jugador = sala.jugadores.find(j => j.id === socket.id);
      if (!jugador) return;
      if (!correcto) {
        sala.errores[jugador.nombre] = (sala.errores[jugador.nombre] || 0) + 1;
        io.to(codigo).emit('erroresActualizados', sala.errores);
        // Si se alcanzó el máximo de errores
        if (sala.maxErrores && sala.errores[jugador.nombre] >= sala.maxErrores) {
          io.to(codigo).emit('finJuego', { perdedor: jugador.nombre });
          return;
        }
      }
    }
    sala.tablero = board;
    io.to(codigo).emit('tableroActualizado', board);
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

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
    // Aquí irá la lógica para limpiar salas si es necesario
  });
});

server.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});
