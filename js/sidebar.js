import {
    auth,
    db,
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    query,
    where,
    orderBy,
    serverTimestamp,
    getDoc,
    setDoc
} from './firebase.js';

import { dashboardData } from './dashboard-data.js';
import { showSection } from './dashboard.js';
import { escapeHtml } from './utils.js';

// Sidebar Elements
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebarToggleMain = document.getElementById('sidebar-toggle-main');
const recentChatsList = document.getElementById('recent-chats-list');
const savedItemsList = document.getElementById('saved-items-list');
const newChatBtn = document.getElementById('new-chat-btn');

// Activity counters
const chatsTodayCount = document.getElementById('chats-today-count');
const activeTasksCount = document.getElementById('active-tasks-count');
const studyStreak = document.getElementById('study-streak');

// Sidebar Toggle for Mobile
sidebarToggle?.addEventListener('click', () => {
    sidebar.classList.add('-translate-x-full');
});

sidebarToggleMain?.addEventListener('click', () => {
    sidebar.classList.remove('-translate-x-full');
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    if (window.innerWidth < 1024) {
        if (!sidebar.contains(e.target) && !sidebarToggleMain.contains(e.target)) {
            sidebar.classList.add('-translate-x-full');
        }
    }
});

// Initialize sidebar on mobile
if (window.innerWidth < 1024) {
    sidebar.classList.add('-translate-x-full');
}

// New Chat Button
newChatBtn?.addEventListener('click', () => {
    // Clear chat and go to bot interface
    const botInterface = document.getElementById('bot-interface');
    const dashboardHome = document.getElementById('dashboard-home');

    if (botInterface && dashboardHome) {
        // Clear chat messages
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.innerHTML = '';
            // Add welcome message
            const welcomeDiv = document.createElement('div');
            welcomeDiv.className = 'flex justify-start';
            welcomeDiv.innerHTML = `
                <div class="max-w-[80%] p-4 rounded-2xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white">
                    Hello! I'm Sua Pa AI, your educational companion. Ask me anything about your studies!
                </div>
            `;
            chatMessages.appendChild(welcomeDiv);
        }

        dashboardHome.classList.add('hidden');
        botInterface.classList.remove('hidden');
    }
});

// Load Recent Chats
async function loadRecentChats() {
    const user = auth.currentUser;
    console.log('📨 Loading recent chats for user:', user?.uid || 'No user');
    
    if (!user) {
        console.log('❌ No authenticated user for recent chats');
        return;
    }

    try {
        // Try with orderBy first, fallback to simple query if index doesn't exist
        let q = query(
            collection(db, 'chats'),
            where('userId', '==', user.uid),
            orderBy('timestamp', 'desc')
        );

        let querySnapshot;
        try {
            querySnapshot = await getDocs(q);
            console.log('✅ Ordered chat query successful');
        } catch (indexError) {
            console.warn('⚠️ Index not available for ordered chat query, using simple query:', indexError.message);
            // Fallback to simple query without orderBy
            q = query(
                collection(db, 'chats'),
                where('userId', '==', user.uid)
            );
            querySnapshot = await getDocs(q);
            console.log('✅ Simple chat query successful');
        }

        const chats = new Map(); // Use Map to group by unique conversations
        console.log(`📊 Found ${querySnapshot.size} chat documents`);

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.userMessage) {
                const chatKey = data.userMessage.substring(0, 50); // Use first 50 chars as key

                if (!chats.has(chatKey) && chats.size < 10) {
                    chats.set(chatKey, {
                        id: docSnap.id,
                        message: data.userMessage,
                        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp || Date.now())
                    });
                }
            }
        });

        // Sort manually if we couldn't use orderBy
        const chatArray = Array.from(chats.values());
        chatArray.sort((a, b) => b.timestamp - a.timestamp);

        console.log(`✅ Processed ${chatArray.length} unique chats for sidebar`);
        renderRecentChats(chatArray);
    } catch (error) {
        console.error('❌ Error loading recent chats:', error);
        console.error('Error details:', error.message);
        // Show empty state on error
        renderRecentChats([]);
    }
}

