import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { playSound } from '../../utils/formatters';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiArrowLeft } = FiIcons;

const MemoryMaze = ({ onNavigate, onGameEnd, targetNumber, contactName }) => {
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0 });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [maze, setMaze] = useState([]);
  const [availableOptions, setAvailableOptions] = useState([]);

  const targetArray = targetNumber.split('');
  const mazeSize = 8;

  const generateMaze = () => {
    const newMaze = Array(mazeSize).fill().map(() => Array(mazeSize).fill(null));
    
    // Create a path from start to finish
    const path = [];
    let x = 0, y = 0;
    
    for (let i = 0; i < targetArray.length; i++) {
      path.push({ x, y, digit: targetArray[i] });
      newMaze[y][x] = { digit: targetArray[i], isPath: true, step: i };
      
      // Move towards bottom-right
      if (i < targetArray.length - 1) {
        if (x < mazeSize - 1 && (y === mazeSize - 1 || Math.random() > 0.3)) {
          x++;
        } else if (y < mazeSize - 1) {
          y++;
        }
      }
    }

    // Add distractor digits
    const allDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const distractors = allDigits.filter(d => !targetArray.includes(d));
    
    for (let i = 0; i < mazeSize; i++) {
      for (let j = 0; j < mazeSize; j++) {
        if (!newMaze[i][j] && Math.random() > 0.6) {
          newMaze[i][j] = { 
            digit: distractors[Math.floor(Math.random() * distractors.length)],
            isPath: false,
            step: -1
          };
        }
      }
    }

    setMaze(newMaze);
    return newMaze;
  };

  const getAvailableOptions = (maze, x, y) => {
    const options = [];
    const directions = [
      { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
      { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
      { dx: -1, dy: -1 }, { dx: 1, dy: -1 },
      { dx: -1, dy: 1 }, { dx: 1, dy: 1 }
    ];

    directions.forEach(({ dx, dy }) => {
      const nx = x + dx;
      const ny = y + dy;
      
      if (nx >= 0 && nx < mazeSize && ny >= 0 && ny < mazeSize && maze[ny][nx]) {
        options.push({ x: nx, y: ny, digit: maze[ny][nx].digit });
      }
    });

    return options;
  };

  const handleDigitClick = (option) => {
    if (gameOver) return;

    const expectedDigit = targetArray[currentIndex];
    
    if (option.digit === expectedDigit) {
      playSound('correct');
      setCurrentPosition({ x: option.x, y: option.y });
      
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      
      if (newIndex >= targetArray.length) {
        setWon(true);
        setGameOver(true);
        playSound('win');
        setTimeout(() => {
          const stars = calculateStars(newIndex);
          onGameEnd(stars);
        }, 1000);
      } else {
        const newOptions = getAvailableOptions(maze, option.x, option.y);
        setAvailableOptions(newOptions);
      }
    } else {
      playSound('gameOver');
      setGameOver(true);
      setTimeout(() => {
        const stars = calculateStars(currentIndex);
        onGameEnd(stars);
      }, 1000);
    }
  };

  const calculateStars = (correctDigits) => {
    if (correctDigits === 0) return 0;
    if (correctDigits <= 3) return 1;
    if (correctDigits <= 5) return 2;
    if (correctDigits <= 7) return 3;
    if (correctDigits <= 9) return 4;
    return 5;
  };

  useEffect(() => {
    const newMaze = generateMaze();
    const options = getAvailableOptions(newMaze, 0, 0);
    setAvailableOptions(options);
  }, [targetNumber]);

  const renderMazeCell = (cell, x, y) => {
    const isCurrentPosition = currentPosition.x === x && currentPosition.y === y;
    const isStart = x === 0 && y === 0;
    const isFinish = x === mazeSize - 1 && y === mazeSize - 1;
    const isAvailable = availableOptions.some(opt => opt.x === x && opt.y === y);
    const isOnPath = cell && cell.isPath && cell.step <= currentIndex;

    let cellClass = 'w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm transition-all ';
    
    if (isCurrentPosition) {
      cellClass += 'bg-blue-500 text-white ring-4 ring-blue-300 ';
    } else if (isStart) {
      cellClass += 'bg-green-500 text-white ';
    } else if (isFinish) {
      cellClass += 'bg-red-500 text-white ';
    } else if (isAvailable && !gameOver) {
      cellClass += 'bg-yellow-400 text-gray-800 cursor-pointer hover:bg-yellow-500 hover:scale-110 ';
    } else if (isOnPath) {
      cellClass += 'bg-blue-200 text-gray-700 ';
    } else if (cell) {
      cellClass += 'bg-gray-200 text-gray-600 ';
    } else {
      cellClass += 'bg-gray-100 ';
    }

    return (
      <motion.div
        key={`${x}-${y}`}
        className={cellClass}
        onClick={() => isAvailable && !gameOver && handleDigitClick({ x, y, digit: cell.digit })}
        whileHover={isAvailable && !gameOver ? { scale: 1.1 } : {}}
        whileTap={isAvailable && !gameOver ? { scale: 0.95 } : {}}
      >
        {isStart ? '🏁' : isFinish ? '🎯' : cell?.digit || ''}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="max-w-4xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <button
            onClick={() => onNavigate('number-selection', { gameMode: 'memory-maze' })}
            className="p-3 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow text-gray-600 hover:text-gray-800"
          >
            <SafeIcon icon={FiArrowLeft} size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-800">{contactName}</h1>
            <p className="text-gray-600">Navigate from 🏁 to 🎯 using the correct digit sequence</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Progress</p>
            <p className="text-xl font-bold text-gray-800">{currentIndex}/10</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Maze */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-3xl shadow-lg"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Maze</h3>
            <div className="grid grid-cols-8 gap-1">
              {maze.map((row, y) =>
                row.map((cell, x) => renderMazeCell(cell, x, y))
              )}
            </div>
          </motion.div>

          {/* Game Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-white p-6 rounded-3xl shadow-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Next Digit</h3>
              <div className="text-center">
                {currentIndex < targetArray.length ? (
                  <div className="text-6xl font-bold text-blue-600 mb-2">
                    {targetArray[currentIndex]}
                  </div>
                ) : (
                  <div className="text-4xl mb-2">🎉</div>
                )}
                <p className="text-gray-600">
                  {currentIndex < targetArray.length
                    ? `Look for digit ${targetArray[currentIndex]}`
                    : 'Maze complete!'}
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Target Number</h3>
              <div className="space-y-2">
                <div className="flex justify-center gap-1">
                  {targetArray.map((digit, index) => (
                    <div
                      key={index}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                        index < currentIndex
                          ? 'bg-green-500 text-white'
                          : index === currentIndex
                          ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {digit}
                    </div>
                  ))}
                </div>
                <p className="text-center text-gray-600 text-sm">
                  {targetNumber.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Game Over Modal */}
        {gameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center"
            >
              <div className="text-6xl mb-4">
                {won ? '🎉' : '😔'}
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {won ? 'Maze Complete!' : 'Game Over'}
              </h2>
              <p className="text-gray-600 mb-4">
                You got {currentIndex} out of {targetArray.length} digits correct!
              </p>
              
              <div className="mb-6">
                <div className="flex justify-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <SafeIcon
                      key={i}
                      icon={FiIcons.FiStar}
                      className={`w-6 h-6 ${
                        i < calculateStars(currentIndex) ? 'text-yellow-500 fill-current' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => onNavigate('number-selection', { gameMode: 'memory-maze' })}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-2xl font-semibold hover:bg-gray-300 transition-colors"
                >
                  Play Again
                </button>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-2xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default MemoryMaze;