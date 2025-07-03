// salaManager.js
// Lógica para crear y unirse a salas

const salas = {};

function generarCodigoSala() {
  // Código de 6 caracteres alfanuméricos
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function crearSala(nombreCreador, dificultad) {
  let codigo;
  do {
    codigo = generarCodigoSala();
  } while (salas[codigo]);
  salas[codigo] = {
    jugadores: [{ id: null, nombre: nombreCreador }],
    tablero: null,
    dificultad: dificultad || 'facil',
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

function getOrCreateTablero(codigo) {
  const sala = salas[codigo];
  if (!sala) return null;
  if (!sala.tablero) {
    // Inicializa un tablero vacío si no existe
    sala.tablero = Array(9).fill(0).map(() => Array(9).fill({ value: '', color: null }));
  }
  return sala.tablero;
}

module.exports = { crearSala, unirseSala, getSala, setJugadorId, salas, getOrCreateTablero };
