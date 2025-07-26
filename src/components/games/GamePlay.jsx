import React from 'react';
import { useGameProgress } from '../../hooks/useGameProgress';
import GameAccessControl from './GameAccessControl';
import SequenceRiddle from './SequenceRiddle';
import Speed5 from './Speed5';
import WordSearch from './WordSearch';
import OddOneOut from './OddOneOut';

const GamePlay = ({ onNavigate, gameMode, targetNumber, contactName, phoneNumberId, phoneNumbers }) => {
  const { saveGameResult } = useGameProgress();

  const handleGameEnd = async (stars, time = null) => {
    if (phoneNumberId) {
      await saveGameResult(phoneNumberId, gameMode, stars, time);
    }
    
    // Navigate back to dashboard after a short delay
    setTimeout(() => {
      onNavigate('dashboard');
    }, 2000);
  };

  const gameProps = {
    onNavigate,
    onGameEnd: handleGameEnd,
    targetNumber,
    contactName,
    phoneNumberId
  };

  // Wrap games that need access control
  const GameComponent = () => {
    switch (gameMode) {
      case 'sequence-riddle':
        return <SequenceRiddle {...gameProps} />;
      case 'speed-5':
        return <Speed5 onNavigate={onNavigate} phoneNumbers={phoneNumbers} onGameEnd={handleGameEnd} />;
      case 'word-search':
        return <WordSearch onNavigate={onNavigate} />;
      case 'odd-one-out':
        return <OddOneOut onNavigate={onNavigate} phoneNumberId={phoneNumberId} />;
      default:
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-800 mb-4">Game Not Found</h1>
              <button
                onClick={() => onNavigate('game-selection')}
                className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Back to Games
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <GameAccessControl gameMode={gameMode}>
      <GameComponent />
    </GameAccessControl>
  );
};

export default GamePlay;