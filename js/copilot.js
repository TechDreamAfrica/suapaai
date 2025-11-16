import {
    auth,
    db,
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp
} from './firebase.js';

import { refreshSidebar, updateUserActivity } from './sidebar.js';
import { dashboardData } from './dashboard-data.js';
import config from './config.js';
import { escapeHtml, showNotification } from './utils.js';

// DOM Elements
const taskForm = document.getElementById('task-form');
const tasksList = document.getElementById('tasks-list');

// AI API Configuration - Loaded from environment variables
const OPENAI_API_KEY = config.ai.openaiApiKey;
const OPENAI_API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

// Task data
let tasks = [];

// AI Helper Function
async function getAISuggestion(prompt) {
    if (!OPENAI_API_KEY) {
        return null; // Return null if no API key configured
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
                    {
                        role: 'system',
                        content: 'You are a helpful task management assistant for students in Ghana. Provide brief, actionable suggestions for breaking down tasks and managing study schedules.'
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 200
            })
        });

        if (!response.ok) return null;

        const data = await response.json();
        return data.choices[0]?.message?.content || null;
    } catch (error) {
        console.error('AI suggestion error:', error);
        return null;
    }
}

// Add Task
taskForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-description').value.trim();
    const deadline = document.getElementById('task-deadline').value;

    if (!title) return;

    const task = {
        title,
        description,
        deadline: deadline || null,
        completed: false,
        userId: auth.currentUser.uid,
        timestamp: serverTimestamp()
    };

    try {
        const docRef = await addDoc(collection(db, 'tasks'), task);
        task.id = docRef.id;
        task.timestamp = new Date();

        tasks.push(task);
        renderTasks();
        taskForm.reset();

        showNotification('Task added successfully!', 'success');

        // Update user activity (for streak tracking)
        updateUserActivity(auth.currentUser.uid);

        // Refresh sidebar to update task count
        refreshSidebar();
        
        // Refresh dashboard data
        if (dashboardData) {
            await dashboardData.refresh();
        }
    } catch (error) {
        console.error('Error adding task:', error);
        showNotification('Failed to add task', 'error');
    }
});

// Load Tasks
async function loadTasks() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        // Try with orderBy first, fallback to simple query if index doesn't exist
        let q = query(
            collection(db, 'tasks'),
            where('userId', '==', user.uid),
            orderBy('timestamp', 'desc')
        );

        let querySnapshot;
        try {
            querySnapshot = await getDocs(q);
        } catch (indexError) {
            console.warn('Index not available for ordered tasks query, using simple query:', indexError);
            // Fallback to simple query without orderBy
            q = query(
                collection(db, 'tasks'),
                where('userId', '==', user.uid)
            );
            querySnapshot = await getDocs(q);
        }

        tasks = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            tasks.push({
                id: doc.id,
                ...data,
                timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp || Date.now())
            });
        });

        // Sort manually if we couldn't use orderBy
        tasks.sort((a, b) => b.timestamp - a.timestamp);

        renderTasks();
    } catch (error) {
        console.error('Error loading tasks:', error);
        showNotification('Failed to load tasks', 'error');
    }
}

// Render Tasks
function renderTasks() {
    if (tasks.length === 0) {
        tasksList.innerHTML = `
            <div class="text-center text-gray-500 dark:text-gray-400 py-8">
                <i class="fas fa-tasks text-4xl mb-2"></i>
                <p>No tasks yet. Create your first task!</p>
            </div>
        `;
        return;
    }

    tasksList.innerHTML = tasks.map(task => createTaskHTML(task)).join('');

    // Add event listeners
    tasks.forEach(task => {
        const taskElement = document.getElementById(`task-${task.id}`);

        // Toggle completion
        taskElement.querySelector('.task-checkbox')?.addEventListener('change', (e) => {
            toggleTaskCompletion(task.id, e.target.checked);
        });

        // Delete task
        taskElement.querySelector('.delete-task')?.addEventListener('click', () => {
            deleteTask(task.id);
        });

        // Get AI Help
        taskElement.querySelector('.get-ai-help')?.addEventListener('click', async (e) => {
            e.preventDefault();
            await getTaskHelp(task.id);
        });
    });
}

