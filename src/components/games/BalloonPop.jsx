import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound } from '../../utils/formatters';
import { useGameProgress } from '../../hooks/useGameProgress';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiArrowLeft, FiStar } = FiIcons;

const BalloonPop = ({ onNavigate, onGameEnd, targetNumber, contactName, phoneNumberId }) => {
  const [activeBalloons, setActiveBalloons] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [poppedCount, setPoppedCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [filledDigits, setFilledDigits] = useState(Array(10).fill(''));
  const [balloonIdCounter, setBalloonIdCounter] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const { saveGameResult } = useGameProgress();
  
  const targetArray = targetNumber.split('');
  const balloonColors = [
    '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', 
    '#eb4d4b', '#6c5ce7', '#a29bfe', '#fd79a8', '#e84393'
  ];

  // Balloon configuration
  const BALLOON_RISE_TIME = 5000; // 5 seconds base time
  const BALLOON_SPAWN_INTERVAL = 6000; // New balloon every 6 seconds
  const MAX_BALLOONS_ON_SCREEN = 3; // Maximum balloons visible at once

  // Format number for display
  const formatNumberDisplay = (digits) => {
    return digits.map((digit, index) => {
      if (index === 3 || index === 6) {
        return ['-', digit];
      }
      return digit;
    }).flat();
  };

  const formattedDigitsDisplay = formatNumberDisplay(filledDigits);

  // Create a new balloon
  const createBalloon = useCallback((digitIndex, spawnDelay = 0) => {
    if (digitIndex >= targetArray.length || gameOver) return null;

    const newBalloonId = balloonIdCounter + 1;
    setBalloonIdCounter(newBalloonId);

    const balloon = {
      id: newBalloonId,
      digitIndex,
      expectedDigit: targetArray[digitIndex],
      color: balloonColors[digitIndex % balloonColors.length],
      spawnTime: Date.now() + spawnDelay,
      riseTime: BALLOON_RISE_TIME,
      incorrectAttempts: 0,
      isActive: true,
      // Random horizontal position for variety
      horizontalPosition: 30 + Math.random() * 40, // 30-70% from left
    };

    return balloon;
  }, [balloonIdCounter, targetArray, gameOver, balloonColors]);

  // Automated balloon spawning system
  const spawnNextBalloon = useCallback(() => {
    if (currentIndex >= targetArray.length || gameOver) return;

    const newBalloon = createBalloon(currentIndex);
    if (newBalloon) {
      setActiveBalloons(prev => [...prev, newBalloon]);
      
      // Auto-schedule balloon escape
      setTimeout(() => {
        setActiveBalloons(prev => prev.filter(b => {
          if (b.id === newBalloon.id && b.isActive) {
            // Balloon escaped!
            if (!gameOver) {
              setGameOver(true);
              playSound('gameOver');
              
              // Save game result
              if (phoneNumberId) {
                saveGameResult(
                  phoneNumberId, 
                  'balloon-pop', 
                  calculateStars(poppedCount),
                  { balloons_popped: poppedCount, balloons_escaped: 1 }
                );
              }
            }
            return false;
          }
          return true;
        }));
      }, newBalloon.riseTime);
    }
  }, [currentIndex, targetArray, gameOver, createBalloon, poppedCount, phoneNumberId, saveGameResult]);

  // Continuous balloon spawning system
  useEffect(() => {
    if (!gameStarted || gameOver || gameWon) return;

    const spawnTimer = setInterval(() => {
      // Only spawn if we have fewer than max balloons and more digits to go
      if (activeBalloons.length < MAX_BALLOONS_ON_SCREEN && currentIndex < targetArray.length) {
        spawnNextBalloon();
      }
    }, BALLOON_SPAWN_INTERVAL);

    return () => clearInterval(spawnTimer);
  }, [gameStarted, gameOver, gameWon, activeBalloons.length, currentIndex, targetArray.length, spawnNextBalloon]);

  // Initialize game
  useEffect(() => {
    if (!gameStarted && !gameOver) {
      setGameStarted(true);
      // Spawn first balloon immediately
      setTimeout(() => spawnNextBalloon(), 500);
    }
  }, [gameStarted, gameOver, spawnNextBalloon]);

  const handleKeypadPress = (digit) => {
    if (gameOver || gameWon) return;

    // Find the balloon for the current digit
    const targetBalloon = activeBalloons.find(b => 
      b.digitIndex === currentIndex && b.isActive
    );

    if (!targetBalloon) return;

    if (digit === targetBalloon.expectedDigit) {
      // Correct digit - pop the balloon!
      playSound('pop');
      setShowConfetti(true);
      
      // Remove the popped balloon
      setActiveBalloons(prev => prev.filter(b => b.id !== targetBalloon.id));
      
      // Update progress
      const newPoppedCount = poppedCount + 1;
      setPoppedCount(newPoppedCount);
      
      // Fill in the digit
      const newFilledDigits = [...filledDigits];
      newFilledDigits[currentIndex] = digit;
      setFilledDigits(newFilledDigits);
      
      // Move to next digit
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);

      // Hide confetti after animation
      setTimeout(() => setShowConfetti(false), 1000);

      if (newIndex >= targetArray.length) {
        // Game won!
        setGameWon(true);
        setGameOver(true);
        playSound('win');
        
        // Clear all remaining balloons
        setActiveBalloons([]);
        
        // Save game result
        if (phoneNumberId) {
          const stars = calculateStars(newPoppedCount);
          saveGameResult(
            phoneNumberId, 
            'balloon-pop', 
            stars,
            { balloons_popped: newPoppedCount, perfect_game: true }
          );
          
          setTimeout(() => {
            onGameEnd(stars);
          }, 1500);
        }
      }
    } else {
      // Wrong digit - speed up the specific balloon
      playSound('incorrect');
      
      setActiveBalloons(prev => prev.map(balloon => {
        if (balloon.id === targetBalloon.id) {
          const newIncorrectAttempts = balloon.incorrectAttempts + 1;
          const speedMultiplier = Math.max(0.3, 1 - (newIncorrectAttempts * 0.25));
          
          return {
            ...balloon,
            incorrectAttempts: newIncorrectAttempts,
            riseTime: BALLOON_RISE_TIME * speedMultiplier
          };
        }
        return balloon;
      }));
    }
  };

  const calculateStars = (popped) => {
    if (popped <= 1) return 0;
    if (popped <= 3) return 1;
    if (popped <= 5) return 2;
    if (popped <= 7) return 3;
    if (popped <= 9) return 4;
    return 5; // All 10 popped
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setActiveBalloons([]);
    };
  }, []);

  const renderKeypad = () => {
    const keys = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
      [null, 0, null],
    ];

    return (
      <div className="grid grid-cols-3 gap-4">
        {keys.flat().map((key, index) => (
          <motion.button
            key={index}
            onClick={() => key !== null && handleKeypadPress(key.toString())}
            disabled={key === null || gameOver}
            className={`h-16 rounded-2xl font-bold text-xl transition-all shadow-md hover:shadow-lg ${
              key === null 
                ? 'invisible' 
                : 'bg-gradient-to-br from-white to-gray-50 hover:from-indigo-50 hover:to-indigo-100 text-indigo-800 active:scale-95 disabled:opacity-50'
            }`}
            whileHover={key !== null ? { y: -2, scale: 1.05 } : {}}
            whileTap={key !== null ? { y: 0, scale: 0.95 } : {}}
          >
            {key}
          </motion.button>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen app-container flex flex-col">
      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-20 w-96 h-96 bg-gradient-to-br from-blue-400 to-sky-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="flex-1 flex flex-col relative z-10">
        {/* App Branding Section */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="text-center pt-6 px-6"
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
        <div className="p-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-4"
          >
            <button
              onClick={() => onNavigate('number-selection', { gameMode: 'balloon-pop' })}
              className="p-3 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow text-indigo-600 hover:text-indigo-800"
            >
              <SafeIcon icon={FiArrowLeft} size={20} />
            </button>
            <div className="flex-1 text-center">
              <h2 className="text-2xl font-bold text-indigo-800">Balloon Pop</h2>
              <p className="text-indigo-600">{contactName}</p>
            </div>
            <div className="bg-white px-4 py-2 rounded-xl shadow-md">
              <p className="text-sm text-indigo-600 font-medium">Popped</p>
              <p className="text-xl font-bold text-indigo-800 text-center">{poppedCount}/10</p>
            </div>
          </motion.div>
        </div>

        {/* Game Area - Sky with Multiple Automated Balloons */}
        <div className="flex-1 relative bg-gradient-to-b from-sky-200 via-sky-100 to-sky-50 mx-6 rounded-3xl mb-4 overflow-hidden shadow-lg border-4 border-white border-opacity-50">
          {/* Multiple Balloons Animation */}
          <AnimatePresence>
            {activeBalloons.map((balloon) => (
              <motion.div
                key={balloon.id}
                initial={{ y: '100%', scale: 0.8, opacity: 0 }}
                animate={{ y: '-120%', scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{
                  duration: balloon.riseTime / 1000,
                  ease: 'linear',
                }}
                className="absolute bottom-0"
                style={{ left: `${balloon.horizontalPosition}%`, transform: 'translateX(-50%)' }}
              >
                <div className="relative">
                  {/* Balloon with digit indicator */}
                  <motion.div
                    className="w-20 h-28 rounded-full flex items-center justify-center relative shadow-lg"
                    style={{ backgroundColor: balloon.color }}
                    animate={{
                      y: [0, -5, 0],
                      rotate: [-2, 2, -2],
                      scale: balloon.incorrectAttempts > 0 ? [1, 1.1, 1] : 1
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    {/* Balloon highlight */}
                    <div className="absolute top-2 left-3 w-6 h-8 bg-white bg-opacity-30 rounded-full blur-sm"></div>
                    
                    {/* Optional: Show digit index as small indicator */}
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center text-xs font-bold text-gray-800 shadow-md">
                      {balloon.digitIndex + 1}
                    </div>
                  </motion.div>
                  
                  {/* Balloon string */}
                  <div className="w-0.5 h-8 bg-gray-400 absolute bottom-0 left-1/2 transform -translate-x-1/2"></div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Enhanced Confetti Effect */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(30)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: balloonColors[i % balloonColors.length],
                    left: `${20 + Math.random() * 60}%`,
                    top: `${40 + Math.random() * 20}%`,
                  }}
                  initial={{ scale: 0, y: 0 }}
                  animate={{
                    scale: [0, 1, 0],
                    y: [-30, -80, -120],
                    x: [0, Math.random() * 60 - 30],
                    rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)]
                  }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              ))}
            </div>
          )}

          {/* Game Status Indicator */}
          {activeBalloons.length > 0 && !gameOver && (
            <div className="absolute top-4 left-4 bg-white bg-opacity-80 px-3 py-2 rounded-xl shadow-md">
              <p className="text-sm font-medium text-indigo-800">
                Active Balloons: {activeBalloons.length}
              </p>
              <p className="text-xs text-indigo-600">
                Next: Digit {currentIndex + 1}
              </p>
            </div>
          )}

          {/* Game Over Overlay */}
          {gameOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm mx-4"
              >
                <div className="text-6xl mb-4">
                  {gameWon ? '🎉' : '💔'}
                </div>
                <h2 className="text-2xl font-bold text-indigo-800 mb-2">
                  {gameWon ? 'Perfect Recall!' : 'Game Over'}
                </h2>
                <p className="text-indigo-600 mb-4">
                  You popped {poppedCount} out of 10 balloons!
                </p>
                
                {/* Show the full number */}
                <div className="mb-4 bg-indigo-50 p-3 rounded-xl">
                  <p className="text-sm text-indigo-600 mb-1">The complete number:</p>
                  <p className="text-xl font-mono font-bold text-indigo-800">
                    {targetNumber.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')}
                  </p>
                </div>
                
                {/* Star Rating */}
                <div className="mb-6">
                  <div className="flex justify-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <SafeIcon
                        key={i}
                        icon={FiStar}
                        className={`w-6 h-6 ${
                          i < calculateStars(poppedCount) 
                            ? 'text-yellow-500 fill-current' 
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {calculateStars(poppedCount)} out of 5 stars
                  </p>
                </div>

                <div className="flex gap-3">
                  <motion.button
                    onClick={() => onNavigate('number-selection', { gameMode: 'balloon-pop' })}
                    className="flex-1 bg-gradient-to-br from-gray-100 to-gray-200 text-indigo-700 py-3 rounded-2xl font-semibold hover:shadow-md transition-all"
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
        </div>

        {/* Phone Number Visual Display */}
        <div className="mx-6 mb-4">
          <div className="bg-white p-4 rounded-2xl shadow-md">
            <div className="flex justify-center items-center gap-1 font-mono text-xl">
              {formattedDigitsDisplay.map((digit, index) => (
                <div 
                  key={index} 
                  className={`w-8 h-10 flex items-center justify-center ${
                    digit === '-' 
                      ? 'px-1' 
                      : digit 
                        ? 'bg-indigo-500 text-white rounded-lg shadow-md' 
                        : 'border-b-2 border-gray-400'
                  }`}
                >
                  {digit}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Keypad - Fixed at bottom */}
        <div className="p-6 bg-white shadow-lg rounded-t-3xl">
          {renderKeypad()}
        </div>
      </div>
    </div>
  );
};

export default BalloonPop;