import React from 'react';
import {motion} from 'framer-motion';
import {useAuth} from '../../contexts/AuthContext';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const {FiPlus, FiList, FiLogOut, FiShield, FiTarget, FiPuzzle, FiCircle, FiFilter} = FiIcons;

const Dashboard = ({onNavigate}) => {
  const {user, signOut} = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen app-container">
      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-20 w-96 h-96 bg-gradient-to-br from-blue-400 to-sky-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto p-6">
        {/* Header with User Info - Right Aligned */}
        <motion.div
          initial={{opacity: 0, y: -20}}
          animate={{opacity: 1, y: 0}}
          className="flex justify-end items-center mb-8"
        >
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-2 px-4 py-2 bg-white bg-opacity-70 backdrop-filter backdrop-blur-lg rounded-full shadow-sm">
                <SafeIcon icon={FiShield} size={16} className="text-indigo-500" />
                <span className="text-sm text-indigo-800">{user.email}</span>
              </div>
            )}
            <motion.button
              onClick={handleSignOut}
              className="p-3 bg-white bg-opacity-80 backdrop-filter backdrop-blur-lg rounded-2xl shadow-lg hover:shadow-xl transition-all text-indigo-600 hover:text-indigo-800"
              whileHover={{scale: 1.05, y: -2}}
              whileTap={{scale: 0.95}}
            >
              <SafeIcon icon={FiLogOut} size={20} />
            </motion.button>
          </div>
        </motion.div>

        {/* App Branding Section */}
        <motion.div
          initial={{opacity: 0, scale: 0.95}}
          animate={{opacity: 1, scale: 1}}
          className="text-center mb-12"
        >
          <motion.div
            className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 rounded-3xl mb-6 shadow-lg"
            whileHover={{rotate: 10, scale: 1.05, boxShadow: "0 0 30px rgba(147,51,234,0.6), 0 0 60px rgba(59,130,246,0.4)"}}
            transition={{type: "spring", stiffness: 300, damping: 15}}
          >
            <span className="text-4xl animate-bounce-slow">📱</span>
          </motion.div>

          <h1
            className="gradient-text app-title text-5xl font-black mb-4"
            style={{background: "linear-gradient(135deg, #9333EA, #4F46E5, #3B82F6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", textShadow: "0 0 20px rgba(147,51,234,0.5)", fontFamily: "'Fredoka', sans-serif", letterSpacing: "-0.02em", lineHeight: "1.3", paddingBottom: "0.1em"}}
          >
            Digit Fun
          </h1>
          <p
            className="gradient-text app-tagline text-xl font-bold"
            style={{background: "linear-gradient(135deg, #9333EA, #4F46E5, #3B82F6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", textShadow: "0 0 10px rgba(147,51,234,0.3)", fontFamily: "'Nunito', sans-serif"}}
          >
            Memorize phone numbers with a little fun
          </p>
        </motion.div>

        {/* Enhanced Core Action Buttons - Larger and More Prominent */}
        <motion.div
          initial={{opacity: 0, y: 40}}
          animate={{opacity: 1, y: 0}}
          transition={{delay: 0.3}}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12"
        >
          {/* Add Number - Enhanced */}
          <motion.div
            className="group relative overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-10 rounded-3xl shadow-2xl cursor-pointer transform transition-all duration-300"
            whileHover={{y: -8, scale: 1.02, boxShadow: "0 25px 50px rgba(147,51,234,0.4), 0 0 0 1px rgba(255,255,255,0.1)"}}
            whileTap={{scale: 0.98}}
            onClick={() => onNavigate('add-number')}
          >
            {/* Animated background overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10 flex flex-col items-center text-center">
              <motion.div
                className="w-20 h-20 bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-3xl flex items-center justify-center mb-6 shadow-lg"
                whileHover={{rotate: 360}}
                transition={{duration: 0.6}}
              >
                <SafeIcon icon={FiPlus} size={40} className="text-white" />
              </motion.div>
              <h3 className="text-3xl font-black text-white mb-4 drop-shadow-lg">
                Add Number
              </h3>
              <p className="text-white text-lg opacity-90 font-medium leading-relaxed">
                Save a new phone number and start your memorization journey
              </p>
              {/* Animated accent */}
              <motion.div
                className="mt-6 w-16 h-1 bg-white rounded-full opacity-60"
                initial={{width: 0}}
                animate={{width: 64}}
                transition={{delay: 0.5, duration: 0.8}}
              />
            </div>
          </motion.div>

          {/* My Numbers - Enhanced */}
          <motion.div
            className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-10 rounded-3xl shadow-2xl cursor-pointer transform transition-all duration-300"
            whileHover={{y: -8, scale: 1.02, boxShadow: "0 25px 50px rgba(20,184,166,0.4), 0 0 0 1px rgba(255,255,255,0.1)"}}
            whileTap={{scale: 0.98}}
            onClick={() => onNavigate('number-list')}
          >
            {/* Animated background overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10 flex flex-col items-center text-center">
              <motion.div
                className="w-20 h-20 bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-3xl flex items-center justify-center mb-6 shadow-lg"
                whileHover={{rotate: -360}}
                transition={{duration: 0.6}}
              >
                <SafeIcon icon={FiList} size={40} className="text-white" />
              </motion.div>
              <h3 className="text-3xl font-black text-white mb-4 drop-shadow-lg">
                My Numbers
              </h3>
              <p className="text-white text-lg opacity-90 font-medium leading-relaxed">
                View, manage, and practice with your saved phone numbers
              </p>
              {/* Animated accent */}
              <motion.div
                className="mt-6 w-16 h-1 bg-white rounded-full opacity-60"
                initial={{width: 0}}
                animate={{width: 64}}
                transition={{delay: 0.7, duration: 0.8}}
              />
            </div>
          </motion.div>
        </motion.div>

        {/* Game Modes Section Title */}
        <motion.div
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{delay: 0.5}}
          className="text-center mb-8"
        >
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 inline-block text-transparent bg-clip-text">
            Play & Practice
          </h2>
          <div className="h-1 w-24 bg-gradient-to-r from-indigo-500 to-purple-500 mx-auto mt-2 rounded-full"></div>
        </motion.div>

        {/* Game Modes Grid */}
        <motion.div
          initial={{opacity: 0, y: 40}}
          animate={{opacity: 1, y: 0}}
          transition={{delay: 0.6}}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12"
        >
          {/* Sequence Riddle - Direct navigation to game */}
          <motion.div
            className="group relative overflow-hidden rounded-3xl shadow-lg cursor-pointer transform transition-all duration-300"
            style={{background: "linear-gradient(to right, rgba(139,92,246,0.15), rgba(236,72,153,0.15))", padding: "3px" /* This creates the border effect*/}}
            whileHover={{y: -5, scale: 1.02, boxShadow: "0 15px 30px rgba(139,92,246,0.3)"}}
            whileTap={{scale: 0.98}}
            onClick={() => onNavigate('number-selection', {gameMode: 'sequence-riddle'})}
          >
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 h-full w-full rounded-3xl p-6">
              <div className="flex items-center gap-4 mb-3">
                <motion.div
                  className="w-12 h-12 bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl flex items-center justify-center"
                  whileHover={{rotate: 180}}
                  transition={{duration: 0.5}}
                >
                  <SafeIcon icon={FiTarget} size={24} className="text-white" />
                </motion.div>
                <h3 className="text-xl font-bold text-white">Sequence Riddle</h3>
              </div>
              <p className="text-white text-opacity-90">
                Guess the number like a puzzle with color-coded hints
              </p>
            </div>
          </motion.div>

          {/* Speed 5 - Direct navigation to game (Previously Puzzle) */}
          <motion.div
            className="group relative overflow-hidden rounded-3xl shadow-lg cursor-pointer transform transition-all duration-300"
            style={{background: "linear-gradient(to right, rgba(139,92,246,0.15), rgba(236,72,153,0.15))", padding: "3px" /* This creates the border effect*/}}
            whileHover={{y: -5, scale: 1.02, boxShadow: "0 15px 30px rgba(139,92,246,0.3)"}}
            whileTap={{scale: 0.98}}
            onClick={() => onNavigate('number-selection', {gameMode: 'speed-5'})}
          >
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 h-full w-full rounded-3xl p-6">
              <div className="flex items-center gap-4 mb-3">
                <motion.div
                  className="w-12 h-12 bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl flex items-center justify-center"
                  whileHover={{rotate: 180}}
                  transition={{duration: 0.5}}
                >
                  <SafeIcon icon={FiPuzzle} size={24} className="text-white" />
                </motion.div>
                <h3 className="text-xl font-bold text-white">Speed 5</h3>
              </div>
              <p className="text-white text-opacity-90">
                Type 5 numbers as fast as you can to test your memory
              </p>
            </div>
          </motion.div>

          {/* Word Search - DIRECT navigation to game screen */}
          <motion.div
            className="group relative overflow-hidden rounded-3xl shadow-lg cursor-pointer transform transition-all duration-300"
            style={{background: "linear-gradient(to right, rgba(139,92,246,0.15), rgba(236,72,153,0.15))", padding: "3px" /* This creates the border effect*/}}
            whileHover={{y: -5, scale: 1.02, boxShadow: "0 15px 30px rgba(139,92,246,0.3)"}}
            whileTap={{scale: 0.98}}
            onClick={() => onNavigate('game-play', {gameMode: 'word-search'})}
          >
            <div className="bg-gradient-to-br from-green-500 to-emerald-500 h-full w-full rounded-3xl p-6">
              <div className="flex items-center gap-4 mb-3">
                <motion.div
                  className="w-12 h-12 bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl flex items-center justify-center"
                  whileHover={{rotate: 180}}
                  transition={{duration: 0.5}}
                >
                  <SafeIcon icon={FiCircle} size={24} className="text-white" />
                </motion.div>
                <h3 className="text-xl font-bold text-white">Word Search</h3>
              </div>
              <p className="text-white text-opacity-90">
                Find hidden phone numbers in a grid of digits
              </p>
            </div>
          </motion.div>

          {/* Odd One Out - DIRECT navigation to game */}
          <motion.div
            className="group relative overflow-hidden rounded-3xl shadow-lg cursor-pointer transform transition-all duration-300"
            style={{background: "linear-gradient(to right, rgba(139,92,246,0.15), rgba(236,72,153,0.15))", padding: "3px" /* This creates the border effect*/}}
            whileHover={{y: -5, scale: 1.02, boxShadow: "0 15px 30px rgba(139,92,246,0.3)"}}
            whileTap={{scale: 0.98}}
            onClick={() => onNavigate('game-play', {gameMode: 'odd-one-out'})}
          >
            <div className="bg-gradient-to-br from-orange-500 to-red-500 h-full w-full rounded-3xl p-6">
              <div className="flex items-center gap-4 mb-3">
                <motion.div
                  className="w-12 h-12 bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl flex items-center justify-center"
                  whileHover={{rotate: 180}}
                  transition={{duration: 0.5}}
                >
                  <SafeIcon icon={FiFilter} size={24} className="text-white" />
                </motion.div>
                <h3 className="text-xl font-bold text-white">Odd One Out</h3>
              </div>
              <p className="text-white text-opacity-90">
                Find the fake numbers that don't belong in your contacts
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* Fun Floating Elements for Extra Hip Factor */}
        <motion.div
          className="absolute top-1/4 left-10 w-8 h-8 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full opacity-60"
          animate={{
            y: [0, -20, 0],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        <motion.div
          className="absolute top-1/3 right-16 w-6 h-6 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full opacity-60"
          animate={{
            y: [0, 15, 0],
            rotate: [0, -180, -360],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />

        <motion.div
          className="absolute bottom-1/4 left-1/4 w-4 h-4 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full opacity-60"
          animate={{
            y: [0, -10, 0],
            x: [0, 10, 0],
            rotate: [0, 90, 180],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
      </div>
    </div>
  );
};

export default Dashboard;