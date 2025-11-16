/**
 * Unified Configuration Loader
 *
 * This module provides a unified way to load configuration from:
 * 1. Google Drive (remote .env file)
 * 2. Local config.js (fallback)
 *
 * Usage:
 *   import { getConfig } from './config-loader.js';
 *   const config = await getConfig();
 */

// Configuration source priority
const CONFIG_SOURCE = {
    GOOGLE_DRIVE: 'google_drive',
    LOCAL: 'local'
};

// Google Drive configuration
const GOOGLE_DRIVE_CONFIG = {
    // Google Drive file ID from: https://drive.google.com/file/d/1D0vDDIFKIiMB8sCmyOsw2O6H_3Znbfg2/view?usp=sharing
    fileId: '1D0vDDIFKIiMB8sCmyOsw2O6H_3Znbfg2',
    enabled: true // Set to true to enable Google Drive loading
};

let cachedConfig = null;
let configLoadPromise = null;

/**
 * Parse .env file content
 */
function parseEnvContent(content) {
    const env = {};
    content.split('\n').forEach(line => {
        if (line.trim().startsWith('#') || !line.trim()) return;
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            env[match[1].trim()] = match[2].trim();
        }
    });
    return env;
}

/**
 * Generate config from environment variables
 */
function envToConfig(env) {
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
 * Load config from Google Drive
 */
async function loadFromGoogleDrive() {
    const url = `https://drive.google.com/uc?export=download&id=${GOOGLE_DRIVE_CONFIG.fileId}`;

    console.log('=� Loading config from Google Drive...');

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const content = await response.text();
    const env = parseEnvContent(content);
    const config = envToConfig(env);

    console.log(' Config loaded from Google Drive');
    return { config, source: CONFIG_SOURCE.GOOGLE_DRIVE };
}

/**
 * Load config from local file
 */
async function loadFromLocal() {
    console.log('=� Loading local config...');

    const module = await import('./config.js');
    const config = module.default;

    console.log(' Config loaded from local file');
    return { config, source: CONFIG_SOURCE.LOCAL };
}

/**
 * Get configuration with caching and fallback
 */
async function getConfig(forceReload = false) {
    // Return cached config if available
    if (cachedConfig && !forceReload) {
        console.log('=� Using cached config');
        return cachedConfig;
    }

    // Return existing load promise if already loading
    if (configLoadPromise) {
        console.log('� Config load already in progress...');
        return configLoadPromise;
    }

    // Start new load
    configLoadPromise = (async () => {
        try {
            let result;

            // Try Google Drive if enabled
            if (GOOGLE_DRIVE_CONFIG.enabled &&
                GOOGLE_DRIVE_CONFIG.fileId !== 'YOUR_GOOGLE_DRIVE_FILE_ID') {
                try {
                    result = await loadFromGoogleDrive();
                } catch (driveError) {
                    console.warn('�  Google Drive load failed:', driveError.message);
                    console.log('= Falling back to local config...');
                    result = await loadFromLocal();
                }
            } else {
                // Use local config
                result = await loadFromLocal();
            }

            // Cache the result
            cachedConfig = result.config;

            console.log(`=� Config source: ${result.source}`);
            console.log(`   - Firebase: ${result.config.firebase.projectId || 'Not set'}`);
            console.log(`   - OpenAI: ${result.config.ai.openaiApiKey ? 'Set' : 'Not set'}`);

            return result.config;

        } catch (error) {
            console.error('L Failed to load config:', error);
            throw new Error('Unable to load configuration');
        } finally {
            configLoadPromise = null;
        }
    })();

    return configLoadPromise;
}

/**
 * Update Google Drive configuration
 */
function setGoogleDriveConfig(fileId, enabled = true) {
    GOOGLE_DRIVE_CONFIG.fileId = fileId;
    GOOGLE_DRIVE_CONFIG.enabled = enabled;
    cachedConfig = null; // Clear cache
    console.log(' Google Drive config updated');
}

/**
 * Clear cached configuration
 */
function clearCache() {
    cachedConfig = null;
    console.log('=�  Config cache cleared');
}

// Export functions
export {
    getConfig,
    setGoogleDriveConfig,
    clearCache,
    CONFIG_SOURCE,
    GOOGLE_DRIVE_CONFIG
};

export default getConfig;
