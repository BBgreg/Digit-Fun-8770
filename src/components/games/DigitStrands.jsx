import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound } from '../../utils/formatters';
import { useGameProgress } from '../../hooks/useGameProgress';
import { useAuth } from '../../contexts/AuthContext';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import Confetti from '../ui/Confetti';
import supabase from '../../lib/supabase';

const { FiArrowLeft, FiClock, FiCheck, FiStar, FiPlay } = FiIcons;

// Constants for the game
const GRID_COLS = 6;
const GRID_ROWS = 10;
const TOTAL_HIDDEN_NUMBERS = 6;

const DigitStrands = ({ onNavigate }) => {
  // Game states
  const [isPreGame, setIsPreGame] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [loading, setLoading] = useState(true);
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
  const [isSelecting, setIsSelecting] = useState(false);
  
  const timerRef = useRef(null);
  const gridRef = useRef(null);
  const { saveGameResult } = useGameProgress();
  const { user } = useAuth();

  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Calculate stars based on time
  const calculateStars = (time) => {
    if (time < 20) return 5;     // Under 20 seconds - 5 stars
    if (time < 25) return 4;     // 20-25 seconds - 4 stars
    if (time < 35) return 3;     // 25-35 seconds - 3 stars
    if (time < 45) return 2;     // 35-45 seconds - 2 stars
    if (time < 60) return 1;     // 45-60 seconds - 1 star
    return 0;                    // Over 60 seconds - 0 stars
  };

  // Fetch user's phone numbers
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
        
      if (fetchError) {
        throw fetchError;
      }
      
      if (!data || data.length === 0) {
        setError("No phone numbers available. Please add some numbers first.");
        setLoading(false);
        return;
      }
      
      setPhoneNumbers(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching phone numbers:', err);
      setError('Failed to retrieve your phone numbers. Please try again.');
      setLoading(false);
    }
  };

  // Initialize game data on component mount
  useEffect(() => {
    fetchPhoneNumbers();
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [user]);

  // Direction vectors for 8 directions
  const directions = [
    { dx: 1, dy: 0 },   // right
    { dx: -1, dy: 0 },  // left
    { dx: 0, dy: 1 },   // down
    { dx: 0, dy: -1 },  // up
    { dx: 1, dy: 1 },   // down-right
    { dx: -1, dy: -1 }, // up-left
    { dx: 1, dy: -1 },  // up-right
    { dx: -1, dy: 1 }   // down-left
  ];

  // Check if a position is valid on the grid
  const isValidPosition = (x, y) => {
    return x >= 0 && x < GRID_COLS && y >= 0 && y < GRID_ROWS;
  };

  // Check if a number can be placed in a specific direction
  const canPlaceNumber = (grid, startX, startY, direction, digits) => {
    const { dx, dy } = direction;
    
    for (let i = 0; i < digits.length; i++) {
      const x = startX + (dx * i);
      const y = startY + (dy * i);
      
      if (!isValidPosition(x, y) || (grid[y][x] !== null && grid[y][x] !== digits[i])) {
        return false;
      }
    }
    
    return true;
  };

  // Place a number on the grid
  const placeNumberOnGrid = (grid, startX, startY, direction, digits, numberIndex) => {
    const { dx, dy } = direction;
    const positions = [];
    
    for (let i = 0; i < digits.length; i++) {
      const x = startX + (dx * i);
      const y = startY + (dy * i);
      
      grid[y][x] = digits[i];
      positions.push({ x, y });
    }
    
    return positions;
  };

  // Generate the game grid with hidden numbers
  const generateGrid = () => {
    // Create empty grid
    const newGrid = Array(GRID_ROWS).fill().map(() => Array(GRID_COLS).fill(null));
    const selectedNumbers = [];
    const numbersWithPositions = [];
    
    // Select numbers to hide in the grid
    let availableNumbers = [...phoneNumbers];
    
    // If we don't have enough phone numbers, repeat them
    while (selectedNumbers.length < TOTAL_HIDDEN_NUMBERS) {
      if (availableNumbers.length === 0) {
        availableNumbers = [...phoneNumbers];
      }
      
      const randomIndex = Math.floor(Math.random() * availableNumbers.length);
      const selectedNumber = availableNumbers[randomIndex];
      
      selectedNumbers.push({
        id: selectedNumber.id,
        contactName: selectedNumber.contact_name,
        digits: selectedNumber.phone_number_digits.split('')
      });
      
      availableNumbers.splice(randomIndex, 1);
    }
    
    // Place numbers on the grid
    for (let numberIndex = 0; numberIndex < selectedNumbers.length; numberIndex++) {
      const { id, contactName, digits } = selectedNumbers[numberIndex];
      let placed = false;
      let attempts = 0;
      const maxAttempts = 100;
      
      while (!placed && attempts < maxAttempts) {
        // Pick a random starting position
        const startX = Math.floor(Math.random() * GRID_COLS);
        const startY = Math.floor(Math.random() * GRID_ROWS);
        
        // Pick a random direction
        const directionIndex = Math.floor(Math.random() * directions.length);
        const direction = directions[directionIndex];
        
        if (canPlaceNumber(newGrid, startX, startY, direction, digits)) {
          const positions = placeNumberOnGrid(newGrid, startX, startY, direction, digits, numberIndex);
          numbersWithPositions.push({
            id,
            contactName,
            digits: digits.join(''),
            positions,
            found: false
          });
          placed = true;
        }
        
        attempts++;
      }
      
      if (!placed) {
        console.error(`Failed to place number ${numberIndex} after ${maxAttempts} attempts`);
        // Try with a different grid if placement fails
        return generateGrid();
      }
    }
    
    // Fill remaining empty cells with random digits
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        if (newGrid[y][x] === null) {
          newGrid[y][x] = Math.floor(Math.random() * 10).toString();
        }
      }
    }
    
    return { grid: newGrid, hiddenNumbers: numbersWithPositions };
  };

  // Start the game
  const startGame = () => {
    setIsPreGame(false);
    setGameStarted(true);
    
    // Generate the grid
    const { grid: newGrid, hiddenNumbers: newHiddenNumbers } = generateGrid();
    setGrid(newGrid);
    setHiddenNumbers(newHiddenNumbers);
    
    // Start the timer
    const now = Date.now();
    setStartTime(now);
    timerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - now) / 1000));
    }, 1000);
  };

  // Handle cell click (start of strand selection)
  const handleCellClick = (x, y) => {
    if (gameComplete || isCellFound(x, y)) return;
    
    // Start new selection
    setCurrentSelection([{ x, y, value: grid[y][x] }]);
    setShowSubmitButton(false);
    setIsSelecting(true);
  };

  // Handle cell hover during selection (path drawing)
  const handleCellHover = (x, y) => {
    if (!isSelecting || gameComplete || isCellFound(x, y)) return;
    
    if (currentSelection.length === 0) return;
    
    const lastCell = currentSelection[currentSelection.length - 1];
    
    // Check if the hovered cell is adjacent to the last selected cell
    if (isAdjacent(lastCell.x, lastCell.y, x, y)) {
      // Check if this cell is already in the selection
      const alreadySelected = currentSelection.some(cell => cell.x === x && cell.y === y);
      
      if (!alreadySelected) {
        const newSelection = [...currentSelection, { x, y, value: grid[y][x] }];
        setCurrentSelection(newSelection);
        
        // Show submit button when we have 10 digits selected
        if (newSelection.length === 10) {
          setShowSubmitButton(true);
          setIsSelecting(false);
        }
      }
    }
  };

  // Handle mouse up (end selection)
  const handleMouseUp = () => {
    setIsSelecting(false);
  };

  // Check if two cells are adjacent (including diagonals)
  const isAdjacent = (x1, y1, x2, y2) => {
    return Math.abs(x1 - x2) <= 1 && Math.abs(y1 - y2) <= 1;
  };

  // Handle submit button click
  const handleSubmit = () => {
    if (currentSelection.length !== 10) return;
    
    // Construct the selected number
    const selectedDigits = currentSelection.map(cell => cell.value).join('');
    
    // Check if the selection matches any of the hidden numbers
    const matchedNumberIndex = hiddenNumbers.findIndex(num => 
      num.digits === selectedDigits && !num.found
    );
    
    if (matchedNumberIndex !== -1) {
      // Correct match found!
      playSound('correct');
      
      // Mark the number as found
      const newHiddenNumbers = [...hiddenNumbers];
      newHiddenNumbers[matchedNumberIndex].found = true;
      setHiddenNumbers(newHiddenNumbers);
      
      // Add to found numbers with the current selection positions
      setFoundNumbers([...foundNumbers, {
        ...newHiddenNumbers[matchedNumberIndex],
        positions: [...currentSelection]
      }]);
      
      // Clear current selection
      setCurrentSelection([]);
      setShowSubmitButton(false);
      
      // Check if all numbers are found
      const allFound = newHiddenNumbers.every(num => num.found);
      if (allFound) {
        handleGameComplete();
      }
    } else {
      // Incorrect selection
      playSound('incorrect');
      
      // Shake the selection briefly
      const gridElement = gridRef.current;
      if (gridElement) {
        gridElement.classList.add('animate-shake');
        setTimeout(() => {
          gridElement.classList.remove('animate-shake');
        }, 500);
      }
      
      // Clear current selection
      setCurrentSelection([]);
      setShowSubmitButton(false);
    }
  };

  // Handle game completion
  const handleGameComplete = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    const finalTime = Math.floor((Date.now() - startTime) / 1000);
    setElapsedTime(finalTime);
    setGameComplete(true);
    setShowConfetti(true);
    playSound('win');
    
    // Calculate stars
    const earnedStars = calculateStars(finalTime);
    setStars(earnedStars);
    
    // Save game results for each found number
    hiddenNumbers.forEach(number => {
      saveGameResult(
        number.id,
        'digit-strands',
        earnedStars,
        {
          time_taken: finalTime,
          numbers_found_count: hiddenNumbers.length
        }
      );
    });
  };

  // Check if a cell is in the current selection
  const isCellSelected = (x, y) => {
    return currentSelection.some(cell => cell.x === x && cell.y === y);
  };

  // Check if a cell is part of a found number
  const isCellFound = (x, y) => {
    return foundNumbers.some(number => 
      number.positions.some(pos => pos.x === x && pos.y === y)
    );
  };

  // Get the index of a found number that contains this cell
  const getFoundNumberIndex = (x, y) => {
    for (let i = 0; i < foundNumbers.length; i++) {
      if (foundNumbers[i].positions.some(pos => pos.x === x && pos.y === y)) {
        return i;
      }
    }
    return -1;
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 app-container">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-0 left-20 w-96 h-96 bg-gradient-to-br from-blue-400 to-sky-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="text-center relative z-10">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mb-4 mx-auto"></div>
          <h2 className="text-2xl font-bold text-indigo-800 mb-2">Preparing Challenge</h2>
          <p className="text-indigo-600">Loading your phone numbers...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 app-container">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-0 left-20 w-96 h-96 bg-gradient-to-br from-blue-400 to-sky-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="text-center bg-white p-8 rounded-3xl shadow-xl relative z-10">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-indigo-800 mb-4">{error}</h2>
          <div className="flex gap-4 justify-center">
            <motion.button
              onClick={() => onNavigate('add-number')}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700"
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
            >
              Add Numbers
            </motion.button>
            <motion.button
              onClick={() => onNavigate('dashboard')}
              className="bg-gray-200 text-indigo-700 px-6 py-3 rounded-xl hover:bg-gray-300"
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
            >
              Back to Dashboard
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-container" onMouseUp={handleMouseUp}>
      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-20 w-96 h-96 bg-gradient-to-br from-blue-400 to-sky-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>
      
      {showConfetti && <Confetti />}
      
      <div className="relative z-10 max-w-4xl mx-auto p-6">
        {/* App Branding Section */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-6"
        >
          <h1 
            className="gradient-text app-title text-4xl font-black mb-2"
            style={{
              background: "linear-gradient(135deg, #9333EA, #4F46E5, #3B82F6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "0 0 20px rgba(147,51,234,0.5)",
              fontFamily: "'Fredoka', sans-serif",
              letterSpacing: "-0.02em",
              lineHeight: "1.2"
            }}
          >
            Digit Fun
          </h1>
          <p 
            className="gradient-text app-tagline text-lg font-bold"
            style={{
              background: "linear-gradient(135deg, #9333EA, #4F46E5, #3B82F6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "0 0 10px rgba(147,51,234,0.3)",
              fontFamily: "'Nunito', sans-serif"
            }}
          >
            Memorize phone numbers with a little fun
          </p>
        </motion.div>
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <button
            onClick={() => onNavigate('number-selection', { gameMode: 'digit-strands' })}
            className="p-3 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow text-indigo-600 hover:text-indigo-800"
          >
            <SafeIcon icon={FiArrowLeft} size={20} />
          </button>
          
          <div className="text-center">
            <h2 className="text-2xl font-bold text-indigo-800">Digit Strands</h2>
            <p className="text-indigo-600">Connect digits to form number strands!</p>
          </div>
          
          <div className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 px-4 py-2 rounded-xl shadow-md text-white">
            <SafeIcon icon={FiClock} className="text-white" />
            <span className="font-bold">{formatTime(elapsedTime)}</span>
          </div>
        </motion.div>
        
        {/* Pre-game screen */}
        {isPreGame && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white bg-opacity-90 backdrop-filter backdrop-blur-sm p-8 rounded-3xl shadow-xl text-center"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <SafeIcon icon={FiPlay} size={36} className="text-white" />
            </div>
            
            <h2 className="text-3xl font-bold text-indigo-800 mb-4">Digit Strands Challenge</h2>
            
            <div className="mb-8 text-left">
              <p className="text-indigo-700 mb-4">
                Connect adjacent digits to form continuous strands that spell out your phone numbers!
              </p>
              
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <SafeIcon icon={FiCheck} size={14} className="text-green-600" />
                  </div>
                  <span>Click and drag to connect adjacent digits in any direction</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <SafeIcon icon={FiCheck} size={14} className="text-green-600" />
                  </div>
                  <span>Form continuous strands of exactly 10 digits</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <SafeIcon icon={FiClock} size={14} className="text-indigo-600" />
                  </div>
                  <span>Find all 6 hidden phone numbers as quickly as possible</span>
                </li>
              </ul>
            </div>
            
            <motion.button
              onClick={startGame}
              className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white px-8 py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2 mx-auto"
              whileHover={{ y: -2, scale: 1.05 }}
              whileTap={{ y: 0, scale: 0.95 }}
            >
              <SafeIcon icon={FiPlay} size={20} />
              Start Challenge
            </motion.button>
          </motion.div>
        )}
        
        {/* Game board */}
        {gameStarted && !isPreGame && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
          >
            {/* Digit Strands Grid */}
            <motion.div
              ref={gridRef}
              className="w-full bg-white p-6 rounded-3xl shadow-lg mb-6 select-none"
            >
              <div className="grid grid-cols-6 gap-2 mb-4">
                {grid.map((row, y) => 
                  row.map((cell, x) => {
                    // Determine cell styling based on state
                    const isSelected = isCellSelected(x, y);
                    const isFound = isCellFound(x, y);
                    const foundIndex = isFound ? getFoundNumberIndex(x, y) : -1;
                    
                    // Generate vibrant colors for found numbers (like NYT Strands)
                    const foundColors = [
                      'bg-yellow-400 text-black border-yellow-500',     // Bright yellow
                      'bg-orange-400 text-white border-orange-500',     // Orange
                      'bg-green-400 text-white border-green-500',       // Green
                      'bg-blue-400 text-white border-blue-500',         // Blue
                      'bg-purple-400 text-white border-purple-500',     // Purple
                      'bg-pink-400 text-white border-pink-500'          // Pink
                    ];
                    
                    let cellClass = 'w-12 h-12 flex items-center justify-center font-bold text-lg rounded-full shadow-sm transition-all cursor-pointer border-2 select-none';
                    
                    if (isFound) {
                      cellClass += ` ${foundColors[foundIndex % foundColors.length]}`;
                    } else if (isSelected) {
                      cellClass += ' bg-indigo-200 border-indigo-400 text-indigo-800 scale-110';
                    } else {
                      cellClass += ' bg-gray-100 border-gray-200 hover:bg-indigo-50 hover:border-indigo-200 text-gray-800';
                    }
                    
                    return (
                      <motion.div
                        key={`${x}-${y}`}
                        className={cellClass}
                        onMouseDown={() => !isFound && handleCellClick(x, y)}
                        onMouseEnter={() => !isFound && handleCellHover(x, y)}
                        whileHover={!isFound ? { scale: 1.05 } : {}}
                        whileTap={!isFound ? { scale: 0.95 } : {}}
                      >
                        {cell}
                      </motion.div>
                    );
                  })
                )}
              </div>

              <div className="text-center text-sm text-indigo-600">
                <p>Find {TOTAL_HIDDEN_NUMBERS} phone number strands • {foundNumbers.length} found</p>
                {currentSelection.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    Current strand: {currentSelection.length}/10 digits
                  </p>
                )}
              </div>
            </motion.div>
            
            {/* Submit button - only shown when 10 digits are selected */}
            <AnimatePresence>
              {showSubmitButton && !gameComplete && (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  onClick={handleSubmit}
                  className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white px-8 py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2 mb-6"
                  whileHover={{ y: -2, scale: 1.05 }}
                  whileTap={{ y: 0, scale: 0.95 }}
                >
                  <SafeIcon icon={FiCheck} size={20} />
                  Check Strand
                </motion.button>
              )}
            </AnimatePresence>
            
            {/* Found numbers list */}
            {foundNumbers.length > 0 && (
              <div className="w-full bg-white p-6 rounded-3xl shadow-lg mt-4">
                <h3 className="text-lg font-bold text-indigo-800 mb-3">Found Strands:</h3>
                <div className="space-y-2">
                  {foundNumbers.map((number, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full ${
                        index === 0 ? 'bg-yellow-400' :
                        index === 1 ? 'bg-orange-400' :
                        index === 2 ? 'bg-green-400' :
                        index === 3 ? 'bg-blue-400' :
                        index === 4 ? 'bg-purple-400' :
                        'bg-pink-400'
                      }`}></div>
                      <span className="text-gray-800 font-mono">
                        {number.digits.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')}
                      </span>
                      <span className="text-indigo-600">
                        - {number.contactName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Game complete overlay */}
            <AnimatePresence>
              {gameComplete && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-filter backdrop-blur-sm"
                >
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center"
                  >
                    <div className="text-7xl mb-4">🎉</div>
                    <h2 className="text-3xl font-bold text-indigo-800 mb-2">All Strands Found!</h2>
                    <p className="text-indigo-600 mb-6">
                      You connected all {TOTAL_HIDDEN_NUMBERS} phone number strands!
                    </p>
                    
                    {/* Time display */}
                    <div className="bg-indigo-50 p-4 rounded-2xl mb-6">
                      <p className="text-sm text-indigo-600 mb-1">Your time:</p>
                      <p className="text-3xl font-mono font-bold text-indigo-800">
                        {formatTime(elapsedTime)}
                      </p>
                    </div>
                    
                    {/* Star rating */}
                    <div className="mb-6">
                      <div className="flex justify-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <SafeIcon
                            key={i}
                            icon={FiStar}
                            className={`w-8 h-8 ${
                              i < stars ? 'text-yellow-500 fill-current' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        {stars} out of 5 stars
                      </p>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex gap-3">
                      <motion.button
                        onClick={() => onNavigate('number-selection', { gameMode: 'digit-strands' })}
                        className="flex-1 bg-gray-100 text-indigo-700 py-3 rounded-2xl font-semibold hover:bg-gray-200 transition-all"
                        whileHover={{ y: -2 }}
                        whileTap={{ y: 0 }}
                      >
                        Play Again
                      </motion.button>
                      <motion.button
                        onClick={() => onNavigate('dashboard')}
                        className="flex-1 bg-gradient-to-br from-indigo-500 to-purple-600 text-white py-3 rounded-2xl font-semibold hover:shadow-lg transition-all"
                        whileHover={{ y: -2 }}
                        whileTap={{ y: 0 }}
                      >
                        Done
                      </motion.button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default DigitStrands;