function renderRecentChats(chats) {
    console.log('🖼️ Rendering recent chats:', chats.length, 'chats');
    
    if (!recentChatsList) {
        console.log('❌ Recent chats list element not found');
        return;
    }

    if (chats.length === 0) {
        console.log('📭 No chats to display, showing empty state');
        recentChatsList.innerHTML = `
            <div class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No recent chats yet
            </div>
        `;
        return;
    }

    console.log('✅ Rendering', chats.length, 'chats in sidebar');
    recentChatsList.innerHTML = chats.map((chat, index) => `
        <button class="w-full text-left p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition group chat-item" data-chat-message="${escapeHtml(chat.message)}" data-chat-id="${chat.id}">
            <div class="flex items-start gap-2">
                <i class="fas fa-message text-gray-400 mt-1"></i>
                <div class="flex-1 min-w-0">
                    <div class="text-sm text-gray-700 dark:text-gray-300 truncate">
                        ${escapeHtml(chat.message)}
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        ${formatTimestamp(chat.timestamp)}
                    </div>
                </div>
                <button class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition delete-chat-btn" data-chat-id="${chat.id}">
                    <i class="fas fa-trash text-xs"></i>
                </button>
            </div>
        </button>
    `).join('');
    
    // Add event listeners for chat items
    recentChatsList.querySelectorAll('.chat-item').forEach(button => {
        button.addEventListener('click', (event) => {
            const chatMessage = button.getAttribute('data-chat-message');
            openChat(chatMessage, event);
        });
    });
    
    // Add event listeners for delete buttons
    recentChatsList.querySelectorAll('.delete-chat-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent opening the chat
            const chatId = button.getAttribute('data-chat-id');
            deleteChat(chatId, event);
        });
    });
}

// Load Saved Items
async function loadSavedItems() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        // Load companion chats (saved items from companion tools)
        let q = query(
            collection(db, 'companionChats'),
            where('userId', '==', user.uid),
            orderBy('timestamp', 'desc')
        );

        let querySnapshot;
        try {
            querySnapshot = await getDocs(q);
        } catch (indexError) {
            console.warn('Index not available for ordered companionChats query, using simple query:', indexError);
            // Fallback to simple query without orderBy
            q = query(
                collection(db, 'companionChats'),
                where('userId', '==', user.uid)
            );
            querySnapshot = await getDocs(q);
        }

        const items = [];

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            items.push({
                id: docSnap.id,
                ...data,
                timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.createdAt || Date.now())
            });
        });

        // Sort manually if we couldn't use orderBy
        items.sort((a, b) => b.timestamp - a.timestamp);

        renderSavedItems(items);
    } catch (error) {
        console.error('Error loading saved items:', error);
        // Collection might not exist yet
        renderSavedItems([]);
    }
}

function renderSavedItems(items) {
    if (!savedItemsList) return;

    if (items.length === 0) {
        savedItemsList.innerHTML = `
            <div class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                <i class="fas fa-tools mb-2 text-lg"></i>
                <p>No companion tools used yet</p>
                <p class="text-xs mt-1">Try the Assignment Helper, Content Writer, or Explainer!</p>
            </div>
        `;
        return;
    }

    // Helper function to get tool icon
    const getToolIcon = (toolType) => {
        const icons = {
            'assignment-helper': 'fas fa-file-alt',
            'content-writer': 'fas fa-pen',
            'explainer': 'fas fa-lightbulb',
            'reference-topic': 'fas fa-book'
        };
        return icons[toolType] || 'fas fa-bookmark';
    };

    // Helper function to get tool color
    const getToolColor = (toolType) => {
        const colors = {
            'assignment-helper': 'text-green-500',
            'content-writer': 'text-blue-500',
            'explainer': 'text-yellow-500',
            'reference-topic': 'text-purple-500'
        };
        return colors[toolType] || 'text-gray-500';
    };

    savedItemsList.innerHTML = items.slice(0, 5).map(item => `
        <button class="w-full text-left p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition group saved-item" data-item-id="${item.id}">
            <div class="flex items-start gap-2">
                <i class="${getToolIcon(item.toolType)} ${getToolColor(item.toolType)} mt-1"></i>
                <div class="flex-1 min-w-0">
                    <div class="text-sm text-gray-700 dark:text-gray-300 truncate">
                        ${escapeHtml(item.prompt?.substring(0, 50) || 'No title')}...
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        ${item.toolType?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Companion Tool'}
                    </div>
                </div>
                <button class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition delete-saved-item-btn" data-item-id="${item.id}">
                    <i class="fas fa-trash text-xs"></i>
                </button>
            </div>
        </button>
    `).join('');
    
    // Add event listeners for saved items
    savedItemsList.querySelectorAll('.saved-item').forEach(button => {
        button.addEventListener('click', (event) => {
            const itemId = button.getAttribute('data-item-id');
            openSavedItem(itemId, event);
        });
    });
    
    // Add event listeners for delete buttons
    savedItemsList.querySelectorAll('.delete-saved-item-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent opening the saved item
            const itemId = button.getAttribute('data-item-id');
            deleteSavedItem(itemId, event);
        });
    });
}

