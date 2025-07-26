import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { usePhoneNumbers } from '../../hooks/usePhoneNumbers';
import GameAccessControl from './GameAccessControl';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiArrowLeft, FiShuffle, FiPlay } = FiIcons;

const NumberSelection = ({ onNavigate, gameMode }) => {
  const { phoneNumbers } = usePhoneNumbers();
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [useRandom, setUseRandom] = useState(false);

  const handleStartGame = async () => {
    let targetNumber, contactName, phoneNumberId;

    // For Speed 5, Odd One Out, and Word Search, we don't need to select a number here
    if (gameMode === 'speed-5' || gameMode === 'odd-one-out' || gameMode === 'word-search') {
      onNavigate('game-play', { gameMode, phoneNumbers });
      return;
    }

    if (useRandom) {
      // Randomly select a number from user's saved numbers
      const randomIndex = Math.floor(Math.random() * phoneNumbers.length);
      const randomNumber = phoneNumbers[randomIndex];
      targetNumber = randomNumber.phone_number_digits;
      contactName = 'Mystery Number'; // Hide the actual contact name
      phoneNumberId = randomNumber.id;
    } else {
      targetNumber = selectedNumber.phone_number_digits;
      contactName = selectedNumber.contact_name;
      phoneNumberId = selectedNumber.id;
    }

    onNavigate('game-play', { gameMode, targetNumber, contactName, phoneNumberId });
  };

  const gameModeNames = {
    'sequence-riddle': 'Sequence Riddle',
    'speed-5': 'Speed 5',
    'word-search': 'Word Search',
    'odd-one-out': 'Odd One Out',
  };

  return (
    <GameAccessControl gameMode={gameMode} onGameStart={handleStartGame}>
      <div className="min-h-screen app-container">
        {/* Animated background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-0 left-20 w-96 h-96 bg-gradient-to-br from-blue-400 to-sky-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        <div className="max-w-4xl mx-auto p-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-8"
          >
            <button
              onClick={() => onNavigate('dashboard')}
              className="p-3 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow text-indigo-600 hover:text-indigo-800"
            >
              <SafeIcon icon={FiArrowLeft} size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-indigo-800">
                {gameModeNames[gameMode]}
              </h1>
              <p className="text-indigo-600 mt-1">
                {gameMode === 'speed-5' ? 'Get ready to type 5 numbers as fast as you can' :
                 gameMode === 'odd-one-out' ? 'Find the fake numbers that don\'t belong in your contacts' :
                 gameMode === 'word-search' ? 'Find hidden phone numbers in a grid of digits' :
                 'Choose a number to practice with'}
              </p>
            </div>
          </motion.div>

          {gameMode === 'speed-5' || gameMode === 'odd-one-out' || gameMode === 'word-search' ? (
            // Speed 5, Odd One Out, and Word Search don't need number selection, just start button
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className={`w-24 h-24 ${
                gameMode === 'odd-one-out' ? 'bg-gradient-to-br from-orange-500 to-red-500' :
                gameMode === 'word-search' ? 'bg-gradient-to-br from-green-500 to-emerald-500' :
                'bg-gradient-to-br from-blue-500 to-cyan-500'
              } rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg`}>
                <SafeIcon icon={FiPlay} size={40} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-indigo-800 mb-4">
                {gameMode === 'odd-one-out' ? 'Odd One Out Challenge' :
                 gameMode === 'word-search' ? 'Word Search Challenge' :
                 'Speed 5 Challenge'}
              </h2>
              <p className="text-indigo-600 mb-8 max-w-md mx-auto">
                {gameMode === 'odd-one-out' ? 'Find the fake numbers that don\'t match your saved contacts. Test your memory and attention to detail!' :
                 gameMode === 'word-search' ? 'Find your phone numbers hidden in a grid of digits. Connect adjacent digits to form complete numbers!' :
                 'You\'ll be presented with 5 of your saved contacts. Type their numbers as fast as you can to earn stars!'}
              </p>
              <motion.button
                onClick={handleStartGame}
                disabled={phoneNumbers.length === 0}
                className="bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 text-white px-8 py-4 rounded-2xl font-semibold transition-all disabled:cursor-not-allowed flex items-center justify-center gap-3 mx-auto shadow-lg hover:shadow-xl"
                whileHover={phoneNumbers.length === 0 ? {} : { y: -2, scale: 1.05 }}
                whileTap={phoneNumbers.length === 0 ? {} : { y: 0, scale: 0.95 }}
              >
                <SafeIcon icon={FiPlay} size={20} />
                Start Challenge
              </motion.button>
              {phoneNumbers.length === 0 && (
                <p className="text-red-500 mt-4">You need to add at least one phone number first</p>
              )}
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Choose from your numbers - Now only showing contact names */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white bg-opacity-80 p-6 rounded-3xl shadow-lg backdrop-blur-sm"
              >
                <h2 className="text-xl font-semibold text-indigo-800 mb-4">Your Numbers</h2>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {phoneNumbers.map((number) => (
                    <div
                      key={number.id}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        selectedNumber?.id === number.id && !useRandom
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                      }`}
                      onClick={() => {
                        setSelectedNumber(number);
                        setUseRandom(false);
                      }}
                    >
                      <h3 className="font-semibold text-indigo-800">{number.contact_name}</h3>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Random number option */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white bg-opacity-80 p-6 rounded-3xl shadow-lg backdrop-blur-sm"
              >
                <h2 className="text-xl font-semibold text-indigo-800 mb-4">Mystery Challenge</h2>
                <div
                  className={`p-6 rounded-2xl border-2 cursor-pointer transition-all text-center ${
                    useRandom
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                  }`}
                  onClick={() => {
                    setUseRandom(true);
                    setSelectedNumber(null);
                  }}
                >
                  <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <SafeIcon icon={FiShuffle} size={24} className="text-green-600" />
                  </div>
                  <h3 className="font-semibold text-indigo-800 mb-2">Mystery Number</h3>
                  <p className="text-indigo-600">
                    Test your recall with a randomly selected number from your list
                  </p>
                </div>
              </motion.div>
            </div>
          )}

          {/* Start Game Button - Only shown for non-Speed5/non-OddOneOut/non-WordSearch games */}
          {gameMode !== 'speed-5' && gameMode !== 'odd-one-out' && gameMode !== 'word-search' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-8 text-center"
            >
              <motion.button
                onClick={handleStartGame}
                disabled={(!selectedNumber && !useRandom) || (useRandom && phoneNumbers.length === 0)}
                className="bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 text-white px-8 py-4 rounded-2xl font-semibold transition-all disabled:cursor-not-allowed flex items-center justify-center gap-3 mx-auto shadow-lg hover:shadow-xl"
                whileHover={(!selectedNumber && !useRandom) ? {} : { y: -2, scale: 1.05 }}
                whileTap={(!selectedNumber && !useRandom) ? {} : { y: 0, scale: 0.95 }}
              >
                <SafeIcon icon={FiPlay} size={20} />
                Start Game
              </motion.button>
            </motion.div>
          )}
        </div>
      </div>
    </GameAccessControl>
  );
};

export default NumberSelection;