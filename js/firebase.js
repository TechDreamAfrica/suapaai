// Firebase Configuration
// Configuration is loaded from Google Drive with fallback to local
import { getConfig } from './config-loader.js';

// Import Firebase modules from CDN
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    getDoc,
    setDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import {
    getFunctions,
    httpsCallable
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js';

// Initialize Firebase with async config loading
let app, auth, db, functions, googleProvider;
let firebaseInitialized = false;
let initializationPromise = null;

async function initializeFirebase() {
    if (firebaseInitialized) {
        return { app, auth, db, functions, googleProvider };
    }

    if (initializationPromise) {
        return initializationPromise;
    }

    initializationPromise = (async () => {
        try {
            console.log('🔥 Initializing Firebase...');
            const config = await getConfig();

            app = initializeApp(config.firebase);
            auth = getAuth(app);
            db = getFirestore(app);
            functions = getFunctions(app);
            googleProvider = new GoogleAuthProvider();

            firebaseInitialized = true;
            console.log('✅ Firebase initialized successfully');

            return { app, auth, db, functions, googleProvider };
        } catch (error) {
            console.error('❌ Firebase initialization failed:', error);
            throw error;
        } finally {
            initializationPromise = null;
        }
    })();

    return initializationPromise;
}

// Auto-initialize on module load
const firebaseReady = initializeFirebase();

// Export Firebase services and initialization
export {
    auth,
    db,
    functions,
    googleProvider,
    firebaseReady,
    initializeFirebase,
    httpsCallable,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    updateProfile,
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    getDoc,
    setDoc
};
