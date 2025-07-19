import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePhoneNumbers } from '../../hooks/usePhoneNumbers';
import { useAuth } from '../../contexts/AuthContext';
import { formatPhoneNumber } from '../../utils/formatters';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import Confetti from '../../components/ui/Confetti';

const { FiArrowLeft, FiEdit2, FiTrash2, FiLogOut, FiCheck, FiAlertCircle, FiShield, FiRefreshCw, FiPlus } = FiIcons;

const NumbersList = ({ onNavigate }) => {
  const { phoneNumbers, loading, error, deletePhoneNumber, refetch } = usePhoneNumbers();
  const { user, signOut } = useAuth();
  const [successMessage, setSuccessMessage] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteInProgress, setDeleteInProgress] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Check for success message when component mounts or is navigated to
  useEffect(() => {
    // Check if there's a success message in session storage
    const message = sessionStorage.getItem('successMessage');
    if (message) {
      setSuccessMessage(message);
      setShowConfetti(true);
      sessionStorage.removeItem('successMessage');
      
      // Clear success message after 3 seconds
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
      // Hide confetti after 4 seconds
      const confettiTimer = setTimeout(() => {
        setShowConfetti(false);
      }, 4000);
      
      return () => {
        clearTimeout(timer);
        clearTimeout(confettiTimer);
      };
    }
  }, []);

  // Handle manual refresh with visual feedback
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    // Ensure the refreshing state lasts at least 500ms for visual feedback
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this number?')) {
      setDeleteInProgress(id);
      try {
        const result = await deletePhoneNumber(id);
        if (result.success) {
          setSuccessMessage('Phone number deleted successfully');
          setTimeout(() => setSuccessMessage(''), 3000);
        }
      } finally {
        setDeleteInProgress(null);
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen">
      {showConfetti && <Confetti />}
      
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <motion.button
              onClick={() => onNavigate('dashboard')}
              className="p-3 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow text-indigo-600 hover:text-indigo-800 btn-bounce"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <SafeIcon icon={FiArrowLeft} size={20} />
            </motion.button>
            <div>
              <h1 className="text-3xl font-bold app-title">My Numbers</h1>
              <p className="text-lg app-tagline">
                Manage your saved phone numbers
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              disabled={loading || isRefreshing}
              className={`p-2 rounded-full ${isRefreshing ? 'bg-indigo-100' : 'bg-transparent'} text-indigo-600 hover:bg-indigo-50 transition-colors`}
              aria-label="Refresh"
            >
              <SafeIcon 
                icon={FiRefreshCw} 
                size={18} 
                className={isRefreshing ? 'animate-spin' : ''} 
              />
            </button>
            <button
              onClick={handleSignOut}
              className="p-3 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow text-indigo-600 hover:text-indigo-800"
            >
              <SafeIcon icon={FiLogOut} size={20} />
            </button>
          </div>
        </motion.div>

        {user && (
          <div className="flex items-center gap-2 mb-6 px-4 py-2 bg-white bg-opacity-70 backdrop-filter backdrop-blur-lg rounded-full shadow-sm inline-block">
            <SafeIcon icon={FiShield} size={16} className="text-indigo-500" />
            <span className="text-sm text-indigo-800">{user.email}</span>
          </div>
        )}

        {/* Success Message */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 bg-green-100 text-green-800 p-4 rounded-2xl mb-6 shadow-md"
            >
              <SafeIcon icon={FiCheck} className="text-green-600" />
              <span className="font-medium">{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading, Error or Content */}
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center items-center py-10 mb-6"
          >
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
              <p className="text-indigo-700 font-medium text-lg">Loading your numbers...</p>
            </div>
          </motion.div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-red-100 text-red-800 p-4 rounded-2xl mb-6 shadow-md"
          >
            <SafeIcon icon={FiAlertCircle} className="text-red-600 flex-shrink-0" />
            <span>Error loading your numbers: {error}</span>
            <button
              onClick={handleRefresh}
              className="ml-auto bg-red-200 px-3 py-1 rounded-xl text-sm hover:bg-red-300 flex items-center gap-1"
            >
              <SafeIcon icon={FiRefreshCw} size={14} />
              <span>Retry</span>
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            {/* Empty state - no phone numbers */}
            {phoneNumbers.length === 0 && (
              <div className="text-center py-12">
                <motion.div 
                  className="w-24 h-24 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 2,
                    ease: "easeInOut" 
                  }}
                >
                  <SafeIcon icon={FiPlus} size={40} className="text-white" />
                </motion.div>
                <h3 className="text-2xl font-bold text-indigo-800 mb-3 app-title">No numbers yet</h3>
                <p className="text-lg text-indigo-600 mb-3 app-tagline">Add your first phone number to start playing games</p>
                <p className="text-sm text-indigo-500 mb-6">
                  Your numbers are private and only visible to you
                </p>
                <motion.button
                  onClick={() => onNavigate('add-number')}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl btn-bounce btn-glow"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Add Your First Number
                </motion.button>
              </div>
            )}

            {/* Phone number list */}
            {phoneNumbers.length > 0 && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white bg-opacity-70 backdrop-filter backdrop-blur-lg rounded-full shadow-sm">
                    <SafeIcon icon={FiShield} size={16} className="text-indigo-500" />
                    <span className="text-sm text-indigo-800">
                      Showing {phoneNumbers.length} number{phoneNumbers.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <motion.button
                    onClick={() => onNavigate('add-number')}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-2xl font-semibold shadow-md hover:shadow-lg flex items-center gap-2 btn-bounce btn-glow"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <SafeIcon icon={FiPlus} size={18} />
                    <span>Add Number</span>
                  </motion.button>
                </div>
                
                {phoneNumbers.map((number, index) => (
                  <motion.div
                    key={number.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="glass-effect p-6 rounded-3xl shadow-md hover:shadow-lg transition-all"
                    whileHover={{ y: -3 }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-indigo-800 mb-1">
                          {number.contact_name}
                        </h3>
                        <p className="text-indigo-600 text-lg font-mono">
                          {formatPhoneNumber(number.phone_number_digits)}
                        </p>
                        <p className="text-xs text-indigo-400 mt-1">
                          Added: {new Date(number.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <motion.button
                          onClick={() => onNavigate('edit-number', number)}
                          className="p-3 bg-indigo-100 rounded-2xl hover:bg-indigo-200 transition-colors text-indigo-600 shadow-sm hover:shadow"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <SafeIcon icon={FiEdit2} size={18} />
                        </motion.button>
                        <motion.button
                          onClick={() => handleDelete(number.id)}
                          disabled={deleteInProgress === number.id}
                          className={`p-3 ${deleteInProgress === number.id ? 'bg-gray-100 text-gray-400' : 'bg-red-100 text-red-600 hover:bg-red-200'} rounded-2xl transition-colors shadow-sm hover:shadow`}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          {deleteInProgress === number.id ? (
                            <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                          ) : (
                            <SafeIcon icon={FiTrash2} size={18} />
                          )}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default NumbersList;