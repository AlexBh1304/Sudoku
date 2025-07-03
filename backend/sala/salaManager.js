// salaManager.js
// Lógica para crear y unirse a salas

const salas = {};

function generarCodigoSala() {
  // Código de 6 caracteres alfanuméricos
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function crearSala(nombreCreador) {
  let codigo;
  do {
    codigo = generarCodigoSala();
  } while (salas[codigo]);
  salas[codigo] = {
    jugadores: [{ id: null, nombre: nombreCreador }],
    tablero: null,
    estado: 'esperando',
    errores: {},
  };
  return codigo;
}

function unirseSala(codigo, nombreJugador) {
  const sala = salas[codigo];
  if (!sala) return { exito: false, mensaje: 'Sala no existe' };
  if (sala.jugadores.length >= 2) return { exito: false, mensaje: 'Sala llena' };
  sala.jugadores.push({ id: null, nombre: nombreJugador });
  return { exito: true };
}

function getSala(codigo) {
  return salas[codigo];
}

function setJugadorId(codigo, nombre, id) {
  const sala = salas[codigo];
  if (!sala) return;
  const jugador = sala.jugadores.find(j => j.nombre === nombre && j.id === null);
  if (jugador) jugador.id = id;
}

module.exports = { crearSala, unirseSala, getSala, setJugadorId, salas };
