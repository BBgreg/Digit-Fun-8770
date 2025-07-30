import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle } = FiIcons;

const LoginForm = ({ onToggleMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();

  const handleSignInClick = async (e) => {
    e.preventDefault();
    
    // Clear any previous errors
    setError('');
    
    // Validate inputs before proceeding
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }
    
    // Show loading indicator immediately
    setLoading(true);
    
    try {
      console.log('Attempting sign-in for:', email);
      
      // Execute Supabase Sign-In
      const result = await signIn(email, password);
      
      if (result.success && result.user) {
        // ✅ SUCCESSFUL SIGN-IN - IMMEDIATE NAVIGATION TRIGGER
        console.log('✅ Sign-in successful for user:', result.user.id);
        console.log('🚀 Navigation will be handled automatically by AuthContext');
        
        // Note: The AuthContext will automatically handle navigation to dashboard
        // via the navigateToScreen state and App.jsx useEffect
        // Loading state will be cleared when component unmounts due to navigation
        
      } else if (result.error) {
        // ❌ FAILED SIGN-IN - Show error and stay on form
        setLoading(false);
        
        // Handle specific error types with user-friendly messages
        let errorMessage = 'Sign-in failed. Please try again later.';
        
        if (result.error.message) {
          const errorMsg = result.error.message.toLowerCase();
          
          if (errorMsg.includes('invalid login credentials') || 
              errorMsg.includes('invalid password') || 
              errorMsg.includes('user not found') || 
              errorMsg.includes('email not confirmed')) {
            
            if (errorMsg.includes('email not confirmed')) {
              errorMessage = 'Please confirm your email to log in.';
            } else {
              errorMessage = 'Invalid email or password. Please try again.';
            }
          } else if (errorMsg.includes('too many requests')) {
            errorMessage = 'Too many sign-in attempts. Please wait a moment and try again.';
          } else if (errorMsg.includes('network') || errorMsg.includes('connection')) {
            errorMessage = 'Network error. Please check your connection and try again.';
          }
        }
        
        setError(errorMessage);
        console.error('Sign-in failed:', result.error);
      }
      
    } catch (err) {
      // Handle unexpected errors
      setLoading(false);
      setError('An unexpected error occurred. Please try again later.');
      console.error('Unexpected sign-in error:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto p-8 glass-effect rounded-3xl shadow-xl"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-indigo-800 mb-2">Welcome Back!</h1>
        <p className="text-indigo-600">Sign in to continue your digit fun journey</p>
      </div>

      <form onSubmit={handleSignInClick} className="space-y-6">
        <div className="relative">
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-indigo-400">
            <SafeIcon icon={FiMail} size={20} />
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full pl-12 pr-4 py-4 bg-white bg-opacity-80 border border-indigo-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
            required
            disabled={loading}
          />
        </div>

        <div className="relative">
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-indigo-400">
            <SafeIcon icon={FiLock} size={20} />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full pl-12 pr-12 py-4 bg-white bg-opacity-80 border border-indigo-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
            required
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-indigo-400 hover:text-indigo-600 disabled:opacity-50"
            disabled={loading}
          >
            <SafeIcon icon={showPassword ? FiEyeOff : FiEye} size={20} />
          </button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-4 rounded-xl shadow-sm"
          >
            <SafeIcon icon={FiAlertCircle} className="text-red-500 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </motion.div>
        )}

        <motion.button
          type="submit"
          disabled={loading}
          onClick={handleSignInClick}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-4 rounded-2xl font-semibold hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-md"
          whileHover={!loading ? { y: -2 } : {}}
          whileTap={!loading ? { y: 0 } : {}}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-3"></div>
              <span>Signing In...</span>
            </div>
          ) : (
            'Sign In'
          )}
        </motion.button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-indigo-600">
          Don't have an account?{' '}
          <motion.button
            onClick={onToggleMode}
            className="text-indigo-800 hover:text-purple-700 font-semibold disabled:opacity-50"
            whileHover={{ scale: 1.05 }}
            disabled={loading}
          >
            Sign up
          </motion.button>
        </p>
      </div>
    </motion.div>
  );
};

export default LoginForm;