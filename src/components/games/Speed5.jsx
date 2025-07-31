import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound } from '../../utils/formatters';
import { useGameProgress } from '../../hooks/useGameProgress';
import { useAuth } from '../../contexts/AuthContext';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import Confetti from '../ui/Confetti';
import supabase from '../../lib/supabase';

const { FiArrowLeft, FiClock, FiCheck, FiStar } = FiIcons;

// FINAL FIX: Added onGameEnd to the component's props
const Speed5 = ({ onNavigate, phoneNumbers: propPhoneNumbers, onGameEnd }) => {
  // Game state
  const [gameStarted, setGameStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [gameComplete, setGameComplete] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [shakeInput, setShakeInput] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [stars, setStars] = useState(0);
  const [currentNumber, setCurrentNumber] = useState(null);
  const [error, setError] = useState(null);
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const timerRef = useRef(null);
  const { saveGameResult } = useGameProgress();
  const { user } = useAuth();

  // Fetch phone numbers and auto-start game
  useEffect(() => {
    const fetchPhoneNumbersAndStartGame = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        if (!user || !user.id) {
          console.error('No authenticated user found');
          setError('You must be logged in to play this game');
          setIsLoading(false);
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
        
        console.log('Fetched phone numbers:', data ? data.length : 0);
        
        if (!data || data.length === 0) {
          setError('No phone numbers available. Please add some numbers first.');
          setIsLoading(false);
          return;
        }

        setPhoneNumbers(data);

        console.log('Auto-starting game with phone numbers:', data.length);
        
        let selected = [];
        let numbersPool = [...data];
        
        while (selected.length < 5) {
          if (numbersPool.length === 0) {
            numbersPool = [...data];
          }
          
          const randomIndex = Math.floor(Math.random() * numbersPool.length);
          const selectedNumber = numbersPool[randomIndex];
          
          selected.push({
            id: selectedNumber.id,
            contactName: selectedNumber.contact_name,
            phoneNumber: selectedNumber.phone_number_digits,
          });
          
          numbersPool.splice(randomIndex, 1);
        }

        console.log('Selected numbers for game:', selected.length);
        setSelectedNumbers(selected);

        setGameStarted(true);
        setCurrentNumber(selected[0]);
        console.log('First challenge set:', selected[0]);
        
        const now = Date.now();
        setStartTime(now);
        timerRef.current = setInterval(() => {
          setElapsedTime(Math.floor((Date.now() - now) / 1000));
        }, 1000);

        setIsLoading(false);
        
      } catch (err) {
        console.error('Error in fetchPhoneNumbersAndStartGame:', err);
        setError('Failed to retrieve your phone numbers. Please try again.');
        setIsLoading(false);
      }
    };

    if (user) {
      fetchPhoneNumbersAndStartGame();
    }
  }, [user]);

  const calculateStars = (time) => {
    if (time <= 20) return 5;
    if (time <= 30) return 4;
    if (time <= 45) return 3;
    if (time <= 60) return 2;
    return 1;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleInputChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      setInputValue(value);
    }
  };

  const handleKeypadPress = (digit) => {
    if (inputValue.length < 10) {
      setInputValue(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    setInputValue(prev => prev.slice(0, -1));
  };

  const handleSubmit = () => {
    if (!inputValue || inputValue.length !== 10 || !currentNumber) return;
    
    console.log('Checking number for:', currentNumber.contactName);
    console.log('Input:', inputValue);
    console.log('Expected:', currentNumber.phoneNumber);

    if (inputValue === currentNumber.phoneNumber) {
      playSound('correct');
      
      if (currentIndex < selectedNumbers.length - 1) {
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        setCurrentNumber(selectedNumbers[nextIndex]);
        setInputValue('');
        
        console.log('Moving to next contact:', selectedNumbers[nextIndex].contactName);
      } else {
        handleGameComplete();
      }
    } else {
      playSound('incorrect');
      setShakeInput(true);
      setTimeout(() => setShakeInput(false), 500);
    }
  };

  const handleGameComplete = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const finalTime = Math.floor((Date.now() - startTime) / 1000);
    setElapsedTime(finalTime);
    setGameComplete(true);
    setShowConfetti(true);

    const earnedStars = calculateStars(finalTime);
    setStars(earnedStars);

    selectedNumbers.forEach(number => {
      saveGameResult(
        number.id,
        'speed-5',
        earnedStars,
        { time_taken: finalTime }
      );
    });

    setTimeout(() => {
      if (onGameEnd) {
        onGameEnd(earnedStars, { time_taken: finalTime });
      } else {
        setTimeout(() => {
          onNavigate('dashboard');
        }, 3000);
      }
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const formatPhoneNumber = (number) => {
    if (!number) return '';
    
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return cleaned;
  };

  const renderKeypad = () => {
    const keys = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
      ['backspace', 0, 'submit']
    ];

    return (
      <div className="grid grid-cols-3 gap-4">
        {keys.flat().map((key, index) => {
          if (key === 'backspace') {
            return (
              <motion.button
                key="backspace"
                onClick={handleBackspace}
                className="h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 font-bold shadow-md hover:shadow-lg"
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
              >
                <SafeIcon icon={FiIcons.FiDelete} size={24} />
              </motion.button>
            );
          } else if (key === 'submit') {
            return (
              <motion.button
                key="submit"
                onClick={handleSubmit}
                disabled={inputValue.length !== 10}
                className={`h-16 ${
                  inputValue.length === 10
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                    : 'bg-gray-200 text-gray-400'
                } rounded-2xl flex items-center justify-center font-bold shadow-md hover:shadow-lg disabled:cursor-not-allowed`}
                whileHover={inputValue.length === 10 ? { y: -2 } : {}}
                whileTap={inputValue.length === 10 ? { y: 0 } : {}}
              >
                <SafeIcon icon={FiCheck} size={24} />
              </motion.button>
            );
          } else {
            return (
              <motion.button
                key={key}
                onClick={() => handleKeypadPress(key.toString())}
                className="h-16 bg-white rounded-2xl flex items-center justify-center text-indigo-800 text-2xl font-bold shadow-md hover:shadow-lg"
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
              >
                {key}
              </motion.button>
            );
          }
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 app-container">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-0 left-20 w-96 h-96 bg-gradient-to-br from-blue-400 to-sky-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="text-center relative z-10">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mb-4 mx-auto"></div>
          <h2 className="text-2xl font-bold text-indigo-800 mb-2">Starting Speed 5 Challenge</h2>
          <p className="text-indigo-600">Fetching your saved phone numbers and preparing the game...</p>
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen app-container">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-20 w-96 h-96 bg-gradient-to-br from-blue-400 to-sky-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {showConfetti && <Confetti />}

      <div className="relative z-10 max-w-4xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <button
            onClick={() => onNavigate('number-selection', { gameMode: 'speed-5' })}
            className="p-3 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow text-indigo-600 hover:text-indigo-800"
          >
            <SafeIcon icon={FiArrowLeft} size={20} />
          </button>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-indigo-800">Speed 5 Challenge</h2>
            <p className="text-indigo-600">Type 5 numbers as fast as you can</p>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-md">
            <SafeIcon icon={FiClock} className="text-indigo-600" />
            <span className="text-indigo-800 font-bold">{formatTime(elapsedTime)}</span>
          </div>
        </motion.div>

        {gameStarted && !gameComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentNumber?.contactName}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
                className="bg-white bg-opacity-80 backdrop-filter backdrop-blur-sm py-4 px-6 rounded-2xl shadow-md mx-auto text-center mb-6 w-full"
              >
                <h3 className="text-3xl font-bold text-indigo-800">
                  {currentNumber ? `${currentNumber.contactName}'s Number` : 'Loading...'}
                </h3>
                <p className="text-indigo-600 mt-1">
                  Type the 10-digit phone number from memory
                </p>
              </motion.div>
            </AnimatePresence>

            <motion.div
              className={`w-full bg-white p-6 rounded-3xl shadow-lg mb-8 ${
                shakeInput ? 'animate-shake' : ''
              }`}
              animate={shakeInput ? { x: [-10, 10, -10, 10, 0] } : {}}
              transition={{ duration: 0.4 }}
            >
              <div className="relative">
                <input
                  type="text"
                  value={formatPhoneNumber(inputValue)}
                  onChange={handleInputChange}
                  placeholder="(000) 000-0000"
                  className="w-full text-center py-4 text-3xl font-mono font-bold text-indigo-800 bg-transparent border-b-2 border-indigo-300 focus:border-indigo-600 focus:outline-none"
                  readOnly
                />
              </div>
              <div className="flex justify-center mt-4">
                <div className="bg-indigo-100 h-2 rounded-full" style={{ width: `${inputValue.length * 10}%` }}></div>
              </div>
            </motion.div>

            <div className="w-full bg-white p-6 rounded-3xl shadow-lg">
              {renderKeypad()}
            </div>

            <div className="mt-6 flex items-center justify-center gap-2">
              {selectedNumbers.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full ${
                    index === currentIndex
                      ? 'bg-indigo-600'
                      : index < currentIndex
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`}
                ></div>
              ))}
            </div>
          </motion.div>
        )}

        {gameComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="text-7xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-indigo-800 mb-2">Challenge Complete!</h2>
            <p className="text-indigo-600 mb-6">
              You completed all 5 numbers in {formatTime(elapsedTime)}!
            </p>

            <div className="mb-8">
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

            <div className="flex gap-4 justify-center">
              <motion.button
                onClick={() => onNavigate('number-selection', { gameMode: 'speed-5' })}
                className="bg-gray-100 text-indigo-700 px-6 py-3 rounded-2xl font-semibold hover:bg-gray-200 transition-all"
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
              >
                Play Again
              </motion.button>
              <motion.button
                onClick={() => onNavigate('dashboard')}
                className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-2xl font-semibold hover:shadow-lg transition-all"
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
              >
                Done
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Speed5;
