// src/App.jsx
import React, { useState, useEffect } from 'react';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from './firebaseConfig'; // Import our configured auth instance
import './App.css'; // Assuming you have this file for styling

function App() {
  const [user, setUser] = useState(null); // State to hold the logged-in user object

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);


  const handleGoogleSignIn = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
      .then((result) => {
        const user = result.user;
        console.log("Welcome!", user.displayName);
      }).catch((error) => {
        console.error("Authentication error:", error);
      });
  };

  const handleSignOut = () => {
    signOut(auth).then(() => {
      console.log("User signed out.");
    }).catch((error) => {
      console.error("Sign out error:", error);
    });
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Digit Fun</h1>
        {user ? (
          <div>
            <p>Welcome, {user.displayName}!</p>
            <p>({user.email})</p>
            <button onClick={handleSignOut}>Sign Out</button>
          </div>
        ) : (
          <button onClick={handleGoogleSignIn}>Sign in with Google</button>
        )}
        
        <hr />

        {/* Your Game Modes would go here */}
        
      </header>
    </div>
  );
}

export default App;