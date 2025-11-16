import {
    auth,
    db,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    googleProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    updateProfile,
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from './firebase.js';

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const resetForm = document.getElementById('reset-form');
const authError = document.getElementById('auth-error');
const authSuccess = document.getElementById('auth-success');

// Toggle Forms
document.getElementById('show-register')?.addEventListener('click', () => {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    resetForm.classList.add('hidden');
    clearMessages();
});

document.getElementById('show-login')?.addEventListener('click', () => {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    resetForm.classList.add('hidden');
    clearMessages();
});

document.getElementById('show-forgot-password')?.addEventListener('click', () => {
    loginForm.classList.add('hidden');
    registerForm.classList.add('hidden');
    resetForm.classList.remove('hidden');
    clearMessages();
});

document.getElementById('back-to-login')?.addEventListener('click', () => {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    resetForm.classList.add('hidden');
    clearMessages();
});

// Helper Functions
function showError(message) {
    authError.textContent = message;
    authError.classList.remove('hidden');
    setTimeout(() => authError.classList.add('hidden'), 5000);
}

function showSuccess(message) {
    authSuccess.textContent = message;
    authSuccess.classList.remove('hidden');
    setTimeout(() => authSuccess.classList.add('hidden'), 5000);
}

function clearMessages() {
    authError.classList.add('hidden');
    authSuccess.classList.add('hidden');
}

// Login
document.getElementById('login-form-element')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);

        // Check if admin email and ensure admin role is set
        if (email === 'info@suapaai.com') {
            const userRef = doc(db, 'users', userCredential.user.uid);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists() || userDoc.data().role !== 'admin') {
                // Set or update admin role
                await setDoc(userRef, {
                    uid: userCredential.user.uid,
                    displayName: userCredential.user.displayName,
                    email: email,
                    role: 'admin',
                    lastLogin: serverTimestamp()
                }, { merge: true });
            } else {
                // Just update last login
                await setDoc(userRef, {
                    lastLogin: serverTimestamp()
                }, { merge: true });
            }
        } else {
            // Update last login for regular users
            const userRef = doc(db, 'users', userCredential.user.uid);
            await setDoc(userRef, {
                lastLogin: serverTimestamp()
            }, { merge: true });
        }

        showSuccess('Login successful!');
    } catch (error) {
        console.error('Login error:', error);
        showError(getErrorMessage(error.code));
    }
});

// Register
document.getElementById('register-form-element')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });

        // Determine role based on email
        const role = email === 'info@suapaai.com' ? 'admin' : 'user';

        // Save user data to Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            uid: userCredential.user.uid,
            displayName: name,
            email: email,
            role: role,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp()
        });

        showSuccess('Account created successfully!');
    } catch (error) {
        console.error('Registration error:', error);
        showError(getErrorMessage(error.code));
    }
});

// Google Sign In
document.getElementById('google-login-btn')?.addEventListener('click', async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);

        // Determine role based on email
        const role = result.user.email === 'info@suapaai.com' ? 'admin' : 'user';

        // Save/update user data to Firestore
        const userRef = doc(db, 'users', result.user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // New user - create document
            await setDoc(userRef, {
                uid: result.user.uid,
                displayName: result.user.displayName,
                email: result.user.email,
                photoURL: result.user.photoURL,
                role: role,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
            });
        } else {
            // Existing user - update last login and ensure admin role if needed
            await setDoc(userRef, {
                role: role, // Update role if admin email
                lastLogin: serverTimestamp()
            }, { merge: true });
        }

        showSuccess('Login successful!');
    } catch (error) {
        console.error('Google login error:', error);
        showError(getErrorMessage(error.code));
    }
});

// Password Reset
document.getElementById('reset-form-element')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('reset-email').value;

    try {
        await sendPasswordResetEmail(auth, email);
        showSuccess('Password reset email sent! Check your inbox.');
    } catch (error) {
        console.error('Password reset error:', error);
        showError(getErrorMessage(error.code));
    }
});

// Logout
document.getElementById('logout-btn')?.addEventListener('click', async () => {
    try {
        await signOut(auth);
        showSuccess('Logged out successfully!');
    } catch (error) {
        console.error('Logout error:', error);
        showError('Failed to logout. Please try again.');
    }
});

// Auth State Observer
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is signed in
        authScreen.classList.add('hidden');
        dashboardScreen.classList.remove('hidden');

        // Retrieve user data from Firestore
        try {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);

            let userData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                role: 'user'
            };

            if (userSnap.exists()) {
                userData = { ...userData, ...userSnap.data() };
            }

            // Redirect to admin page if user is admin
            if (userData.role === 'admin' && !window.location.pathname.includes('admin.html')) {
                window.location.href = 'admin.html';
                return;
            }

            // Set user name in dashboard
            const userName = document.getElementById('user-name');
            if (userName) {
                userName.textContent = userData.displayName || userData.email;
            }

            // Show admin link if user is admin
            const adminLink = document.getElementById('admin-link');
            if (adminLink && userData.role === 'admin') {
                adminLink.classList.remove('hidden');
            }

            // Store user info in localStorage
            localStorage.setItem('user', JSON.stringify(userData));

            // Dispatch custom event with user data
            window.dispatchEvent(new CustomEvent('userDataLoaded', { detail: userData }));
        } catch (error) {
            console.error('Error fetching user data:', error);

            // Fallback to basic user info
            const userName = document.getElementById('user-name');
            if (userName) {
                userName.textContent = user.displayName || user.email;
            }

            localStorage.setItem('user', JSON.stringify({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                role: 'user'
            }));
        }
    } else {
        // User is signed out
        authScreen.classList.remove('hidden');
        dashboardScreen.classList.add('hidden');
        localStorage.removeItem('user');
    }
});

// Profile Menu Toggle
document.getElementById('profile-menu-btn')?.addEventListener('click', () => {
    const menu = document.getElementById('profile-menu');
    menu.classList.toggle('hidden');
});

// Close profile menu when clicking outside
document.addEventListener('click', (e) => {
    const menu = document.getElementById('profile-menu');
    const btn = document.getElementById('profile-menu-btn');
    if (!btn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.add('hidden');
    }
});

// Error Messages
function getErrorMessage(errorCode) {
    const errorMessages = {
        'auth/invalid-email': 'Invalid email address.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/email-already-in-use': 'Email already in use.',
        'auth/weak-password': 'Password should be at least 6 characters.',
        'auth/network-request-failed': 'Network error. Please check your connection.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/popup-closed-by-user': 'Sign-in popup was closed.',
        'auth/cancelled-popup-request': 'Sign-in cancelled.',
        'auth/unauthorized-domain': 'This domain is not authorized. Add it in Firebase Console.',
        'auth/popup-blocked': 'Popup was blocked by browser. Please allow popups.',
        'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.'
    };

    return errorMessages[errorCode] || `An error occurred: ${errorCode || 'Unknown error'}. Please try again.`;
}

// Theme Toggle
const themeToggle = document.getElementById('theme-toggle');
const htmlElement = document.documentElement;

// Force light mode on initial load
const savedTheme = localStorage.getItem('theme') || 'light';

// Ensure we start in the correct mode
if (savedTheme === 'dark') {
    htmlElement.classList.add('dark');
} else {
    htmlElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
}

// Theme toggle functionality
themeToggle?.addEventListener('click', () => {
    if (htmlElement.classList.contains('dark')) {
        htmlElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else {
        htmlElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }
});
