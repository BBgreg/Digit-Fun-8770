import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import supabase from '../../lib/supabase';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiUsers, FiMail, FiCheck, FiX, FiRefreshCw, FiDollarSign } = FiIcons;

const UserProfilesViewer = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    paid: 0,
    free: 0
  });

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all user profiles with subscription data
      const { data, error: fetchError } = await supabase
        .from('app_users_profile')
        .select(`
          *,
          user_subscriptions (
            subscription_status,
            free_games_played,
            stripe_customer_id,
            current_period_end
          )
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setProfiles(data || []);

      // Calculate stats
      const totalUsers = data?.length || 0;
      const paidUsers = data?.filter(profile => profile.has_paid).length || 0;
      const freeUsers = totalUsers - paidUsers;

      setStats({
        total: totalUsers,
        paid: paidUsers,
        free: freeUsers
      });

    } catch (err) {
      console.error('Error fetching user profiles:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-indigo-200 border-t-indigo-500 rounded-full mx-auto mb-4"></div>
          <p className="text-indigo-600">Loading user profiles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-3xl shadow-xl">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-red-800 mb-4">Error Loading Profiles</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <button
            onClick={fetchProfiles}
            className="bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-container">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-indigo-800 flex items-center gap-3">
              <SafeIcon icon={FiUsers} size={32} />
              User Profiles Dashboard
            </h1>
            <p className="text-indigo-600 mt-2">
              Overview of all Digit Fun users and their subscription status
            </p>
          </div>
          <button
            onClick={fetchProfiles}
            className="p-3 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow text-indigo-600 hover:text-indigo-800"
          >
            <SafeIcon icon={FiRefreshCw} size={20} />
          </button>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-3xl text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Users</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <SafeIcon icon={FiUsers} size={32} className="text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-3xl text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Paid Users</p>
                <p className="text-3xl font-bold">{stats.paid}</p>
              </div>
              <SafeIcon icon={FiDollarSign} size={32} className="text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-red-600 p-6 rounded-3xl text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Free Trial</p>
                <p className="text-3xl font-bold">{stats.free}</p>
              </div>
              <SafeIcon icon={FiUsers} size={32} className="text-orange-200" />
            </div>
          </div>
        </motion.div>

        {/* User Profiles Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl shadow-lg overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">All User Profiles</h2>
            <p className="text-gray-600 text-sm mt-1">
              Complete list of users with subscription details
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Games Played
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Subscription
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {profiles.map((profile, index) => (
                  <motion.tr
                    key={profile.user_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <SafeIcon icon={FiMail} size={16} className="text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {profile.email}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {profile.user_id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {profile.has_paid ? (
                          <div className="flex items-center gap-2">
                            <SafeIcon icon={FiCheck} size={16} className="text-green-500" />
                            <span className="text-sm font-medium text-green-800 bg-green-100 px-2 py-1 rounded-full">
                              Paid
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <SafeIcon icon={FiX} size={16} className="text-orange-500" />
                            <span className="text-sm font-medium text-orange-800 bg-orange-100 px-2 py-1 rounded-full">
                              Free Trial
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {profile.user_subscriptions?.[0]?.free_games_played || 0} / 6
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(profile.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {profile.user_subscriptions?.[0]?.subscription_status || 'free_trial'}
                        </div>
                        {profile.user_subscriptions?.[0]?.current_period_end && (
                          <div className="text-xs text-gray-500">
                            Expires: {formatDate(profile.user_subscriptions[0].current_period_end)}
                          </div>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {profiles.length === 0 && (
            <div className="text-center py-12">
              <SafeIcon icon={FiUsers} size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Users Found</h3>
              <p className="text-gray-500">No user profiles have been created yet.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default UserProfilesViewer;