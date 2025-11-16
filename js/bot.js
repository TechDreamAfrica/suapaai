import {
    auth,
    db,
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp
} from './firebase.js';

import { refreshSidebar, updateUserActivity } from './sidebar.js';
import { dashboardData } from './dashboard-data.js';
import config from './config.js';

// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');

// AI API Configuration - Loaded from environment variables
const OPENAI_API_KEY = config.ai.openaiApiKey;
const OPENAI_API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

// Ghana Education Service curriculum context
const GES_CONTEXT = `You are Sua Pa AI, an educational assistant for students in Ghana following the Ghana Education Service (GES) curriculum.
You help with subjects including Mathematics, English Language, Integrated Science, Social Studies, and other GES-approved subjects.
Provide accurate, helpful, and age-appropriate answers aligned with Ghanaian educational standards.
Be concise, clear, and use examples relevant to Ghanaian students.`;

// Chat Form Submission
chatForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();

    if (!message) return;

    // Display user message
    addMessage(message, 'user');
    chatInput.value = '';

    // Show typing indicator
    const typingId = showTypingIndicator();

    try {
        // Get AI response
        const response = await getAIResponse(message);

        // Remove typing indicator
        removeTypingIndicator(typingId);

        // Display AI response
        addMessage(response, 'bot');

        // Save to Firebase
        await saveChatMessage(message, response);
    } catch (error) {
        console.error('Error getting AI response:', error);
        removeTypingIndicator(typingId);
        addMessage('Sorry, I encountered an error. Please try again.', 'bot');
    }
});

// Add message to chat interface
function addMessage(text, sender) {
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

// Add companion message to chat interface
function addCompanionMessage(companionData) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'flex justify-start mb-4';

    const toolTypeIcons = {
        'assignment-helper': 'fa-magic',
        'content-writer': 'fa-pen-fancy',
        'explainer': 'fa-lightbulb',
        'reference-topic': 'fa-graduation-cap'
    };

    const toolTypeColors = {
        'assignment-helper': 'from-green-600 to-green-700',
        'content-writer': 'from-blue-600 to-blue-700',
        'explainer': 'from-yellow-600 to-yellow-700',
        'reference-topic': 'from-red-600 to-red-700'
    };

    const toolTypeNames = {
        'assignment-helper': 'Assignment Helper',
        'content-writer': 'Content Writer',
        'explainer': 'Concept Explainer',
        'reference-topic': 'Reference Topic'
    };

    const messageBubble = document.createElement('div');
    messageBubble.className = 'max-w-[80%] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl overflow-hidden';

    let metadataHtml = '';
    if (companionData.metadata) {
        const meta = companionData.metadata;
        if (meta.subject) metadataHtml += `<span class="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded mr-2">${meta.subject}</span>`;
        if (meta.topic) metadataHtml += `<span class="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded mr-2">${meta.topic}</span>`;
        if (meta.type) metadataHtml += `<span class="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded mr-2">${meta.type}</span>`;
        if (meta.levelDescription) metadataHtml += `<span class="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">${meta.levelDescription}</span>`;
    }

    messageBubble.innerHTML = `
        <div class="bg-gradient-to-r ${toolTypeColors[companionData.toolType] || 'from-gray-600 to-gray-700'} p-3">
            <div class="flex items-center gap-2 text-white">
                <i class="fas ${toolTypeIcons[companionData.toolType] || 'fa-cog'}"></i>
                <span class="font-semibold">${toolTypeNames[companionData.toolType] || 'Companion Tool'}</span>
                <span class="text-xs opacity-75">${companionData.timestamp.toLocaleString()}</span>
            </div>
            ${metadataHtml ? `<div class="mt-2">${metadataHtml}</div>` : ''}
        </div>
        <div class="p-4">
            <div class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">${formatMessage(companionData.response)}</div>
        </div>
    `;

    messageDiv.appendChild(messageBubble);
    chatMessages.appendChild(messageDiv);

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Format message with basic markdown
function formatMessage(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>')
        .replace(/```(.*?)```/gs, '<pre class="bg-gray-100 dark:bg-gray-800 p-2 rounded mt-2 overflow-x-auto"><code>$1</code></pre>');
}

// Typing indicator
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    const id = Date.now();
    typingDiv.id = `typing-${id}`;
    typingDiv.className = 'flex justify-start';

    typingDiv.innerHTML = `
        <div class="bg-gray-200 dark:bg-gray-700 p-4 rounded-2xl">
            <div class="flex gap-1">
                <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0s"></div>
                <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
            </div>
        </div>
    `;

    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return id;
}

