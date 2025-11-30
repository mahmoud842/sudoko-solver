import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCcw, Zap, Target, CheckCircle, XCircle, Loader, HelpCircle } from 'lucide-react';

// --- Constants ---
const API_BASE_URL = 'http://127.0.0.1:5000'; // Assumes the Flask app is running on the same host

const DIFFICULTY_MAP = {
  easy: 50,
  medium: 40,
  hard: 30,
};

// --- Utility Functions ---

/**
 * Checks if a given number is valid at (row, col) in the current board.
 * This is a highly optimized client-side check used for immediate red-marking.
 * It checks conflicts against all other existing numbers (both initial and user-entered).
 * @param {number[][]} board - The 9x9 board array
 * @param {number} row - The row index (0-8)
 * @param {number} col - The column index (0-8)
 * @param {number} num - The number to check (1-9)
 * @returns {boolean} - True if valid, false otherwise.
 */
const isValidPlacement = (board, row, col, num) => {
  if (num === 0) return true; // 0 (empty) is always valid

  // Check row and column
  for (let i = 0; i < 9; i++) {
    if ((i !== col && board[row][i] === num) || (i !== row && board[i][col] === num)) {
      return false;
    }
  }

  // Check 3x3 subgrid
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const r = startRow + i;
      const c = startCol + j;
      if (r !== row && c !== col && board[r][c] === num) {
        return false;
      }
    }
  }
  return true;
};

// --- API Helper Function (with exponential backoff) ---

const callApi = async (endpoint, data, maxRetries = 3) => {
  const url = `${API_BASE_URL}${endpoint}`;
  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        await new Promise(res => setTimeout(res, delay));
      }
    }
  }
  throw lastError;
};

// --- Main App Component ---

