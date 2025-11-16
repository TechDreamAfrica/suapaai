// Configuration Template for Main App
// IMPORTANT: This is a template file - DO NOT use directly!
//
// To set up your configuration:
// 1. Copy .env.example to .env
// 2. Fill in your actual credentials in .env
// 3. Run: npm run config
//    This will generate js/config.js from your .env file
//
// The actual config.js is auto-generated and not committed to git

const config = {
    firebase: {
        apiKey: "YOUR_FIREBASE_API_KEY",
        authDomain: "your-app.firebaseapp.com",
        projectId: "your-project-id",
        storageBucket: "your-app.firebasestorage.app",
        messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
        appId: "YOUR_APP_ID",
        measurementId: "YOUR_MEASUREMENT_ID"
    },
    ai: {
        openaiApiKey: "YOUR_OPENAI_API_KEY",
        anthropicApiKey: "YOUR_ANTHROPIC_API_KEY"
    },
    app: {
        name: "Sua Pa AI",
        url: "http://localhost:3000",
        apiBaseUrl: "http://localhost:3000"
    }
};

export default config;