// Load Activity Stats
async function loadActivityStats() {
    const user = auth.currentUser;
    if (!user) {
        console.log('No user logged in, skipping activity stats');
        return;
    }

    console.log('Loading activity stats for user:', user.uid);

    try {
        // Count chats today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const chatsQuery = query(
            collection(db, 'chats'),
            where('userId', '==', user.uid),
            where('timestamp', '>=', today)
        );

        const chatsSnapshot = await getDocs(chatsQuery);
        console.log(`Chats today: ${chatsSnapshot.size}`);
        if (chatsTodayCount) {
            chatsTodayCount.textContent = chatsSnapshot.size;
        }

        // Count active tasks
        const tasksQuery = query(
            collection(db, 'tasks'),
            where('userId', '==', user.uid),
            where('completed', '==', false)
        );

        const tasksSnapshot = await getDocs(tasksQuery);
        console.log(`Active tasks: ${tasksSnapshot.size}`);
        if (activeTasksCount) {
            activeTasksCount.textContent = tasksSnapshot.size;
        }

        // Calculate study streak from database
        const streak = await calculateStudyStreak(user.uid);
        console.log(`Study streak: ${streak}`);
        if (studyStreak) {
            studyStreak.textContent = streak;
        }
    } catch (error) {
        console.error('Error loading activity stats:', error);
        console.error('Error details:', error.message);
    }
}

async function calculateStudyStreak(userId) {
    try {
        // Get user's activity document from Firestore
        const userActivityRef = doc(db, 'userActivity', userId);
        const activityDoc = await getDoc(userActivityRef);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        if (!activityDoc.exists()) {
            // Initialize streak for new user
            await setDoc(userActivityRef, {
                streak: 1,
                lastActiveDate: todayStr,
                totalDaysActive: 1,
                createdAt: serverTimestamp()
            });
            return 1;
        }

        const activityData = activityDoc.data();
        const lastActiveDate = activityData.lastActiveDate;
        const currentStreak = activityData.streak || 0;

        // Check if already updated today
        if (lastActiveDate === todayStr) {
            return currentStreak;
        }

        // Calculate yesterday's date
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let newStreak;
        if (lastActiveDate === yesterdayStr) {
            // Continue streak - user was active yesterday
            newStreak = currentStreak + 1;
        } else {
            // Streak broken - reset to 1
            newStreak = 1;
        }

        // Update the database
        await setDoc(userActivityRef, {
            streak: newStreak,
            lastActiveDate: todayStr,
            totalDaysActive: (activityData.totalDaysActive || 0) + 1,
            updatedAt: serverTimestamp()
        }, { merge: true });

        return newStreak;

    } catch (error) {
        console.error('Error calculating study streak:', error);
        // Fallback to localStorage
        const streakData = localStorage.getItem('studyStreak');
        return streakData ? JSON.parse(streakData).count || 0 : 0;
    }
}

// Update user activity when they interact with the app
async function updateUserActivity(userId) {
    try {
        const userActivityRef = doc(db, 'userActivity', userId);
        const today = new Date().toISOString().split('T')[0];

        // This will trigger streak calculation
        await calculateStudyStreak(userId);

        // Update last seen
        await setDoc(userActivityRef, {
            lastSeen: serverTimestamp()
        }, { merge: true });

    } catch (error) {
        console.error('Error updating user activity:', error);
    }
}

// Delete Chat
window.deleteChat = async function(chatId, event) {
    event?.stopPropagation();

    if (!confirm('Delete this chat?')) return;

    try {
        await deleteDoc(doc(db, 'chats', chatId));
        loadRecentChats();
        loadActivityStats();
    } catch (error) {
        console.error('Error deleting chat:', error);
    }
};

