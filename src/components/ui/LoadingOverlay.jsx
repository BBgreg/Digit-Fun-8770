import React from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiLoader } = FiIcons;

const LoadingOverlay = ({ message = 'Loading...', showDigits = false }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: "linear-gradient(135deg, rgba(147,51,234,0.85), rgba(79,70,229,0.85), rgba(59,130,246,0.85))"
      }}
    >
      <div className="text-center p-8 bg-white bg-opacity-20 backdrop-filter backdrop-blur-md rounded-3xl shadow-2xl">
        <div className="relative w-24 h-24 mx-auto mb-6">
          {/* Main spinner */}
          <div className="absolute inset-0 rounded-full border-4 border-white border-opacity-20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-indigo-400 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          
          {showDigits && (
            /* Animated digits floating around */
            [...Array(10)].map((_, i) => {
              const digit = i;
              return (
                <motion.div 
                  key={i}
                  className="absolute w-6 h-6 text-white font-bold flex items-center justify-center"
                  initial={{ 
                    x: 0, 
                    y: 0, 
                    scale: 0.5, 
                    opacity: 0 
                  }}
                  animate={{ 
                    x: [0, Math.sin(i * 36 * Math.PI/180) * 40, 0],
                    y: [0, Math.cos(i * 36 * Math.PI/180) * 40, 0],
                    scale: [0.5, 1, 0.5],
                    opacity: [0, 1, 0]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 2 + Math.random() * 2,
                    delay: i * 0.2
                  }}
                >
                  {digit}
                </motion.div>
              );
            })
          )}
          
          {!showDigits && (
            <SafeIcon 
              icon={FiLoader} 
              size={36} 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white animate-spin" 
            />
          )}
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-3">
          {message}
        </h2>
        <p className="text-white text-opacity-90">
          Please wait a moment...
        </p>
      </div>
    </motion.div>
  );
};

export default LoadingOverlay;