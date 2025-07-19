import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const Confetti = () => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Create confetti particles
    const colors = [
      '#f687b3', // Pink
      '#6366f1', // Indigo
      '#60a5fa', // Blue
      '#34d399', // Green
      '#fcd34d', // Yellow
      '#f472b6', // Pink
    ];

    const newParticles = [];
    const particleCount = 60; // Increased particle count for more festive feel

    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100, // Random position across the screen (percentage)
        y: -5 - Math.random() * 10, // Start above the viewport
        size: 5 + Math.random() * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        duration: 2 + Math.random() * 4,
        delay: Math.random() * 2,
        shape: Math.random() > 0.7 ? 'circle' : 'square', // Mix of shapes
      });
    }

    setParticles(newParticles);

    // Clean up
    return () => {
      setParticles([]);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map(particle => (
        <motion.div
          key={particle.id}
          className="absolute"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            borderRadius: particle.shape === 'circle' ? '50%' : '0%',
            transform: `rotate(${particle.rotation}deg)`,
          }}
          animate={{
            y: ['0%', '100%'],
            x: [
              '0%',
              `${(Math.random() * 20) - 10}%`,
              `${(Math.random() * 40) - 20}%`
            ],
            rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
            opacity: [1, 0.8, 0],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

export default Confetti;