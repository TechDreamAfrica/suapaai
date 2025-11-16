// Main App Navigation and UI Logic
import { auth } from './auth.js';

// DOM Elements
const views = {
    dashboard: document.getElementById('dashboard-view'),
    bot: document.getElementById('bot-view'),
    copilot: document.getElementById('copilot-view'),
    companion: document.getElementById('companion-view')
};

const navItems = document.querySelectorAll('.nav-item');
const fab = document.getElementById('fab');
const fabMenu = document.getElementById('fab-menu');
const menuBtn = document.getElementById('menu-btn');
const drawer = document.getElementById('drawer');
const drawerOverlay = document.getElementById('drawer-overlay');
const profileBtn = document.getElementById('profile-btn');
const profileMenu = document.getElementById('profile-menu');
const themeToggle = document.getElementById('theme-toggle');

// Current view state
let currentView = 'dashboard';

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeFAB();
    initializeDrawer();
    initializeTheme();
    checkURLParams();
});

// Navigation System
function initializeNavigation() {
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewName = item.getAttribute('data-view');
            if (viewName) {
                switchView(viewName);
            }
        });
    });
}

function switchView(viewName) {
    // Hide all views
    Object.values(views).forEach(view => {
        if (view) view.classList.remove('active');
    });

    // Show selected view
    if (views[viewName]) {
        views[viewName].classList.add('active');
        currentView = viewName;
    }

    // Update navigation
    navItems.forEach(item => {
        if (item.getAttribute('data-view') === viewName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Update app bar title
    updateAppBarTitle(viewName);

    // Close drawer if open
    closeDrawer();
}

function updateAppBarTitle(viewName) {
    const titles = {
        dashboard: 'Sua Pa AI',
        bot: 'AI Bot',
        copilot: 'Task Manager',
        companion: 'Learning Tools'
    };

    const titleElement = document.querySelector('.app-bar-title');
    if (titleElement) {
        titleElement.textContent = titles[viewName] || 'Sua Pa AI';
    }
}

// Floating Action Button
function initializeFAB() {
    if (!fab || !fabMenu) return;

    fab.addEventListener('click', () => {
        toggleFABMenu();
    });

    // FAB menu items
    document.querySelectorAll('.fab-menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const action = item.getAttribute('data-action');
            handleFABAction(action);
            closeFABMenu();
        });
    });

    // Close FAB menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!fab.contains(e.target) && !fabMenu.contains(e.target)) {
            closeFABMenu();
        }
    });
}

function toggleFABMenu() {
    const isOpen = !fabMenu.classList.contains('hidden');

    if (isOpen) {
        closeFABMenu();
    } else {
        openFABMenu();
    }
}

function openFABMenu() {
    fabMenu.classList.remove('hidden');
    fab.classList.add('rotate');
}

function closeFABMenu() {
    fabMenu.classList.add('hidden');
    fab.classList.remove('rotate');
}

function handleFABAction(action) {
    switch (action) {
        case 'new-chat':
            switchView('bot');
            // Focus chat input
            setTimeout(() => {
                const chatInput = document.getElementById('chat-input');
                if (chatInput) chatInput.focus();
            }, 300);
            break;

        case 'new-task':
            switchView('copilot');
            // Focus task input
            setTimeout(() => {
                const taskTitle = document.getElementById('task-title');
                if (taskTitle) taskTitle.focus();
            }, 300);
            break;

        case 'quick-note':
            if (window.PWA) {
                window.PWA.showToast('Quick note feature coming soon!', 'info');
            }
            break;
    }
}

// Drawer Navigation
function initializeDrawer() {
    if (!drawer || !drawerOverlay) return;

    menuBtn?.addEventListener('click', openDrawer);
    drawerOverlay?.addEventListener('click', closeDrawer);

    // Close button in drawer (on smaller screens)
    const drawerCloseBtn = drawer.querySelector('.drawer-close');
    if (drawerCloseBtn) {
        drawerCloseBtn.addEventListener('click', closeDrawer);
    }
}

function openDrawer() {
    drawer?.classList.add('active');
    drawerOverlay?.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeDrawer() {
    drawer?.classList.remove('active');
    drawerOverlay?.classList.remove('active');
    document.body.style.overflow = '';
}

// Profile Menu
if (profileBtn && profileMenu) {
    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        profileMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!profileBtn.contains(e.target) && !profileMenu.contains(e.target)) {
            profileMenu.classList.add('hidden');
        }
    });
}

// Theme Toggle
function initializeTheme() {
    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
        updateThemeIcon(true);
    }

    // Theme toggle button
    themeToggle?.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        updateThemeIcon(isDark);

        if (window.PWA) {
            window.PWA.showToast(`${isDark ? 'Dark' : 'Light'} mode enabled`, 'success');
        }
    });
}

function updateThemeIcon(isDark) {
    if (!themeToggle) return;

    const icon = themeToggle.querySelector('i');
    if (icon) {
        icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// Check URL Parameters for deep linking
function checkURLParams() {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');

    if (view && views[view]) {
        switchView(view);
    }
}

// Update activity stats
function updateStats() {
    auth.onAuthStateChanged(user => {
        if (!user) return;

        // These would be fetched from Firestore in a real implementation
        const stats = {
            chatsToday: 0,
            activeTasks: 0,
            studyStreak: 0
        };

        // Update dashboard stats
        const chatsCount = document.getElementById('chats-count');
        const tasksCount = document.getElementById('tasks-count');
        const streakCount = document.getElementById('streak-count');

        if (chatsCount) chatsCount.textContent = stats.chatsToday;
        if (tasksCount) tasksCount.textContent = stats.activeTasks;
        if (streakCount) streakCount.textContent = stats.studyStreak;
    });
}

// Initialize stats update
updateStats();

// Export for use in other modules
export { switchView, updateStats, closeDrawer };
