// PWA Installation and Service Worker Registration

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/pwa/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered successfully:', registration.scope);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('New Service Worker found');

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available, show update prompt
              showUpdatePrompt();
            }
          });
        });
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

// Show update prompt
function showUpdatePrompt() {
  const updateBanner = document.createElement('div');
  updateBanner.className = 'update-banner';
  updateBanner.innerHTML = `
    <div class="update-banner-content">
      <span>A new version is available!</span>
      <button id="update-btn" class="btn btn-primary">Update</button>
    </div>
  `;
  document.body.appendChild(updateBanner);

  document.getElementById('update-btn').addEventListener('click', () => {
    navigator.serviceWorker.getRegistration().then(registration => {
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    });
    window.location.reload();
  });
}

// PWA Install Prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('beforeinstallprompt event fired');
  e.preventDefault();
  deferredPrompt = e;

  // Show install button
  showInstallPrompt();
});

function showInstallPrompt() {
  const installBanner = document.createElement('div');
  installBanner.id = 'install-banner';
  installBanner.className = 'install-banner';
  installBanner.innerHTML = `
    <div class="install-banner-content">
      <div class="install-banner-text">
        <i class="fas fa-download"></i>
        <div>
          <strong>Install Sua Pa AI</strong>
          <p>Install our app for a better experience</p>
        </div>
      </div>
      <div class="install-banner-actions">
        <button id="install-btn" class="btn btn-primary btn-sm">Install</button>
        <button id="dismiss-install" class="btn btn-secondary btn-sm">Not now</button>
      </div>
    </div>
  `;

  // Only show if not already dismissed
  if (!localStorage.getItem('installPromptDismissed')) {
    setTimeout(() => {
      document.body.appendChild(installBanner);
    }, 5000); // Show after 5 seconds
  }

  document.addEventListener('click', (e) => {
    if (e.target.id === 'install-btn') {
      installApp();
    }
    if (e.target.id === 'dismiss-install') {
      dismissInstallPrompt();
    }
  });
}

async function installApp() {
  if (!deferredPrompt) {
    console.log('Install prompt not available');
    return;
  }

  deferredPrompt.prompt();

  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User response to install prompt: ${outcome}`);

  if (outcome === 'accepted') {
    console.log('User accepted the install prompt');
  } else {
    console.log('User dismissed the install prompt');
  }

  deferredPrompt = null;

  // Remove install banner
  const banner = document.getElementById('install-banner');
  if (banner) {
    banner.remove();
  }
}

function dismissInstallPrompt() {
  const banner = document.getElementById('install-banner');
  if (banner) {
    banner.remove();
  }
  localStorage.setItem('installPromptDismissed', 'true');
}

// Handle app installed event
window.addEventListener('appinstalled', () => {
  console.log('PWA was installed');
  deferredPrompt = null;

  // Show success message
  showToast('App installed successfully!', 'success');
});

// Check if running as PWA
function isRunningStandalone() {
  return (window.matchMedia('(display-mode: standalone)').matches) ||
         (window.navigator.standalone) ||
         document.referrer.includes('android-app://');
}

if (isRunningStandalone()) {
  console.log('Running as installed PWA');
  document.body.classList.add('standalone-mode');
}

// Network Status Detection
window.addEventListener('online', () => {
  console.log('Network connection restored');
  showToast('You are back online!', 'success');
  document.body.classList.remove('offline-mode');
});

window.addEventListener('offline', () => {
  console.log('Network connection lost');
  showToast('You are offline. Some features may be limited.', 'warning');
  document.body.classList.add('offline-mode');
});

// Background Sync Registration
async function registerBackgroundSync(tag) {
  if ('serviceWorker' in navigator && 'sync' in navigator.serviceWorker) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(tag);
      console.log(`Background sync registered: ${tag}`);
    } catch (error) {
      console.error('Background sync registration failed:', error);
    }
  }
}

// Push Notification Support
async function subscribeToPushNotifications() {
  if (!('PushManager' in window)) {
    console.log('Push notifications not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(getVapidPublicKey())
    });

    console.log('Push notification subscription:', subscription);
    return subscription;
  } catch (error) {
    console.error('Push notification subscription failed:', error);
    return null;
  }
}

function getVapidPublicKey() {
  // Get VAPID key from environment config
  return window.ENV?.VITE_VAPID_PUBLIC_KEY || '';
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Request Notification Permission
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

// Show local notification
function showNotification(title, options = {}) {
  if (Notification.permission === 'granted') {
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification(title, {
        icon: '/pwa/icons/icon-192x192.png',
        badge: '/pwa/icons/badge-72x72.png',
        vibrate: [200, 100, 200],
        ...options
      });
    });
  }
}

// Toast notification helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideDown 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Export for use in other modules
window.PWA = {
  registerBackgroundSync,
  subscribeToPushNotifications,
  requestNotificationPermission,
  showNotification,
  showToast,
  isRunningStandalone
};
