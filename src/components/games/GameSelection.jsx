import React from 'react';
import {motion} from 'framer-motion';
import {usePhoneNumbers} from '../../hooks/usePhoneNumbers';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const {FiArrowLeft,FiTarget,FiPuzzle,FiCircle,FiMap}=FiIcons;

const GameSelection=({onNavigate})=> {
  const {phoneNumbers}=usePhoneNumbers();

  const games=[
    {
      id: 'sequence-riddle',
      name: 'Sequence Riddle',
      icon: FiTarget,
      description: 'Guess the number like Wordle with color-coded hints',
      color: 'bg-gradient-to-br from-purple-500 to-pink-500',
      textColor: 'text-white',
    },
    {
      id: 'speed-5',
      name: 'Speed 5',
      icon: FiPuzzle,
      description: 'Type 5 numbers as fast as you can to test your memory',
      color: 'bg-gradient-to-br from-blue-500 to-cyan-500',
      textColor: 'text-white',
    },
    {
      id: 'balloon-pop',
      name: 'Balloon Pop',
      icon: FiCircle,
      description: 'Pop balloons in sequence before they escape',
      color: 'bg-gradient-to-br from-green-500 to-emerald-500',
      textColor: 'text-white',
    },
    {
      id: 'memory-maze',
      name: 'Memory Maze',
      icon: FiMap,
      description: 'Navigate through a maze using number sequences',
      color: 'bg-gradient-to-br from-orange-500 to-red-500',
      textColor: 'text-white',
    },
  ];

  return (
    <div className="min-h-screen app-container">
      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-20 w-96 h-96 bg-gradient-to-br from-blue-400 to-sky-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-4xl mx-auto p-6 relative z-10">
        <motion.div
          initial={{opacity: 0,y: -20}}
          animate={{opacity: 1,y: 0}}
          className="flex items-center gap-4 mb-8"
        >
          <button
            onClick={()=> onNavigate('dashboard')}
            className="p-3 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow text-indigo-600 hover:text-indigo-800"
          >
            <SafeIcon icon={FiArrowLeft} size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-indigo-800">Choose Your Game</h1>
            <p className="text-indigo-600 mt-1">Select a game mode to start memorizing</p>
          </div>
        </motion.div>

        {phoneNumbers.length===0 ? (
          <motion.div
            initial={{opacity: 0,y: 20}}
            animate={{opacity: 1,y: 0}}
            className="text-center py-12"
          >
            <div className="w-24 h-24 bg-white bg-opacity-70 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-md">
              <SafeIcon icon={FiTarget} size={32} className="text-indigo-400" />
            </div>
            <h3 className="text-xl font-semibold text-indigo-800 mb-2">No numbers to play with</h3>
            <p className="text-indigo-600 mb-6">Add some phone numbers first to start playing games</p>
            <motion.button
              onClick={()=> onNavigate('add-number')}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-2xl font-semibold hover:shadow-lg transition-all"
              whileHover={{y: -2,scale: 1.05}}
              whileTap={{y: 0,scale: 0.95}}
            >
              Add Your First Number
            </motion.button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {games.map((game, index) => (
              <motion.div
                key={game.id}
                initial={{opacity: 0,y: 20}}
                animate={{opacity: 1,y: 0}}
                transition={{delay: index * 0.1}}
                className={`${game.color} p-8 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105`}
                onClick={()=> onNavigate('number-selection',{gameMode: game.id})}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center">
                    <SafeIcon icon={game.icon} size={24} className={game.textColor} />
                  </div>
                  <h3 className={`text-2xl font-bold ${game.textColor}`}>
                    {game.name}
                  </h3>
                </div>
                <p className={`${game.textColor} opacity-90 text-lg`}>
                  {game.description}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameSelection;