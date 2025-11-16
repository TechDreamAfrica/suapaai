import {
    auth,
    db,
    collection,
    getDocs,
    query,
    where,
    orderBy
} from './firebase.js';

// Dashboard data management
export class DashboardDataManager {
    constructor() {
        this.currentUser = null;
        this.userChats = [];
        this.userTasks = [];
        this.userActivities = [];
        this.userStats = {
            chatsToday: 0,
            activeTasks: 0,
            studyStreak: 0,
            totalChats: 0,
            completedTasks: 0,
            totalActivities: 0
        };
    }

    // Initialize with current user
    init(user) {
        this.currentUser = user;
        return this.loadAllUserData();
    }

    // Load all user data from Firebase
    async loadAllUserData() {
        if (!this.currentUser) {
            return false;
        }

        try {
            // Load data in parallel for better performance
            const [chats, tasks, activities] = await Promise.all([
                this.loadUserChats(),
                this.loadUserTasks(),
                this.loadUserActivities()
            ]);

            // Calculate statistics
            this.calculateUserStats();
            
            // Update dashboard UI
            this.updateDashboardUI();

            return true;
        } catch (error) {
            console.error('Error loading user data:', error);
            return false;
        }
    }

    // Load user's chat history and companion chats
    async loadUserChats() {
        try {
            // Load regular chats
            let chatQuery = query(
                collection(db, 'chats'),
                where('userId', '==', this.currentUser.uid),
                orderBy('timestamp', 'desc')
            );

            // Load companion chats
            let companionQuery = query(
                collection(db, 'companionChats'),
                where('userId', '==', this.currentUser.uid),
                orderBy('timestamp', 'desc')
            );

            let chatSnapshot, companionSnapshot;
            
            try {
                [chatSnapshot, companionSnapshot] = await Promise.all([
                    getDocs(chatQuery),
                    getDocs(companionQuery)
                ]);
            } catch (indexError) {
                console.warn('Index not available for ordered query, using simple queries:', indexError);
                chatQuery = query(
                    collection(db, 'chats'),
                    where('userId', '==', this.currentUser.uid)
                );
                companionQuery = query(
                    collection(db, 'companionChats'),
                    where('userId', '==', this.currentUser.uid)
                );
                [chatSnapshot, companionSnapshot] = await Promise.all([
                    getDocs(chatQuery),
                    getDocs(companionQuery)
                ]);
            }

            this.userChats = [];

            // Add regular chats
            chatSnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                this.userChats.push({
                    id: docSnap.id,
                    type: 'chat',
                    ...data,
                    timestamp: data.timestamp?.toDate() || new Date()
                });
            });

