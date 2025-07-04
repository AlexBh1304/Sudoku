// utilsNotas.js
// Elimina un número de las notas de la fila, columna y bloque de un tablero

function eliminarNotasTablero(tablero, row, col, value) {
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

module.exports = { eliminarNotasTablero };
