// sudokuChecker.js
// Verifica si un movimiento es correcto y cuenta errores

function checkMove(board, row, col, value) {
  // Verifica si el valor ya existe en la fila, columna o bloque 3x3
  for (let i = 0; i < 9; i++) {
    if (i !== col && board[row][i].value === value && board[row][i].value !== '') return false;
    if (i !== row && board[i][col].value === value && board[i][col].value !== '') return false;
  }
  const startRow = row - row % 3, startCol = col - col % 3;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const r = startRow + i, c = startCol + j;
    if ((r !== row || c !== col) && board[r][c].value === value && board[r][c].value !== '') return false;
  }
  return true;
}

module.exports = { checkMove };
