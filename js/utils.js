// Shared utility functions for Sua Pa AI

/**
 * Escapes HTML special characters to prevent XSS
 * @param {string} text - The text to escape
 * @returns {string} - HTML-safe text
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Shows a temporary notification message
 * @param {string} message - The message to display
 * @param {string} type - The notification type ('success', 'error', 'warning', 'info')
 */
export function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    let bgColor;

    switch(type) {
        case 'success':
            bgColor = 'bg-green-600';
            break;
        case 'error':
            bgColor = 'bg-red-600';
            break;
        case 'warning':
            bgColor = 'bg-yellow-600';
            break;
        case 'info':
            bgColor = 'bg-blue-600';
            break;
        default:
            bgColor = 'bg-gray-600';
    }

    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white ${bgColor} transition-opacity duration-300 z-50`;
    notification.textContent = message;

    document.body.appendChild(notification);

    const duration = (type === 'info' || type === 'warning') ? 5000 : 3000;
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}
