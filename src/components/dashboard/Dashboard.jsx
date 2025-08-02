import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
// import { useSubscription } from '../../hooks/useSubscription'; // Temporarily commented out for diagnostics

// --- DIAGNOSTIC VERSION ---
// The following code is simplified to isolate the build error.
// Functionality related to subscriptions and game cards has been removed.

const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    // const { subscriptionStatus, plays, loading: subscriptionLoading } = useSubscription(); // Temporarily removed

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setUser(session.user);
            } else {
                navigate('/login');
            }
        };
        fetchUser();
    }, [navigate]);

    const handleUpgrade = async () => {
        setLoading(true);
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) throw sessionError;
            if (!session) throw new Error("User is not authenticated.");

            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                    },
                }
            );

            const data = await response.json();

            if (response.ok) {
                window.location.href = data.url;
            } else {
                console.error('Error creating checkout session:', data.error);
            }
        } catch (error) {
            console.error('An unexpected error occurred:', error);
        } finally {
            setLoading(false);
        }
    };

    // Simplified loading state
    if (!user) {
        return <div>Loading user details...</div>;
    }

    // Forcing isPremium to false for this diagnostic version
    const isPremium = false;

    return (
        <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Welcome, {user?.email}</h1>
                    <button
                        onClick={() => supabase.auth.signOut().then(() => navigate('/login'))}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                    >
                        Sign Out
                    </button>
                </div>

                {!isPremium && (
                    <div className="bg-white shadow-lg rounded-lg p-6 mb-8 border border-blue-200">
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Upgrade to Unlimited</h2>
                        <p className="text-gray-600 mb-4">You are on the free plan. Upgrade now for unlimited access to all games and features.</p>
                        {/* Play counts removed temporarily */}
                        <button
                            onClick={handleUpgrade}
                            disabled={loading}
                            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300 disabled:bg-blue-300"
                        >
                            {loading ? 'Processing...' : 'Upgrade Now for $2.99/month'}
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {/* GameCards removed temporarily for diagnostics */}
                   <div className="bg-white shadow-md rounded-lg p-4">
                        <h3 className="text-lg font-bold">Games Temporarily Hidden</h3>
                        <p className="text-gray-600">Running diagnostics...</p>
                   </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
