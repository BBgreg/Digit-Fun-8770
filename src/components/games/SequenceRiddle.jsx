import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound } from '../../utils/formatters';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiArrowLeft, FiDelete, FiCheck, FiStar } = FiIcons;

const SequenceRiddle = ({ onNavigate, onGameEnd, targetNumber, contactName }) => {
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState(Array(10).fill(''));
  const [selectedBoxIndex, setSelectedBoxIndex] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const maxGuesses = 5;
  const targetArray = targetNumber.split('');

  // Auto-fill green digits from previous guess
  useEffect(() => {
    if (guesses.length > 0 && guesses.length < maxGuesses) {
      const lastGuess = guesses[guesses.length - 1];
      const newCurrentGuess = [...currentGuess];
      
      lastGuess.feedback.forEach((feedback, index) => {
        if (feedback === 'correct') {
          newCurrentGuess[index] = lastGuess.guess[index];
        }
      });
      
      setCurrentGuess(newCurrentGuess);
      
      // Set selected box to first empty box
      const firstEmptyIndex = newCurrentGuess.findIndex(digit => digit === '');
      setSelectedBoxIndex(firstEmptyIndex !== -1 ? firstEmptyIndex : 0);
    }
  }, [guesses]);

  const getDigitFeedback = (guess, target) => {
    const feedback = [];
    const targetCounts = {};
    const guessCounts = {};

    // Count occurrences
    target.forEach(digit => {
      targetCounts[digit] = (targetCounts[digit] || 0) + 1;
    });
    
    guess.forEach(digit => {
      guessCounts[digit] = (guessCounts[digit] || 0) + 1;
    });

    // First pass: mark correct positions
    for (let i = 0; i < guess.length; i++) {
      if (guess[i] === target[i]) {
        feedback[i] = 'correct';
        targetCounts[guess[i]]--;
      }
    }

    // Second pass: mark wrong positions
    for (let i = 0; i < guess.length; i++) {
      if (feedback[i] === undefined) {
        if (targetCounts[guess[i]] > 0) {
          feedback[i] = 'wrong-position';
          targetCounts[guess[i]]--;
        } else {
          feedback[i] = 'not-in-target';
        }
      }
    }

    return feedback;
  };

  const handleNumberInput = (digit) => {
    if (gameOver || isRowComplete()) return;
    
    const newGuess = [...currentGuess];
    newGuess[selectedBoxIndex] = digit;
    setCurrentGuess(newGuess);
    
    // Auto-advance to next empty box
    const nextEmptyIndex = newGuess.findIndex((val, idx) => val === '' && idx > selectedBoxIndex);
    if (nextEmptyIndex !== -1) {
      setSelectedBoxIndex(nextEmptyIndex);
    }
  };

  const handleBoxClick = (index) => {
    if (!gameOver) {
      setSelectedBoxIndex(index);
    }
  };

  const handleBackspace = () => {
    if (gameOver) return;
    
    const newGuess = [...currentGuess];
    
    // If selected box has a value, clear it
    if (newGuess[selectedBoxIndex] !== '') {
      newGuess[selectedBoxIndex] = '';
    } 
    // Otherwise, move to previous box and clear it
    else if (selectedBoxIndex > 0) {
      const newIndex = selectedBoxIndex - 1;
      setSelectedBoxIndex(newIndex);
      newGuess[newIndex] = '';
    }
    
    setCurrentGuess(newGuess);
  };

  const isRowComplete = () => {
    return currentGuess.every(digit => digit !== '');
  };

  const handleSubmit = () => {
    if (!isRowComplete() || gameOver) return;
    
    const guessString = currentGuess.join('');
    const feedback = getDigitFeedback(currentGuess, targetArray);
    
    const newGuess = {
      guess: currentGuess,
      feedback,
    };
    
    const newGuesses = [...guesses, newGuess];
    setGuesses(newGuesses);
    
    const isCorrect = feedback.every(f => f === 'correct');
    
    if (isCorrect) {
      setWon(true);
      setGameOver(true);
      playSound('win');
      setTimeout(() => {
        const stars = Math.max(1, 6 - newGuesses.length);
        onGameEnd(stars);
      }, 1000);
    } else if (newGuesses.length >= maxGuesses) {
      setGameOver(true);
      playSound('gameOver');
      setTimeout(() => {
        setShowResult(true);
      }, 1000);
    } else {
      playSound('incorrect');
    }
    
    // Reset current guess for next row (auto-fill will happen in useEffect)
    setCurrentGuess(Array(10).fill(''));
  };

  const getFeedbackColor = (feedback) => {
    switch (feedback) {
      case 'correct':
        return 'bg-gradient-to-br from-green-400 to-green-600 text-white ring-2 ring-green-300';
      case 'wrong-position':
        return 'bg-gradient-to-br from-yellow-300 to-amber-500 text-white ring-2 ring-yellow-200';
      default:
        return 'bg-gray-200 text-gray-700';
    }
  };

  const getStars = () => {
    if (!won) return 0;
    return Math.max(1, 6 - guesses.length);
  };

  const renderStars = (count) => {
    return (
      <div className="flex justify-center gap-1">
        {[...Array(5)].map((_, i) => (
          <SafeIcon 
            key={i} 
            icon={FiStar} 
            className={`w-6 h-6 ${i < count ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} 
          />
        ))}
      </div>
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
      
      <div className="max-w-2xl mx-auto p-6 relative z-10">
        {/* App Branding Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-8"
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

        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <button 
            onClick={() => onNavigate('number-selection', { gameMode: 'sequence-riddle' })}
            className="p-3 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow text-indigo-600 hover:text-indigo-800"
          >
            <SafeIcon icon={FiArrowLeft} size={20} />
          </button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-indigo-800">{contactName}</h2>
            <p className="text-indigo-600">Sequence Riddle: Guess the 10-digit number</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl shadow-md">
            <p className="text-sm text-indigo-600 font-medium">Guess</p>
            <p className="text-xl font-bold text-indigo-800 text-center">{guesses.length}/{maxGuesses}</p>
          </div>
        </motion.div>

        {/* Game Grid */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-3xl shadow-lg mb-6 glass-effect"
        >
          <div className="space-y-3 mb-2">
            {/* Previous guesses */}
            {guesses.map((guess, rowIndex) => (
              <div key={rowIndex} className="flex gap-2 justify-center">
                {guess.guess.map((digit, colIndex) => (
                  <div
                    key={colIndex}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg ${getFeedbackColor(guess.feedback[colIndex])}`}
                  >
                    {digit}
                  </div>
                ))}
              </div>
            ))}

            {/* Current guess row */}
            {!gameOver && guesses.length < maxGuesses && (
              <div className="flex gap-2 justify-center">
                {currentGuess.map((digit, index) => (
                  <div
                    key={index}
                    onClick={() => handleBoxClick(index)}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg cursor-pointer 
                      ${selectedBoxIndex === index 
                        ? 'bg-indigo-100 border-2 border-indigo-500' 
                        : digit 
                          ? 'bg-white border-2 border-indigo-300' 
                          : 'bg-gray-100 border-2 border-gray-200'}`}
                  >
                    {digit}
                  </div>
                ))}
              </div>
            )}

            {/* Empty rows */}
            {[...Array(Math.max(0, maxGuesses - guesses.length - (gameOver ? 0 : 1)))].map((_, index) => (
              <div key={index} className="flex gap-2 justify-center">
                {[...Array(10)].map((_, colIndex) => (
                  <div 
                    key={colIndex} 
                    className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-200"
                  />
                ))}
              </div>
            ))}
          </div>

          <p className="text-center text-indigo-500 text-sm font-medium mt-4">
            {!gameOver && guesses.length < maxGuesses ? 
              "Tap a box to edit, or use the keypad below" : 
              won ? "Great job! You solved it!" : "Better luck next time!"}
          </p>
        </motion.div>

        {/* Keypad */}
        {!gameOver && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-3xl shadow-lg glass-effect"
          >
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <motion.button
                  key={digit}
                  onClick={() => handleNumberInput(digit.toString())}
                  className="h-16 bg-gradient-to-br from-gray-50 to-gray-100 hover:from-indigo-50 hover:to-indigo-100 
                    text-indigo-800 rounded-2xl font-semibold text-2xl transition-colors shadow-md hover:shadow-lg"
                  whileHover={{ y: -2, scale: 1.05 }}
                  whileTap={{ y: 0, scale: 0.95 }}
                >
                  {digit}
                </motion.button>
              ))}
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <motion.button
                onClick={handleBackspace}
                className="h-16 bg-gradient-to-br from-red-50 to-red-100 text-red-600 rounded-2xl font-semibold transition-colors 
                  flex items-center justify-center shadow-md hover:shadow-lg"
                whileHover={{ y: -2, scale: 1.05 }}
                whileTap={{ y: 0, scale: 0.95 }}
              >
                <SafeIcon icon={FiDelete} size={24} />
              </motion.button>
              
              <motion.button
                onClick={() => handleNumberInput('0')}
                className="h-16 bg-gradient-to-br from-gray-50 to-gray-100 hover:from-indigo-50 hover:to-indigo-100 
                  text-indigo-800 rounded-2xl font-semibold text-2xl transition-colors shadow-md hover:shadow-lg"
                whileHover={{ y: -2, scale: 1.05 }}
                whileTap={{ y: 0, scale: 0.95 }}
              >
                0
              </motion.button>
              
              <motion.button
                onClick={handleSubmit}
                disabled={!isRowComplete()}
                className="h-16 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 
                  disabled:from-gray-300 disabled:to-gray-400 text-white rounded-2xl font-semibold text-lg transition-colors 
                  flex items-center justify-center shadow-md hover:shadow-lg disabled:cursor-not-allowed"
                whileHover={isRowComplete() ? { y: -2, scale: 1.05 } : {}}
                whileTap={isRowComplete() ? { y: 0, scale: 0.95 } : {}}
              >
                <SafeIcon icon={FiCheck} size={24} />
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 bg-white bg-opacity-80 p-4 rounded-2xl shadow-sm"
        >
          <div className="flex justify-around items-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-green-600 rounded-lg"></div>
              <span>Correct spot</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-yellow-300 to-amber-500 rounded-lg"></div>
              <span>Wrong spot</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-200 rounded-lg"></div>
              <span>Not in number</span>
            </div>
          </div>
        </motion.div>

        {/* Result Modal */}
        <AnimatePresence>
          {(won || showResult) && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            >
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center glass-effect"
              >
                <div className="relative mb-6">
                  {won ? (
                    <motion.div 
                      className="text-7xl mb-4"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", damping: 10 }}
                    >
                      🎉
                    </motion.div>
                  ) : (
                    <motion.div 
                      className="text-7xl mb-4"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 10 }}
                    >
                      😔
                    </motion.div>
                  )}
                  
                  <h2 className="text-3xl font-bold text-indigo-800 mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {won ? 'Congratulations!' : 'Game Over'}
                  </h2>
                  
                  <p className="text-indigo-600 mb-4">
                    {won 
                      ? `You guessed it in ${guesses.length} ${guesses.length === 1 ? 'try' : 'tries'}!` 
                      : 'Better luck next time!'}
                  </p>
                  
                  {won && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      {renderStars(getStars())}
                    </motion.div>
                  )}
                </div>

                <div className="mb-6 bg-indigo-50 p-4 rounded-2xl">
                  <p className="text-sm text-indigo-600 mb-2">The correct number was:</p>
                  <div className="flex justify-center gap-1 mb-2">
                    {targetArray.map((digit, index) => (
                      <div
                        key={index}
                        className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 
                          rounded-lg flex items-center justify-center font-bold text-white"
                      >
                        {digit}
                      </div>
                    ))}
                  </div>
                  <p className="text-lg font-mono font-bold text-indigo-800">
                    {targetNumber.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')}
                  </p>
                </div>

                <div className="flex gap-3">
                  <motion.button
                    onClick={() => onNavigate('number-selection', { gameMode: 'sequence-riddle' })}
                    className="flex-1 bg-gradient-to-br from-gray-100 to-gray-200 text-indigo-700 py-3 px-4 rounded-2xl 
                      font-semibold hover:shadow-md transition-all"
                    whileHover={{ y: -2 }}
                    whileTap={{ y: 0 }}
                  >
                    Play Again
                  </motion.button>
                  
                  <motion.button
                    onClick={() => onNavigate('dashboard')}
                    className="flex-1 bg-gradient-to-br from-indigo-500 to-purple-600 text-white py-3 px-4 rounded-2xl 
                      font-semibold hover:shadow-lg transition-all"
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

export default SequenceRiddle;