            // Add companion chats
            companionSnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                this.userChats.push({
                    id: docSnap.id,
                    type: 'companion',
                    ...data,
                    timestamp: data.timestamp?.toDate() || new Date()
                });
            });

            // Sort manually by timestamp
            this.userChats.sort((a, b) => b.timestamp - a.timestamp);

            return this.userChats;
        } catch (error) {
            console.error('Error loading chats:', error);
            this.userChats = [];
            return [];
        }
    }

    // Load user's tasks
    async loadUserTasks() {
        try {
            // Try with orderBy first, fallback to simple query if index doesn't exist
            let q = query(
                collection(db, 'tasks'),
                where('userId', '==', this.currentUser.uid),
                orderBy('timestamp', 'desc')
            );

            let querySnapshot;
            try {
                querySnapshot = await getDocs(q);
            } catch (indexError) {
                console.warn('Index not available for ordered task query, using simple query:', indexError);
                q = query(
                    collection(db, 'tasks'),
                    where('userId', '==', this.currentUser.uid)
                );
                querySnapshot = await getDocs(q);
            }

            this.userTasks = [];

            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                this.userTasks.push({
                    id: docSnap.id,
                    ...data,
                    timestamp: data.timestamp?.toDate() || new Date(),
                    deadline: data.deadline ? new Date(data.deadline) : null
                });
            });

            // Sort manually if we couldn't use orderBy
            this.userTasks.sort((a, b) => b.timestamp - a.timestamp);

            return this.userTasks;
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.userTasks = [];
            return [];
        }
    }

    // Load user's activity data
    async loadUserActivities() {
        try {
            // Try with orderBy first, fallback to simple query if index doesn't exist
            let q = query(
                collection(db, 'userActivities'),
                where('userId', '==', this.currentUser.uid),
                orderBy('timestamp', 'desc')
            );

            let querySnapshot;
            try {
                querySnapshot = await getDocs(q);
            } catch (indexError) {
                console.warn('Index not available for ordered activity query, using simple query:', indexError);
                q = query(
                    collection(db, 'userActivities'),
                    where('userId', '==', this.currentUser.uid)
                );
                querySnapshot = await getDocs(q);
            }

            this.userActivities = [];

            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                this.userActivities.push({
                    id: docSnap.id,
                    ...data,
                    timestamp: data.timestamp?.toDate() || new Date()
                });
            });

            // Sort manually if we couldn't use orderBy
            this.userActivities.sort((a, b) => b.timestamp - a.timestamp);

            return this.userActivities;
        } catch (error) {
            console.error('Error loading activities:', error);
            this.userActivities = [];
            return [];
        }
    }

    // Calculate user statistics
    calculateUserStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Chats today
        this.userStats.chatsToday = this.userChats.filter(chat => 
            chat.timestamp >= today && chat.timestamp < tomorrow
        ).length;

        // Active (incomplete) tasks
        this.userStats.activeTasks = this.userTasks.filter(task => !task.completed).length;

        // Total chats and completed tasks
        this.userStats.totalChats = this.userChats.length;
        this.userStats.completedTasks = this.userTasks.filter(task => task.completed).length;
        this.userStats.totalActivities = this.userActivities.length;

        // Calculate study streak
        this.userStats.studyStreak = this.calculateStudyStreak();
    }

    // Calculate study streak based on activity
    calculateStudyStreak() {
        if (this.userActivities.length === 0) return 0;

        // Group activities by date
        const activityDates = new Map();
        this.userActivities.forEach(activity => {
            const dateKey = activity.timestamp.toDateString();
            if (!activityDates.has(dateKey)) {
                activityDates.set(dateKey, []);
            }
            activityDates.get(dateKey).push(activity);
        });

        // Sort dates in descending order
        const sortedDates = Array.from(activityDates.keys()).sort((a, b) => new Date(b) - new Date(a));

        let streak = 0;
        const today = new Date().toDateString();
        
        // Check if there's activity today or yesterday (give some flexibility)
        if (sortedDates.length > 0) {
            const mostRecentDate = sortedDates[0];
            const daysDiff = Math.floor((new Date(today) - new Date(mostRecentDate)) / (1000 * 60 * 60 * 24));
            
            if (daysDiff <= 1) { // Activity today or yesterday
                let previousDate = new Date(mostRecentDate);
                
                for (const dateStr of sortedDates) {
                    const currentDate = new Date(dateStr);
                    const diff = Math.floor((previousDate - currentDate) / (1000 * 60 * 60 * 24));
                    
                    if (diff <= 1) { // Consecutive or same day
                        streak++;
                        previousDate = currentDate;
                    } else {
                        break;
                    }
                }
            }
        }

        return streak;
    }

    // Update dashboard UI with loaded data
    updateDashboardUI() {
        // Update sidebar counters
        this.updateSidebarCounters();
        
        // Update dashboard overview
        this.updateDashboardOverview();
        
        // Update recent activity section
        this.updateRecentActivity();
    }

    // Update sidebar counters
    updateSidebarCounters() {
        // Use a small delay to ensure DOM elements are available
        setTimeout(() => {
            const chatsTodayElement = document.getElementById('chats-today-count');
            const activeTasksElement = document.getElementById('active-tasks-count');
            const studyStreakElement = document.getElementById('study-streak');

            if (chatsTodayElement) {
                chatsTodayElement.textContent = this.userStats.chatsToday;
            }
            if (activeTasksElement) {
                activeTasksElement.textContent = this.userStats.activeTasks;
            }
            if (studyStreakElement) {
                studyStreakElement.textContent = this.userStats.studyStreak;
            }
        }, 100);
    }

    // Update dashboard overview section
    updateDashboardOverview() {
        // Create or update overview section in dashboard
        const dashboardHome = document.getElementById('dashboard-home');
        if (!dashboardHome) return;

        let overviewSection = document.getElementById('user-overview-section');
        if (!overviewSection) {
            overviewSection = this.createOverviewSection();
            // Insert after the welcome message but before the feature cards
            const welcomeSection = dashboardHome.querySelector('.text-center');
            if (welcomeSection) {
                welcomeSection.parentNode.insertBefore(overviewSection, welcomeSection.nextSibling);
            } else {
                dashboardHome.insertBefore(overviewSection, dashboardHome.firstChild);
            }
        }

        this.populateOverviewSection(overviewSection);
    }

    // Create overview section HTML
    createOverviewSection() {
        const section = document.createElement('div');
        section.id = 'user-overview-section';
        section.className = 'mb-8';
        section.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <h3 class="text-xl font-bold text-gray-800 dark:text-white mb-6">Your Activity Overview</h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4" id="overview-stats">
                    <!-- Stats will be populated here -->
                </div>
            </div>
        `;
        return section;
    }

    // Populate overview section with stats
    populateOverviewSection(section) {
        const statsContainer = section.querySelector('#overview-stats');
        if (!statsContainer) return;

        const stats = [
            {
                title: 'Total Chats',
                value: this.userStats.totalChats,
                icon: 'fas fa-comments',
                color: 'blue'
            },
            {
                title: 'Active Tasks',
                value: this.userStats.activeTasks,
                icon: 'fas fa-tasks',
                color: 'purple'
            },
            {
                title: 'Completed Tasks',
                value: this.userStats.completedTasks,
                icon: 'fas fa-check-circle',
                color: 'green'
            },
            {
                title: 'Study Streak',
                value: this.userStats.studyStreak + ' days',
                icon: 'fas fa-fire',
                color: 'orange'
            }
        ];

        statsContainer.innerHTML = stats.map(stat => `
            <div class="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <i class="${stat.icon} text-2xl text-${stat.color}-500 mb-2"></i>
                <div class="text-2xl font-bold text-gray-800 dark:text-white">${stat.value}</div>
                <div class="text-sm text-gray-600 dark:text-gray-400">${stat.title}</div>
            </div>
        `).join('');
    }

    // Update recent activity section
    updateRecentActivity() {
        let recentActivitySection = document.getElementById('recent-activity-section');
        
        if (!recentActivitySection) {
            recentActivitySection = this.createRecentActivitySection();
            const dashboardHome = document.getElementById('dashboard-home');
            if (dashboardHome) {
                dashboardHome.appendChild(recentActivitySection);
            }
        }

        this.populateRecentActivity(recentActivitySection);
    }

    // Create recent activity section
    createRecentActivitySection() {
        const section = document.createElement('div');
        section.id = 'recent-activity-section';
        section.className = 'mb-8';
        section.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <h3 class="text-xl font-bold text-gray-800 dark:text-white mb-6">Recent Activity</h3>
                <div id="recent-activity-list" class="space-y-3 max-h-96 overflow-y-auto">
                    <!-- Activity items will be populated here -->
                </div>
            </div>
        `;
        return section;
    }

    // Populate recent activity
    populateRecentActivity(section) {
        const activityList = section.querySelector('#recent-activity-list');
        if (!activityList) return;

        // Combine recent chats, tasks, and activities
        const recentItems = [
            ...this.userChats.slice(0, 5).map(chat => ({
                type: 'chat',
                title: chat.userMessage || 'Chat session',
                timestamp: chat.timestamp,
                icon: 'fas fa-comment',
                color: 'blue'
            })),
            ...this.userTasks.slice(0, 5).map(task => ({
                type: 'task',
                title: task.title,
                timestamp: task.timestamp,
                icon: task.completed ? 'fas fa-check-circle' : 'fas fa-circle',
                color: task.completed ? 'green' : 'purple'
            })),
            ...this.userActivities.slice(0, 5).map(activity => ({
                type: 'activity',
                title: activity.type || 'Study session',
                timestamp: activity.timestamp,
                icon: 'fas fa-bolt',
                color: 'orange'
            }))
        ];

        // Sort by timestamp and take the most recent 10
        recentItems.sort((a, b) => b.timestamp - a.timestamp);
        const recentTop = recentItems.slice(0, 10);

        if (recentTop.length === 0) {
            activityList.innerHTML = `
                <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                    <i class="fas fa-history text-3xl mb-3"></i>
                    <p>No recent activity yet. Start chatting or creating tasks!</p>
                </div>
            `;
            return;
        }

        activityList.innerHTML = recentTop.map(item => `
            <div class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                <i class="${item.icon} text-${item.color}-500"></i>
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-800 dark:text-white truncate">
                        ${this.escapeHtml(item.title)}
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">
                        ${this.formatTimestamp(item.timestamp)} • ${item.type}
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Utility function to escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Utility function to format timestamp
    formatTimestamp(timestamp) {
        const now = new Date();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        
        return timestamp.toLocaleDateString();
    }

    // Refresh data (call this when user performs new actions)
    async refresh() {
        return await this.loadAllUserData();
    }

    // Get specific data for other modules
    getUserChats() {
        return this.userChats;
    }

    getUserTasks() {
        return this.userTasks;
    }

    getUserActivities() {
        return this.userActivities;
    }

    getUserStats() {
        return this.userStats;
    }
}

// Export singleton instance
export const dashboardData = new DashboardDataManager();

// Make it available globally for debugging
window.dashboardData = dashboardData;