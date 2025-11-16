// Dashboard Navigation
import { refreshSidebar } from './sidebar.js';
import { loadChatHistory } from './bot.js';
import { loadTasks } from './copilot.js';
import { auth, onAuthStateChanged } from './firebase.js';
import { dashboardData } from './dashboard-data.js';

let dashboardHome, botInterface, copilotInterface, companionInterface;

// Navigation Functions
function showSection(section) {
    if (!section) {
        console.error('Section is null or undefined');
        return;
    }

    // Hide all sections
    dashboardHome?.classList.add('hidden');
    botInterface?.classList.add('hidden');
    copilotInterface?.classList.add('hidden');
    companionInterface?.classList.add('hidden');

    // Show selected section
    section.classList.remove('hidden');

    // Refresh sidebar when navigating
    refreshSidebar();
}

// Setup click handlers
function setupClickHandlers() {
    // Get all button elements
    const openBotBtn = document.getElementById('open-bot');
    const closeBotBtn = document.getElementById('close-bot');
    const openCopilotBtn = document.getElementById('open-copilot');
    const closeCopilotBtn = document.getElementById('close-copilot');
    const openCompanionBtn = document.getElementById('open-companion');
    const closeCompanionBtn = document.getElementById('close-companion');
    const newChatBtn = document.getElementById('new-chat-btn');
    const refreshDataBtn = document.getElementById('refresh-data-btn');

    // Open Bot
    if (openBotBtn) {
        openBotBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showSection(botInterface);
            loadChatHistory();
        });
    }

    if (closeBotBtn) {
        closeBotBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showSection(dashboardHome);
        });
    }

    // Open Copilot
    if (openCopilotBtn) {
        openCopilotBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showSection(copilotInterface);
            loadTasks();
        });
    }

    if (closeCopilotBtn) {
        closeCopilotBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showSection(dashboardHome);
        });
    }

    // Open Companion
    if (openCompanionBtn) {
        openCompanionBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showSection(companionInterface);
        });
    }

    if (closeCompanionBtn) {
        closeCompanionBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showSection(dashboardHome);
        });
    }

    // New Chat button
    if (newChatBtn) {
        newChatBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showSection(botInterface);
            loadChatHistory();
        });
    }

    // Refresh Data button
    if (refreshDataBtn) {
        refreshDataBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            // Add spinning animation
            const icon = refreshDataBtn.querySelector('i');
            icon.classList.add('fa-spin');
            
            try {
                if (auth.currentUser && dashboardData) {
                    await dashboardData.refresh();
                }
            } catch (error) {
                console.error('❌ Error refreshing dashboard data:', error);
            } finally {
                // Remove spinning animation
                setTimeout(() => {
                    icon.classList.remove('fa-spin');
                }, 500);
            }
        });
    }
}

// Initialize dashboard
function initDashboard() {
    dashboardHome = document.getElementById('dashboard-home');
    botInterface = document.getElementById('bot-interface');
    copilotInterface = document.getElementById('copilot-interface');
    companionInterface = document.getElementById('companion-interface');

    if (dashboardHome && botInterface && copilotInterface && companionInterface) {
        setupClickHandlers();
    } else {
        console.error('Some dashboard elements not found!');
    }
}

// Wait for auth state and DOM
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User logged in, wait a bit for dashboard to render
        setTimeout(async () => {
            initDashboard();
            // Load user data for dashboard
            await dashboardData.init(user);
        }, 100);
    }
});

// Also try on DOM load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initDashboard, 100);
    });
} else {
    setTimeout(initDashboard, 100);
}

// Export for use in other modules
export { showSection };
