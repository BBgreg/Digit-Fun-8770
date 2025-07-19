import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { playSound } from '../../utils/formatters';
import { useGameProgress } from '../../hooks/useGameProgress';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiArrowLeft, FiStar } = FiIcons;

const Puzzle = ({ onNavigate, onGameEnd, targetNumber, contactName, phoneNumberId }) => {
  const [pieces, setPieces] = useState([]);
  const [placedPieces, setPlacedPieces] = useState(Array(10).fill(null));
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [gameComplete, setGameComplete] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const { saveGameResult } = useGameProgress();
  const targetArray = targetNumber.split('');

  // Define piece colors
  const pieceColors = [
    '#4C51BF', '#805AD5', '#D53F8C', '#3182CE', '#38A169',
    '#D69E2E', '#DD6B20', '#63B3ED', '#48BB78', '#F6AD55'
  ];

  // Initialize puzzle
  useEffect(() => {
    const initialPieces = generatePuzzlePieces();
    setPieces(initialPieces);
  }, [targetNumber]);

  const generatePuzzlePieces = () => {
    const correctPieces = targetArray.map((digit, index) => {
      const isFirstPiece = index === 0;
      const isLastPiece = index === targetArray.length - 1;

      return {
        id: `correct-${index}`,
        digit,
        position: index,
        isCorrect: true,
        color: pieceColors[index],
        leftConnector: isFirstPiece ? 'none' : 'hole',
        rightConnector: isLastPiece ? 'none' : 'peg',
        x: Math.random() * (window.innerWidth * 0.6) + (window.innerWidth * 0.2),
        y: Math.random() * (window.innerHeight * 0.4) + (window.innerHeight * 0.3)
      };
    });

    return correctPieces;
  };

  const handlePieceClick = (piece) => {
    setSelectedPiece(piece);
  };

  const handleSlotClick = (slotIndex) => {
    if (!selectedPiece || placedPieces[slotIndex]) return;

    // Check if piece can be placed in this slot
    if (selectedPiece.position === slotIndex) {
      // Check left connection
      const leftPiece = slotIndex > 0 ? placedPieces[slotIndex - 1] : null;
      const rightPiece = slotIndex < 9 ? placedPieces[slotIndex + 1] : null;

      let canPlace = true;

      if (leftPiece) {
        canPlace = leftPiece.rightConnector === 'peg' && selectedPiece.leftConnector === 'hole';
      }
      if (rightPiece) {
        canPlace = canPlace && selectedPiece.rightConnector === 'peg' && rightPiece.leftConnector === 'hole';
      }

      if (canPlace) {
        const newPlacedPieces = [...placedPieces];
        newPlacedPieces[slotIndex] = selectedPiece;
        setPlacedPieces(newPlacedPieces);
        setPieces(pieces.filter(p => p.id !== selectedPiece.id));
        setSelectedPiece(null);
        playSound('correct');

        // Check if puzzle is complete
        if (newPlacedPieces.filter(Boolean).length === 10) {
          handlePuzzleComplete();
        }
      } else {
        playSound('incorrect');
      }
    } else {
      playSound('incorrect');
    }
  };

  const renderPuzzlePiece = (piece, isPlaced = false) => {
    const isSelected = selectedPiece?.id === piece.id;
    const width = 80;
    const height = 60;

    return (
      <motion.div
        key={piece.id}
        className={`relative ${isSelected ? 'z-50' : 'z-10'}`}
        initial={false}
        animate={{
          x: isPlaced ? 0 : piece.x,
          y: isPlaced ? 0 : piece.y,
          scale: isSelected ? 1.1 : 1,
          zIndex: isSelected ? 50 : 10
        }}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          position: isPlaced ? 'relative' : 'absolute',
          cursor: isPlaced ? 'default' : 'pointer'
        }}
      >
        {/* Main piece body */}
        <div
          className="absolute inset-0 flex items-center justify-center text-white text-2xl font-bold"
          style={{
            backgroundColor: piece.color,
            borderRadius: '2px',
            boxShadow: isSelected ? '0 0 10px rgba(255,255,255,0.5)' : '0 2px 4px rgba(0,0,0,0.2)'
          }}
          onClick={() => !isPlaced && handlePieceClick(piece)}
        >
          {/* Left connector */}
          {piece.leftConnector === 'hole' && (
            <div
              className="absolute left-0 top-1/2 transform -translate-x-full -translate-y-1/2"
              style={{
                width: '20px',
                height: '40px',
                backgroundColor: piece.color,
                clipPath: 'polygon(100% 0, 0 20%, 0 80%, 100% 100%)'
              }}
            />
          )}

          {/* Right connector */}
          {piece.rightConnector === 'peg' && (
            <div
              className="absolute right-0 top-1/2 transform translate-x-full -translate-y-1/2"
              style={{
                width: '20px',
                height: '40px',
                backgroundColor: piece.color,
                clipPath: 'polygon(0 0, 100% 20%, 100% 80%, 0 100%)'
              }}
            />
          )}

          {/* Digit */}
          {piece.digit}
        </div>
      </motion.div>
    );
  };

  // Rest of the component remains the same...
  // (keeping the game completion logic, star calculation, etc.)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <button
            onClick={() => onNavigate('number-selection', { gameMode: 'puzzle' })}
            className="p-3 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow text-indigo-600 hover:text-indigo-800"
          >
            <SafeIcon icon={FiArrowLeft} size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Puzzle Challenge</h2>
            <p className="text-gray-600">{contactName}</p>
          </div>
        </motion.div>

        {/* Puzzle board */}
        <div className="bg-white p-6 rounded-3xl shadow-lg mb-8">
          <div className="flex justify-center gap-2 mb-8">
            {Array(10).fill(null).map((_, index) => (
              <div
                key={index}
                className="w-20 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center"
                onClick={() => handleSlotClick(index)}
              >
                {placedPieces[index] && renderPuzzlePiece(placedPieces[index], true)}
              </div>
            ))}
          </div>
        </div>

        {/* Piece pool */}
        <div className="relative h-60 bg-white rounded-3xl shadow-lg p-4">
          {pieces.map(piece => renderPuzzlePiece(piece))}
        </div>
      </div>
    </div>
  );
};

export default Puzzle;