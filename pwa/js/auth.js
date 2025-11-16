import {
    auth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    signInWithPopup,
    googleProvider,
    sendPasswordResetEmail,
    updateProfile
} from './firebase.js';

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const resetForm = document.getElementById('reset-form');
const authError = document.getElementById('auth-error');
const authSuccess = document.getElementById('auth-success');

// Form toggle buttons
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

// Login Form
document.getElementById('login-form-element')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        showLoading(true);
        await signInWithEmailAndPassword(auth, email, password);
        showSuccess('Login successful!');
    } catch (error) {
        showError(getErrorMessage(error.code));
    } finally {
        showLoading(false);
    }
});

// Register Form
document.getElementById('register-form-element')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        showLoading(true);
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        // Update profile with name
        await updateProfile(userCredential.user, {
            displayName: name
        });

        showSuccess('Account created successfully!');
    } catch (error) {
        showError(getErrorMessage(error.code));
    } finally {
        showLoading(false);
    }
});

// Google Login
document.getElementById('google-login-btn')?.addEventListener('click', async () => {
    clearMessages();

    try {
        showLoading(true);
        await signInWithPopup(auth, googleProvider);
        showSuccess('Login successful!');
    } catch (error) {
        showError(getErrorMessage(error.code));
    } finally {
        showLoading(false);
    }
});

// Password Reset
document.getElementById('reset-form-element')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const email = document.getElementById('reset-email').value;

    try {
        showLoading(true);
        await sendPasswordResetEmail(auth, email);
        showSuccess('Password reset email sent! Check your inbox.');
    } catch (error) {
        showError(getErrorMessage(error.code));
    } finally {
        showLoading(false);
    }
});

// Auth State Observer
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('User logged in:', user.email);
        showApp(user);
    } else {
        console.log('User logged out');
        showAuth();
    }
});

// Show/Hide screens
function showAuth() {
    authScreen.classList.add('active');
    appScreen.classList.remove('active');
}

function showApp(user) {
    authScreen.classList.remove('active');
    appScreen.classList.add('active');

    // Update user info in drawer
    const drawerUserName = document.getElementById('drawer-user-name');
    const drawerUserEmail = document.getElementById('drawer-user-email');
    const userDisplayName = document.getElementById('user-display-name');

    if (drawerUserName) drawerUserName.textContent = user.displayName || 'User';
    if (drawerUserEmail) drawerUserEmail.textContent = user.email;
    if (userDisplayName) userDisplayName.textContent = `Welcome, ${user.displayName || 'User'}!`;
}

// Logout
document.getElementById('logout-btn')?.addEventListener('click', async () => {
    try {
        showLoading(true);
        await signOut(auth);
        if (window.PWA) {
            window.PWA.showToast('Logged out successfully', 'success');
        }
    } catch (error) {
        showError('Logout failed. Please try again.');
    } finally {
        showLoading(false);
    }
});

document.getElementById('drawer-logout')?.addEventListener('click', async () => {
    try {
        showLoading(true);
        await signOut(auth);
        closeDrawer();
        if (window.PWA) {
            window.PWA.showToast('Logged out successfully', 'success');
        }
    } catch (error) {
        showError('Logout failed. Please try again.');
    } finally {
        showLoading(false);
    }
});

// Helper functions
function showError(message) {
    if (authError) {
        authError.textContent = message;
        authError.classList.remove('hidden');
    }
}

function showSuccess(message) {
    if (authSuccess) {
        authSuccess.textContent = message;
        authSuccess.classList.remove('hidden');
    }
}

function clearMessages() {
    if (authError) authError.classList.add('hidden');
    if (authSuccess) authSuccess.classList.add('hidden');
}

function showLoading(show) {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        if (show) {
            loadingOverlay.classList.remove('hidden');
        } else {
            loadingOverlay.classList.add('hidden');
        }
    }
}

function getErrorMessage(errorCode) {
    const errorMessages = {
        'auth/email-already-in-use': 'This email is already registered.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/operation-not-allowed': 'Operation not allowed. Please enable this sign-in method in Firebase Console.',
        'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
        'auth/network-request-failed': 'Network error. Check your connection.',
        'auth/popup-closed-by-user': 'Sign-in popup was closed.',
        'auth/cancelled-popup-request': 'Sign-in cancelled.',
        'auth/unauthorized-domain': 'This domain is not authorized. Add it in Firebase Console.',
        'auth/popup-blocked': 'Popup was blocked by browser. Please allow popups.',
        'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.'
    };

    return errorMessages[errorCode] || `An error occurred: ${errorCode || 'Unknown error'}. Please try again.`;
}

function closeDrawer() {
    const drawer = document.getElementById('drawer');
    const overlay = document.getElementById('drawer-overlay');
    if (drawer) drawer.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
}

export { auth, showLoading };
