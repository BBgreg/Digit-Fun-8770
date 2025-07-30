import React from 'react';
import { motion } from 'framer-motion';

const LoadingScreen = () => {
  return (
    <div className="min-h-screen app-container flex items-center justify-center">
      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-20 w-96 h-96 bg-gradient-to-br from-blue-400 to-sky-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 text-center">
        {/* App Logo */}
        <motion.div
          className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 rounded-3xl mb-8 shadow-lg"
          animate={{
            rotate: [0, 360],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <span className="text-6xl">📱</span>
        </motion.div>

        {/* App Title */}
        <h1 
          className="gradient-text app-title text-6xl font-black mb-6"
          style={{
            background: "linear-gradient(135deg, #9333EA, #4F46E5, #3B82F6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            textShadow: "0 0 20px rgba(147,51,234,0.5)",
            fontFamily: "'Fredoka', sans-serif",
            letterSpacing: "-0.02em",
            lineHeight: "1.3",
            paddingBottom: "0.1em"
          }}
        >
          Digit Fun
        </h1>

        {/* Loading Spinner */}
        <motion.div
          className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-500 rounded-full mx-auto mb-6"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />

        {/* Loading Text */}
        <motion.p
          className="text-indigo-600 text-xl font-semibold"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          Loading your experience...
        </motion.p>

        {/* Animated dots */}
        <div className="flex justify-center mt-4 space-x-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-3 h-3 bg-indigo-500 rounded-full"
              animate={{
                y: [0, -10, 0],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;