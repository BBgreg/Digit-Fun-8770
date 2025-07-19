export const formatPhoneNumber = (number) => {
  const cleaned = number.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return number;
};

export const generateRandomNumber = () => {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
};

export const playSound = (type) => {
  // Simple sound effects using Web Audio API
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    const sounds = {
      correct: {
        frequency: 800,
        duration: 0.2
      },
      incorrect: {
        frequency: 300,
        duration: 0.3
      },
      pop: {
        frequency: 1200,
        duration: 0.15,
        type: 'sawtooth' // More satisfying pop sound
      },
      win: {
        frequencies: [523, 659, 784, 1047], // C, E, G, C (major chord)
        duration: 0.6
      },
      gameOver: {
        frequency: 200,
        duration: 0.8
      },
    };

    const sound = sounds[type];
    if (!sound) return;

    if (type === 'win') {
      // Play a chord for win sound
      sound.frequencies.forEach((freq, index) => {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.frequency.value = freq;
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + sound.duration);
        }, index * 100);
      });
    } else if (type === 'pop') {
      // Enhanced pop sound with more physical feel
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = sound.frequency;
      oscillator.type = sound.type || 'sine';
      
      // Quick attack and decay for pop sound
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
      
      oscillator.frequency.setValueAtTime(sound.frequency, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        sound.frequency * 0.5,
        audioContext.currentTime + sound.duration
      );
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + sound.duration);
    } else {
      // Play single tone
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = sound.frequency;
      oscillator.type = sound.type || 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + sound.duration);
    }
  } catch (error) {
    console.log('Audio not supported or failed:', error);
  }
};