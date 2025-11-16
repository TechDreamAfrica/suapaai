# Sua Pa AI - Mobile PWA

A fully-featured Progressive Web App (PWA) version of Sua Pa AI, designed specifically for mobile devices with Material Design principles.

## Features

### 🎨 Mobile-First Design
- **Bottom App Bar**: Easy thumb-zone navigation for one-handed use
- **Floating Action Button (FAB)**: Quick access to common actions
- **Material Design**: Modern, intuitive interface following Material Design guidelines
- **Dark Mode**: Automatic theme switching with system preferences support
- **Responsive**: Adapts to all screen sizes and orientations

### 🚀 PWA Capabilities
- **Offline Support**: Works without internet connection
- **Install to Home Screen**: Add to device like a native app
- **Push Notifications**: Stay updated with important alerts
- **Background Sync**: Syncs data when connection is restored
- **Fast Loading**: Service worker caching for instant loads

### 📱 Core Features
1. **AI Bot**: Chat interface for educational assistance
2. **Copilot**: Task and assignment management
3. **Companion**: Learning tools and study resources
   - Assignment Helper
   - Content Writer
   - Concept Explainer
   - Adaptive Learning
   - Subject Reference (GES Curriculum)

### 🔐 Authentication
- Email/Password authentication
- Google Sign-In
- Password reset functionality
- Persistent sessions

## Installation

### For Users

#### Android/Chrome:
1. Open the app in Chrome
2. Tap the menu (⋮) → "Add to Home screen"
3. Or wait for the automatic install prompt

#### iOS/Safari:
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"

### For Developers

1. **Firebase Setup**:
   ```bash
   # Ensure Firebase is configured in js/firebase.js
   # Add your Firebase config credentials
   ```

2. **Serve the PWA**:
   ```bash
   # Using Python
   python -m http.server 8000

   # Or using Node.js
   npx serve .

   # Or using PHP
   php -S localhost:8000
   ```

3. **Access the app**:
   ```
   http://localhost:8000/pwa/
   ```

## File Structure

```
pwa/
├── index.html              # Main HTML file
├── manifest.json           # PWA manifest
├── service-worker.js       # Service worker for offline support
├── README.md              # This file
│
├── css/
│   └── styles.css         # Mobile-optimized styles
│
├── js/
│   ├── firebase.js        # Firebase configuration
│   ├── auth.js           # Authentication logic
│   ├── app.js            # Main app navigation
│   ├── bot.js            # Chat bot functionality
│   ├── copilot.js        # Task management
│   ├── companion.js      # Learning tools
│   └── pwa.js            # PWA utilities
│
└── icons/                 # App icons (need to be added)
    ├── icon-72x72.png
    ├── icon-96x96.png
    ├── icon-128x128.png
    ├── icon-144x144.png
    ├── icon-152x152.png
    ├── icon-192x192.png
    ├── icon-384x384.png
    └── icon-512x512.png
```

## Icons Setup

You need to create app icons in the following sizes:
- 72x72
- 96x96
- 128x128
- 144x144
- 152x152
- 192x192
- 384x384
- 512x512

### Quick Icon Generation:

You can use online tools like:
- [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- [Favicon.io](https://favicon.io/)

Or use this simple approach:
1. Create a 512x512 base icon (PNG with transparent background)
2. Use an image editor or online tool to resize to all required sizes
3. Place all icons in the `pwa/icons/` folder

### Icon Design Guidelines:
- Use a simple, recognizable design
- Include the app logo or brand
- Ensure good contrast on various backgrounds
- Use a transparent or white background
- Make it look good at small sizes

## Configuration

### Firebase
Edit `js/firebase.js` to update your Firebase configuration:
```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    // ... other config
};
```

### Theme Colors
Edit `css/styles.css` to customize theme colors:
```css
:root {
    --primary-color: #6366f1;
    --secondary-color: #8b5cf6;
    --accent-color: #ec4899;
    /* ... other colors */
}
```

### Service Worker
Edit `service-worker.js` to:
- Update cache name when deploying new versions
- Add/remove URLs to cache
- Modify caching strategies

## Browser Support

- ✅ Chrome/Edge (Android & Desktop)
- ✅ Safari (iOS 11.3+)
- ✅ Firefox (Android & Desktop)
- ✅ Samsung Internet
- ⚠️ Limited support on older browsers

## Firebase Configuration Required

Make sure you have:
1. Firebase project created
2. Authentication enabled (Email/Password, Google)
3. Firestore database created
4. Firebase rules configured:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /messages/{message} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    match /tasks/{task} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

## Testing

### Test PWA Features:

1. **Offline Mode**:
   - Open DevTools → Network tab
   - Set to "Offline"
   - Refresh page - should still work

2. **Service Worker**:
   - Open DevTools → Application tab
   - Check Service Workers section
   - Should show active worker

3. **Install Prompt**:
   - Clear site data
   - Visit page
   - Should see install prompt after 5 seconds

4. **Manifest**:
   - Open DevTools → Application tab
   - Check Manifest section
   - Verify all properties

## Deployment

### Deploy to Firebase Hosting:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project
firebase init

# Deploy
firebase deploy
```

### Deploy to Netlify/Vercel:

1. Connect your Git repository
2. Set build settings (none needed for static PWA)
3. Deploy!

## Performance Optimization

- Service worker caches all static assets
- Images should be optimized and compressed
- Use WebP format for better compression
- Lazy load non-critical resources
- Minify CSS and JS for production

## Security Notes

- Never commit Firebase credentials
- Use environment variables for sensitive data
- Implement proper Firestore security rules
- Enable reCAPTCHA for authentication
- Use HTTPS in production

## Future Enhancements

- [ ] Offline message queue
- [ ] Voice input for chat
- [ ] File attachments
- [ ] Study reminders/notifications
- [ ] Calendar integration
- [ ] Collaborative features
- [ ] AI-powered study scheduling
- [ ] Progress tracking and analytics

## Support

For issues or questions:
1. Check the main project documentation
2. Review Firebase console for errors
3. Check browser console for JavaScript errors
4. Verify service worker is active

## License

Same as the parent project - Sua Pa AI

---

**Made with ❤️ for students**
