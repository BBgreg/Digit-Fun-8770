import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound } from '../../utils/formatters';
import { useGameProgress } from '../../hooks/useGameProgress';
import { useAuth } from '../../contexts/AuthContext';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import Confetti from '../ui/Confetti';
import supabase from '../../lib/supabase';

const { FiArrowLeft, FiClock, FiCheck, FiStar, FiPlay } = FiIcons;

const GRID_COLS = 6;
const GRID_ROWS = 10;
const TOTAL_HIDDEN_NUMBERS = 6;
const CELL_SIZE = 48;
const CELL_GAP = 8;

// Change 1: Added onGameEnd to the props
const WordSearch = ({ onNavigate, onGameEnd }) => {
  // Game states
  const [isPreGame, setIsPreGame] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isGeneratingGrid, setIsGeneratingGrid] = useState(false);
  const [error, setError] = useState(null);
  const [grid, setGrid] = useState([]);
  const [hiddenNumbers, setHiddenNumbers] = useState([]);
  const [foundNumbers, setFoundNumbers] = useState([]);
  const [currentSelection, setCurrentSelection] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [stars, setStars] = useState(0);
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [showSubmitButton, setShowSubmitButton] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartCell, setDragStartCell] = useState(null);
  const [selectionMethod, setSelectionMethod] = useState(null);
  const [mouseDownTime, setMouseDownTime] = useState(null);
  const [hasMouseMoved, setHasMouseMoved] = useState(false);
  const [touchStartTime, setTouchStartTime] = useState(null);
  const [lastTouchPosition, setLastTouchPosition] = useState(null);
  const [generationAttempts, setGenerationAttempts] = useState(0);
  const [generationLog, setGenerationLog] = useState([]);
  const [loadingMessage, setLoadingMessage] = useState('Preparing your challenge...');
  const [mouseDownCell, setMouseDownCell] = useState(null);
  const [touchIdentifier, setTouchIdentifier] = useState(null);
  const [clickStartTime, setClickStartTime] = useState(null);
  
  const timerRef = useRef(null);
  const gridRef = useRef(null);
  const gridGenerationTimeoutRef = useRef(null);
  const cellRefs = useRef({});
  const clickTimeoutRef = useRef(null);
  const { saveGameResult } = useGameProgress();
  const { user } = useAuth();

  const DIRECTIONS = [
    { dx: 1, dy: 0, name: 'right' }, { dx: -1, dy: 0, name: 'left' },
    { dx: 0, dy: 1, name: 'down' }, { dx: 0, dy: -1, name: 'up' },
    { dx: 1, dy: 1, name: 'down-right' }, { dx: -1, dy: -1, name: 'up-left' },
    { dx: 1, dy: -1, name: 'up-right' }, { dx: -1, dy: 1, name: 'down-left' }
  ];

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const calculateStars = (time) => {
    if (time < 45) return 5;
    if (time < 100) return 4;
    if (time < 145) return 3;
    if (time < 210) return 2;
    if (time < 360) return 1;
    return 0;
  };

  const fetchPhoneNumbers = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!user) {
        setError("You must be logged in to play this game");
        setLoading(false);
        return;
      }
      const { data, error: fetchError } = await supabase
        .from('user_phone_numbers')
        .select('id, contact_name, phone_number_digits')
        .eq('user_id', user.id);
      if (fetchError) throw fetchError;
      if (!data || data.length === 0) {
        setError("No phone numbers available. Please add some numbers first.");
        setLoading(false);
        return;
      }
      setPhoneNumbers(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to retrieve your phone numbers. Please try again.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhoneNumbers();
    document.addEventListener('touchend', handleGlobalTouchEnd);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (gridGenerationTimeoutRef.current) clearTimeout(gridGenerationTimeoutRef.current);
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [user]);

  const logGeneration = (message, data = null) => {
    const logEntry = { timestamp: new Date().toISOString(), message, ...(data ? { data } : {}) };
    console.log(`[WordSearch] ${message}`, data || '');
    setGenerationLog(prev => [...prev, logEntry]);
    if (message.includes('Grid generation attempt')) setLoadingMessage('Designing your unique puzzle grid...');
    else if (message.includes('Selected')) setLoadingMessage('Selecting your phone numbers...');
    else if (message.includes('Placed number')) setLoadingMessage('Creating complex paths for your numbers...');
    else if (message.includes('Validation')) setLoadingMessage('Ensuring your puzzle is perfectly solvable...');
    else if (message.includes('Complete')) setLoadingMessage('Finishing touches on your puzzle...');
  };

  const generateComplexPath = useCallback((startRow, startCol, digits, occupiedCells, grid) => {
    const path = [];
    const visited = new Set();
    path.push({ row: startRow, col: startCol });
    visited.add(`${startRow}-${startCol}`);
    const findPath = (currentRow, currentCol, digitIndex) => {
      if (digitIndex >= digits.length) return true;
      const shuffledDirections = [...DIRECTIONS].sort(() => Math.random() - 0.5);
      for (const direction of shuffledDirections) {
        const newRow = currentRow + direction.dy;
        const newCol = currentCol + direction.dx;
        const cellKey = `${newRow}-${newCol}`;
        if (newRow >= 0 && newRow < GRID_ROWS && newCol >= 0 && newCol < GRID_COLS && !occupiedCells.has(cellKey) && !visited.has(cellKey)) {
          path.push({ row: newRow, col: newCol });
          visited.add(cellKey);
          if (findPath(newRow, newCol, digitIndex + 1)) return true;
          path.pop();
          visited.delete(cellKey);
        }
      }
      return false;
    };
    const success = findPath(startRow, startCol, 1);
    if (!success) return null;
    let directionChanges = 0;
    for (let i = 2; i < path.length; i++) {
      const dir1 = { dx: path[i - 1].col - path[i - 2].col, dy: path[i - 1].row - path[i - 2].row };
      const dir2 = { dx: path[i].col - path[i - 1].col, dy: path[i].row - path[i - 1].row };
      if (dir1.dx !== dir2.dx || dir1.dy !== dir2.dy) directionChanges++;
    }
    if (directionChanges < 3 && path.length === 10) return null;
    return path;
  }, []);

  const isAdjacent = (x1, y1, x2, y2) => Math.abs(x1 - x2) <= 1 && Math.abs(y1 - y2) <= 1;

  const verifyNumberPath = (grid, startPos, digits, number) => {
    if (grid[startPos.y][startPos.x] !== digits[0]) return false;
    for (let i = 0; i < number.positions.length; i++) {
      const pos = number.positions[i];
      const expectedDigit = digits[i];
      if (pos.y < 0 || pos.y >= GRID_ROWS || pos.x < 0 || pos.x >= GRID_COLS) return false;
      if (grid[pos.y][pos.x] !== expectedDigit) return false;
      if (i > 0) {
        const prevPos = number.positions[i - 1];
        if (!isAdjacent(prevPos.x, prevPos.y, pos.x, pos.y)) return false;
      }
    }
    if (number.positions.length !== digits.length) return false;
    return true;
  };
  
  const validateNumberDiscoverability = (grid, placedNumbers) => {
    for (const number of placedNumbers) {
      if (!verifyNumberPath(grid, number.positions[0], number.digits.split(''), number)) {
        return false;
      }
    }
    return true;
  };

  const generateGrid = useCallback(() => {
    const currentAttempt = generationAttempts + 1;
    setGenerationAttempts(currentAttempt);
    logGeneration(`🎯 Grid generation attempt ${currentAttempt}`);
    const newGrid = Array(GRID_ROWS).fill().map(() => Array(GRID_COLS).fill(null));
    const numbersWithPositions = [];
    const occupiedCells = new Set();
    const allPossibleStartPositions = [];
    for (let row = 0; row < GRID_ROWS; row++) for (let col = 0; col < GRID_COLS; col++) allPossibleStartPositions.push({ row, col });
    const shuffledStartPositions = [...allPossibleStartPositions].sort(() => Math.random() - 0.5);
    const selectedNumbers = [];
    let availablePhoneNumbers = [...phoneNumbers];
    if (availablePhoneNumbers.length === 0) return { error: "No phone numbers available. Please add some first." };
    while (selectedNumbers.length < TOTAL_HIDDEN_NUMBERS) {
      if (availablePhoneNumbers.length === 0) availablePhoneNumbers = [...phoneNumbers];
      const randomIndex = Math.floor(Math.random() * availablePhoneNumbers.length);
      const selectedNumber = availablePhoneNumbers[randomIndex];
      selectedNumbers.push({ id: selectedNumber.id, contactName: selectedNumber.contact_name, digits: selectedNumber.phone_number_digits.split('') });
      availablePhoneNumbers.splice(randomIndex, 1);
    }
    let placedCount = 0;
    for (const number of selectedNumbers) {
      let placed = false;
      let attempts = 0;
      for (const startPos of shuffledStartPositions) {
        if (attempts >= 1000) break;
        const { row: startRow, col: startCol } = startPos;
        if (occupiedCells.has(`${startRow}-${startCol}`)) { attempts++; continue; }
        newGrid[startRow][startCol] = number.digits[0];
        const path = generateComplexPath(startRow, startCol, number.digits, occupiedCells, newGrid);
        if (!path) { newGrid[startRow][startCol] = null; attempts++; continue; }
        if (path && path.length === 10) {
          path.forEach((pos, digitIndex) => {
            newGrid[pos.row][pos.col] = number.digits[digitIndex];
            occupiedCells.add(`${pos.row}-${pos.col}`);
          });
          let directionChanges = 0;
          for (let i = 2; i < path.length; i++) {
            const dir1 = { dx: path[i - 1].col - path[i - 2].col, dy: path[i - 1].row - path[i - 2].row };
            const dir2 = { dx: path[i].col - path[i - 1].col, dy: path[i].row - path[i - 1].row };
            if (dir1.dx !== dir2.dx || dir1.dy !== dir2.dy) directionChanges++;
          }
          numbersWithPositions.push({ id: number.id, contactName: number.contactName, digits: number.digits.join(''), positions: path.map(pos => ({ x: pos.col, y: pos.row })), directionChanges, pathComplexity: directionChanges / 9, found: false, exactPath: path.map(pos => ({ x: pos.col, y: pos.row })) });
          placed = true;
          placedCount++;
          break;
        } else {
          newGrid[startRow][startCol] = null;
        }
        attempts++;
      }
      if (!placed) {
        if (currentAttempt < 30) return generateGrid();
        return { error: "Couldn't generate a solvable puzzle. Please try again." };
      }
    }
    if (numbersWithPositions.length !== TOTAL_HIDDEN_NUMBERS) {
      if (currentAttempt < 30) return generateGrid();
      return { error: "Couldn't place all numbers." };
    }
    for (let row = 0; row < GRID_ROWS; row++) for (let col = 0; col < GRID_COLS; col++) if (newGrid[row][col] === null) newGrid[row][col] = Math.floor(Math.random() * 10).toString();
    if (!validateNumberDiscoverability(newGrid, numbersWithPositions)) {
      if (currentAttempt < 30) return generateGrid();
      return { error: "Couldn't generate a fully solvable puzzle after multiple attempts. Please try again." };
    }
    setGenerationAttempts(0);
    return { grid: newGrid, hiddenNumbers: numbersWithPositions };
  }, [phoneNumbers, generationAttempts, generateComplexPath]);

  const startGame = () => {
    setIsPreGame(false);
    setGameStarted(true);
    setGenerationLog([]);
    setIsGeneratingGrid(true);
    setLoadingMessage('Preparing your challenge...');
    setTimeout(() => {
      const result = generateGrid();
      if (result.error) {
        setError(result.error);
        setGameStarted(false);
        setIsPreGame(true);
        setIsGeneratingGrid(false);
        return;
      }
      setGrid(result.grid);
      setHiddenNumbers(result.hiddenNumbers);
      setIsGeneratingGrid(false);
      const now = Date.now();
      setStartTime(now);
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - now) / 1000));
      }, 1000);
    }, 50);
  };

  const handleCellClick = (x, y) => {
    if (gameComplete || isCellFound(x, y) || isDragging) return;
    const cellValue = grid[y][x];
    if (currentSelection.length === 0) {
      setCurrentSelection([{ x, y, value: cellValue }]);
      setShowSubmitButton(false);
      setSelectionMethod('click');
      playSound('correct');
      return;
    }
    const existingIndex = currentSelection.findIndex(cell => cell.x === x && cell.y === y);
    if (existingIndex !== -1) {
      const newSelection = currentSelection.slice(0, existingIndex + 1);
      setCurrentSelection(newSelection);
      setShowSubmitButton(newSelection.length === 10);
      return;
    }
    const lastCell = currentSelection[currentSelection.length - 1];
    if (isAdjacent(lastCell.x, lastCell.y, x, y)) {
      const newSelection = [...currentSelection, { x, y, value: cellValue }];
      setCurrentSelection(newSelection);
      setShowSubmitButton(newSelection.length === 10);
      playSound('correct');
    } else {
      setCurrentSelection([{ x, y, value: cellValue }]);
      setShowSubmitButton(false);
      setSelectionMethod('click');
      playSound('correct');
    }
  };

  const handleCellMouseDown = (e, x, y) => {
    if (gameComplete || isCellFound(x, y)) return;
    setMouseDownTime(Date.now());
    setClickStartTime(Date.now());
    setMouseDownCell({ x, y });
    setHasMouseMoved(false);
    setDragStartCell({ x, y });
  };

  const handleCellMouseMove = (e, x, y) => {
    if (mouseDownCell && (mouseDownCell.x !== x || mouseDownCell.y !== y)) {
      setHasMouseMoved(true);
      if (!isDragging) {
        setIsDragging(true);
        setSelectionMethod('drag');
        const startCellValue = grid[mouseDownCell.y][mouseDownCell.x];
        setCurrentSelection([{ x: mouseDownCell.x, y: mouseDownCell.y, value: startCellValue }]);
        setShowSubmitButton(false);
      }
      handleCellDrag(x, y);
    }
  };

  const handleCellDrag = (x, y) => {
    if (gameComplete || isCellFound(x, y) || !isDragging || currentSelection.length === 0) return;
    const lastCell = currentSelection[currentSelection.length - 1];
    if (isAdjacent(lastCell.x, lastCell.y, x, y)) {
      const alreadySelected = currentSelection.some(cell => cell.x === x && cell.y === y);
      if (!alreadySelected) {
        const cellValue = grid[y][x];
        const newSelection = [...currentSelection, { x, y, value: cellValue }];
        setCurrentSelection(newSelection);
        if (newSelection.length === 10) setShowSubmitButton(true);
      }
    }
  };

  const handleCellTouchStart = (e, x, y) => {
    if (gameComplete || isCellFound(x, y)) return;
    e.preventDefault();
    const now = Date.now();
    setTouchStartTime(now);
    setClickStartTime(now);
    setLastTouchPosition({ x, y });
    setMouseDownCell({ x, y });
    if (e.touches && e.touches[0]) setTouchIdentifier(e.touches[0].identifier);
  };

  const handleCellTouchMove = (e, x, y) => {
    if (gameComplete || isCellFound(x, y)) return;
    e.preventDefault();
    let isValidTouch = true;
    if (e.changedTouches && e.changedTouches.length > 0) {
      if (touchIdentifier !== null && e.changedTouches[0].identifier !== touchIdentifier) isValidTouch = false;
    }
    if (!isValidTouch) return;
    if (!isDragging && mouseDownCell && (mouseDownCell.x !== x || mouseDownCell.y !== y)) {
      setIsDragging(true);
      setSelectionMethod('touch');
      const startCellValue = grid[mouseDownCell.y][mouseDownCell.x];
      setCurrentSelection([{ x: mouseDownCell.x, y: mouseDownCell.y, value: startCellValue }]);
      setShowSubmitButton(false);
    }
    if (isDragging) {
      if (lastTouchPosition && (lastTouchPosition.x !== x || lastTouchPosition.y !== y)) {
        setLastTouchPosition({ x, y });
        handleCellDrag(x, y);
      }
    }
  };

  const handleGlobalMouseUp = (e) => {
    const isQuickClick = mouseDownTime && (Date.now() - mouseDownTime < 200) && !hasMouseMoved;
    if (isQuickClick && mouseDownCell && !isDragging) {
      handleCellClick(mouseDownCell.x, mouseDownCell.y);
    } else if (isDragging) {
      if (currentSelection.length === 10) setTimeout(() => handleSubmit(), 100);
    }
    setIsDragging(false);
    setDragStartCell(null);
    setMouseDownTime(null);
    setMouseDownCell(null);
    setHasMouseMoved(false);
  };

  const handleGlobalTouchEnd = (e) => {
    let isValidTouch = true;
    if (e.changedTouches && e.changedTouches.length > 0) {
      if (touchIdentifier !== null && e.changedTouches[0].identifier !== touchIdentifier) isValidTouch = false;
    }
    if (!isValidTouch) return;
    const isQuickTap = touchStartTime && (Date.now() - touchStartTime < 200) && !isDragging;
    if (isQuickTap && mouseDownCell) {
      handleCellClick(mouseDownCell.x, mouseDownCell.y);
    } else if (isDragging) {
      if (currentSelection.length === 10) setTimeout(() => handleSubmit(), 100);
    }
    setIsDragging(false);
    setTouchStartTime(null);
    setLastTouchPosition(null);
    setMouseDownCell(null);
    setTouchIdentifier(null);
  };

  const isExactPathMatch = (userSelection, hiddenNumber) => {
    if (userSelection.length !== hiddenNumber.exactPath.length) return false;
    for (let i = 0; i < userSelection.length; i++) {
      if (userSelection[i].x !== hiddenNumber.exactPath[i].x || userSelection[i].y !== hiddenNumber.exactPath[i].y) return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (currentSelection.length !== 10) return;
    const selectedDigits = currentSelection.map(cell => cell.value).join('');
    const matchedNumberIndex = hiddenNumbers.findIndex(num => num.digits === selectedDigits && !num.found);
    if (matchedNumberIndex !== -1) {
      const matchedNumber = hiddenNumbers[matchedNumberIndex];
      const exactPathMatch = isExactPathMatch(currentSelection, matchedNumber);
      if (exactPathMatch) {
        playSound('correct');
        const newHiddenNumbers = [...hiddenNumbers];
        newHiddenNumbers[matchedNumberIndex].found = true;
        setHiddenNumbers(newHiddenNumbers);
        setFoundNumbers([...foundNumbers, { ...newHiddenNumbers[matchedNumberIndex], positions: [...currentSelection] }]);
        setCurrentSelection([]);
        setShowSubmitButton(false);
        setSelectionMethod(null);
        if (newHiddenNumbers.every(num => num.found)) handleGameComplete();
      } else {
        playSound('incorrect');
        const gridElement = gridRef.current;
        if (gridElement) {
          gridElement.classList.add('animate-shake');
          setTimeout(() => gridElement.classList.remove('animate-shake'), 500);
        }
        setCurrentSelection([]);
        setShowSubmitButton(false);
        setSelectionMethod(null);
      }
    } else {
      playSound('incorrect');
      const gridElement = gridRef.current;
      if (gridElement) {
        gridElement.classList.add('animate-shake');
        setTimeout(() => gridElement.classList.remove('animate-shake'), 500);
      }
      setCurrentSelection([]);
      setShowSubmitButton(false);
      setSelectionMethod(null);
    }
  };

  const handleGameComplete = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const finalTime = Math.floor((Date.now() - startTime) / 1000);
    setElapsedTime(finalTime);
    setGameComplete(true);
    setShowConfetti(true);
    playSound('win');
    const earnedStars = calculateStars(finalTime);
    setStars(earnedStars);
    hiddenNumbers.forEach(number => {
      saveGameResult(number.id, 'word-search', earnedStars, { time_taken: finalTime, numbers_found_count: hiddenNumbers.length, path_complexity: number.pathComplexity });
    });
    logGeneration(`🏆 Game completed! Time: ${finalTime}s, Stars: ${earnedStars}/5`);
    // Change 2: Call onGameEnd when the game is complete
    if (onGameEnd) {
        onGameEnd(earnedStars, finalTime);
    }
  };

  const isCellSelected = (x, y) => currentSelection.some(cell => cell.x === x && cell.y === y);
  const isCellFound = (x, y) => foundNumbers.some(number => number.positions.some(pos => pos.x === x && pos.y === y));
  const getFoundNumberIndex = (x, y) => {
    for (let i = 0; i < foundNumbers.length; i++) if (foundNumbers[i].positions.some(pos => pos.x === x && pos.y === y)) return i;
    return -1;
  };
  const getSelectionIndex = (x, y) => currentSelection.findIndex(cell => cell.x === x && cell.y === y);

  if (loading) return <div className="min-h-screen flex items-center justify-center p-6 app-container"><div className="text-center relative z-10"><div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mb-4 mx-auto"></div><h2 className="text-2xl font-bold text-indigo-800 mb-2">Preparing Challenge</h2><p className="text-indigo-600">Loading your phone numbers...</p></div></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center p-6 app-container"><div className="text-center bg-white p-8 rounded-3xl shadow-xl relative z-10"><div className="text-6xl mb-4">😕</div><h2 className="text-2xl font-bold text-indigo-800 mb-4">{error}</h2><div className="flex gap-4 justify-center"><motion.button onClick={() => onNavigate('add-number')} className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700">Add Numbers</motion.button><motion.button onClick={() => onNavigate('dashboard')} className="bg-gray-200 text-indigo-700 px-6 py-3 rounded-xl hover:bg-gray-300">Back to Dashboard</motion.button></div></div></div>;

  return (
    <div className="min-h-screen app-container">
      {showConfetti && <Confetti />}
      <div className="relative z-10 max-w-4xl mx-auto p-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
          <button onClick={() => onNavigate('dashboard')} className="p-3 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow text-indigo-600 hover:text-indigo-800"><SafeIcon icon={FiArrowLeft} size={20} /></button>
          <div className="text-center"><h2 className="text-2xl font-bold text-indigo-800">Word Search</h2><p className="text-indigo-600">Find hidden phone numbers!</p></div>
          <div className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 px-4 py-2 rounded-xl shadow-md text-white"><SafeIcon icon={FiClock} className="text-white" /><span className="font-bold">{formatTime(elapsedTime)}</span></div>
        </motion.div>
        {isPreGame && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white bg-opacity-90 backdrop-filter backdrop-blur-sm p-8 rounded-3xl shadow-xl text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"><SafeIcon icon={FiPlay} size={36} className="text-white" /></div>
            <h2 className="text-3xl font-bold text-indigo-800 mb-4">Word Search Challenge</h2>
            <p className="text-indigo-700 mb-4">Find {TOTAL_HIDDEN_NUMBERS} hidden phone numbers in the grid!</p>
            <motion.button onClick={startGame} className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white px-8 py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl">Start Challenge</motion.button>
          </motion.div>
        )}
        {isGeneratingGrid && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"><div className="text-white text-2xl">{loadingMessage}</div></div>)}
        {gameStarted && !isPreGame && !isGeneratingGrid && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
            <motion.div ref={gridRef} className="bg-white p-6 rounded-3xl shadow-lg mb-6 select-none">
              <div className="grid select-none" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, ${CELL_SIZE}px)`, gap: `${CELL_GAP}px`}}>
                {grid.map((row, y) => row.map((cell, x) => {
                  const isSelected = isCellSelected(x, y);
                  const isFound = isCellFound(x, y);
                  const foundIndex = getFoundNumberIndex(x, y);
                  const selectionIndex = getSelectionIndex(x, y);
                  const foundColors = ['bg-green-400', 'bg-blue-400', 'bg-purple-400', 'bg-yellow-400', 'bg-pink-400', 'bg-orange-400'];
                  return (
                    <motion.div key={`${x}-${y}`} className={`rounded-full flex items-center justify-center font-bold text-lg shadow-sm transition-all cursor-pointer border-2 select-none ${isFound ? `${foundColors[foundIndex % foundColors.length]} text-white border-transparent` : isSelected ? 'bg-indigo-300 border-indigo-500 text-indigo-900 scale-110 z-10' : 'bg-gray-100 border-gray-200 hover:bg-indigo-50 hover:border-indigo-200 text-gray-800'}`} style={{ width: `${CELL_SIZE}px`, height: `${CELL_SIZE}px`}}
                      onClick={() => handleCellClick(x, y)}
                      onMouseDown={(e) => handleCellMouseDown(e, x, y)}
                      onMouseMove={(e) => handleCellMouseMove(e, x, y)}
                    >
                      {cell}
                      {isSelected && selectionIndex >= 0 && (<div className="absolute -top-2 -right-2 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">{selectionIndex + 1}</div>)}
                    </motion.div>
                  );
                }))}
              </div>
            </motion.div>
            <AnimatePresence>
              {showSubmitButton && !gameComplete && (<motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} onClick={handleSubmit} className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white px-8 py-4 rounded-2xl font-semibold shadow-lg">Check Number</motion.button>)}
            </AnimatePresence>
            {foundNumbers.length > 0 && (
              <div className="w-full bg-white p-6 rounded-3xl shadow-lg mt-4">
                <h3 className="text-lg font-bold text-indigo-800 mb-3">Found:</h3>
                <div className="space-y-2">
                  {foundNumbers.map((number, index) => (<div key={index} className="flex items-center gap-2"><div className={`w-4 h-4 rounded-full ${['bg-green-400', 'bg-blue-400', 'bg-purple-400', 'bg-yellow-400', 'bg-pink-400', 'bg-orange-400'][index % 6]}`}></div><span className="text-gray-800 font-mono">{number.digits.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')}</span><span className="text-indigo-600">- {number.contactName}</span></div>))}
                </div>
              </div>
            )}
          </motion.div>
        )}
        <AnimatePresence>
          {gameComplete && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-filter backdrop-blur-sm">
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center">
                <div className="text-7xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold text-indigo-800 mb-2">Challenge Complete!</h2>
                <p className="text-indigo-600 mb-6">You found all {TOTAL_HIDDEN_NUMBERS} hidden numbers!</p>
                <div className="bg-indigo-50 p-4 rounded-2xl mb-6"><p className="text-sm text-indigo-600 mb-1">Your time:</p><p className="text-3xl font-mono font-bold text-indigo-800">{formatTime(elapsedTime)}</p></div>
                <div className="mb-6"><div className="flex justify-center gap-1">{[...Array(5)].map((_, i) => (<SafeIcon key={i} icon={FiStar} className={`w-8 h-8 ${i < stars ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} />))}</div><p className="text-sm text-gray-600 mt-2">{stars} out of 5 stars</p></div>
                <div className="flex gap-3"><motion.button onClick={() => onNavigate('dashboard')} className="flex-1 bg-gray-100 text-indigo-700 py-3 rounded-2xl font-semibold hover:bg-gray-200">Play Again</motion.button><motion.button onClick={() => onNavigate('dashboard')} className="flex-1 bg-gradient-to-br from-indigo-500 to-purple-600 text-white py-3 rounded-2xl font-semibold hover:shadow-lg">Done</motion.button></div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );};export default WordSear
