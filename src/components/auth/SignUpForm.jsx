import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle, FiCheckCircle } = FiIcons;

const SignUpForm = ({ onToggleMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { signUp } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const { error, data } = await signUp(email, password);

    if (error) {
      let errorMessage = error.message;
      // Make error messages more user-friendly
      if (error.message.includes('already registered')) {
        errorMessage = 'This email is already registered. Please sign in instead.';
      } else if (error.message.includes('valid email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.message.includes('weak password')) {
        errorMessage = 'Your password is too weak. Please choose a stronger password.';
      }
      setError(errorMessage);
    } else {
      // Clear form after successful signup
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      // Email confirmation message
      setSuccess('Account created successfully! Please check your email to confirm your account before logging in.');
      // Don't automatically switch to login form - let user read the confirmation message
    }
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto p-8 glass-effect rounded-3xl shadow-xl"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-indigo-800 mb-2">Join Digit Fun!</h1>
        <p className="text-indigo-600">Create your account to start memorizing numbers</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
            placeholder="Password (min. 6 characters)"
            className="w-full pl-12 pr-12 py-4 bg-white bg-opacity-80 border border-indigo-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
            required
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-indigo-400 hover:text-indigo-600"
          >
            <SafeIcon icon={showPassword ? FiEyeOff : FiEye} size={20} />
          </button>
        </div>

        <div className="relative">
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-indigo-400">
            <SafeIcon icon={FiLock} size={20} />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            className="w-full pl-12 pr-4 py-4 bg-white bg-opacity-80 border border-indigo-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
            required
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-4 rounded-xl shadow-sm">
            <SafeIcon icon={FiAlertCircle} className="text-red-500 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-4 rounded-xl shadow-sm">
            <SafeIcon icon={FiCheckCircle} className="text-green-500 flex-shrink-0" />
            <span className="font-medium">{success}</span>
          </div>
        )}

        <motion.button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-4 rounded-2xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          whileHover={{ y: -2 }}
          whileTap={{ y: 0 }}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
              <span>Creating Account...</span>
            </div>
          ) : (
            'Create Account'
          )}
        </motion.button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-indigo-600">
          Already have an account?{' '}
          <motion.button
            onClick={onToggleMode}
            className="text-indigo-800 hover:text-purple-700 font-semibold"
            whileHover={{ scale: 1.05 }}
          >
            Sign in
          </motion.button>
        </p>
      </div>
    </motion.div>
  );
};

export default SignUpForm;