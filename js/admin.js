import {
    auth,
    db,
    functions,
    httpsCallable,
    onAuthStateChanged,
    signOut,
    collection,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    setDoc,
    query,
    orderBy,
    getDoc,
    serverTimestamp
} from './firebase.js';

import { showNotification } from './utils.js';

// DOM Elements
const authCheck = document.getElementById('auth-check');
const adminDashboard = document.getElementById('admin-dashboard');
const noAccess = document.getElementById('no-access');
const usersTableBody = document.getElementById('users-table-body');
const editModal = document.getElementById('edit-user-modal');
const editForm = document.getElementById('edit-user-form');
const addModal = document.getElementById('add-user-modal');
const addForm = document.getElementById('add-user-form');
const searchInput = document.getElementById('search-users');
const roleFilter = document.getElementById('role-filter');

let allUsers = [];
let filteredUsers = [];
let currentPage = 1;
const usersPerPage = 10;

// Check authentication and admin role
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Check if user is admin
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (userDoc.exists() && userDoc.data().role === 'admin') {
            // User is admin
            authCheck.classList.add('hidden');
            adminDashboard.classList.remove('hidden');

            // Set admin name
            const adminName = document.getElementById('admin-name');
            if (adminName) {
                adminName.textContent = user.displayName || user.email;
            }

            // Load dashboard data
            await loadUsers();
            updateStats();
        } else {
            // User is not admin
            authCheck.classList.add('hidden');
            noAccess.classList.remove('hidden');
        }
    } else {
        // Not logged in - redirect to dashboard
        window.location.href = 'dashboard.html';
    }
});

