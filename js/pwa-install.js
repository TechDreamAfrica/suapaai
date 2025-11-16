// PWA Install Prompt
let deferredPrompt;
const modal = document.getElementById('pwa-install-modal');
const installBtn = document.getElementById('pwa-install-btn');
const dismissBtn = document.getElementById('pwa-dismiss-btn');

// Check if already dismissed or installed
const pwaPromptDismissed = localStorage.getItem('pwa-prompt-dismissed');
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

// Listen for the beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();

    // Stash the event so it can be triggered later
    deferredPrompt = e;

    // Show modal after 3 seconds if not dismissed and not in standalone mode
    if (!pwaPromptDismissed && !isStandalone) {
        setTimeout(() => {
            modal.classList.remove('hidden');
        }, 3000);
    }
});

// Install button click
installBtn?.addEventListener('click', async () => {
    if (!deferredPrompt) {
        // Fallback: Show instructions for manual install
        alert('To install:\n\n1. Click the browser menu (⋮)\n2. Select "Install app" or "Add to Home Screen"\n3. Follow the prompts');
        return;
    }

    // Hide the modal
    modal.classList.add('hidden');

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
    } else {
        console.log('User dismissed the install prompt');
    }

    // Clear the deferredPrompt for next time
    deferredPrompt = null;
});

// Dismiss button click
dismissBtn?.addEventListener('click', () => {
    modal.classList.add('hidden');
    localStorage.setItem('pwa-prompt-dismissed', 'true');

    // Clear dismissal after 7 days
    setTimeout(() => {
        localStorage.removeItem('pwa-prompt-dismissed');
    }, 7 * 24 * 60 * 60 * 1000);
});

// Close modal when clicking outside
modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.add('hidden');
        localStorage.setItem('pwa-prompt-dismissed', 'true');
    }
});

// Listen for successful installation
window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    modal.classList.add('hidden');
    localStorage.setItem('pwa-prompt-dismissed', 'true');
});
