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

// EXACT GRID SPECIFICATIONS - CRITICAL CONSTANTS
const GRID_COLS = 6;
const GRID_ROWS = 10;
const TOTAL_HIDDEN_NUMBERS = 6;
const CELL_SIZE = 48; // Fixed size for perfect uniformity
const CELL_GAP = 8; // Fixed gap for perfect uniformity

const WordSearch = ({ onNavigate }) => {
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

  // DUAL SELECTION METHOD STATE VARIABLES
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartCell, setDragStartCell] = useState(null);
  const [selectionMethod, setSelectionMethod] = useState(null); // 'click' or 'drag'
  const [mouseDownTime, setMouseDownTime] = useState(null);
  const [hasMouseMoved, setHasMouseMoved] = useState(false);
  const [touchStartTime, setTouchStartTime] = useState(null);
  const [lastTouchPosition, setLastTouchPosition] = useState(null);
  
  const [generationAttempts, setGenerationAttempts] = useState(0);
  const [generationLog, setGenerationLog] = useState([]);
  const [loadingMessage, setLoadingMessage] = useState('Preparing your challenge...');

  // Track if we're in a drag operation vs a click
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

  // ALL 8 DIRECTIONS FOR COMPLEX PATH GENERATION
  const DIRECTIONS = [
    { dx: 1, dy: 0, name: 'right' },
    { dx: -1, dy: 0, name: 'left' },
    { dx: 0, dy: 1, name: 'down' },
    { dx: 0, dy: -1, name: 'up' },
    { dx: 1, dy: 1, name: 'down-right' },
    { dx: -1, dy: -1, name: 'up-left' },
    { dx: 1, dy: -1, name: 'up-right' },
    { dx: -1, dy: 1, name: 'down-left' }
  ];

  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // UPDATED: Calculate stars based on NEW time thresholds for Word Search
  const calculateStars = (time) => {
    if (time < 45) return 5;      // Under 45 seconds - 5 stars
    if (time < 100) return 4;     // 45-100 seconds - 4 stars
    if (time < 145) return 3;     // 100-145 seconds - 3 stars
    if (time < 210) return 2;     // 145-210 seconds - 2 stars
    if (time < 360) return 1;     // 210-360 seconds - 1 star
    return 0;                     // Over 360 seconds - 0 stars
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

      console.log('Fetching phone numbers for user:', user.id);
      const { data, error: fetchError } = await supabase
        .from('user_phone_numbers')
        .select('id, contact_name, phone_number_digits')
        .eq('user_id', user.id);

      if (fetchError) {
        console.error('Error fetching phone numbers:', fetchError);
        throw fetchError;
      }

      console.log(`Retrieved ${data?.length || 0} phone numbers`);
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

    // Add global touch event listeners for handling touch end outside grid
    document.addEventListener('touchend', handleGlobalTouchEnd);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (gridGenerationTimeoutRef.current) {
        clearTimeout(gridGenerationTimeoutRef.current);
      }
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }

      // Clean up global event listeners
      document.removeEventListener('touchend', handleGlobalTouchEnd);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [user]);

  // CRITICAL NEW FUNCTION: Logs generation progress for debugging
  const logGeneration = (message, data = null) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      ...(data ? { data } : {})
    };
    console.log(`[WordSearch] ${message}`, data || '');
    setGenerationLog(prev => [...prev, logEntry]);

    // Update loading message with meaningful progress indicators
    if (message.includes('Grid generation attempt')) {
      setLoadingMessage('Designing your unique puzzle grid...');
    } else if (message.includes('Selected')) {
      setLoadingMessage('Selecting your phone numbers...');
    } else if (message.includes('Placed number')) {
      setLoadingMessage('Creating complex paths for your numbers...');
    } else if (message.includes('Validation')) {
      setLoadingMessage('Ensuring your puzzle is perfectly solvable...');
    } else if (message.includes('Complete')) {
      setLoadingMessage('Finishing touches on your puzzle...');
    }
  };

  // OPTIMIZED: ROBUST COMPLEX PATH GENERATION WITH GUARANTEED EMBEDDING
  const generateComplexPath = useCallback((startRow, startCol, digits, occupiedCells, grid) => {
    // Track the path and available cells for backtracking
    const path = [];
    const visited = new Set();

    // Add starting position
    path.push({ row: startRow, col: startCol });
    visited.add(`${startRow}-${startCol}`);

    // OPTIMIZATION: Pre-calculate valid cells for faster lookup
    const validCells = new Map();
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const cellKey = `${row}-${col}`;
        if (!occupiedCells.has(cellKey)) {
          validCells.set(cellKey, { row, col });
        }
      }
    }

    // Use depth-first search with backtracking to find a valid path
    const findPath = (currentRow, currentCol, digitIndex) => {
      // Base case: we've placed all digits successfully
      if (digitIndex >= digits.length) {
        return true;
      }

      // OPTIMIZATION: Shuffle directions once per call instead of every time
      const shuffledDirections = [...DIRECTIONS].sort(() => Math.random() - 0.5);

      // Force direction changes every 2-3 steps for complexity
      const shouldChangeDirection = digitIndex > 0 && digitIndex % 2 === 0 && path.length > 1;
      let lastDirection = null;
      if (path.length >= 2) {
        const prev = path[path.length - 2];
        const current = path[path.length - 1];
        lastDirection = {
          dx: current.col - prev.col,
          dy: current.row - prev.row
        };
      }

      // OPTIMIZATION: Filter and prioritize directions based on our complexity needs
      let prioritizedDirections = shuffledDirections;
      if (shouldChangeDirection && lastDirection) {
        // Prioritize directions that change the current path direction
        prioritizedDirections = shuffledDirections.sort((a, b) => {
          const aSameDir = (a.dx === lastDirection.dx && a.dy === lastDirection.dy);
          const bSameDir = (b.dx === lastDirection.dx && b.dy === lastDirection.dy);
          if (aSameDir && !bSameDir) return 1; // Push same directions to end
          if (!aSameDir && bSameDir) return -1; // Prioritize direction changes
          return 0;
        });
      }

      // Try each direction
      for (const direction of prioritizedDirections) {
        const newRow = currentRow + direction.dy;
        const newCol = currentCol + direction.dx;
        const cellKey = `${newRow}-${newCol}`;

        // OPTIMIZATION: Quick check using validCells map instead of multiple conditions
        if (validCells.has(cellKey) && !visited.has(cellKey)) {
          // Add to path
          path.push({ row: newRow, col: newCol });
          visited.add(cellKey);

          // Try to continue the path from this cell
          if (findPath(newRow, newCol, digitIndex + 1)) {
            return true; // Path found!
          }

          // Backtrack - remove this cell from path
          path.pop();
          visited.delete(cellKey);
        }
      }

      // No valid path found from this position
      return false;
    };

    // Start the path finding
    const success = findPath(startRow, startCol, 1); // Start at index 1 since we already placed the first digit

    if (!success) {
      return null;
    }

    // Calculate path complexity
    let directionChanges = 0;
    for (let i = 2; i < path.length; i++) {
      const dir1 = {
        dx: path[i-1].col - path[i-2].col,
        dy: path[i-1].row - path[i-2].row
      };
      const dir2 = {
        dx: path[i].col - path[i-1].col,
        dy: path[i].row - path[i-1].row
      };
      if (dir1.dx !== dir2.dx || dir1.dy !== dir2.dy) {
        directionChanges++;
      }
    }

    // Ensure minimum complexity - at least 3 direction changes for a 10-digit number
    if (directionChanges < 3 && path.length === 10) {
      return null;
    }

    return path;
  }, []);

  // CRITICAL FIX: Validate that all placed numbers are truly discoverable
  const validateNumberDiscoverability = (grid, placedNumbers) => {
    logGeneration('🔍 Validating number discoverability');

    // For each placed number, verify it can be traced in the grid
    for (const number of placedNumbers) {
      const digits = number.digits.split('');
      const startPos = number.positions[0];
      
      // Attempt to trace the number from its start position
      const isTraceable = verifyNumberPath(grid, startPos, digits, number);
      if (!isTraceable) {
        logGeneration(`❌ Number ${number.contactName} (${number.digits}) is NOT discoverable!`);
        return false;
      }
    }

    logGeneration('✅ All numbers are verifiably discoverable');
    return true;
  };

  // Helper function to verify a number can be traced through the grid
  const verifyNumberPath = (grid, startPos, digits, number) => {
    // Check if first digit matches
    if (grid[startPos.y][startPos.x] !== digits[0]) {
      logGeneration(`❌ First digit mismatch for ${number.contactName}: expected ${digits[0]}, found ${grid[startPos.y][startPos.x]} at (${startPos.x}, ${startPos.y})`);
      return false;
    }

    // Verify each position in the path contains the correct digit
    for (let i = 0; i < number.positions.length; i++) {
      const pos = number.positions[i];
      const expectedDigit = digits[i];
      
      // Check grid bounds
      if (pos.y < 0 || pos.y >= GRID_ROWS || pos.x < 0 || pos.x >= GRID_COLS) {
        logGeneration(`❌ Position out of bounds: (${pos.x}, ${pos.y})`);
        return false;
      }
      
      // Check digit match
      if (grid[pos.y][pos.x] !== expectedDigit) {
        logGeneration(`❌ Digit mismatch at position ${i}: expected ${expectedDigit}, found ${grid[pos.y][pos.x]} at (${pos.x}, ${pos.y})`);
        return false;
      }
      
      // Check adjacency (except for first position)
      if (i > 0) {
        const prevPos = number.positions[i-1];
        if (!isAdjacent(prevPos.x, prevPos.y, pos.x, pos.y)) {
          logGeneration(`❌ Non-adjacent positions: (${prevPos.x}, ${prevPos.y}) and (${pos.x}, ${pos.y})`);
          return false;
        }
      }
    }
    
    // Ensure path length is correct
    if (number.positions.length !== digits.length) {
      logGeneration(`❌ Path length (${number.positions.length}) doesn't match digits length (${digits.length})`);
      return false;
    }
    
    return true;
  };

  // OPTIMIZED: ADVANCED GRID GENERATION WITH GUARANTEED FULL NUMBER EMBEDDING AND VALIDATED SOLVABILITY
  const generateGrid = useCallback(() => {
    // Track generation attempts
    const currentAttempt = generationAttempts + 1;
    setGenerationAttempts(currentAttempt);
    logGeneration(`🎯 Grid generation attempt ${currentAttempt}`);

    // Initialize empty grid
    const newGrid = Array(GRID_ROWS).fill().map(() => Array(GRID_COLS).fill(null));
    const numbersWithPositions = [];
    const occupiedCells = new Set();

    // OPTIMIZATION: Pre-calculate all possible starting positions once
    const allPossibleStartPositions = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        allPossibleStartPositions.push({ row, col });
      }
    }

    // Shuffle starting positions for randomness
    const shuffledStartPositions = [...allPossibleStartPositions].sort(() => Math.random() - 0.5);

    // CRITICAL FIX: GUARANTEE 6 PHONE NUMBERS SELECTION
    const selectedNumbers = [];
    let availablePhoneNumbers = [...phoneNumbers];

    // Handle the case with fewer than 6 saved numbers
    if (availablePhoneNumbers.length === 0) {
      logGeneration('❌ No phone numbers available');
      return { error: "No phone numbers available. Please add some first." };
    }

    // Select exactly 6 numbers with repetition if needed
    while (selectedNumbers.length < TOTAL_HIDDEN_NUMBERS) {
      // If we've used all available numbers but need more, reset the pool
      if (availablePhoneNumbers.length === 0) {
        // Refill with original phone numbers for repetition
        availablePhoneNumbers = [...phoneNumbers];
        logGeneration('⚠️ Recycling phone numbers pool to ensure 6 numbers');
      }
      
      // Select a random number from available pool
      const randomIndex = Math.floor(Math.random() * availablePhoneNumbers.length);
      const selectedNumber = availablePhoneNumbers[randomIndex];
      selectedNumbers.push({
        id: selectedNumber.id,
        contactName: selectedNumber.contact_name,
        digits: selectedNumber.phone_number_digits.split('')
      });

      // Remove the selected number from available pool to avoid immediate duplicates
      availablePhoneNumbers.splice(randomIndex, 1);
    }

    logGeneration(`Selected ${selectedNumbers.length} numbers for placement`);

    // OPTIMIZATION: Lower max attempts for faster generation while still ensuring quality
    const MAX_PLACEMENT_ATTEMPTS_PER_NUMBER = 1000; // Reduced from 2000
    const MAX_TOTAL_GRID_ATTEMPTS = 30; // Reduced from 50
    
    let placedCount = 0;

    // OPTIMIZATION: Try to place each number with a more efficient approach
    for (const number of selectedNumbers) {
      let placed = false;
      let attempts = 0;
      
      logGeneration(`Attempting to place number: ${number.digits.join('')} (${number.contactName})`);

      // OPTIMIZATION: Use shuffled starting positions list
      for (const startPos of shuffledStartPositions) {
        if (attempts >= MAX_PLACEMENT_ATTEMPTS_PER_NUMBER) break;

        const startRow = startPos.row;
        const startCol = startPos.col;
        const startCellKey = `${startRow}-${startCol}`;
        
        if (occupiedCells.has(startCellKey)) {
          attempts++;
          continue;
        }
        
        // First, set the starting digit in the grid temporarily
        newGrid[startRow][startCol] = number.digits[0];
        
        // Generate complex winding path
        const path = generateComplexPath(startRow, startCol, number.digits, occupiedCells, newGrid);
        
        // Clear the starting digit if path generation failed
        if (!path) {
          newGrid[startRow][startCol] = null;
          attempts++;
          continue;
        }
        
        if (path && path.length === 10) {
          // Place the number along the path
          path.forEach((pos, digitIndex) => {
            newGrid[pos.row][pos.col] = number.digits[digitIndex];
            occupiedCells.add(`${pos.row}-${pos.col}`);
          });

          // Calculate path complexity metrics
          let directionChanges = 0;
          for (let i = 2; i < path.length; i++) {
            const dir1 = {
              dx: path[i-1].col - path[i-2].col,
              dy: path[i-1].row - path[i-2].row
            };
            const dir2 = {
              dx: path[i].col - path[i-1].col,
              dy: path[i].row - path[i-1].row
            };
            if (dir1.dx !== dir2.dx || dir1.dy !== dir2.dy) {
              directionChanges++;
            }
          }
          
          numbersWithPositions.push({
            id: number.id,
            contactName: number.contactName,
            digits: number.digits.join(''),
            positions: path.map(pos => ({ x: pos.col, y: pos.row })),
            directionChanges,
            pathComplexity: directionChanges / 9, // Normalized complexity
            found: false,
            // CRITICAL FIX: Store exact path as master solution
            exactPath: path.map(pos => ({ x: pos.col, y: pos.row }))
          });
          
          placed = true;
          placedCount++;
          
          logGeneration(`✅ Placed number ${placedCount}: ${number.contactName} (${number.digits.join('')}) with ${directionChanges} direction changes`);
          break; // Success! Move to next number
        } else {
          // Clear the starting digit if path is invalid
          newGrid[startRow][startCol] = null;
        }
        
        attempts++;
      }
      
      if (!placed) {
        logGeneration(`❌ Failed to place number after ${attempts} attempts - retrying entire grid`);
        // Retry the entire grid generation if we can't place a number
        if (currentAttempt < MAX_TOTAL_GRID_ATTEMPTS) {
          return generateGrid();
        } else {
          logGeneration(`❌ Failed to generate grid after ${MAX_TOTAL_GRID_ATTEMPTS} attempts`);
          return { error: "Couldn't generate a solvable puzzle. Please try again." };
        }
      }
    }

    // Verify all numbers were placed successfully
    if (numbersWithPositions.length !== TOTAL_HIDDEN_NUMBERS) {
      logGeneration(`❌ Only placed ${numbersWithPositions.length}/${TOTAL_HIDDEN_NUMBERS} numbers`);
      if (currentAttempt < MAX_TOTAL_GRID_ATTEMPTS) {
        return generateGrid();
      } else {
        return { error: "Couldn't generate a solvable puzzle. Please try again." };
      }
    }

    // OPTIMIZATION: Fill remaining cells with random digits more efficiently
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (newGrid[row][col] === null) {
          newGrid[row][col] = Math.floor(Math.random() * 10).toString();
        }
      }
    }

    // CRITICAL FIX: VERIFY NO ACCIDENTAL PHONE NUMBERS
    const verifyNoAccidentalNumbers = () => {
      const userNumbers = new Set(phoneNumbers.map(pn => pn.phone_number_digits));
      const placedNumbers = new Set(numbersWithPositions.map(n => n.digits));
      
      // OPTIMIZATION: Check only the most likely directions (horizontal and vertical)
      // instead of all 8 directions to speed up verification
      const checkDirections = [
        { dx: 1, dy: 0 }, // right
        { dx: 0, dy: 1 }  // down
      ];
      
      for (const direction of checkDirections) {
        for (let startRow = 0; startRow < GRID_ROWS; startRow++) {
          for (let startCol = 0; startCol < GRID_COLS; startCol++) {
            const sequence = [];
            let row = startRow;
            let col = startCol;
            
            // Build 10-digit sequence
            for (let i = 0; i < 10; i++) {
              if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) break;
              sequence.push(newGrid[row][col]);
              row += direction.dy;
              col += direction.dx;
            }
            
            if (sequence.length === 10) {
              const numberString = sequence.join('');
              if (userNumbers.has(numberString) && !placedNumbers.has(numberString)) {
                logGeneration('⚠️ Accidental number detected, regenerating grid');
                return false;
              }
            }
          }
        }
      }
      
      return true;
    };

    if (!verifyNoAccidentalNumbers()) {
      if (currentAttempt < MAX_TOTAL_GRID_ATTEMPTS) {
        return generateGrid();
      } else {
        return { error: "Couldn't generate a valid puzzle. Please try again." };
      }
    }

    // CRITICAL FIX: VALIDATE ALL NUMBERS ARE FULLY DISCOVERABLE
    const allNumbersDiscoverable = validateNumberDiscoverability(newGrid, numbersWithPositions);
    if (!allNumbersDiscoverable) {
      logGeneration('❌ Validation failed: Not all numbers are discoverable');
      if (currentAttempt < MAX_TOTAL_GRID_ATTEMPTS) {
        logGeneration('🔄 Retrying grid generation with guaranteed discoverability...');
        return generateGrid();
      } else {
        return { error: "Couldn't generate a fully solvable puzzle after multiple attempts. Please try again." };
      }
    }

    logGeneration('🎯 Grid generation complete - Path complexity analysis:');
    const avgComplexity = numbersWithPositions.reduce((sum, num) => sum + num.pathComplexity, 0) / numbersWithPositions.length;
    logGeneration(`Average path complexity: ${(avgComplexity * 100).toFixed(1)}%`);

    // Final validation: Ensure all 6 numbers are truly distinct paths
    const distinctPathsCheck = new Set();
    let pathsAreUnique = true;
    
    numbersWithPositions.forEach((num, index) => {
      // Create a path signature by encoding all coordinates
      const pathSignature = num.positions.map(pos => `${pos.x},${pos.y}`).join('|');
      
      if (distinctPathsCheck.has(pathSignature)) {
        pathsAreUnique = false;
        logGeneration(`❌ Duplicate path detected for number ${index + 1}`);
      }
      
      distinctPathsCheck.add(pathSignature);
      logGeneration(`✅ Number ${index + 1}: ${num.contactName} (${num.digits}) - ${num.directionChanges} changes (${(num.pathComplexity * 100).toFixed(1)}% complex)`);
    });

    if (!pathsAreUnique && currentAttempt < MAX_TOTAL_GRID_ATTEMPTS) {
      logGeneration('🔄 Duplicate paths detected, regenerating grid...');
      return generateGrid();
    }

    // Reset attempts counter for next game
    setGenerationAttempts(0);
    
    return { grid: newGrid, hiddenNumbers: numbersWithPositions };
  }, [phoneNumbers, generationAttempts, generateComplexPath]);

  // Start the game with optimized async grid generation
  const startGame = () => {
    setIsPreGame(false);
    setGameStarted(true);
    setGenerationLog([]);
    setIsGeneratingGrid(true);
    setLoadingMessage('Preparing your challenge...');
    
    logGeneration('🎮 Starting Word Search game generation');
    
    // Async grid generation with proper loading state
    const generateGridAsync = () => {
      return new Promise((resolve) => {
        // Use setTimeout to allow UI to update before heavy computation
        gridGenerationTimeoutRef.current = setTimeout(() => {
          const result = generateGrid();
          resolve(result);
        }, 50); // Small delay to ensure UI updates
      });
    };
    
    // Execute grid generation asynchronously
    generateGridAsync().then(result => {
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
      
      // Start the timer only after grid generation is complete
      const now = Date.now();
      setStartTime(now);
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - now) / 1000));
      }, 1000);
      
      logGeneration('🎮 Game started successfully with all 6 numbers properly embedded');
    });
  };

  // Check if two cells are adjacent (including diagonals)
  const isAdjacent = (x1, y1, x2, y2) => {
    return Math.abs(x1 - x2) <= 1 && Math.abs(y1 - y2) <= 1;
  };

  // ================== CLICK-TO-SELECT IMPLEMENTATION ==================
  // PRECISELY FOLLOWING THE REQUIREMENTS
  
  // A. Handle cell click for click-to-select method
  const handleCellClick = (x, y) => {
    if (gameComplete || isCellFound(x, y)) return;
    
    // If we're in drag mode, don't process as a click
    if (isDragging) return;
    
    const cellValue = grid[y][x];
    
    // A. If currentSelection is EMPTY (First Click of a New Path):
    if (currentSelection.length === 0) {
      // Add the clicked cell's coordinates to currentSelection
      setCurrentSelection([{ x, y, value: cellValue }]);
      setShowSubmitButton(false);
      setSelectionMethod('click');
      playSound('correct'); // Subtle feedback for successful selection
      return;
    }
    
    // B. If currentSelection is NOT EMPTY (Extending or Modifying an Existing Path):
    
    // Check if clicking on already selected cell (C. CASE)
    const existingIndex = currentSelection.findIndex(cell => cell.x === x && cell.y === y);
    if (existingIndex !== -1) {
      // C. If newlyClickedCell is ALREADY IN currentSelectionPath
      // Truncate currentSelectionPath to include only cells up to and including newlyClickedCell
      const newSelection = currentSelection.slice(0, existingIndex + 1);
      setCurrentSelection(newSelection);
      setShowSubmitButton(newSelection.length === 10);
      return;
    }
    
    // Get the coordinates of the lastCell in currentSelectionPath
    const lastCell = currentSelection[currentSelection.length - 1];
    
    // Check for Adjacency
    if (isAdjacent(lastCell.x, lastCell.y, x, y)) {
      // B. Adjacent cell - add to selection
      const newSelection = [...currentSelection, { x, y, value: cellValue }];
      setCurrentSelection(newSelection);
      setShowSubmitButton(newSelection.length === 10);
      playSound('correct'); // Subtle feedback for successful selection
    } else {
      // B. Not adjacent - start new selection
      setCurrentSelection([{ x, y, value: cellValue }]);
      setShowSubmitButton(false);
      setSelectionMethod('click');
      playSound('correct'); // Subtle feedback for successful selection
    }
  };

  // ================== DRAG-TO-SELECT IMPLEMENTATION ==================
  // PRESERVING EXISTING FUNCTIONALITY EXACTLY
  
  const handleCellMouseDown = (e, x, y) => {
    if (gameComplete || isCellFound(x, y)) return;
    
    // Record time of mouse down for distinguishing click vs drag
    const now = Date.now();
    setMouseDownTime(now);
    setClickStartTime(now);
    setMouseDownCell({ x, y });
    setHasMouseMoved(false);
    
    // Don't set isDragging yet - we'll determine if it's a drag or click based on movement
    
    // Store the cell for potential drag start
    setDragStartCell({ x, y });
  };

  const handleCellMouseMove = (e, x, y) => {
    // Only track movement if mouse is down and we have a start cell
    if (mouseDownCell && (mouseDownCell.x !== x || mouseDownCell.y !== y)) {
      setHasMouseMoved(true);
      
      // Now we know it's a drag operation
      if (!isDragging) {
        setIsDragging(true);
        setSelectionMethod('drag');
        
        // Initialize drag with starting cell
        const startCellValue = grid[mouseDownCell.y][mouseDownCell.x];
        setCurrentSelection([{ x: mouseDownCell.x, y: mouseDownCell.y, value: startCellValue }]);
        setShowSubmitButton(false);
      }
      
      // Now handle the cell we've moved to
      handleCellDrag(x, y);
    }
  };

  const handleCellDrag = (x, y) => {
    if (gameComplete || isCellFound(x, y) || !isDragging || currentSelection.length === 0) return;
    
    const lastCell = currentSelection[currentSelection.length - 1];
    
    // Check if the cell is adjacent to the last selected cell
    if (isAdjacent(lastCell.x, lastCell.y, x, y)) {
      // Check if this cell is already in the selection
      const alreadySelected = currentSelection.some(cell => cell.x === x && cell.y === y);
      
      if (!alreadySelected) {
        const cellValue = grid[y][x];
        const newSelection = [...currentSelection, { x, y, value: cellValue }];
        setCurrentSelection(newSelection);
        
        // Show submit button when we have 10 digits selected
        if (newSelection.length === 10) {
          setShowSubmitButton(true);
        }
      }
    }
  };

  // Touch event handlers for mobile - PRESERVED EXACTLY
  const handleCellTouchStart = (e, x, y) => {
    if (gameComplete || isCellFound(x, y)) return;
    
    // Prevent default to avoid scrolling
    e.preventDefault();
    
    // Record touch start time and position
    const now = Date.now();
    setTouchStartTime(now);
    setClickStartTime(now);
    setLastTouchPosition({ x, y });
    setMouseDownCell({ x, y });
    
    // Store touch identifier to track this specific touch
    if (e.touches && e.touches[0]) {
      setTouchIdentifier(e.touches[0].identifier);
    }
  };

  const handleCellTouchMove = (e, x, y) => {
    if (gameComplete || isCellFound(x, y)) return;
    
    // Prevent default to avoid scrolling
    e.preventDefault();
    
    // Check if it's the same touch we started tracking
    let isValidTouch = true;
    if (e.changedTouches && e.changedTouches.length > 0) {
      if (touchIdentifier !== null && e.changedTouches[0].identifier !== touchIdentifier) {
        isValidTouch = false;
      }
    }
    
    if (!isValidTouch) return;
    
    // If this is the first movement, start dragging mode
    if (!isDragging && mouseDownCell && (mouseDownCell.x !== x || mouseDownCell.y !== y)) {
      setIsDragging(true);
      setSelectionMethod('touch');
      
      // Initialize with starting cell
      const startCellValue = grid[mouseDownCell.y][mouseDownCell.x];
      setCurrentSelection([{ x: mouseDownCell.x, y: mouseDownCell.y, value: startCellValue }]);
      setShowSubmitButton(false);
    }
    
    // Now we're in drag mode, handle cell selection
    if (isDragging) {
      // If this is a different cell than the last one we touched
      if (lastTouchPosition && (lastTouchPosition.x !== x || lastTouchPosition.y !== y)) {
        setLastTouchPosition({ x, y });
        handleCellDrag(x, y);
      }
    }
  };

  // Global event handlers to finalize selection
  const handleGlobalMouseUp = (e) => {
    const isQuickClick = mouseDownTime && (Date.now() - mouseDownTime < 200) && !hasMouseMoved;
    
    // If it was a quick click and we have a mouseDownCell, process as click
    if (isQuickClick && mouseDownCell && !isDragging) {
      handleCellClick(mouseDownCell.x, mouseDownCell.y);
    } else if (isDragging) {
      // If we have 10 digits and we're in drag mode, auto-submit
      if (currentSelection.length === 10) {
        setTimeout(() => handleSubmit(), 100);
      }
    }
    
    // Reset drag state
    setIsDragging(false);
    setDragStartCell(null);
    setMouseDownTime(null);
    setMouseDownCell(null);
    setHasMouseMoved(false);
  };

  const handleGlobalTouchEnd = (e) => {
    // Check if it's the same touch we started tracking
    let isValidTouch = true;
    if (e.changedTouches && e.changedTouches.length > 0) {
      if (touchIdentifier !== null && e.changedTouches[0].identifier !== touchIdentifier) {
        isValidTouch = false;
      }
    }
    
    if (!isValidTouch) return;
    
    const isQuickTap = touchStartTime && (Date.now() - touchStartTime < 200) && !isDragging;
    
    // If it was a quick tap and we have a mouseDownCell, process as click
    if (isQuickTap && mouseDownCell) {
      handleCellClick(mouseDownCell.x, mouseDownCell.y);
    } else if (isDragging) {
      // If we have 10 digits and we're in touch mode, auto-submit
      if (currentSelection.length === 10) {
        setTimeout(() => handleSubmit(), 100);
      }
    }
    
    // Reset touch state
    setIsDragging(false);
    setTouchStartTime(null);
    setLastTouchPosition(null);
    setMouseDownCell(null);
    setTouchIdentifier(null);
  };

  // CRITICAL FIX: Check if user's selection path matches the exact intended path for a number
  const isExactPathMatch = (userSelection, hiddenNumber) => {
    // Must have the right number of cells
    if (userSelection.length !== hiddenNumber.exactPath.length) {
      return false;
    }
    
    // Check if each position matches exactly
    for (let i = 0; i < userSelection.length; i++) {
      const userPos = userSelection[i];
      const exactPos = hiddenNumber.exactPath[i];
      if (userPos.x !== exactPos.x || userPos.y !== exactPos.y) {
        return false;
      }
    }
    
    return true;
  };

  // Handle submit button click with CRITICAL EXACT PATH VALIDATION
  const handleSubmit = () => {
    if (currentSelection.length !== 10) return;
    
    // Construct the selected number
    const selectedDigits = currentSelection.map(cell => cell.value).join('');
    
    // Check if the selection matches any of the hidden numbers
    const matchedNumberIndex = hiddenNumbers.findIndex(num => 
      num.digits === selectedDigits && !num.found
    );
    
    if (matchedNumberIndex !== -1) {
      const matchedNumber = hiddenNumbers[matchedNumberIndex];
      
      // CRITICAL NEW CHECK: Verify the selection follows the EXACT intended path
      const exactPathMatch = isExactPathMatch(currentSelection, matchedNumber);
      
      if (exactPathMatch) {
        // Correct match found with exact path!
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
        setSelectionMethod(null);
        
        // Check if all numbers are found
        const allFound = newHiddenNumbers.every(num => num.found);
        if (allFound) {
          handleGameComplete();
        }
      } else {
        // Right digits but WRONG PATH - incorrect selection
        console.log("Correct number but wrong path - digits match but path is incorrect");
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
        setSelectionMethod(null);
      }
    } else {
      // Incorrect selection - digits don't match any hidden number
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
      setSelectionMethod(null);
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
    
    // Calculate stars using the NEW thresholds
    const earnedStars = calculateStars(finalTime);
    setStars(earnedStars);
    
    // Save game results for each found number
    hiddenNumbers.forEach(number => {
      saveGameResult(
        number.id,
        'word-search',
        earnedStars,
        {
          time_taken: finalTime,
          numbers_found_count: hiddenNumbers.length,
          path_complexity: number.pathComplexity
        }
      );
    });
    
    logGeneration(`🏆 Game completed! Time: ${finalTime}s, Stars: ${earnedStars}/5`);
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

  // Get selection path index for a cell
  const getSelectionIndex = (x, y) => {
    return currentSelection.findIndex(cell => cell.x === x && cell.y === y);
  };

  // Show loading state if fetching phone numbers
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
    <div 
      className="min-h-screen app-container"
    >
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
            onClick={() => onNavigate('number-selection', { gameMode: 'word-search' })}
            className="p-3 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow text-indigo-600 hover:text-indigo-800"
          >
            <SafeIcon icon={FiArrowLeft} size={20} />
          </button>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-indigo-800">Word Search</h2>
            <p className="text-indigo-600">Find hidden phone numbers in the grid!</p>
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
            <h2 className="text-3xl font-bold text-indigo-800 mb-4">Word Search Challenge</h2>
            <div className="mb-8 text-left">
              <p className="text-indigo-700 mb-4">
                Find 6 hidden phone numbers in complex, winding paths through the grid!
              </p>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <SafeIcon icon={FiCheck} size={14} className="text-green-600" />
                  </div>
                  <span>Numbers follow complex, interwoven paths that change direction</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <SafeIcon icon={FiCheck} size={14} className="text-green-600" />
                  </div>
                  <span>Click individual adjacent digits OR click and drag to select</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <SafeIcon icon={FiClock} size={14} className="text-indigo-600" />
                  </div>
                  <span>Find all 6 hidden numbers as quickly as possible</span>
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

        {/* Enhanced Loading Overlay */}
        {isGeneratingGrid && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(147,51,234,0.85), rgba(79,70,229,0.85), rgba(59,130,246,0.85))"
            }}
          >
            <div className="text-center p-8 bg-white bg-opacity-20 backdrop-filter backdrop-blur-md rounded-3xl shadow-2xl">
              <div className="relative w-24 h-24 mx-auto mb-6">
                {/* Animated spinner with digits */}
                <div className="absolute inset-0 rounded-full border-4 border-white border-opacity-20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-indigo-400 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                
                {/* Animated digits floating around */}
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-6 h-6 text-white font-bold flex items-center justify-center"
                    initial={{ x: 0, y: 0, scale: 0.5, opacity: 0 }}
                    animate={{
                      x: [0, Math.sin(i * 36 * Math.PI/180) * 40, 0],
                      y: [0, Math.cos(i * 36 * Math.PI/180) * 40, 0],
                      scale: [0.5, 1, 0.5],
                      opacity: [0, 1, 0]
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 2 + Math.random() * 2,
                      delay: i * 0.2
                    }}
                  >
                    {digit}
                  </motion.div>
                ))}
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">
                {loadingMessage}
              </h2>
              <p className="text-white text-opacity-90">
                Creating your unique challenge with complex paths...
              </p>
            </div>
          </motion.div>
        )}

        {/* Game board */}
        {gameStarted && !isPreGame && !isGeneratingGrid && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
          >
            {/* PERFECTLY UNIFORM GRID WITH DUAL INTERACTION */}
            <motion.div
              ref={gridRef}
              className="bg-white p-6 rounded-3xl shadow-lg mb-6 select-none"
              style={{
                display: 'inline-block',
                width: 'fit-content'
              }}
            >
              <div
                className="grid select-none"
                style={{
                  gridTemplateColumns: `repeat(${GRID_COLS}, ${CELL_SIZE}px)`,
                  gridTemplateRows: `repeat(${GRID_ROWS}, ${CELL_SIZE}px)`,
                  gap: `${CELL_GAP}px`,
                  width: `${(CELL_SIZE * GRID_COLS) + (CELL_GAP * (GRID_COLS - 1))}px`,
                  height: `${(CELL_SIZE * GRID_ROWS) + (CELL_GAP * (GRID_ROWS - 1))}px`,
                  justifyItems: 'center',
                  alignItems: 'center'
                }}
              >
                {grid.map((row, y) =>
                  row.map((cell, x) => {
                    const isSelected = isCellSelected(x, y);
                    const isFound = isCellFound(x, y);
                    const foundIndex = isFound ? getFoundNumberIndex(x, y) : -1;
                    const selectionIndex = getSelectionIndex(x, y);
                    
                    const foundColors = [
                      'bg-green-400 text-white border-green-500',
                      'bg-blue-400 text-white border-blue-500',
                      'bg-purple-400 text-white border-purple-500',
                      'bg-yellow-400 text-black border-yellow-500',
                      'bg-pink-400 text-white border-pink-500',
                      'bg-orange-400 text-white border-orange-500'
                    ];

                    return (
                      <motion.div
                        key={`${x}-${y}`}
                        ref={el => cellRefs.current[`${x}-${y}`] = el}
                        className={`
                          rounded-full flex items-center justify-center font-bold text-lg shadow-sm transition-all cursor-pointer border-2 select-none
                          ${isFound ? foundColors[foundIndex % foundColors.length] : isSelected ? 'bg-indigo-300 border-indigo-500 text-indigo-900 scale-110 z-10' : 'bg-gray-100 border-gray-200 hover:bg-indigo-50 hover:border-indigo-200 text-gray-800'}
                        `}
                        style={{
                          width: `${CELL_SIZE}px`,
                          height: `${CELL_SIZE}px`,
                          position: 'relative',
                          zIndex: isSelected ? 20 : 1
                        }}
                        onClick={() => handleCellClick(x, y)}
                        onMouseDown={(e) => handleCellMouseDown(e, x, y)}
                        onMouseMove={(e) => handleCellMouseMove(e, x, y)}
                        onTouchStart={(e) => handleCellTouchStart(e, x, y)}
                        onTouchMove={(e) => handleCellTouchMove(e, x, y)}
                        whileHover={!isFound ? { scale: 1.05 } : {}}
                        whileTap={!isFound ? { scale: 0.95 } : {}}
                      >
                        {cell}
                        {/* Selection order indicator */}
                        {isSelected && selectionIndex >= 0 && (
                          <div className="absolute -top-2 -right-2 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            {selectionIndex + 1}
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
              <div className="text-center text-sm text-indigo-600 mt-4">
                <p>Find {TOTAL_HIDDEN_NUMBERS} phone numbers • {foundNumbers.length} found</p>
                {currentSelection.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    Current selection: {currentSelection.length}/10 digits
                    {selectionMethod && (
                      <span className="ml-2 text-indigo-500">
                        ({selectionMethod === 'drag' ? 'drag' : 'click'} mode)
                      </span>
                    )}
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
                  Check Number
                </motion.button>
              )}
            </AnimatePresence>

            {/* Found numbers list */}
            {foundNumbers.length > 0 && (
              <div className="w-full bg-white p-6 rounded-3xl shadow-lg mt-4">
                <h3 className="text-lg font-bold text-indigo-800 mb-3">Found Numbers:</h3>
                <div className="space-y-2">
                  {foundNumbers.map((number, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full ${
                          index === 0 ? 'bg-green-400' :
                          index === 1 ? 'bg-blue-400' :
                          index === 2 ? 'bg-purple-400' :
                          index === 3 ? 'bg-yellow-400' :
                          index === 4 ? 'bg-pink-400' :
                          'bg-orange-400'
                        }`}
                      ></div>
                      <span className="text-gray-800 font-mono">
                        {number.digits.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')}
                      </span>
                      <span className="text-indigo-600">
                        - {number.contactName}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({number.directionChanges} turns)
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
                    <h2 className="text-3xl font-bold text-indigo-800 mb-2">Challenge Complete!</h2>
                    <p className="text-indigo-600 mb-6">
                      You found all {TOTAL_HIDDEN_NUMBERS} hidden numbers in their complex paths!
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
                            className={`w-8 h-8 ${i < stars ? 'text-yellow-500 fill-current' : 'text-gray-300'}`}
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
                        onClick={() => onNavigate('number-selection', { gameMode: 'word-search' })}
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

export default WordSearch;