// Open Chat - Load chat history and switch to chat interface
window.openChat = async function(searchMessage, event) {
    event?.stopPropagation();
    
    console.log('🔄 Opening chat for message:', searchMessage);
    
    try {
        // Switch to bot interface
        const botInterface = document.getElementById('bot-interface');
        const dashboardHome = document.getElementById('dashboard-home');
        
        if (botInterface && dashboardHome) {
            dashboardHome.classList.add('hidden');
            botInterface.classList.remove('hidden');
        }
        
        // Load the full chat history
        const user = auth.currentUser;
        if (!user) return;
        
        // Query for chats with this message to get the full conversation context
        const q = query(
            collection(db, 'chats'),
            where('userId', '==', user.uid)
        );
        
        const querySnapshot = await getDocs(q);
        const allChats = [];
        
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            allChats.push({
                ...data,
                timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp || Date.now())
            });
        });
        
        // Sort by timestamp
        allChats.sort((a, b) => a.timestamp - b.timestamp);
        
        // Load chat history in the bot interface
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.innerHTML = '';
            
            // Add all historical messages
            allChats.forEach(chat => {
                if (chat.userMessage) {
                    addMessageToChat(chat.userMessage, 'user');
                }
                if (chat.botResponse) {
                    addMessageToChat(chat.botResponse, 'bot');
                }
            });
        }
        
        console.log('✅ Chat history loaded successfully');
        
    } catch (error) {
        console.error('❌ Error opening chat:', error);
    }
};

// Delete Saved Item
window.deleteSavedItem = async function(itemId, event) {
    event?.stopPropagation();

    if (!confirm('Delete this saved item?')) return;

    try {
        await deleteDoc(doc(db, 'savedItems', itemId));
        loadSavedItems();
    } catch (error) {
        console.error('Error deleting saved item:', error);
    }
};

// Save Item Function (to be called from other modules)
export async function saveItem(title, content, type = 'note') {
    const user = auth.currentUser;
    if (!user) return;

    try {
        await addDoc(collection(db, 'savedItems'), {
            userId: user.uid,
            title: title,
            content: content,
            type: type,
            timestamp: serverTimestamp()
        });

        loadSavedItems();
        return true;
    } catch (error) {
        console.error('Error saving item:', error);
        return false;
    }
}

// Helper Functions
function formatTimestamp(timestamp) {
    if (!timestamp) return 'Just now';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
}

// Format message with basic markdown (local implementation)
function formatMessage(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>')
        .replace(/```(.*?)```/gs, '<pre class="bg-gray-100 dark:bg-gray-800 p-2 rounded mt-2 overflow-x-auto"><code>$1</code></pre>');
}

// Add message to chat interface (local implementation to avoid circular imports)
function addMessageToChat(text, sender) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) {
        console.error('Chat messages container not found');
        return;
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `flex ${sender === 'user' ? 'justify-end' : 'justify-start'}`;

    const messageBubble = document.createElement('div');
    messageBubble.className = `max-w-[80%] p-4 rounded-2xl ${
        sender === 'user'
            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white'
    }`;

    // Parse markdown-style formatting
    const formattedText = formatMessage(text);
    messageBubble.innerHTML = formattedText;

    messageDiv.appendChild(messageBubble);
    chatMessages.appendChild(messageDiv);

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Initialize sidebar when dashboard loads
function initSidebar() {
    const user = auth.currentUser;
    console.log('🔧 Initializing sidebar for user:', user?.uid || 'No user');
    
    if (!user) {
        console.log('❌ No authenticated user found for sidebar');
        return;
    }

    console.log('✅ Loading sidebar data...');
    
    // Update user activity (tracks streak)
    updateUserActivity(user.uid);

    loadRecentChats();
    loadSavedItems();
    loadActivityStats();
}

// Refresh sidebar data
async function refreshSidebar() {
    loadRecentChats();
    loadSavedItems();
    loadActivityStats();
    
    // Refresh dashboard data as well
    if (auth.currentUser) {
        await dashboardData.refresh();
    }
}

// Function to open saved item from sidebar
function openSavedItem(itemId, event) {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('Opening saved item:', itemId);
    
    // Switch to bot interface using the dashboard navigation function
    const botInterface = document.getElementById('bot-interface');
    if (botInterface) {
        showSection(botInterface);
    } else {
        console.error('Could not find bot-interface element');
        return;
    }
    
    // Get current user
    const user = auth.currentUser;
    if (!user) {
        console.error('No user logged in');
        return;
    }
    
    // Query for the saved companion chat
    getDoc(doc(db, 'companionChats', itemId))
        .then(docSnapshot => {
            if (docSnapshot.exists()) {
                const itemData = docSnapshot.data();
                
                // Clear existing chat
                const chatContainer = document.getElementById('chat-messages');
                if (chatContainer) {
                    chatContainer.innerHTML = '';
                }
                
                // Add the companion interaction to chat using local addMessageToChat function
                // Add the user's prompt
                addMessageToChat(itemData.prompt, 'user');
                
                // Add the AI response with tool context
                const toolName = itemData.toolType?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Companion Tool';
                const responseWithContext = `**${toolName} Response:**\n\n${itemData.response}`;
                addMessageToChat(responseWithContext, 'bot');
                
                // If there's metadata, add it as additional context
                if (itemData.metadata && Object.keys(itemData.metadata).length > 0) {
                    let metadataText = '**Additional Information:**\n';
                    
                    // Format metadata nicely
                    Object.entries(itemData.metadata).forEach(([key, value]) => {
                        if (value && value !== '') {
                            const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                            metadataText += `• **${formattedKey}:** ${value}\n`;
                        }
                    });
                    
                    addMessageToChat(metadataText, 'bot');
                }
                
                console.log('Saved item loaded successfully');
            } else {
                console.log('No saved item found with that ID');
            }
        })
        .catch(error => {
            console.error('Error loading saved item:', error);
        });
}

// Function to delete chat from sidebar
function deleteChat(chatId, event) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!chatId) {
        console.error('No chat ID provided for deletion');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this chat?')) {
        return;
    }
    
    const user = auth.currentUser;
    if (!user) {
        console.error('No user logged in');
        return;
    }
    
    // Delete from Firestore using v9+ modular SDK
    deleteDoc(doc(db, 'chats', chatId))
        .then(() => {
            console.log('Chat deleted successfully');
            // Refresh the sidebar to update the chat list
            loadRecentChats();
        })
        .catch(error => {
            console.error('Error deleting chat:', error);
        });
}