// Load all users from Firestore
async function loadUsers() {
    try {
        const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(usersQuery);

        allUsers = [];
        querySnapshot.forEach((doc) => {
            allUsers.push({
                id: doc.id,
                ...doc.data()
            });
        });

        filteredUsers = [...allUsers];
        renderUsers();

        // Show helpful message if no users found
        if (allUsers.length === 0) {
            showNotification('No users found in database. Click "Sync from Auth" to import users from Firebase Authentication, or manually add users.', 'info');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Failed to load users', 'error');
    }
}

// Refresh users from Firebase Authentication and sync to Firestore
async function syncAuthUsers() {
    const syncBtn = document.getElementById('sync-users-btn');
    const originalHTML = syncBtn.innerHTML;

    try {
        // Show loading state
        syncBtn.disabled = true;
        syncBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing from Auth...';

        // Try to call Firebase Function first
        try {
            const syncFunction = httpsCallable(functions, 'syncAuthUsersToFirestore');
            const result = await syncFunction();

            if (result.data.success) {
                // Reload users from Firestore after sync
                await loadUsers();
                updateStats();

                const { syncedCount, updatedCount, totalProcessed, errors } = result.data;
                
                let message = `Successfully synced ${totalProcessed} users from Firebase Authentication! `;
                message += `(${syncedCount} new, ${updatedCount} updated)`;
                
                if (errors && errors.length > 0) {
                    message += ` Note: ${errors.length} users had sync errors.`;
                    console.warn('Sync errors:', errors);
                }

                showNotification(message, 'success');
                return;
            } else {
                throw new Error(result.data.message || 'Sync failed');
            }
        } catch (functionError) {
            console.warn('Firebase Function not available:', functionError);
            
            // Fallback: Just reload existing users from Firestore
            await loadUsers();
            updateStats();
            
            let errorMessage = 'Firebase Functions not deployed. ';
            if (functionError.code === 'functions/not-found') {
                errorMessage += 'Please deploy Firebase Functions to enable Authentication sync. ';
                errorMessage += 'Currently showing users from Firestore database only.';
            } else if (functionError.code === 'functions/permission-denied') {
                errorMessage += 'You need admin permissions to sync users.';
            } else if (functionError.code === 'functions/unauthenticated') {
                errorMessage += 'Please sign in to sync users.';
            } else {
                errorMessage += 'Showing existing users from database. ';
                errorMessage += 'To sync from Firebase Authentication, ensure Functions are deployed.';
            }
            
            showNotification(errorMessage, 'warning');
        }
    } catch (error) {
        console.error('Error in sync process:', error);
        showNotification('Failed to load users: ' + (error.message || 'Unknown error'), 'error');
    } finally {
        // Reset button state
        syncBtn.disabled = false;
        syncBtn.innerHTML = originalHTML;
    }
}

// Render users table
function renderUsers() {
    const start = (currentPage - 1) * usersPerPage;
    const end = start + usersPerPage;
    const paginatedUsers = filteredUsers.slice(start, end);

    if (paginatedUsers.length === 0) {
        usersTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <i class="fas fa-users-slash text-3xl mb-2"></i>
                    <p>No users found</p>
                </td>
            </tr>
        `;
        return;
    }

    usersTableBody.innerHTML = paginatedUsers.map(user => `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                        ${user.photoURL
                ? `<img class="h-10 w-10 rounded-full" src="${user.photoURL}" alt="">`
                : `<div class="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-semibold">${(user.displayName || user.email || 'U')[0].toUpperCase()}</div>`
            }
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900 dark:text-white">
                            ${user.displayName || 'Unknown'}
                            ${user.syncedFromAuth ? '<i class="fas fa-check-circle text-green-500 ml-1" title="Synced from Firebase Authentication"></i>' : ''}
                        </div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">
                            UID: ${user.uid || user.id}
                        </div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900 dark:text-white">${user.email}</div>
                ${user.syncedFromAuth && user.syncedAt ? 
                    `<div class="text-xs text-gray-500 dark:text-gray-400">
                        Synced: ${formatDate(user.syncedAt.toDate ? user.syncedAt.toDate() : new Date(user.syncedAt))}
                    </div>` : ''
                }
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin'
            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
        }">
                    ${user.role || 'user'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                ${user.createdAt ? formatDate(user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt)) : 'N/A'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                ${user.lastLogin ? formatDate(user.lastLogin.toDate ? user.lastLogin.toDate() : new Date(user.lastLogin)) : 'N/A'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onclick="editUser('${user.id}')" class="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400 mr-3">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteUser('${user.id}')" class="text-red-600 hover:text-red-900 dark:hover:text-red-400">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');

    // Update pagination info
    document.getElementById('showing-count').textContent = Math.min(end, filteredUsers.length);
    document.getElementById('total-count').textContent = filteredUsers.length;

    // Update pagination buttons
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = end >= filteredUsers.length;
}

// Format date
function formatDate(date) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Edit user
window.editUser = async function (userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('edit-user-id').value = userId;
    document.getElementById('edit-user-name').value = user.displayName || '';
    document.getElementById('edit-user-email').value = user.email || '';
    document.getElementById('edit-user-role').value = user.role || 'user';

    editModal.classList.remove('hidden');
};

// Delete user
window.deleteUser = async function (userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }

    try {
        await deleteDoc(doc(db, 'users', userId));
        showNotification('User deleted successfully', 'success');
        await loadUsers();
        updateStats();
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Failed to delete user', 'error');
    }
};

// Save user changes
editForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const userId = document.getElementById('edit-user-id').value;
    const displayName = document.getElementById('edit-user-name').value;
    const role = document.getElementById('edit-user-role').value;

    try {
        await updateDoc(doc(db, 'users', userId), {
            displayName,
            role
        });

        showNotification('User updated successfully', 'success');
        editModal.classList.add('hidden');
        await loadUsers();
        updateStats();
    } catch (error) {
        console.error('Error updating user:', error);
        showNotification('Failed to update user', 'error');
    }
});

