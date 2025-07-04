// sudokuGenerator.js
// Generador simple de tableros de Sudoku válidos según dificultad

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function isSafe(board, row, col, num) {
  for (let x = 0; x < 9; x++) {
    if (board[row][x] === num || board[x][col] === num) return false;
  }
  const startRow = row - row % 3, startCol = col - col % 3;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    if (board[i + startRow][j + startCol] === num) return false;
  }
  return true;
}

function fillBoard(board) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) {
        let nums = [1,2,3,4,5,6,7,8,9];
        shuffle(nums);
        for (let num of nums) {
          if (isSafe(board, row, col, num)) {
            board[row][col] = num;
            if (fillBoard(board)) return true;
            board[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

// Contador de soluciones para unicidad
function countSolutions(board) {
  let count = 0;
  function solve(bd) {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (bd[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isSafe(bd, row, col, num)) {
              bd[row][col] = num;
              solve(bd);
              bd[row][col] = 0;
              if (count > 1) return; // Early exit si hay más de una solución
            }
          }
          return;
        }
      }
    }
    count++;
  }
  solve(board.map(row => row.slice()));
  return count;
}

function removeCells(board, dificultad) {
  let attempts = dificultad === 'facil' ? 35 : dificultad === 'media' ? 45 : 55;
  let puzzle = board.map(row => row.slice());
  while (attempts > 0) {
    let row = Math.floor(Math.random() * 9);
    let col = Math.floor(Math.random() * 9);
    if (puzzle[row][col] !== 0) {
      const backup = puzzle[row][col];
      puzzle[row][col] = 0;
      // Verificar unicidad de solución
      if (countSolutions(puzzle) !== 1) {
        puzzle[row][col] = backup; // Si no es única, no quitar
      } else {
        attempts--;
      }
    }
  }
  return puzzle;
}

function generarSudoku(dificultad = 'facil') {
  let board = Array(9).fill(0).map(() => Array(9).fill(0));
  fillBoard(board);
  // Guardar la solución antes de quitar celdas
  const solucion = board.map(row => row.slice());
  let puzzle = removeCells(board, dificultad);
  // Devuelve el tablero y la solución
  return {
    tablero: puzzle.map((fila, r) =>
      fila.map((num, c) => ({
        value: num === 0 ? '' : num.toString(),
        color: null,
        fixed: num !== 0 // true si es pregenerada
      }))
    ),
    solucion
  };
}

module.exports = { generarSudoku };
