import React from 'react';
import { useGameProgress } from '../../hooks/useGameProgress';
import { useSubscription } from '../../hooks/useSubscription'; // 1. Import the hook
import GameAccessControl from './GameAccessControl';
import SequenceRiddle from './SequenceRiddle';
import Speed5 from './Speed5';
import WordSearch from './WordSearch';
import OddOneOut from './OddOneOut';

const GamePlay = ({ onNavigate, gameMode, targetNumber, contactName, phoneNumberId, phoneNumbers }) => {
  const { saveGameResult } = useGameProgress();
  // 2. Get the increment function from our subscription hook
  const { incrementGameModeUsage } = useSubscription();

  /**
   * This function is called when any game is completed.
   * It will now increment the usage counter before navigating back to the dashboard.
   */
  const handleGameEnd = async (stars, time = null) => {
    try {
      // 3. Increment the usage for the specific game mode that was just played
      console.log(`🚀 GamePlay: Game ended for mode: ${gameMode}. Incrementing usage.`);
      await incrementGameModeUsage(gameMode);

      if (phoneNumberId) {
        await saveGameResult(phoneNumberId, gameMode, stars, time);
      }
    } catch (error) {
      console.error("Error during game end process:", error);
    } finally {
      // Navigate back to dashboard after a short delay
      setTimeout(() => {
        onNavigate('dashboard');
      }, 1500); // Shortened delay slightly
    }
  };

  const gameProps = {
    onNavigate,
    onGameEnd: handleGameEnd,
    targetNumber,
    contactName,
    phoneNumberId
  };

  // This component dynamically renders the correct game based on the gameMode prop
  const GameComponent = () => {
    switch (gameMode) {
      case 'sequence-riddle':
        return <SequenceRiddle {...gameProps} />;
      case 'speed-5':
        return <Speed5 onNavigate={onNavigate} phoneNumbers={phoneNumbers} onGameEnd={handleGameEnd} />;
      case 'word-search':
        // This game might need the onGameEnd prop as well
        return <WordSearch onNavigate={onNavigate} onGameEnd={handleGameEnd} />;
      case 'odd-one-out':
        // This game might need the onGameEnd prop as well
        return <OddOneOut onNavigate={onNavigate} phoneNumberId={phoneNumberId} onGameEnd={handleGameEnd} />;
      default:
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-800 mb-4">Game Not Found</h1>
              <button
                onClick={() => onNavigate('dashboard')}
                className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Back to Dashboard
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
