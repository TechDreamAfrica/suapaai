// Bot Chat Functionality
import { auth, db, collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from './firebase.js';
import config from './config.js';

const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');

// AI API Configuration - Loaded from environment variables
const OPENAI_API_KEY = config.ai.openaiApiKey;
const OPENAI_API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

let currentChatId = null;

// Initialize Bot
chatForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await sendMessage();
});

async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    // Add user message to UI
    addMessageToUI(message, 'user');

    // Clear input
    chatInput.value = '';

    // Save to Firestore
    try {
        await saveMessage(message, 'user');

        // Get bot response (placeholder - integrate with actual AI API)
        const botResponse = await getBotResponse(message);

        // Add bot response to UI
        addMessageToUI(botResponse, 'bot');

        // Save bot response
        await saveMessage(botResponse, 'bot');

        // Update stats
        if (window.updateStats) {
            window.updateStats();
        }
    } catch (error) {
        console.error('Error sending message:', error);
        if (window.PWA) {
            window.PWA.showToast('Failed to send message', 'error');
        }
    }
}

function addMessageToUI(message, type) {
    if (!chatMessages) return;

    // Remove empty state if present
    const emptyState = chatMessages.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message-bubble ${type} fade-in`;
    messageDiv.textContent = message;

    chatMessages.appendChild(messageDiv);

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function saveMessage(content, role) {
    if (!auth.currentUser) return;

    try {
        if (!currentChatId) {
            // Create new chat session
            currentChatId = `chat_${Date.now()}`;
        }

        await addDoc(collection(db, 'messages'), {
            userId: auth.currentUser.uid,
            chatId: currentChatId,
            content,
            role,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error('Error saving message:', error);
    }
}

async function getBotResponse(userMessage) {
    // Use OpenAI API if key is configured, otherwise use placeholder responses
    if (OPENAI_API_KEY) {
        console.log('PWA: Using OpenAI API with key:', OPENAI_API_KEY.substring(0, 20) + '...');

        try {
            const response = await fetch(OPENAI_API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are Sua Pa AI, an educational assistant for students in Ghana following the GES curriculum. Provide helpful, accurate, and concise answers.'
                        },
                        { role: 'user', content: userMessage }
                    ],
                    temperature: 0.7,
                    max_tokens: 500
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('PWA: OpenAI API Success');
                return data.choices[0].message.content;
            } else {
                const errorText = await response.text();
                console.error('PWA: OpenAI API Error:', response.status, errorText);
            }
        } catch (error) {
            console.error('PWA: AI API error:', error);
        }
    } else {
        console.warn('PWA: No OpenAI API key configured');
    }

    // Fallback to placeholder responses
    await new Promise(resolve => setTimeout(resolve, 1000));

    const responses = {
        greeting: [
            "Hello! How can I help you with your studies today?",
            "Hi there! What would you like to learn about?",
            "Hey! I'm here to assist you. What do you need help with?"
        ],
        help: [
            "I can help you with homework, explain concepts, create study materials, and much more!",
            "I'm your educational companion. Ask me about any subject or topic you're studying.",
            "Feel free to ask me questions about your assignments, or request help with understanding difficult concepts."
        ],
        default: [
            "That's an interesting question! Let me help you understand that better.",
            "Great question! Here's what I know about that...",
            "I'd be happy to help you with that!"
        ]
    };

    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.match(/\b(hi|hello|hey|greetings)\b/)) {
        return responses.greeting[Math.floor(Math.random() * responses.greeting.length)];
    }

    if (lowerMessage.match(/\b(help|what can you do|capabilities)\b/)) {
        return responses.help[Math.floor(Math.random() * responses.help.length)];
    }

    return responses.default[Math.floor(Math.random() * responses.default.length)];
}

async function loadChatHistory() {
    if (!auth.currentUser || !chatMessages) return;

    try {
        const messagesQuery = query(
            collection(db, 'messages'),
            where('userId', '==', auth.currentUser.uid),
            orderBy('timestamp', 'desc')
        );

        const querySnapshot = await getDocs(messagesQuery);

        if (querySnapshot.empty) {
            showEmptyState();
            return;
        }

        chatMessages.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const message = doc.data();
            addMessageToUI(message.content, message.role);
        });
    } catch (error) {
        console.error('Error loading chat history:', error);
        showEmptyState();
    }
}

function showEmptyState() {
    if (!chatMessages) return;

    chatMessages.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-comments"></i>
            <p>Start a conversation!</p>
            <p style="font-size: 12px; margin-top: 8px;">Ask me anything about your studies</p>
        </div>
    `;
}

// Load chat history when user logs in
auth.onAuthStateChanged(user => {
    if (user) {
        loadChatHistory();
    }
});

// New chat functionality
function startNewChat() {
    currentChatId = null;
    if (chatMessages) {
        chatMessages.innerHTML = '';
        showEmptyState();
    }
    if (chatInput) {
        chatInput.focus();
    }
}

// Export for use in other modules
export { startNewChat, addMessageToUI };
