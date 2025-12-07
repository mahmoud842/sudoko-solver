import React, { useState, useEffect } from 'react';
import { Play, Undo, Redo, CheckCircle, Brain, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

const API_URL = 'http://localhost:8080/api';

const App = () => {
  const [gameState, setGameState] = useState('input'); // input, playing, ai
  const [board, setBoard] = useState(Array(9).fill(null).map(() => Array(9).fill(0)));
  const [originalBoard, setOriginalBoard] = useState(null);
  const [currentBoard, setCurrentBoard] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedCell, setSelectedCell] = useState(null);
  const [errors, setErrors] = useState(new Set());
  const [solvable, setSolvable] = useState(null);
  const [numSolutions, setNumSolutions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // AI mode states
  const [aiSteps, setAiSteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [domains, setDomains] = useState({});
  const [aiSolution, setAiSolution] = useState(null);
  const [aiTimeTaken, setAiTimeTaken] = useState(0);

  const emptyBoard = Array(9).fill(null).map(() => Array(9).fill(0));

  const validateMove = (newBoard, row, col, value) => {
    if (value === 0) return true;
    
    // Check row
    for (let c = 0; c < 9; c++) {
      if (c !== col && newBoard[row][c] === value) return false;
    }
    
    // Check column
    for (let r = 0; r < 9; r++) {
      if (r !== row && newBoard[r][col] === value) return false;
    }
    
    // Check 3x3 box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if (r !== row && c !== col && newBoard[r][c] === value) return false;
      }
    }
    
    return true;
  };

  const checkSolvability = async (boardToCheck) => {
    setLoading(true);
    setMessage('Checking solvability...');
    try {
      const response = await fetch(`${API_URL}/solvable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board: boardToCheck })
      });
      const data = await response.json();
      console.log(data);
      if (data.error != null) {
        setMessage(data.error);
        setSolvable(false);
        return false;
      }
      setNumSolutions(data.number_of_solutions);
      setSolvable(data.solvable);
      if (data.solvable){
        setMessage(`Board is solvable ${data.number_of_solutions > 1 ? 'but has more than 1 solution' : 'and has only 1 solution'}`)
      }
      else {
        setMessage(`Board is not solvable`);
      }
      return data.solvable;
    } catch (error) {
      setMessage('Error checking solvability: ' + error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const generateBoard = async (difficulty) => {
    setLoading(true);
    setMessage(`Generating ${difficulty} puzzle...`);
    try {
      const response = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ difficulty })
      });
      const data = await response.json();
      setBoard(data.board);
      setMessage(`Generated ${difficulty} puzzle in ${data.time_taken_ms.toFixed(2)}ms`);
    } catch (error) {
      setMessage('Error generating board: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const startGame = async () => {
    const isSolvable = await checkSolvability(board);
    if (!isSolvable) return;
    
    setOriginalBoard(JSON.parse(JSON.stringify(board)));
    setCurrentBoard(JSON.parse(JSON.stringify(board)));
    setHistory([JSON.parse(JSON.stringify(board))]);
    setHistoryIndex(0);
    setGameState('playing');
    setErrors(new Set());
  };

  const handleCellChange = (row, col, value) => {
    if (originalBoard[row][col] !== 0) return;
    
    const newBoard = JSON.parse(JSON.stringify(currentBoard));
    newBoard[row][col] = value;
    
    const isValid = validateMove(newBoard, row, col, value);
    
    if (!isValid && value !== 0) {
      const newErrors = new Set(errors);
      newErrors.add(`${row}-${col}`);
      setErrors(newErrors);
    } else {
      const newErrors = new Set(errors);
      newErrors.delete(`${row}-${col}`);
      setErrors(newErrors);
    }
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newBoard);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCurrentBoard(newBoard);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setCurrentBoard(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setCurrentBoard(history[historyIndex + 1]);
    }
  };

  const solveWithBacktracking = async () => {
    setLoading(true);
    setMessage('Solving with backtracking...');
    try {
      const response = await fetch(`${API_URL}/solve/backtracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board: currentBoard })
      });
      const data = await response.json();
      if (data.solution) {
        setCurrentBoard(data.solution);
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(data.solution);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        setMessage(`Solved in ${data.time_taken_ms.toFixed(2)}ms`);
      } else {
        setMessage('No solution found');
      }
    } catch (error) {
      setMessage('Error solving: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const enterAIMode = async () => {
    setLoading(true);
    setMessage('Running AI solver...');
    try {
      const response = await fetch(`${API_URL}/solve/arc-backtracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board: currentBoard })
      });
      const data = await response.json();
      
      if (data.solvable) {
        setAiSteps(data.steps);
        setAiSolution(data.solution);
        setCurrentStepIndex(-1);
        setAiTimeTaken(data.time_taken_ms);
        
        // Initialize domains with all possible values (1-9) for empty cells
        const initialDomains = {};
        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            if (currentBoard[r][c] === 0) {
              initialDomains[`${r}-${c}`] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
            }
          }
        }
        setDomains(initialDomains);
        
        setGameState('ai');
        setMessage(`AI solver completed with ${data.num_steps} steps in ${data.time_taken_ms.toFixed(2)}ms`);
      } else {
        setMessage('Board is not solvable');
      }
    } catch (error) {
      setMessage('Error running AI solver: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const applyStepsToDomains = (stepIndex) => {
    const initialDomains = {};
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (currentBoard[r][c] === 0) {
          initialDomains[`${r}-${c}`] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        }
      }
    }
    
    let updatedDomains = { ...initialDomains };
    
    for (let i = 0; i <= stepIndex; i++) {
      const step = aiSteps[i];
      if (step.type === 'arc') {
        const [fromRow, fromCol] = step.from;
        const key = `${fromRow}-${fromCol}`;
        if (updatedDomains[key]) {
          updatedDomains[key] = updatedDomains[key].filter(v => v !== step.value);
        }
      } else if (step.type === 'arc_inferred') {
        const [row, col] = step.cell;
        const key = `${row}-${col}`;
        updatedDomains[key] = [step.value];
      } else if (step.type === 'backtrack_assign') {
        const [row, col] = step.cell;
        const key = `${row}-${col}`;
        updatedDomains[key] = [step.value];
      } else if (step.type === 'backtrack_revert') {
        if (step.domain_before) {
          const domainBefore = step.domain_before;
          for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
              const key = `${r}-${c}`;
              const domainSet = domainBefore[r][c];
              updatedDomains[key] = domainSet.length > 0 ? Array.from(domainSet) : [];
            }
          }
        } else {
          // Fallback: clear the cell's domain
          const [row, col] = step.cell;
          const key = `${row}-${col}`;
          updatedDomains[key] = [];
        }
      }
    }
    
    setDomains(updatedDomains);
  };

  const nextStep = () => {
    if (currentStepIndex < aiSteps.length - 1) {
      const newIndex = currentStepIndex + 1;
      setCurrentStepIndex(newIndex);
      applyStepsToDomains(newIndex);
    }
  };

  const prevStep = () => {
    if (currentStepIndex >= 0) {
      const newIndex = currentStepIndex - 1;
      setCurrentStepIndex(newIndex);
      if (newIndex >= 0) {
        applyStepsToDomains(newIndex);
      } else {
        // Reset to initial domains
        const initialDomains = {};
        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            if (currentBoard[r][c] === 0) {
              initialDomains[`${r}-${c}`] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
            }
          }
        }
        setDomains(initialDomains);
      }
    }
  };

  const jumpToStep = (stepIndex) => {
    if (stepIndex < -1 || stepIndex >= aiSteps.length) return;
    
    setCurrentStepIndex(stepIndex);
    if (stepIndex >= 0) {
      applyStepsToDomains(stepIndex);
    } else {
      // Reset to initial domains
      const initialDomains = {};
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (currentBoard[r][c] === 0) {
            initialDomains[`${r}-${c}`] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
          }
        }
      }
      setDomains(initialDomains);
    }
  };

  const reset = () => {
    setGameState('input');
    setBoard(emptyBoard);
    setOriginalBoard(null);
    setCurrentBoard(null);
    setHistory([]);
    setHistoryIndex(-1);
    setSelectedCell(null);
    setErrors(new Set());
    setSolvable(null);
    setNumSolutions(null);
    setMessage('');
    setAiSteps([]);
    setCurrentStepIndex(-1);
    setDomains({});
    setAiSolution(null);
    setAiTimeTaken(0);
  };

  const renderInputBoard = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-center">Sudoku Game</h2>
      <div className="grid grid-cols-9 gap-0 border-4 border-gray-800 w-fit mx-auto">
        {board.map((row, rowIndex) => (
          row.map((cell, colIndex) => (
            <input
              key={`${rowIndex}-${colIndex}`}
              type="text"
              maxLength="1"
              value={cell === 0 ? '' : cell}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || /^[1-9]$/.test(val)) {
                  const newBoard = [...board];
                  newBoard[rowIndex][colIndex] = val === '' ? 0 : parseInt(val);
                  setBoard(newBoard);
                }
              }}
              className={`w-12 h-12 text-center font-bold text-lg border border-gray-300
                ${colIndex % 3 === 2 && colIndex !== 8 ? 'border-r-2 border-r-gray-800' : ''}
                ${rowIndex % 3 === 2 && rowIndex !== 8 ? 'border-b-2 border-b-gray-800' : ''}
                focus:outline-none focus:bg-blue-100`}
            />
          ))
        ))}
      </div>
      
      <div className="flex gap-2 justify-center flex-wrap">
        <button
          onClick={() => generateBoard('easy')}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          disabled={loading}
        >
          Easy
        </button>
        <button
          onClick={() => generateBoard('medium')}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          disabled={loading}
        >
          Medium
        </button>
        <button
          onClick={() => generateBoard('hard')}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          disabled={loading}
        >
          Hard
        </button>
      </div>
      
      <div className="flex justify-center">
        <button
          onClick={startGame}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 flex items-center gap-2"
          disabled={loading}
        >
          <Play size={20} />
          Start Game
        </button>
      </div>
      
      {message && (
        <div className="text-center p-3 bg-gray-100 rounded">
          {message}
        </div>
      )}
    </div>
  );

  const renderPlayingBoard = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Playing Sudoku</h2>
        <button
          onClick={reset}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center gap-2"
        >
          <RotateCcw size={16} />
          New Game
        </button>
      </div>
      
      <div className="grid grid-cols-9 gap-0 border-4 border-gray-800 w-fit mx-auto">
        {currentBoard.map((row, rowIndex) => (
          row.map((cell, colIndex) => {
            const isOriginal = originalBoard[rowIndex][colIndex] !== 0;
            const hasError = errors.has(`${rowIndex}-${colIndex}`);
            
            return (
              <input
                key={`${rowIndex}-${colIndex}`}
                type="text"
                maxLength="1"
                value={cell === 0 ? '' : cell}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^[1-9]$/.test(val)) {
                    handleCellChange(rowIndex, colIndex, val === '' ? 0 : parseInt(val));
                  }
                }}
                disabled={isOriginal}
                className={`w-12 h-12 text-center font-bold text-lg border border-gray-300
                  ${colIndex % 3 === 2 && colIndex !== 8 ? 'border-r-2 border-r-gray-800' : ''}
                  ${rowIndex % 3 === 2 && rowIndex !== 8 ? 'border-b-2 border-b-gray-800' : ''}
                  ${isOriginal ? 'bg-gray-200 cursor-not-allowed' : 'bg-white'}
                  ${hasError ? 'text-red-600 bg-red-50' : ''}
                  focus:outline-none focus:bg-blue-100`}
              />
            );
          })
        ))}
      </div>
      
      <div className="flex gap-2 justify-center flex-wrap">
        <button
          onClick={undo}
          disabled={historyIndex <= 0}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300 flex items-center gap-2"
        >
          <Undo size={16} />
          Undo
        </button>
        <button
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300 flex items-center gap-2"
        >
          <Redo size={16} />
          Redo
        </button>
        <button
          onClick={() => checkSolvability(currentBoard)}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2"
          disabled={loading}
        >
          <CheckCircle size={16} />
          Check Solvability
        </button>
        <button
          onClick={solveWithBacktracking}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
          disabled={loading}
        >
          Solve
        </button>
        <button
          onClick={enterAIMode}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
          disabled={loading}
        >
          <Brain size={16} />
          AI Mode
        </button>
      </div>
      
      {message && (
        <div className="text-center p-3 bg-gray-100 rounded">
          {message}
        </div>
      )}
    </div>
  );

  const renderAIMode = () => {
    const currentStep = currentStepIndex >= 0 ? aiSteps[currentStepIndex] : null;
    
    // Track which cells have been assigned via backtracking (considering reverts)
    const backtrackAssignments = {};
    for (let i = 0; i <= currentStepIndex; i++) {
      const step = aiSteps[i];
      if (step.type === 'backtrack_assign') {
        const key = `${step.cell[0]}-${step.cell[1]}`;
        backtrackAssignments[key] = step.value;
      } else if (step.type === 'backtrack_revert') {
        const key = `${step.cell[0]}-${step.cell[1]}`;
        delete backtrackAssignments[key];
      }
    }
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">AI Solver Mode</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Solved in {aiTimeTaken.toFixed(2)}ms</span>
            <button
              onClick={reset}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center gap-2"
            >
              <RotateCcw size={16} />
              New Game
            </button>
          </div>
        </div>
        
        <div className="flex gap-6">
          <div className="w-[500px] bg-gray-50 p-4 rounded-lg overflow-y-auto" style={{maxHeight: '680px'}}>
            <h3 className="font-bold text-lg mb-3">Solver Steps</h3>
            <div className="space-y-2">
              {aiSteps.map((step, index) => (
                <div
                  key={index}
                  onClick={() => jumpToStep(index)}
                  className={`p-3 rounded cursor-pointer transition-all ${
                    index === currentStepIndex
                      ? 'bg-blue-200 border-2 border-blue-500'
                      : index < currentStepIndex
                      ? 'bg-green-100 hover:bg-green-150'
                      : 'bg-white hover:bg-gray-100'
                  }`}
                >
                  <div className="font-semibold text-sm">
                    Step {index + 1}: {step.type === 'arc' ? 'Arc Consistency' : step.type === 'arc_inferred' ? 'Arc Inferred' : step.type === 'backtrack_assign' ? 'Backtrack Assign' : 'Backtrack Revert'}
                  </div>
                  {step.type === 'arc' ? (
                    <div className="text-sm mt-1">
                      Arc from <span className="font-mono bg-gray-200 px-1 rounded">({step.from[0]}, {step.from[1]})</span> to{' '}
                      <span className="font-mono bg-gray-200 px-1 rounded">({step.to[0]}, {step.to[1]})</span>
                      <br />
                      <span className="text-gray-600">
                        Remove value <span className="font-bold text-red-600">{step.value}</span> from domain
                      </span>
                    </div>
                  ) : step.type === 'arc_inferred' ? (
                    <div className="text-sm mt-1">
                      Inferred <span className="font-bold text-purple-600">{step.value}</span> at cell{' '}
                      <span className="font-mono bg-gray-200 px-1 rounded">({step.cell[0]}, {step.cell[1]})</span>
                      <span className="text-gray-600 text-xs"> (via arc consistency)</span>
                    </div>
                  ) : step.type === 'backtrack_assign' ? (
                    <div className="text-sm mt-1">
                      Assign <span className="font-bold text-green-600">{step.value}</span> to cell{' '}
                      <span className="font-mono bg-gray-200 px-1 rounded">({step.cell[0]}, {step.cell[1]})</span>
                    </div>
                  ) : (
                    <div className="text-sm mt-1">
                      Revert value <span className="font-bold text-orange-600">{step.value}</span> from cell{' '}
                      <span className="font-mono bg-gray-200 px-1 rounded">({step.cell[0]}, {step.cell[1]})</span>
                      <span className="text-gray-600 text-xs"> (backtracking)</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex-1 flex flex-col items-center">
            <div className="grid grid-cols-9 gap-0 border-4 border-gray-800">
              {currentBoard.map((row, rowIndex) => (
                row.map((cell, colIndex) => {
                  const isOriginal = cell !== 0;
                  const key = `${rowIndex}-${colIndex}`;
                  const cellDomains = domains[key] || [];
                  const isBacktrackAssigned = backtrackAssignments[key] !== undefined;
                  const isArcInferred = {};
                  for (let i = 0; i <= currentStepIndex; i++) {
                    const step = aiSteps[i];
                    if (step.type === 'arc_inferred') {
                      const stepKey = `${step.cell[0]}-${step.cell[1]}`;
                      isArcInferred[stepKey] = step.value;
                    }
                  }
                  
                  return (
                    <div
                      key={key}
                      className={`w-16 h-16 border border-gray-300 relative
                        ${colIndex % 3 === 2 && colIndex !== 8 ? 'border-r-2 border-r-gray-800' : ''}
                        ${rowIndex % 3 === 2 && rowIndex !== 8 ? 'border-b-2 border-b-gray-800' : ''}
                        ${isOriginal ? 'bg-gray-200' : 'bg-white'}`}
                    >
                      {isOriginal ? (
                        <div className="absolute inset-0 flex items-center justify-center font-bold text-2xl">
                          {cell}
                        </div>
                      ) : isBacktrackAssigned ? (
                        <div className="absolute inset-0 flex items-center justify-center font-bold text-3xl text-blue-600">
                          {backtrackAssignments[key]}
                        </div>
                      ) : isArcInferred[key] ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                          <div className="absolute inset-0 flex items-center justify-center font-bold text-3xl text-purple-600">
                            {isArcInferred[key]}
                          </div>
                          <div className="absolute top-1 right-1 text-purple-600 font-bold text-lg">⭐</div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 p-1 grid grid-cols-3 gap-0 text-xs">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <div
                              key={num}
                              className={`flex items-center justify-center ${
                                cellDomains.includes(num) ? 'text-blue-600 font-semibold' : 'text-transparent'
                              }`}
                            >
                              {num}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ))}
            </div>
            
            <div className="flex gap-2 justify-center mt-4">
              <button
                onClick={prevStep}
                disabled={currentStepIndex < 0}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300 flex items-center gap-2"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <span className="px-4 py-2">
                Step {currentStepIndex + 1} / {aiSteps.length}
              </span>
              <button
                onClick={nextStep}
                disabled={currentStepIndex >= aiSteps.length - 1}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300 flex items-center gap-2"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        {gameState === 'input' && renderInputBoard()}
        {gameState === 'playing' && renderPlayingBoard()}
        {gameState === 'ai' && renderAIMode()}
      </div>
    </div>
  );
};

export default App;