// Function to open chat from sidebar
function openChat(chatMessage, event) {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('Opening chat:', chatMessage);
    
    // Switch to bot interface using the dashboard navigation function
    const botInterface = document.getElementById('bot-interface');
    if (botInterface) {
        showSection(botInterface);
    } else {
        console.error('Could not find bot-interface element');
        return;
    }
    
    // Get current user
    const user = auth.currentUser;
    if (!user) {
        console.error('No user logged in');
        return;
    }
    
    // Query for full chat history using the chat message as a starting point
    let q = query(
        collection(db, 'chats'),
        where('userId', '==', user.uid),
        where('userMessage', '==', chatMessage),
        orderBy('timestamp', 'desc')
    );
    
    // Try with orderBy first, fallback to simple query if index doesn't exist
    getDocs(q)
        .then(snapshot => {
            return { snapshot, fallback: false };
        })
        .catch(indexError => {
            console.warn('Index not available for ordered chat query, using simple query:', indexError);
            // Fallback to simple query without orderBy
            q = query(
                collection(db, 'chats'),
                where('userId', '==', user.uid),
                where('userMessage', '==', chatMessage)
            );
            return getDocs(q).then(snapshot => ({ snapshot, fallback: true }));
        })
        .then(({ snapshot }) => {
            if (!snapshot.empty) {
                const chatDoc = snapshot.docs[0];
                const chatData = chatDoc.data();
                
                // Clear existing chat
                const chatContainer = document.getElementById('chat-messages');
                if (chatContainer) {
                    chatContainer.innerHTML = '';
                }
                
                // Add the chat messages using local addMessageToChat function
                addMessageToChat(chatData.userMessage, 'user');
                addMessageToChat(chatData.botResponse, 'bot');
                
                console.log('Chat loaded successfully');
            } else {
                console.log('No chat found with that message');
            }
        })
        .catch(error => {
            console.error('Error loading chat:', error);
        });
}

// Function to delete saved item from sidebar
function deleteSavedItem(itemId, event) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!itemId) {
        console.error('No item ID provided for deletion');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this saved item?')) {
        return;
    }
    
    const user = auth.currentUser;
    if (!user) {
        console.error('No user logged in');
        return;
    }
    
    // Delete from companionChats collection using v9+ modular SDK
    deleteDoc(doc(db, 'companionChats', itemId))
        .then(() => {
            console.log('Saved item deleted successfully');
            // Refresh the sidebar to update the saved items list
            loadSavedItems();
        })
        .catch(error => {
            console.error('Error deleting saved item:', error);
        });
}

// Make functions globally available for onclick handlers
window.openChat = openChat;
window.deleteChat = deleteChat;
window.openSavedItem = openSavedItem;
window.deleteSavedItem = deleteSavedItem;

// Auto-init sidebar when auth changes
auth.onAuthStateChanged((user) => {
    if (user) {
        // Wait for DOM to be ready
        setTimeout(initSidebar, 500);
    }
});

// Refresh sidebar data periodically
setInterval(() => {
    if (auth.currentUser) {
        loadActivityStats();
    }
}, 60000); // Every minute

// Export functions for use in other modules
export { initSidebar, refreshSidebar, loadRecentChats, loadSavedItems, loadActivityStats, updateUserActivity, openSavedItem, deleteSavedItem };
