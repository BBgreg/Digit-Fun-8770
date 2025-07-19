import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound } from '../../utils/formatters';
import { useGameProgress } from '../../hooks/useGameProgress';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import Confetti from '../ui/Confetti';

const { FiArrowLeft, FiStar, FiRefreshCw, FiClock } = FiIcons;

const DigitLinkPuzzle = ({ onNavigate, onGameEnd, targetNumber, contactName, phoneNumberId }) => {
  // Game state
  const [pieces, setPieces] = useState([]);
  const [placedPieces, setPlacedPieces] = useState(Array(10).fill(null));
  const [gameComplete, setGameComplete] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [bumpBackCount, setBumpBackCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [gameStats, setGameStats] = useState(null);
  
  // Refs
  const timerRef = useRef(null);
  const slotsRef = useRef([]);
  const draggedPieceRef = useRef(null);
  
  const { saveGameResult } = useGameProgress();
  const targetArray = targetNumber.split('');

  // Colors for puzzle pieces
  const pieceColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#F9CA24', '#F0932B',
    '#EB4D4B', '#6C5CE7', '#A29BFE', '#FD79A8', '#E84393',
    '#55EFC4', '#81ECEC', '#74B9FF', '#A3CB38', '#FFC312',
    '#C44569', '#786FA6', '#F8A5C2', '#63CDDA', '#EA8685'
  ];

  // Generate puzzle piece shapes (interlocking sides)
  const generateShapeForPosition = (position, total) => {
    const isFirst = position === 0;
    const isLast = position === total - 1;
    
    // Possible shape types for interlocking sides
    const shapeTypes = ['wave', 'tab', 'dovetail', 'zigzag'];
    
    // Generate random shape types for left and right sides
    const leftShapeType = !isFirst ? shapeTypes[Math.floor(Math.random() * shapeTypes.length)] : 'flat';
    const rightShapeType = !isLast ? shapeTypes[Math.floor(Math.random() * shapeTypes.length)] : 'flat';
    
    // For each shape type, generate a unique identifier
    // This ensures the same position always has the same shape
    const leftShapeId = !isFirst ? `${leftShapeType}-${position}-left` : 'flat';
    const rightShapeId = !isLast ? `${rightShapeType}-${position}-right` : 'flat';
    
    return {
      leftShape: leftShapeId,
      rightShape: rightShapeId,
      leftType: leftShapeType,
      rightType: rightShapeType
    };
  };

  // Check if two pieces can connect
  const canPiecesConnect = (piece1, piece2, side) => {
    if (!piece1 || !piece2) return false;
    
    // For left connection, piece1's left shape must match piece2's right shape
    if (side === 'left') {
      return piece1.leftShape === piece2.rightShape;
    }
    
    // For right connection, piece1's right shape must match piece2's left shape
    if (side === 'right') {
      return piece1.rightShape === piece2.leftShape;
    }
    
    return false;
  };

  // Generate all puzzle pieces
  const generatePuzzlePieces = () => {
    // Count occurrences of each digit in the target number
    const digitCounts = {};
    targetArray.forEach(digit => {
      digitCounts[digit] = (digitCounts[digit] || 0) + 1;
    });

    // Create correct pieces (one for each digit in target number)
    const correctPieces = targetArray.map((digit, index) => {
      const shape = generateShapeForPosition(index, targetArray.length);
      return {
        id: `correct-${index}`,
        digit,
        position: index,
        isCorrect: true,
        color: pieceColors[index % pieceColors.length],
        leftShape: shape.leftShape,
        rightShape: shape.rightShape,
        leftType: shape.leftType,
        rightType: shape.rightType,
        x: Math.random() * (window.innerWidth * 0.7) + (window.innerWidth * 0.15),
        y: Math.random() * (window.innerHeight * 0.4) + (window.innerHeight * 0.4)
      };
    });

    // Create distractor pieces (digits not in target number)
    const distractorPieces = [];
    for (let i = 0; i <= 9; i++) {
      const digit = i.toString();
      
      // If this digit isn't in the target number or we need additional distractors
      if (!digitCounts[digit] || Math.random() > 0.7) {
        // Add 1-2 distractors per digit
        const count = Math.floor(Math.random() * 2) + 1;
        
        for (let j = 0; j < count; j++) {
          // Generate random fake shapes that won't fit with correct pieces
          const fakeShape = {
            leftShape: `fake-left-${Math.random()}`,
            rightShape: `fake-right-${Math.random()}`,
            leftType: Math.random() > 0.5 ? 'flat' : 'wave',
            rightType: Math.random() > 0.5 ? 'flat' : 'zigzag'
          };
          
          distractorPieces.push({
            id: `distractor-${digit}-${j}`,
            digit,
            position: -1,
            isCorrect: false,
            color: pieceColors[(parseInt(digit) + 10) % pieceColors.length],
            leftShape: fakeShape.leftShape,
            rightShape: fakeShape.rightShape,
            leftType: fakeShape.leftType,
            rightType: fakeShape.rightType,
            x: Math.random() * (window.innerWidth * 0.7) + (window.innerWidth * 0.15),
            y: Math.random() * (window.innerHeight * 0.4) + (window.innerHeight * 0.4)
          });
        }
      }
    }

    // Combine and shuffle all pieces
    return shuffleArray([...correctPieces, ...distractorPieces]);
  };

  // Shuffle array
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Check if a piece fits in a specific slot
  const doesPieceFit = (piece, slotIndex) => {
    // If no piece or not a correct piece, it doesn't fit
    if (!piece || !piece.isCorrect) return false;
    
    // Piece must be for the correct position
    if (piece.position !== slotIndex) return false;
    
    // Check if it connects with adjacent pieces
    const leftPiece = placedPieces[slotIndex - 1];
    const rightPiece = placedPieces[slotIndex + 1];
    
    // If there's a piece to the left, check if they connect
    if (leftPiece) {
      const leftPieceData = pieces.find(p => p.id === leftPiece.id);
      if (!canPiecesConnect(piece, leftPieceData, 'left')) {
        return false;
      }
    }
    
    // If there's a piece to the right, check if they connect
    if (rightPiece) {
      const rightPieceData = pieces.find(p => p.id === rightPiece.id);
      if (!canPiecesConnect(rightPieceData, piece, 'left')) {
        return false;
      }
    }
    
    return true;
  };

  // Handle piece placement
  const handlePiecePlacement = (piece, slotIndex) => {
    if (slotIndex < 0 || slotIndex >= 10) return false;
    
    // Check if piece fits in this slot
    if (doesPieceFit(piece, slotIndex)) {
      // Place piece in slot
      const newPlacedPieces = [...placedPieces];
      newPlacedPieces[slotIndex] = piece;
      setPlacedPieces(newPlacedPieces);
      
      // Play success sound
      playSound('correct');
      
      // Check if puzzle is complete
      if (newPlacedPieces.filter(p => p !== null).length === 10) {
        handlePuzzleComplete();
      }
      
      return true;
    } else {
      // Piece doesn't fit - bump back
      playSound('incorrect');
      setBumpBackCount(prev => prev + 1);
      return false;
    }
  };

  // Handle puzzle completion
  const handlePuzzleComplete = () => {
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    const endTime = Date.now();
    const timeTaken = Math.round((endTime - startTime) / 1000);
    setElapsedTime(timeTaken);
    
    // Calculate stars based on time and bump backs
    const stars = calculateStars(timeTaken, bumpBackCount);
    
    // Show completion UI
    setGameComplete(true);
    setShowConfetti(true);
    playSound('win');
    
    // Store game stats
    setGameStats({
      timeTaken,
      bumpBackCount,
      stars
    });
    
    // Save game result to Supabase
    if (phoneNumberId) {
      saveGameResult(
        phoneNumberId,
        'digitlink-puzzle',
        stars,
        {
          time_taken: timeTaken,
          bump_backs: bumpBackCount
        }
      );
      
      // Notify parent component
      setTimeout(() => {
        onGameEnd(stars);
      }, 2000);
    }
  };

  // Calculate stars based on performance
  const calculateStars = (time, bumpBacks) => {
    // Factor in both time and bump backs
    const timeScore = time <= 30 ? 5 :
                      time <= 60 ? 4 :
                      time <= 90 ? 3 :
                      time <= 120 ? 2 : 1;
    
    const bumpScore = bumpBacks <= 2 ? 5 :
                      bumpBacks <= 5 ? 4 :
                      bumpBacks <= 10 ? 3 :
                      bumpBacks <= 15 ? 2 : 1;
    
    // Average the two scores and round down
    return Math.floor((timeScore + bumpScore) / 2);
  };

  // Reset the game
  const handleReset = () => {
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Reset state
    setPlacedPieces(Array(10).fill(null));
    setPieces(generatePuzzlePieces());
    setGameComplete(false);
    setShowConfetti(false);
    setBumpBackCount(0);
    setGameStats(null);
    
    // Reset and start timer
    setStartTime(Date.now());
    setElapsedTime(0);
    
    // Start timer
    timerRef.current = setInterval(() => {
      setElapsedTime(Math.round((Date.now() - startTime) / 1000));
    }, 1000);
  };

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Format phone number for display
  const formatPhoneNumber = (number) => {
    return number.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  };

  // Initialize game
  useEffect(() => {
    setPieces(generatePuzzlePieces());
    setStartTime(Date.now());
    
    // Start timer
    timerRef.current = setInterval(() => {
      setElapsedTime(Math.round((Date.now() - startTime) / 1000));
    }, 1000);
    
    // Cleanup
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [targetNumber]);

  // Handle drag start
  const handleDragStart = (piece) => {
    draggedPieceRef.current = piece;
  };

  // Handle drag end
  const handleDragEnd = (_, info) => {
    const piece = draggedPieceRef.current;
    if (!piece) return;
    
    // Check if piece is over any slot
    let placed = false;
    
    slotsRef.current.forEach((slotRect, index) => {
      if (!slotRect) return;
      
      // If slot is already filled, skip
      if (placedPieces[index]) return;
      
      // Check if piece is over this slot
      if (
        info.point.x >= slotRect.left &&
        info.point.x <= slotRect.right &&
        info.point.y >= slotRect.top &&
        info.point.y <= slotRect.bottom
      ) {
        // Try to place piece in slot
        placed = handlePiecePlacement(piece, index);
      }
    });
    
    // If piece was placed, remove it from available pieces
    if (placed) {
      setPieces(prev => prev.filter(p => p.id !== piece.id));
    }
    
    // Clear dragged piece ref
    draggedPieceRef.current = null;
  };

  // Measure slots after render
  useEffect(() => {
    // Wait for render to complete
    const timer = setTimeout(() => {
      // Get all slot elements
      const slotElements = document.querySelectorAll('.puzzle-slot');
      
      // Measure each slot
      slotElements.forEach((slot, index) => {
        if (slot) {
          const rect = slot.getBoundingClientRect();
          slotsRef.current[index] = rect;
        }
      });
    }, 500);
    
    return () => clearTimeout(timer);
  }, [placedPieces]);

  // Render puzzle piece
  const renderPuzzlePiece = (piece, isPlaced = false) => {
    return (
      <motion.div
        key={piece.id}
        drag={!isPlaced}
        dragSnapToOrigin={!isPlaced}
        onDragStart={() => handleDragStart(piece)}
        onDragEnd={handleDragEnd}
        whileDrag={{ scale: 1.1, zIndex: 100 }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className={`puzzle-piece ${isPlaced ? 'placed' : ''}`}
        style={{
          position: isPlaced ? 'relative' : 'absolute',
          left: !isPlaced ? piece.x : undefined,
          top: !isPlaced ? piece.y : undefined,
          backgroundColor: piece.color,
          width: '50px',
          height: '50px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '20px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
          cursor: isPlaced ? 'default' : 'grab',
          zIndex: isPlaced ? 1 : 10
        }}
      >
        {/* Left connector */}
        {piece.leftType !== 'flat' && (
          <div
            className="connector left-connector"
            style={{
              position: 'absolute',
              left: '-12px',
              width: '12px',
              height: '20px',
              backgroundColor: piece.color,
              clipPath: piece.leftType === 'tab' 
                ? 'polygon(0 0, 100% 40%, 100% 60%, 0 100%)' 
                : piece.leftType === 'dovetail'
                ? 'polygon(0 20%, 100% 0, 100% 100%, 0 80%)'
                : 'polygon(0 0, 50% 50%, 100% 0, 100% 100%, 50% 50%, 0 100%)'
            }}
          />
        )}
        
        {/* Digit */}
        {piece.digit}
        
        {/* Right connector */}
        {piece.rightType !== 'flat' && (
          <div
            className="connector right-connector"
            style={{
              position: 'absolute',
              right: '-12px',
              width: '12px',
              height: '20px',
              backgroundColor: piece.color,
              clipPath: piece.rightType === 'tab' 
                ? 'polygon(0 40%, 100% 0, 100% 100%, 0 60%)' 
                : piece.rightType === 'dovetail'
                ? 'polygon(0 0, 100% 20%, 100% 80%, 0 100%)'
                : 'polygon(0 0, 50% 50%, 100% 0, 100% 100%, 50% 50%, 0 100%)'
            }}
          />
        )}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen app-container">
      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-20 w-96 h-96 bg-gradient-to-br from-blue-400 to-sky-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {showConfetti && <Confetti />}

      <div className="relative z-10 max-w-6xl mx-auto p-6">
        {/* App Branding Section */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-6"
        >
          <h1 
            className="gradient-text app-title text-4xl font-black mb-2" 
            style={{
              background: "linear-gradient(135deg,#9333EA,#4F46E5,#3B82F6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "0 0 20px rgba(147,51,234,0.5)",
              fontFamily: "'Fredoka',sans-serif",
              letterSpacing: "-0.02em",
              lineHeight: "1.2"
            }}
          >
            Digit Fun
          </h1>
          <p 
            className="gradient-text app-tagline text-lg font-bold" 
            style={{
              background: "linear-gradient(135deg,#9333EA,#4F46E5,#3B82F6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "0 0 10px rgba(147,51,234,0.3)",
              fontFamily: "'Nunito',sans-serif"
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
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('number-selection', { gameMode: 'digitlink-puzzle' })}
              className="p-3 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow text-indigo-600 hover:text-indigo-800"
            >
              <SafeIcon icon={FiArrowLeft} size={20} />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-indigo-800">DigitLink Puzzle</h2>
              <p className="text-indigo-600">{contactName}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-md">
              <SafeIcon icon={FiClock} className="text-indigo-600" />
              <span className="text-indigo-800 font-bold">{formatTime(elapsedTime)}</span>
            </div>
            
            <button
              onClick={handleReset}
              className="p-3 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow text-indigo-600 hover:text-indigo-800"
            >
              <SafeIcon icon={FiRefreshCw} size={20} />
            </button>
          </div>
        </motion.div>

        {/* Puzzle slot area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-3xl shadow-lg mb-8 relative"
        >
          <div className="flex justify-center gap-1 mb-2">
            {Array(10).fill(null).map((_, index) => (
              <div
                key={index}
                className="puzzle-slot relative"
                style={{
                  width: '50px',
                  height: '50px',
                  border: '2px dashed #a0aec0',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(226, 232, 240, 0.5)'
                }}
              >
                {placedPieces[index] && renderPuzzlePiece(placedPieces[index], true)}
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-indigo-600 mt-4">
            Drag the puzzle pieces below to build the correct phone number sequence
          </p>
        </motion.div>

        {/* Puzzle pieces area */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-3xl shadow-lg mb-8 relative h-64"
          style={{ minHeight: '300px' }}
        >
          {pieces.map(piece => (
            <React.Fragment key={piece.id}>
              {!placedPieces.some(p => p && p.id === piece.id) && renderPuzzlePiece(piece)}
            </React.Fragment>
          ))}
        </motion.div>

        {/* Game completion overlay */}
        <AnimatePresence>
          {gameComplete && gameStats && (
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
                <div className="text-7xl mb-4">🧩</div>
                <h2 className="text-3xl font-bold text-indigo-800 mb-2">Puzzle Solved!</h2>
                <p className="text-indigo-600 mb-6">
                  Great job completing the puzzle!
                </p>
                
                {/* Game stats */}
                <div className="space-y-4 mb-6">
                  <div className="bg-indigo-50 p-4 rounded-2xl">
                    <p className="text-sm text-indigo-600 mb-2">The complete number:</p>
                    <p className="text-2xl font-mono font-bold text-indigo-800">
                      {formatPhoneNumber(targetNumber)}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-indigo-50 p-3 rounded-2xl">
                      <p className="text-sm text-indigo-600">Time</p>
                      <p className="text-xl font-bold text-indigo-800">
                        {formatTime(gameStats.timeTaken)}
                      </p>
                    </div>
                    <div className="bg-indigo-50 p-3 rounded-2xl">
                      <p className="text-sm text-indigo-600">Bumps</p>
                      <p className="text-xl font-bold text-indigo-800">
                        {gameStats.bumpBackCount}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Star rating */}
                <div className="mb-6">
                  <div className="flex justify-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <SafeIcon
                        key={i}
                        icon={FiStar}
                        className={`w-8 h-8 ${
                          i < gameStats.stars
                            ? 'text-yellow-500 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {gameStats.stars} out of 5 stars
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <motion.button
                    onClick={() => onNavigate('number-selection', { gameMode: 'digitlink-puzzle' })}
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
      </div>
    </div>
  );
};

export default DigitLinkPuzzle;