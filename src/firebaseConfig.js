// src/firebaseConfig.js

// Import the core Firebase functions
import { initializeApp } from "firebase/app";

// Import the specific Firebase services you'll need
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's unique Firebase configuration keys
const firebaseConfig = {
  apiKey: "AIzaSyC_4SWE_MiNbOyHVnI36kkgqb0ZhCmGrOM",
  authDomain: "digit-fun.firebaseapp.com",
  projectId: "digit-fun",
  storageBucket: "digit-fun.firebasestorage.app",
  messagingSenderId: "366481807227",
  appId: "1:366481807227:web:ae35d282417236ab248fde"
};

// Initialize the main Firebase app instance
const app = initializeApp(firebaseConfig);

// Initialize and export Firebase services for use throughout your app
export const auth = getAuth(app);
export const db = getFirestore(app);
