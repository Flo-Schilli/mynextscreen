/**
 * Digital Signage LG WebOS Application
 * Thin shell that loads the web player in an iframe and authenticates via postMessage.
 */

const STORAGE_KEYS = {
    serverUrl: 'server_url',
    apiKey: 'api_key',
    playerUrl: 'player_url'
};

/**
 * Initialize the application.
 * If Server URL or API Key are missing, opens the settings overlay.
 */
function initApp() {
    console.log('Initializing Digital Signage application...');

    const serverUrl = localStorage.getItem(STORAGE_KEYS.serverUrl);
    const apiKey = localStorage.getItem(STORAGE_KEYS.apiKey);

    if (!serverUrl || !apiKey) {
        const loadingMessage = document.getElementById('loadingMessage');
        if (loadingMessage) {
            loadingMessage.textContent = 'Configuration required. Open settings to enter Server URL and API Key.';
        }
        if (typeof window.toggleSettings === 'function') {
            window.toggleSettings(true);
        } else {
            setTimeout(function() {
                if (typeof window.toggleSettings === 'function') {
                    window.toggleSettings(true);
                }
            }, 0);
        }
        console.warn('Server URL or API Key missing. Waiting for configuration.');
        return;
    }

    // Resolve the player URL
    const playerUrl = localStorage.getItem(STORAGE_KEYS.playerUrl) || (serverUrl.replace(/\/+$/, '') + '/player/');

    loadPlayer(playerUrl);
}

/**
 * Load the web player in the iframe
 */
function loadPlayer(playerUrl) {
    const iframe = document.getElementById('contentFrame');
    const loadingMessage = document.getElementById('loadingMessage');

    iframe.src = playerUrl;

    iframe.onload = function() {
        loadingMessage.style.display = 'none';
        iframe.style.display = 'block';
        console.log('Player loaded successfully');
    };

    iframe.onerror = function() {
        loadingMessage.textContent = 'Error loading content. Please check your connection.';
        console.error('Error loading player');
    };
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
