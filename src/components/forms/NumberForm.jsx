import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { usePhoneNumbers } from '../../hooks/usePhoneNumbers';
import { useAuth } from '../../contexts/AuthContext';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import Confetti from '../../components/ui/Confetti';

const { FiArrowLeft, FiUser, FiPhone, FiSave, FiAlertCircle, FiCheckCircle, FiShield } = FiIcons;

const NumberForm = ({ onNavigate, editingNumber = null }) => {
  const [name, setName] = useState(editingNumber?.contact_name || '');
  const [number, setNumber] = useState(editingNumber?.phone_number_digits || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [redirectTimer, setRedirectTimer] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const { addPhoneNumber, updatePhoneNumber } = usePhoneNumbers();
  const { user } = useAuth();

  // Clear any redirect timers when component unmounts
  useEffect(() => {
    return () => {
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [redirectTimer]);

  const handleNumberChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      setNumber(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!user) {
      setError('You must be logged in to save phone numbers');
      return;
    }

    if (number.length !== 10) {
      setError('Phone number must be exactly 10 digits');
      return;
    }

    setLoading(true);

    try {
      console.log('Saving phone number for user:', user.id);
      
      const result = editingNumber 
        ? await updatePhoneNumber(editingNumber.id, name, number)
        : await addPhoneNumber(name, number);

      if (result.success) {
        const message = editingNumber ? 'Number updated successfully!' : 'Number saved successfully!';
        setSuccess(message);
        setShowConfetti(true);
        
        // Store success message for dashboard
        sessionStorage.setItem('successMessage', message);
        
        // Set a timer to navigate back to dashboard
        const timer = setTimeout(() => {
          onNavigate('dashboard');
        }, 1500);
        setRedirectTimer(timer);
      } else {
        setError(result.error || 'Failed to save number. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Error saving number:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDisplayNumber = (num) => {
    if (num.length <= 3) return num;
    if (num.length <= 6) return `(${num.slice(0, 3)}) ${num.slice(3)}`;
    return `(${num.slice(0, 3)}) ${num.slice(3, 6)}-${num.slice(6)}`;
  };

  const handleCancel = () => {
    // Cancel any pending redirect
    if (redirectTimer) clearTimeout(redirectTimer);
    onNavigate('dashboard');
  };

  return (
    <div className="min-h-screen">
      {showConfetti && <Confetti />}
      
      <div className="max-w-2xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <motion.button
            onClick={handleCancel}
            className="p-3 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow text-indigo-600 hover:text-indigo-800"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <SafeIcon icon={FiArrowLeft} size={20} />
          </motion.button>
          <div>
            <h1 className="text-3xl font-bold app-title">
              {editingNumber ? 'Edit Number' : 'Add New Number'}
            </h1>
            <p className="text-lg app-tagline">
              {editingNumber ? 'Update your contact information' : 'Add a new phone number to memorize'}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-effect p-8 rounded-3xl shadow-lg"
        >
          {user && (
            <div className="flex items-center gap-2 mb-6 px-4 py-2 bg-white bg-opacity-70 backdrop-filter backdrop-blur-lg rounded-full shadow-sm inline-block">
              <SafeIcon icon={FiShield} size={16} className="text-indigo-500" />
              <span className="text-sm text-indigo-800">This number will be private to your account</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <label className="block text-sm font-medium text-indigo-700 mb-2">
                Contact Name
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-indigo-400">
                  <SafeIcon icon={FiUser} size={20} />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter contact name"
                  className="w-full pl-12 pr-4 py-4 bg-white bg-opacity-70 border border-indigo-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                  required
                />
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-indigo-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-indigo-400">
                  <SafeIcon icon={FiPhone} size={20} />
                </div>
                <input
                  type="tel"
                  value={formatDisplayNumber(number)}
                  onChange={handleNumberChange}
                  placeholder="(555) 123-4567"
                  className="w-full pl-12 pr-4 py-4 bg-white bg-opacity-70 border border-indigo-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-lg shadow-sm"
                  required
                />
              </div>
              <p className="text-sm text-indigo-500 mt-2">
                Enter exactly 10 digits (numbers only)
              </p>
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

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-4 rounded-xl shadow-sm"
              >
                <SafeIcon icon={FiCheckCircle} className="text-green-500 flex-shrink-0" />
                <span className="font-medium">{success}</span>
                <div className="ml-auto text-xs text-green-600 font-medium">
                  Redirecting to dashboard...
                </div>
              </motion.div>
            )}

            <div className="flex gap-4 pt-4">
              <motion.button
                type="button"
                onClick={handleCancel}
                className="flex-1 bg-gray-100 text-indigo-700 py-4 rounded-2xl font-semibold hover:bg-gray-200 transition-colors shadow-md"
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
              >
                Cancel
              </motion.button>

              <motion.button
                type="submit"
                disabled={loading || !name.trim() || number.length !== 10}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-4 rounded-2xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <SafeIcon icon={FiSave} size={20} />
                    <span>{editingNumber ? 'Update' : 'Save'}</span>
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default NumberForm;