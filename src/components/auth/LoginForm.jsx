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

  // 🚀 CRITICAL: EXCRUCIATINGLY PRECISE SIGN-IN BUTTON LOGIC
  const handleSignInClick = async (e) => {
    e.preventDefault();
    
    // Clear any previous errors immediately
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
    
    // 🔥 STEP 1: IMMEDIATELY display loading indicator
    console.log('🔥 STEP 1: Displaying loading indicator');
    setLoading(true);
    
    try {
      console.log('🔥 STEP 2: Attempting Supabase sign-in for:', email);
      
      // 🔥 STEP 2: Execute Supabase Sign-In Operation
      const result = await signIn(email, password);
      
      console.log('🔥 STEP 3: Sign-in result received:', { 
        success: result.success, 
        hasUser: !!result.user,
        hasError: !!result.error 
      });
      
      if (result.success && result.user) {
        // 🚀 CRITICAL SUCCESS PATH: IMMEDIATE NAVIGATION GUARANTEE
        console.log('🚀 SUCCESS: Sign-in successful for user:', result.user.id);
        console.log('🚀 IMMEDIATE NAVIGATION: AuthContext will handle dashboard navigation');
        
        // 🔥 STEP 3a: Hide loading indicator immediately
        setLoading(false);
        
        // 🚀 NOTE: The AuthContext automatically triggers navigation to dashboard
        // via the navigateToScreen state and App.jsx useEffect
        // This ensures IMMEDIATE and FORCEFUL navigation to dashboard
        
      } else if (result.error) {
        // 🚨 CRITICAL FAILURE PATH: Show error and stay on form
        console.log('🚨 FAILURE: Sign-in failed with error:', result.error);
        
        // 🔥 STEP 3b: Hide loading indicator immediately
        setLoading(false);
        
        // 🔥 STEP 3c: Display user-friendly error message
        let errorMessage = 'Sign-in failed. Please try again later.';
        
        if (result.error.message) {
          const errorMsg = result.error.message.toLowerCase();
          
          if (errorMsg.includes('invalid login credentials') || 
              errorMsg.includes('invalid password') || 
              errorMsg.includes('user not found')) {
            errorMessage = 'Invalid email or password. Please try again.';
          } else if (errorMsg.includes('email not confirmed')) {
            errorMessage = 'Please confirm your email to log in.';
          } else if (errorMsg.includes('too many requests')) {
            errorMessage = 'Too many sign-in attempts. Please wait a moment and try again.';
          } else if (errorMsg.includes('network') || errorMsg.includes('connection')) {
            errorMessage = 'Network error. Please check your connection and try again.';
          }
        }
        
        setError(errorMessage);
        console.error('🚨 Displaying error to user:', errorMessage);
        
        // 🚨 CRITICAL: DO NOT NAVIGATE on failed sign-in
      } else {
        // 🚨 Unexpected case: no user and no error
        console.error('🚨 UNEXPECTED: No user data and no error returned');
        setLoading(false);
        setError('An unexpected error occurred. Please try again later.');
      }
      
    } catch (err) {
      // 🚨 Handle unexpected exceptions
      console.error('🚨 EXCEPTION during sign-in:', err);
      setLoading(false);
      setError('An unexpected error occurred. Please try again later.');
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

        {/* 🚀 CRITICAL: THE SIGN IN BUTTON WITH PRECISE NAVIGATION LOGIC */}
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