// Add user form submission
addForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const displayName = document.getElementById('add-user-name').value;
    const email = document.getElementById('add-user-email').value;
    const role = document.getElementById('add-user-role').value;

    try {
        // Generate a unique ID for the user (since we don't have Firebase Auth UID)
        const userId = 'manual_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        await setDoc(doc(db, 'users', userId), {
            uid: userId,
            displayName,
            email,
            role,
            createdAt: serverTimestamp(),
            lastLogin: null,
            syncedFromAuth: false,
            manuallyCreated: true,
            createdBy: auth.currentUser?.uid
        });

        showNotification('User added successfully', 'success');
        addModal.classList.add('hidden');
        addForm.reset();
        await loadUsers();
        updateStats();
    } catch (error) {
        console.error('Error adding user:', error);
        showNotification('Failed to add user', 'error');
    }
});

// Cancel edit
document.getElementById('cancel-edit-btn')?.addEventListener('click', () => {
    editModal.classList.add('hidden');
});

// Cancel add
document.getElementById('cancel-add-btn')?.addEventListener('click', () => {
    addModal.classList.add('hidden');
    addForm.reset();
});

// Add user button
document.getElementById('add-user-btn')?.addEventListener('click', () => {
    addModal.classList.remove('hidden');
});

// Sync users button
document.getElementById('sync-users-btn')?.addEventListener('click', syncAuthUsers);

// Search users
searchInput?.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();

    filteredUsers = allUsers.filter(user => {
        const matchesSearch = (user.displayName || '').toLowerCase().includes(searchTerm) ||
            (user.email || '').toLowerCase().includes(searchTerm);

        const roleFilterValue = roleFilter.value;
        const matchesRole = roleFilterValue === 'all' || user.role === roleFilterValue;

        return matchesSearch && matchesRole;
    });

    currentPage = 1;
    renderUsers();
});

// Role filter
roleFilter?.addEventListener('change', () => {
    searchInput.dispatchEvent(new Event('input'));
});

// Pagination
document.getElementById('prev-page')?.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderUsers();
    }
});

document.getElementById('next-page')?.addEventListener('click', () => {
    const maxPage = Math.ceil(filteredUsers.length / usersPerPage);
    if (currentPage < maxPage) {
        currentPage++;
        renderUsers();
    }
});

// Update stats
function updateStats() {
    const totalUsers = allUsers.length;
    const totalAdmins = allUsers.filter(u => u.role === 'admin').length;
    const syncedUsers = allUsers.filter(u => u.syncedFromAuth).length;

    // Calculate new users today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newToday = allUsers.filter(u => {
        if (!u.createdAt) return false;
        const createdDate = u.createdAt.toDate ? u.createdAt.toDate() : new Date(u.createdAt);
        createdDate.setHours(0, 0, 0, 0);
        return createdDate.getTime() === today.getTime();
    }).length;

    // Calculate active sessions (users who logged in within last 24 hours)
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const activeSessions = allUsers.filter(u => {
        if (!u.lastLogin) return false;
        const lastLoginDate = u.lastLogin.toDate ? u.lastLogin.toDate() : new Date(u.lastLogin);
        return lastLoginDate >= yesterday;
    }).length;

    document.getElementById('total-users').textContent = totalUsers;
    document.getElementById('total-admins').textContent = totalAdmins;
    document.getElementById('new-today').textContent = newToday;
    document.getElementById('active-sessions').textContent = activeSessions;

    // Update showing/total count for pagination
    document.getElementById('total-count').textContent = totalUsers;
    document.getElementById('showing-count').textContent = Math.min(filteredUsers.length, usersPerPage);
}

// Theme toggle
const themeToggle = document.getElementById('theme-toggle');
themeToggle?.addEventListener('click', () => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else {
        html.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }
});

// Profile menu toggle
document.getElementById('admin-profile-btn')?.addEventListener('click', () => {
    const menu = document.getElementById('admin-profile-menu');
    menu.classList.toggle('hidden');
});

// Logout
document.getElementById('admin-logout-btn')?.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = 'dashboard.html';
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Failed to logout', 'error');
    }
});

// Close modal on outside click
editModal?.addEventListener('click', (e) => {
    if (e.target === editModal) {
        editModal.classList.add('hidden');
    }
});

// Close add modal on outside click
addModal?.addEventListener('click', (e) => {
    if (e.target === addModal) {
        addModal.classList.add('hidden');
        addForm.reset();
    }
});
