import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound } from '../../utils/formatters';
import { useGameProgress } from '../../hooks/useGameProgress';
import { useAuth } from '../../contexts/AuthContext';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import Confetti from '../ui/Confetti';
import supabase from '../../lib/supabase';

const { FiArrowLeft, FiClock, FiCheck, FiX, FiStar, FiPlay } = FiIcons;

// FINAL FIX: Added onGameEnd to the component's props
const OddOneOut = ({ onNavigate, phoneNumberId, onGameEnd }) => {
  // Game states
  const [isPreGame, setIsPreGame] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [displayedNumbers, setDisplayedNumbers] = useState([]);
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [stars, setStars] = useState(0);
  const [incorrectSubmission, setIncorrectSubmission] = useState(false);
  const [userPhoneNumbers, setUserPhoneNumbers] = useState([]);
  
  const timerRef = useRef(null);
  const { saveGameResult } = useGameProgress();
  const { user } = useAuth();

  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Format phone number for display
  const formatPhoneNumber = (number) => {
    if (!number) return '';
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return cleaned;
  };

  // Calculate stars based on time
  const calculateStars = (time) => {
    if (time < 10) return 5;
    if (time < 15) return 4;
    if (time < 25) return 3;
    if (time < 35) return 2;
    if (time < 45) return 1;
    return 0;
  };

  // Generate a fake phone number
  const generateFakeNumber = (realNumber, existingNumbers) => {
    const digits = realNumber.split('');
    let fakeNumber;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      const fakeDigits = [...digits];
      const alterationType = Math.random() > 0.5 ? 'change' : 'swap';
      
      if (alterationType === 'change') {
        const numChanges = Math.random() > 0.5 ? 1 : 2;
        for (let i = 0; i < numChanges; i++) {
          const randomIndex = Math.floor(Math.random() * 10);
          const currentDigit = parseInt(fakeDigits[randomIndex]);
          let newDigit;
          do {
            newDigit = Math.floor(Math.random() * 10).toString();
          } while (newDigit === currentDigit.toString());
          fakeDigits[randomIndex] = newDigit;
        }
      } else {
        const randomIndex = Math.floor(Math.random() * 9);
        [fakeDigits[randomIndex], fakeDigits[randomIndex + 1]] = [fakeDigits[randomIndex + 1], fakeDigits[randomIndex]];
      }
      
      fakeNumber = fakeDigits.join('');
      attempts++;
      
    } while (
      (existingNumbers.includes(fakeNumber) || userPhoneNumbers.some(pn => pn.phone_number_digits === fakeNumber)) && 
      attempts < maxAttempts
    );

    return fakeNumber;
  };

  // Generate numbers for the game
  const generateGameNumbers = () => {
    if (userPhoneNumbers.length === 0) {
      setError("No phone numbers available to play with");
      return [];
    }

    const maxRealNumbers = Math.min(7, userPhoneNumbers.length);
    const numRealNumbers = Math.max(2, Math.floor(Math.random() * (maxRealNumbers - 1)) + 2);
    
    const shuffledRealNumbers = [...userPhoneNumbers].sort(() => 0.5 - Math.random());
    const selectedRealNumbers = shuffledRealNumbers.slice(0, numRealNumbers);
    
    const numFakeNumbers = 10 - numRealNumbers;
    const fakeNumbers = [];
    const allNumbers = selectedRealNumbers.map(pn => pn.phone_number_digits);
    
    for (let i = 0; i < numFakeNumbers; i++) {
      const baseRealNumber = selectedRealNumbers[Math.floor(Math.random() * numRealNumbers)].phone_number_digits;
      const fakeNumber = generateFakeNumber(baseRealNumber, [...allNumbers, ...fakeNumbers]);
      fakeNumbers.push(fakeNumber);
    }
    
    const gameNumbers = [
      ...selectedRealNumbers.map(pn => ({
        id: pn.id,
        digits: pn.phone_number_digits,
        contactName: pn.contact_name,
        isReal: true
      })),
      ...fakeNumbers.map((digits, index) => ({
        id: `fake-${index}`,
        digits,
        contactName: null,
        isReal: false
      }))
    ];
    
    return gameNumbers.sort(() => 0.5 - Math.random());
  };

  // Fetch phone numbers
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
      
      setUserPhoneNumbers(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching phone numbers:', err);
      setError('Failed to retrieve your phone numbers. Please try again.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhoneNumbers();
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [user]);

  const startGame = () => {
    setIsPreGame(false);
    setGameStarted(true);
    
    const generatedNumbers = generateGameNumbers();
    setDisplayedNumbers(generatedNumbers);
    
    const now = Date.now();
    setStartTime(now);
    timerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - now) / 1000));
    }, 1000);
  };

  const toggleNumberSelection = (number) => {
    if (gameComplete) return;
    
    setSelectedNumbers(prev => {
      const isSelected = prev.some(n => n.id === number.id);
      
      if (isSelected) {
        return prev.filter(n => n.id !== number.id);
      } else {
        return [...prev, number];
      }
    });
    
    if (incorrectSubmission) {
      setIncorrectSubmission(false);
    }
  };

  const handleSubmit = () => {
    if (gameComplete || selectedNumbers.length === 0) return;
    
    const allFakeSelected = displayedNumbers
      .filter(n => !n.isReal)
      .every(fakeNumber => selectedNumbers.some(selected => selected.id === fakeNumber.id));
      
    const noRealSelected = selectedNumbers
      .every(selected => displayedNumbers.find(n => n.id === selected.id && !n.isReal));
    
    if (allFakeSelected && noRealSelected) {
      // Correct submission
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      const finalTime = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(finalTime);
      setGameComplete(true);
      setShowConfetti(true);
      playSound('win');
      
      const earnedStars = calculateStars(finalTime);
      setStars(earnedStars);
      
      const realNumberIds = displayedNumbers
        .filter(n => n.isReal)
        .map(n => n.id);
        
      realNumberIds.forEach(id => {
        saveGameResult(
          id,
          'odd-one-out',
          earnedStars,
          {
            time_taken: finalTime,
            num_real_numbers: displayedNumbers.filter(n => n.isReal).length,
            num_fake_numbers: displayedNumbers.filter(n => !n.isReal).length
          }
        );
      });

      // Call onGameEnd to update usage
      if (onGameEnd) {
        setTimeout(() => {
            onGameEnd(earnedStars, { time_taken: finalTime });
        }, 2000);
      }

    } else {
      // Incorrect submission
      setIncorrectSubmission(true);
      playSound('incorrect');
      
      setTimeout(() => {
        setIncorrectSubmission(false);
      }, 1000);
    }
  };

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
          className="flex items-center justify-between mb-8"
        >
          <button
            onClick={() => onNavigate('dashboard')}
            className="p-3 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow text-indigo-600 hover:text-indigo-800"
          >
            <SafeIcon icon={FiArrowLeft} size={20} />
          </button>
          
          <div className="text-center">
            <h2 className="text-2xl font-bold text-indigo-800">Odd One Out</h2>
            <p className="text-indigo-600">Find the fake numbers!</p>
          </div>
          
          <div className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 px-4 py-2 rounded-xl shadow-md text-white">
            <SafeIcon icon={FiClock} className="text-white" />
            <span className="font-bold">{formatTime(elapsedTime)}</span>
          </div>
        </motion.div>
        
        {isPreGame && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white bg-opacity-90 backdrop-filter backdrop-blur-sm p-8 rounded-3xl shadow-xl text-center"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <SafeIcon icon={FiPlay} size={36} className="text-white" />
            </div>
            
            <h2 className="text-3xl font-bold text-indigo-800 mb-4">Odd One Out Challenge</h2>
            
            <div className="mb-8 text-left">
              <p className="text-indigo-700 mb-4">
                Find the fake phone numbers that don't belong to your saved contacts!
              </p>
              
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <SafeIcon icon={FiCheck} size={14} className="text-green-600" />
                  </div>
                  <span>Some numbers are your actual saved numbers</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <SafeIcon icon={FiX} size={14} className="text-red-600" />
                  </div>
                  <span>Others are fake with 1-2 digits changed</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <SafeIcon icon={FiClock} size={14} className="text-indigo-600" />
                  </div>
                  <span>Select all fake numbers as quickly as possible</span>
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
        
        {gameStarted && !isPreGame && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
          >
            <motion.div
              className={`w-full bg-white p-6 rounded-3xl shadow-lg mb-6 ${
                incorrectSubmission ? 'animate-shake' : ''
              }`}
              animate={incorrectSubmission ? { x: [-10, 10, -10, 10, 0] } : {}}
              transition={{ duration: 0.4 }}
            >
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-indigo-800 mb-1">
                  Find the "Odd Ones Out"
                </h3>
                <p className="text-indigo-600 text-sm">
                  Select all the fake numbers that aren't in your saved contacts
                </p>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {displayedNumbers.map((number) => (
                  <motion.div
                    key={number.id}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      selectedNumbers.some(n => n.id === number.id)
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                    } ${
                      gameComplete && !number.isReal
                        ? 'border-red-500 bg-red-50'
                        : gameComplete && number.isReal
                        ? 'border-green-500 bg-green-50'
                        : ''
                    }`}
                    onClick={() => toggleNumberSelection(number)}
                    whileHover={gameComplete ? {} : { scale: 1.02 }}
                    whileTap={gameComplete ? {} : { scale: 0.98 }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-mono font-bold text-gray-800">
                          {formatPhoneNumber(number.digits)}
                        </p>
                        {gameComplete && (
                          <p className="text-sm mt-1">
                            {number.isReal ? (
                              <span className="text-green-600 flex items-center gap-1">
                                <SafeIcon icon={FiCheck} size={14} />
                                Real - {number.contactName}
                              </span>
                            ) : (
                              <span className="text-red-600 flex items-center gap-1">
                                <SafeIcon icon={FiX} size={14} />
                                Fake number
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                      
                      {selectedNumbers.some(n => n.id === number.id) && !gameComplete && (
                        <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                          <SafeIcon icon={FiCheck} size={14} className="text-white" />
                        </div>
                      )}
                      
                      {gameComplete && (
                        <div className={`w-6 h-6 ${
                          number.isReal ? 'bg-green-500' : 'bg-red-500'
                        } rounded-full flex items-center justify-center`}>
                          <SafeIcon 
                            icon={number.isReal ? FiCheck : FiX} 
                            size={14} 
                            className="text-white" 
                          />
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            
            {!gameComplete ? (
              <motion.button
                onClick={handleSubmit}
                disabled={selectedNumbers.length === 0}
                className={`bg-gradient-to-br from-indigo-500 to-purple-600 text-white px-8 py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                whileHover={selectedNumbers.length === 0 ? {} : { y: -2, scale: 1.05 }}
                whileTap={selectedNumbers.length === 0 ? {} : { y: 0, scale: 0.95 }}
              >
                <SafeIcon icon={FiCheck} size={20} />
                Submit Selection
              </motion.button>
            ) : (
              <div className="text-center">
                <div className="mb-4">
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
                  <p className="text-lg text-indigo-800 mt-1">
                    Time: {formatTime(elapsedTime)}
                  </p>
                </div>
                
                <div className="flex gap-4 justify-center">
                  <motion.button
                    onClick={() => onNavigate('dashboard')}
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
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

// There was a typo here, it should be OddOneOut
export default OddOneOut;