function removeTypingIndicator(id) {
    const indicator = document.getElementById(`typing-${id}`);
    if (indicator) {
        indicator.remove();
    }
}

// Get AI Response using OpenAI
async function getAIResponse(userMessage) {
    // Check if API key is configured
    if (!OPENAI_API_KEY) {
        console.warn('OpenAI API key not configured, using fallback responses');
        return getFallbackResponse(userMessage);
    }

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
                    { role: 'system', content: GES_CONTEXT },
                    { role: 'user', content: userMessage }
                ],
                temperature: 0.7,
                max_tokens: 1024
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenAI API Error Response:', response.status, errorText);
            throw new Error(`API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || getFallbackResponse(userMessage);
    } catch (error) {
        console.error('AI API Error Details:', error.message);
        console.error('Full error:', error);
        return getFallbackResponse(userMessage);
    }
}

// Fallback response when AI API is not configured
function getFallbackResponse(message) {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
        return "Hello! I'm Sua Pa AI, your educational companion. How can I help you with your studies today?";
    }

    if (lowerMessage.includes('math') || lowerMessage.includes('mathematics')) {
        return "I can help you with Mathematics! What specific topic would you like to explore? (Algebra, Geometry, Statistics, etc.)";
    }

    if (lowerMessage.includes('science')) {
        return "Science is fascinating! I can assist with Physics, Chemistry, and Biology. What would you like to learn about?";
    }

    if (lowerMessage.includes('english')) {
        return "I can help with English Language! Whether it's grammar, comprehension, or essay writing, I'm here to assist.";
    }

    if (lowerMessage.includes('help')) {
        return "I'm here to help with:\n- Mathematics\n- Science (Physics, Chemistry, Biology)\n- English Language\n- Social Studies\n- Study tips and explanations\n\nWhat subject interests you?";
    }

    return `Thank you for your message! I'm here to help with your studies. Feel free to ask about specific subjects like Math, Science, English, or Social Studies!`;
}

// Save chat to Firebase
async function saveChatMessage(userMessage, botResponse) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        await addDoc(collection(db, 'chats'), {
            userId: user.uid,
            userMessage: userMessage,
            botResponse: botResponse,
            timestamp: serverTimestamp()
        });

        // Update user activity (for streak tracking)
        updateUserActivity(user.uid);

        // Refresh sidebar and dashboard data to show new chat
        refreshSidebar();
        
        // Refresh dashboard data
        if (dashboardData) {
            await dashboardData.refresh();
        }
    } catch (error) {
        console.error('Error saving chat:', error);
    }
}

// Load chat history from Firebase
async function loadChatHistory() {
    const user = auth.currentUser;
    if (!user) return;

    // Clear existing messages
    if (chatMessages) {
        chatMessages.innerHTML = '';
    }

    try {
        // Load regular chats
        const chatQuery = query(
            collection(db, 'chats'),
            where('userId', '==', user.uid),
            orderBy('timestamp', 'asc')
        );

        // Load companion chats
        const companionQuery = query(
            collection(db, 'companionChats'),
            where('userId', '==', user.uid),
            orderBy('timestamp', 'asc')
        );

        const [chatSnapshot, companionSnapshot] = await Promise.all([
            getDocs(chatQuery),
            getDocs(companionQuery)
        ]);

        // Combine and sort all messages by timestamp
        const allMessages = [];

        chatSnapshot.forEach((doc) => {
            const data = doc.data();
            allMessages.push({
                type: 'chat',
                timestamp: data.timestamp?.toDate() || new Date(data.createdAt),
                userMessage: data.userMessage,
                botResponse: data.botResponse
            });
        });

        companionSnapshot.forEach((doc) => {
            const data = doc.data();
            allMessages.push({
                type: 'companion',
                timestamp: data.timestamp?.toDate() || new Date(data.createdAt),
                toolType: data.toolType,
                prompt: data.prompt,
                response: data.response,
                metadata: data.metadata
            });
        });

        // Sort by timestamp
        allMessages.sort((a, b) => a.timestamp - b.timestamp);

        if (allMessages.length === 0) {
            addMessage("Hello! I'm Sua Pa AI, your educational companion. Ask me anything about your studies!", 'bot');
        } else {
            allMessages.forEach((msg) => {
                if (msg.type === 'chat') {
                    addMessage(msg.userMessage, 'user');
                    addMessage(msg.botResponse, 'bot');
                } else {
                    addCompanionMessage(msg);
                }
            });
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
        addMessage("Hello! I'm Sua Pa AI, your educational companion. Ask me anything about your studies!", 'bot');
    }
}

// Export for use in other modules
export { loadChatHistory };
