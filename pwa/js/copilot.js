// Copilot Task Management Functionality
import { auth, db, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp } from './firebase.js';

const taskForm = document.getElementById('task-form');
const tasksList = document.getElementById('tasks-list');
const taskTitle = document.getElementById('task-title');
const taskDescription = document.getElementById('task-description');
const taskDeadline = document.getElementById('task-deadline');

// Initialize Copilot
taskForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await addTask();
});

async function addTask() {
    const title = taskTitle?.value.trim();
    const description = taskDescription?.value.trim();
    const deadline = taskDeadline?.value;

    if (!title) {
        if (window.PWA) {
            window.PWA.showToast('Please enter a task title', 'error');
        }
        return;
    }

    if (!auth.currentUser) {
        if (window.PWA) {
            window.PWA.showToast('Please login to add tasks', 'error');
        }
        return;
    }

    try {
        const task = {
            userId: auth.currentUser.uid,
            title,
            description,
            deadline: deadline || null,
            completed: false,
            createdAt: serverTimestamp()
        };

        await addDoc(collection(db, 'tasks'), task);

        // Clear form
        if (taskTitle) taskTitle.value = '';
        if (taskDescription) taskDescription.value = '';
        if (taskDeadline) taskDeadline.value = '';

        if (window.PWA) {
            window.PWA.showToast('Task added successfully!', 'success');
        }

        // Reload tasks
        loadTasks();

        // Update stats
        if (window.updateStats) {
            window.updateStats();
        }
    } catch (error) {
        console.error('Error adding task:', error);
        if (window.PWA) {
            window.PWA.showToast('Failed to add task', 'error');
        }
    }
}

async function loadTasks() {
    if (!auth.currentUser || !tasksList) return;

    try {
        const tasksQuery = query(
            collection(db, 'tasks'),
            where('userId', '==', auth.currentUser.uid),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(tasksQuery);

        if (querySnapshot.empty) {
            showEmptyState();
            return;
        }

        tasksList.innerHTML = '';

        querySnapshot.forEach((docSnapshot) => {
            const task = docSnapshot.data();
            const taskElement = createTaskElement(task, docSnapshot.id);
            tasksList.appendChild(taskElement);
        });
    } catch (error) {
        console.error('Error loading tasks:', error);
        showEmptyState();
    }
}

function createTaskElement(task, taskId) {
    const taskItem = document.createElement('div');
    taskItem.className = 'task-item fade-in';

    const checkbox = document.createElement('div');
    checkbox.className = `task-checkbox ${task.completed ? 'checked' : ''}`;
    checkbox.innerHTML = task.completed ? '<i class="fas fa-check"></i>' : '';
    checkbox.addEventListener('click', () => toggleTask(taskId, task.completed));

    const content = document.createElement('div');
    content.className = 'task-content';

    const titleEl = document.createElement('div');
    titleEl.className = 'task-title';
    titleEl.textContent = task.title;
    if (task.completed) {
        titleEl.style.textDecoration = 'line-through';
        titleEl.style.opacity = '0.6';
    }

    content.appendChild(titleEl);

    if (task.description) {
        const descEl = document.createElement('div');
        descEl.className = 'task-description';
        descEl.textContent = task.description;
        content.appendChild(descEl);
    }

    if (task.deadline) {
        const deadlineEl = document.createElement('div');
        deadlineEl.className = 'task-description';
        deadlineEl.style.color = 'var(--warning-color)';
        deadlineEl.innerHTML = `<i class="fas fa-clock"></i> ${formatDeadline(task.deadline)}`;
        content.appendChild(deadlineEl);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'icon-btn';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.style.color = 'var(--error-color)';
    deleteBtn.addEventListener('click', () => deleteTask(taskId));

    taskItem.appendChild(checkbox);
    taskItem.appendChild(content);
    taskItem.appendChild(deleteBtn);

    return taskItem;
}

async function toggleTask(taskId, currentStatus) {
    try {
        const taskRef = doc(db, 'tasks', taskId);
        await updateDoc(taskRef, {
            completed: !currentStatus
        });

        loadTasks();

        if (window.PWA) {
            window.PWA.showToast(
                !currentStatus ? 'Task completed!' : 'Task marked as incomplete',
                'success'
            );
        }
    } catch (error) {
        console.error('Error toggling task:', error);
        if (window.PWA) {
            window.PWA.showToast('Failed to update task', 'error');
        }
    }
}

async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }

    try {
        await deleteDoc(doc(db, 'tasks', taskId));

        loadTasks();

        if (window.PWA) {
            window.PWA.showToast('Task deleted', 'success');
        }

        // Update stats
        if (window.updateStats) {
            window.updateStats();
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        if (window.PWA) {
            window.PWA.showToast('Failed to delete task', 'error');
        }
    }
}

function formatDeadline(deadline) {
    if (!deadline) return '';

    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diff = deadlineDate - now;

    if (diff < 0) {
        return 'Overdue';
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
        return `Due in ${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
        return `Due in ${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
        return 'Due soon';
    }
}

function showEmptyState() {
    if (!tasksList) return;

    tasksList.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-check-circle"></i>
            <p>No tasks yet</p>
            <p style="font-size: 12px; margin-top: 8px;">Add your first task to get started</p>
        </div>
    `;
}

// Load tasks when user logs in
auth.onAuthStateChanged(user => {
    if (user) {
        loadTasks();
    }
});

// Export for use in other modules
export { loadTasks };
