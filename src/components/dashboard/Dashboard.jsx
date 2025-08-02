import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useSubscription } from '../../hooks/useSubscription';

// Placeholder for your GameCard component. 
// If you have a GameCard.jsx file, you'll need to import it.
// e.g., import GameCard from '../components/ui/GameCard'; // Adjust path as needed
const GameCard = ({ title, description, linkTo, unlocked }) => (
    <div className={`bg-white shadow-md rounded-lg p-4 ${!unlocked ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        {unlocked ? (
            <a href={linkTo} className="text-blue-500 hover:text-blue-700 font-semibold">Play Now</a>
        ) : (
            <p className="text-red-500 font-semibold">Locked</p>
        )}
    </div>
);

const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { subscriptionStatus, plays, loading: subscriptionLoading } = useSubscription();

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

    if (subscriptionLoading || !user) {
        return <div>Loading user and subscription details...</div>;
    }

    const isPremium = subscriptionStatus === 'active';

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
                        <p className="text-gray-600 mb-2">Digit Span Plays Used: {plays.digit_span}/2</p>
                        <p className="text-gray-600 mb-4">Verbal Memory Plays Used: {plays.verbal_memory}/2</p>
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
                    <GameCard
                        title="Digit Span"
                        description="Test your short-term memory by recalling sequences of numbers."
                        linkTo="/digit-span"
                        unlocked={isPremium || (plays && plays.digit_span < 2)}
                    />
                    <GameCard
                        title="Verbal Memory"
                        description="See how many words you can remember from a progressively longer list."
                        linkTo="/verbal-memory"
                        unlocked={isPremium || (plays && plays.verbal_memory < 2)}
                    />
                     <GameCard
                        title="Coming Soon"
                        description="More games are on the way!"
                        linkTo="#"
                        unlocked={false}
                    />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
