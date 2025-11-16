/**
 * Load Environment Variables from Google Drive
 *
 * This module loads the .env file from a Google Drive share link
 * and makes the configuration available to the application.
 *
 * Setup Instructions:
 * 1. Upload your .env file to Google Drive
 * 2. Right-click > Share > Get link
 * 3. Set to "Anyone with the link can view"
 * 4. Copy the file ID from the share link
 * 5. Update DRIVE_FILE_ID below
 */

// Google Drive file ID (extract from share link)
// Share link format: https://drive.google.com/file/d/FILE_ID_HERE/view?usp=sharing
// Full link: https://drive.google.com/file/d/1D0vDDIFKIiMB8sCmyOsw2O6H_3Znbfg2/view?usp=sharing
const DRIVE_FILE_ID = '1D0vDDIFKIiMB8sCmyOsw2O6H_3Znbfg2';

// Google Drive direct download URL
const DRIVE_DOWNLOAD_URL = `https://drive.google.com/uc?export=download&id=${DRIVE_FILE_ID}`;

/**
 * Parse .env file content into an object
 * @param {string} content - The .env file content
 * @returns {object} Parsed environment variables
 */
function parseEnvContent(content) {
    const env = {};

    content.split('\n').forEach(line => {
        // Skip comments and empty lines
        if (line.trim().startsWith('#') || !line.trim()) {
            return;
        }

        // Parse KEY=VALUE
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim();
            env[key] = value;
        }
    });

    return env;
}

/**
 * Generate config object from environment variables
 * @param {object} env - Environment variables object
 * @returns {object} Configuration object
 */
function generateConfig(env) {
    return {
        firebase: {
            apiKey: env.VITE_FIREBASE_API_KEY || '',
            authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
            projectId: env.VITE_FIREBASE_PROJECT_ID || '',
            storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
            messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
            appId: env.VITE_FIREBASE_APP_ID || '',
            measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || ''
        },
        ai: {
            openaiApiKey: env.VITE_OPENAI_API_KEY || '',
            anthropicApiKey: env.VITE_ANTHROPIC_API_KEY || ''
        },
        app: {
            name: env.VITE_APP_NAME || 'Sua Pa AI',
            url: env.VITE_APP_URL || 'http://localhost:3000',
            apiBaseUrl: env.VITE_API_BASE_URL || 'http://localhost:3000'
        }
    };
}

/**
 * Load configuration from Google Drive
 * @returns {Promise<object>} Configuration object
 */
async function loadConfigFromDrive() {
    try {
        console.log('=� Loading configuration from Google Drive...');

        // Fetch .env file from Google Drive
        const response = await fetch(DRIVE_DOWNLOAD_URL);

        if (!response.ok) {
            throw new Error(`Failed to fetch .env from Google Drive: ${response.status}`);
        }

        const envContent = await response.text();

        // Parse environment variables
        const env = parseEnvContent(envContent);

        // Generate config
        const config = generateConfig(env);

        console.log(' Configuration loaded successfully from Google Drive');
        console.log(`   - Firebase Project: ${config.firebase.projectId || 'Not set'}`);
        console.log(`   - OpenAI API Key: ${config.ai.openaiApiKey ? ' Set' : ' Not set'}`);
        console.log(`   - App Name: ${config.app.name}`);

        return config;

    } catch (error) {
        console.error('L Error loading config from Google Drive:', error);
        throw error;
    }
}

/**
 * Load configuration with fallback to local config
 * @returns {Promise<object>} Configuration object
 */
async function loadConfig() {
    // Check if Google Drive file ID is configured
    if (DRIVE_FILE_ID === 'YOUR_GOOGLE_DRIVE_FILE_ID') {
        console.warn('�  Google Drive file ID not configured');
        console.log('=� Attempting to load local config...');

        try {
            // Try to import local config
            const localConfig = await import('./config.js');
            console.log(' Loaded local config.js');
            return localConfig.default;
        } catch (error) {
            console.error('L Failed to load local config:', error);
            throw new Error('No configuration available. Please set up Google Drive or local config.');
        }
    }

    try {
        // Try to load from Google Drive first
        return await loadConfigFromDrive();
    } catch (driveError) {
        console.warn('�  Failed to load from Google Drive, falling back to local config');

        try {
            // Fallback to local config
            const localConfig = await import('./config.js');
            console.log(' Loaded local config.js as fallback');
            return localConfig.default;
        } catch (localError) {
            console.error('L All config sources failed');
            throw new Error('Unable to load configuration from any source');
        }
    }
}

// Export the config loader
export { loadConfig, loadConfigFromDrive };
export default loadConfig;
