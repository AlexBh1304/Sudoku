const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { crearSala, unirseSala, getSala, setJugadorId } = require('./sala/salaManager');

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
  socket.on('crearSala', ({ nombre }, callback) => {
    const codigo = crearSala(nombre);
    setJugadorId(codigo, nombre, socket.id);
    socket.join(codigo);
    callback({ exito: true, codigo });
    io.to(codigo).emit('salaActualizada', getSala(codigo));
  });

  // Unirse a sala
  socket.on('unirseSala', ({ codigo, nombre }, callback) => {
    const resultado = unirseSala(codigo, nombre);
    if (resultado.exito) {
      setJugadorId(codigo, nombre, socket.id);
      socket.join(codigo);
      callback({ exito: true });
      io.to(codigo).emit('salaActualizada', getSala(codigo));
    } else {
      callback(resultado);
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