const App = () => {
  const [initialBoard, setInitialBoard] = useState(null);
  const [currentBoard, setCurrentBoard] = useState(null);
  const [validationMask, setValidationMask] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: 'info', message: 'Choose an action to begin.' });
  const [difficulty, setDifficulty] = useState('medium');
  const [showSolutionPopup, setShowSolutionPopup] = useState(false);
  const [solutionBoard, setSolutionBoard] = useState(null);
  const [hintCell, setHintCell] = useState(null);
  const [history, setHistory] = useState([]);

  // Memoize empty board for resetting
  const EMPTY_BOARD = useMemo(() => Array(9).fill(null).map(() => Array(9).fill(0)), []);

  // --- Core Board Logic ---

  const checkAndApplyLocalValidation = useCallback((boardToCheck) => {
    // This creates a mask of invalid user-entered cells (red marks)
    const newMask = boardToCheck.map((rowArr, r) =>
      rowArr.map((num, c) => {
        // Only check user-entered cells (where initialBoard[r][c] is 0)
        if (num !== 0 && initialBoard && initialBoard[r][c] === 0) {
          return !isValidPlacement(boardToCheck, r, c, num);
        }
        return false;
      })
    );
    setValidationMask(newMask);
    return newMask;
  }, [initialBoard]);

  const resetGame = (newBoard) => {
    setInitialBoard(newBoard);
    setCurrentBoard(newBoard);
    setValidationMask(Array(9).fill(null).map(() => Array(9).fill(false)));
    setStatus({ type: 'info', message: 'Game started!' });
    setSolutionBoard(null);
    setHintCell(null);
    setShowSolutionPopup(false);
    setHistory([]);
  };

  useEffect(() => {
    if (currentBoard) {
      checkAndApplyLocalValidation(currentBoard);
      // Check for completion
      const isComplete = currentBoard.every(row => row.every(cell => cell !== 0));
      const hasErrors = validationMask?.some(row => row.some(cell => cell));

      if (isComplete && !hasErrors) {
        setStatus({ type: 'success', message: 'Congratulations! The board is fully solved and valid.' });
      } else if (isComplete && hasErrors) {
        setStatus({ type: 'error', message: 'Board is complete but contains invalid moves (red cells).' });
      }
    }
  }, [currentBoard, checkAndApplyLocalValidation]);


  const handleInputChange = (r, c, value) => {
    if (initialBoard[r][c] !== 0) return; // Cannot change initial numbers

    const num = parseInt(value, 10) || 0; // Ensure it's 0-9
    if (num < 0 || num > 9) return;

    // Save current state to history before changing
    setHistory(prev => [...prev, { board: currentBoard, mask: validationMask }]);

    const newBoard = currentBoard.map((row, rowIdx) =>
      row.map((cell, colIdx) => (rowIdx === r && colIdx === c ? num : cell))
    );
    setCurrentBoard(newBoard);
    // The useEffect hook will handle validation mask update
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setCurrentBoard(lastState.board);
    setValidationMask(lastState.mask);
    setHistory(prev => prev.slice(0, -1));
    setStatus({ type: 'info', message: 'Move undone.' });
  };


  // --- API Handlers ---

  const handleGenerateBoard = async () => {
    setIsLoading(true);
    setStatus({ type: 'info', message: 'Generating a new puzzle...' });
    try {
      const result = await callApi('/api/generate', { difficulty: difficulty });
      if (result.board) {
        resetGame(result.board);
        setStatus({ type: 'success', message: `New ${difficulty} board generated in ${result.time_taken_ms.toFixed(1)}ms.` });
      }
    } catch (e) {
      setStatus({ type: 'error', message: `Generation failed: ${e.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidateBoard = async () => {
    setIsLoading(true);
    setStatus({ type: 'info', message: 'Validating current board layout...' });
    try {
      const result = await callApi('/api/validate', { board: currentBoard });
      if (result.valid) {
        setStatus({ type: 'success', message: `Board is structurally valid (no immediate conflicts). Checked in ${result.time_taken_ms.toFixed(1)}ms.` });
      } else {
        setStatus({ type: 'error', message: `Board is structurally invalid (conflicts found). Checked in ${result.time_taken_ms.toFixed(1)}ms.` });
      }
    } catch (e) {
      setStatus({ type: 'error', message: `Validation failed: ${e.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckSolvability = async () => {
    setIsLoading(true);
    setStatus({ type: 'info', message: 'Checking if the current board is solvable...' });
    try {
      const result = await callApi('/api/solvable', { board: currentBoard });
      if (result.solvable) {
        if (result.number_of_solutions > 1) {
          setStatus({ type: 'warning', message: `Board is solvable but has multiple solutions (${result.number_of_solutions}). This is not a proper Sudoku puzzle.` });
        } else {
          setStatus({ type: 'success', message: `Board is solvable and has a unique solution. Solvability checked in ${result.time_to_check_solvable.toFixed(1)}ms.` });
        }
      } else {
        setStatus({ type: 'error', message: 'This board is NOT solvable. You should consider undoing your moves.' });
      }
    } catch (e) {
      setStatus({ type: 'error', message: `Solvability check failed: ${e.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetSolution = async () => {
    setIsLoading(true);
    setStatus({ type: 'info', message: 'Calculating the solution...' });
    try {
      const result = await callApi('/api/solve/backtracking', { board: initialBoard }); // Use initialBoard to get the puzzle's solution
      if (result.solution) {
        setSolutionBoard(result.solution);
        setShowSolutionPopup(true);
        setStatus({ type: 'success', message: `Solution found in ${result.time_taken_ms.toFixed(1)}ms.` });
      } else {
        setStatus({ type: 'error', message: 'Could not find a unique solution for the initial puzzle.' });
      }
    } catch (e) {
      setStatus({ type: 'error', message: `Solving failed: ${e.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetHint = async () => {
    setIsLoading(true);
    setStatus({ type: 'info', message: 'Fetching a hint...' });
    try {
      // 1. Get the full solution based on the initial board
      let solution = solutionBoard;
      if (!solution) {
        const result = await callApi('/api/solve/backtracking', { board: initialBoard });
        if (!result.solution) {
          throw new Error('Could not find solution to generate hint.');
        }
        solution = result.solution;
        setSolutionBoard(solution);
      }

      // 2. Find the first empty cell
      let emptyCell = null;
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (currentBoard[r][c] === 0) {
            emptyCell = [r, c];
            break;
          }
        }
        if (emptyCell) break;
      }

      if (!emptyCell) {
        setStatus({ type: 'warning', message: 'The board is already complete! No hint needed.' });
        return;
      }

      const [r, c] = emptyCell;
      const hintValue = solution[r][c];

      // Save current state to history before changing
      setHistory(prev => [...prev, { board: currentBoard, mask: validationMask }]);

      // 3. Apply the hint
      const newBoard = currentBoard.map((rowArr, rowIdx) =>
        rowArr.map((cell, colIdx) => (rowIdx === r && colIdx === c ? hintValue : cell))
      );

      setCurrentBoard(newBoard);
      setHintCell([r, c]);
      setStatus({ type: 'success', message: 'Hint applied! The new number is marked in green.' });

    } catch (e) {
      setStatus({ type: 'error', message: `Hint failed: ${e.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Components ---

  const SudokuCell = ({ r, c }) => {
    const value = currentBoard ? currentBoard[r][c] : 0;
    const isInitial = initialBoard && initialBoard[r][c] !== 0;
    const isInvalid = validationMask && validationMask[r][c];
    const isHint = hintCell && hintCell[0] === r && hintCell[1] === c;

    // Apply 3x3 box borders for visual grouping
    const borderR = (r % 3 === 2 && r !== 8) ? 'border-b-4 border-gray-400' : 'border-b border-gray-200';
    const borderC = (c % 3 === 2 && c !== 8) ? 'border-r-4 border-gray-400' : 'border-r border-gray-200';

    let cellClasses = `w-full aspect-square text-lg font-mono flex items-center justify-center transition-all duration-150 ${borderR} ${borderC}`;

    if (isInitial) {
      cellClasses += ' bg-gray-100 font-bold text-gray-800 pointer-events-none';
    } else {
      cellClasses += ' bg-white hover:bg-yellow-50 focus-within:ring-2 focus-within:ring-blue-500 cursor-pointer';
    }

    if (isInvalid) {
      cellClasses += ' text-red-600 font-extrabold';
    } else if (isHint) {
      cellClasses += ' bg-green-200 text-green-800 font-extrabold';
    } else if (!isInitial && value !== 0) {
      cellClasses += ' text-blue-600 font-semibold';
    }

    return (
      <div className={cellClasses}>
        <input
          type="text"
          className="w-full h-full text-center bg-transparent outline-none p-0 appearance-none"
          value={value === 0 ? '' : value}
          onChange={(e) => handleInputChange(r, c, e.target.value)}
          maxLength="1"
          disabled={isInitial || !currentBoard || isLoading}
          style={{ caretColor: 'transparent' }} // Hide cursor for cleaner look
        />
      </div>
    );
  };

  const StatusBox = ({ status }) => {
    let icon = <HelpCircle className="w-5 h-5" />;
    let color = 'bg-blue-100 text-blue-700 border-blue-300';

    if (status.type === 'error') {
      icon = <XCircle className="w-5 h-5" />;
      color = 'bg-red-100 text-red-700 border-red-300';
    } else if (status.type === 'success') {
      icon = <CheckCircle className="w-5 h-5" />;
      color = 'bg-green-100 text-green-700 border-green-300';
    } else if (status.type === 'warning') {
      icon = <Zap className="w-5 h-5" />;
      color = 'bg-yellow-100 text-yellow-700 border-yellow-300';
    }

    return (
      <div className={`p-4 rounded-xl border-2 shadow-inner mt-6 flex items-start space-x-3 ${color}`}>
        <div className="flex-shrink-0 mt-0.5">{icon}</div>
        <p className="text-sm font-medium">{status.message}</p>
      </div>
    );
  };

  const SolutionModal = () => {
    if (!showSolutionPopup || !solutionBoard) return null;

    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50 transition-opacity duration-300">
        <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg transform scale-100 transition-transform duration-300">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex justify-between items-center">
            Final Solution
            <button
              onClick={() => setShowSolutionPopup(false)}
              className="text-gray-400 hover:text-gray-700 transition-colors"
            >
              &times;
            </button>
          </h2>

          <div className="grid grid-cols-9 border-4 border-gray-500 rounded-lg overflow-hidden max-w-sm mx-auto shadow-xl">
            {solutionBoard.flat().map((num, index) => {
              const r = Math.floor(index / 9);
              const c = index % 9;
              const borderR = (r % 3 === 2 && r !== 8) ? 'border-b-4 border-gray-500' : 'border-b border-gray-300';
              const borderC = (c % 3 === 2 && c !== 8) ? 'border-r-4 border-gray-500' : 'border-r border-gray-300';

              return (
                <div
                  key={index}
                  className={`w-full aspect-square flex items-center justify-center text-xl font-bold text-gray-800 ${borderR} ${borderC} bg-gray-50`}
                >
                  {num}
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setShowSolutionPopup(false)}
            className="mt-6 w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-sans">
      <h1 className="text-4xl font-extrabold text-center text-gray-800 mb-2">Sudoku Master</h1>
      <p className="text-center text-gray-500 mb-8">Powered by Gemini & Flask Backend</p>

      <div className="flex flex-col lg:flex-row max-w-6xl mx-auto gap-8">
        {/* --- Left Panel: Controls --- */}
        <div className="lg:w-1/3 w-full bg-white p-6 rounded-2xl shadow-lg h-fit">
          <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Game Setup</h2>

          <div className="space-y-4">
            {/* Generate Board */}
            <div className="flex flex-col space-y-2">
              <label htmlFor="difficulty" className="text-sm font-medium text-gray-600">
                Generate New Board
              </label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
                disabled={isLoading}
              >
                <option value="easy">Easy (More Filled Cells)</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard (Fewer Filled Cells)</option>
              </select>
              <button
                onClick={handleGenerateBoard}
                disabled={isLoading}
                className="flex items-center justify-center w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-md disabled:bg-gray-400"
              >
                {isLoading ? <Loader className="w-5 h-5 animate-spin mr-2" /> : <RefreshCcw className="w-5 h-5 mr-2" />}
                Generate Puzzle
              </button>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Playing Tools</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleUndo}
                  disabled={!currentBoard || isLoading || history.length === 0}
                  className="flex items-center justify-center px-3 py-2 text-sm bg-yellow-500 text-white font-semibold rounded-xl hover:bg-yellow-600 transition-colors shadow disabled:bg-gray-400"
                >
                  Undo ({history.length})
                </button>
                <button
                  onClick={handleCheckSolvability}
                  disabled={!currentBoard || isLoading}
                  className="flex items-center justify-center px-3 py-2 text-sm bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-colors shadow disabled:bg-gray-400"
                >
                  <Zap className="w-4 h-4 mr-2" /> Check Solvability
                </button>
                <button
                  onClick={handleGetHint}
                  disabled={!currentBoard || isLoading || (currentBoard && currentBoard.flat().every(c => c !== 0))}
                  className="flex items-center justify-center px-3 py-2 text-sm bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors shadow disabled:bg-gray-400"
                >
                  <Target className="w-4 h-4 mr-2" /> Get Hint
                </button>
                <button
                  onClick={handleGetSolution}
                  disabled={!initialBoard || isLoading}
                  className="flex items-center justify-center px-3 py-2 text-sm bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors shadow disabled:bg-gray-400"
                >
                  <Target className="w-4 h-4 mr-2" /> Show Solution
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* --- Right Panel: Sudoku Board & Status --- */}
        <div className="lg:w-2/3 w-full">
          <StatusBox status={status} />

          <div className="mt-8 border-4 border-gray-800 rounded-xl shadow-2xl bg-gray-50 mx-auto max-w-lg w-full">
            {currentBoard ? (
              <div className="grid grid-cols-9">
                {currentBoard.map((rowArr, r) =>
                  rowArr.map((_, c) => <SudokuCell key={`${r}-${c}`} r={r} c={c} />)
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-80 text-gray-500 p-8">
                <p className="text-center">
                  {isLoading ? 'Loading...' : 'Please generate a puzzle to begin playing.'}
                </p>
              </div>
            )}
          </div>
          {currentBoard && (
            <div className="mt-4 flex justify-center">
               <button
                  onClick={handleValidateBoard}
                  disabled={isLoading}
                  className="flex items-center px-4 py-2 text-sm bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-colors shadow-md disabled:opacity-50"
                >
                  Check Final Validity (API)
                </button>
            </div>
          )}

        </div>
      </div>

      <SolutionModal />
    </div>
  );
};

export default App;