// Get AI Help for a task
async function getTaskHelp(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const aiHelpBtn = document.querySelector(`[data-task-id="${taskId}"]`);
    if (aiHelpBtn) {
        aiHelpBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Getting help...';
        aiHelpBtn.disabled = true;
    }

    const prompt = `I have a task: "${task.title}". ${task.description ? `Description: ${task.description}. ` : ''}Give me 2-3 brief tips to help me complete this task efficiently as a student.`;

    const suggestion = await getAISuggestion(prompt);

    if (suggestion) {
        try {
            await updateDoc(doc(db, 'tasks', taskId), {
                aiSuggestion: suggestion
            });

            task.aiSuggestion = suggestion;
            renderTasks();
            showNotification('AI suggestions added!', 'success');
        } catch (error) {
            console.error('Error saving AI suggestion:', error);
            showNotification('Got suggestions but failed to save', 'error');
        }
    } else {
        showNotification('AI help not available. Configure API key in copilot.js', 'error');
        renderTasks();
    }
}

// Create Task HTML
function createTaskHTML(task) {
    const isOverdue = task.deadline && new Date(task.deadline) < new Date() && !task.completed;
    const deadlineText = task.deadline ? formatDeadline(task.deadline) : 'No deadline';

    return `
        <div id="task-${task.id}" class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 ${task.completed ? 'opacity-60' : ''}">
            <div class="flex items-start gap-3">
                <input type="checkbox"
                    class="task-checkbox w-5 h-5 mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    ${task.completed ? 'checked' : ''}>
                <div class="flex-1">
                    <h4 class="font-semibold text-gray-800 dark:text-white ${task.completed ? 'line-through' : ''}">
                        ${escapeHtml(task.title)}
                    </h4>
                    ${task.description ? `<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">${escapeHtml(task.description)}</p>` : ''}
                    ${task.aiSuggestion ? `
                        <div class="mt-2 p-2 bg-blue-50 dark:bg-blue-900/30 rounded text-xs text-blue-700 dark:text-blue-300">
                            <i class="fas fa-lightbulb mr-1"></i>
                            <strong>AI Tip:</strong> ${escapeHtml(task.aiSuggestion)}
                        </div>
                    ` : ''}
                    <div class="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span class="${isOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : ''}">
                            <i class="far fa-clock mr-1"></i>
                            ${deadlineText}
                        </span>
                        ${!task.completed && !task.aiSuggestion ? `
                            <button class="get-ai-help text-purple-600 dark:text-purple-400 hover:underline" data-task-id="${task.id}">
                                <i class="fas fa-magic mr-1"></i>Get AI Help
                            </button>
                        ` : ''}
                    </div>
                </div>
                <button class="delete-task text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

// Toggle Task Completion
async function toggleTaskCompletion(taskId, completed) {
    try {
        await updateDoc(doc(db, 'tasks', taskId), {
            completed: completed
        });

        const task = tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = completed;
            renderTasks();
        }

        showNotification(completed ? 'Task completed!' : 'Task marked as incomplete', 'success');

        // Refresh sidebar to update task count
        refreshSidebar();
        
        // Refresh dashboard data
        if (dashboardData) {
            await dashboardData.refresh();
        }
    } catch (error) {
        console.error('Error updating task:', error);
        showNotification('Failed to update task', 'error');
    }
}

// Delete Task
async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
        await deleteDoc(doc(db, 'tasks', taskId));
        tasks = tasks.filter(t => t.id !== taskId);
        renderTasks();
        showNotification('Task deleted successfully', 'success');

        // Refresh sidebar to update task count
        refreshSidebar();
        
        // Refresh dashboard data
        if (dashboardData) {
            await dashboardData.refresh();
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        showNotification('Failed to delete task', 'error');
    }
}

// Format Deadline
function formatDeadline(deadline) {
    if (!deadline) return 'No deadline';

    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diffTime = deadlineDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return `Overdue by ${Math.abs(diffDays)} day(s)`;
    } else if (diffDays === 0) {
        return 'Due today';
    } else if (diffDays === 1) {
        return 'Due tomorrow';
    } else if (diffDays <= 7) {
        return `Due in ${diffDays} days`;
    } else {
        return deadlineDate.toLocaleDateString();
    }
}

// Check for upcoming deadlines and send reminders
function checkDeadlineReminders() {
    const now = new Date();
    tasks.forEach(task => {
        if (task.deadline && !task.completed) {
            const deadline = new Date(task.deadline);
            const hoursUntilDeadline = (deadline - now) / (1000 * 60 * 60);

            // Remind 24 hours before deadline
            if (hoursUntilDeadline > 0 && hoursUntilDeadline <= 24) {
                // You can implement browser notifications here if needed
                console.log(`Reminder: Task "${task.title}" is due soon!`);
            }
        }
    });
}

// Check reminders every hour
setInterval(checkDeadlineReminders, 60 * 60 * 1000);

// Export for testing
export { loadTasks, toggleTaskCompletion, deleteTask };
