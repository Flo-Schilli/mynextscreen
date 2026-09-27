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
 * All three values (serverUrl, apiKey, playerUrl) must be present in localStorage.
 * If any is missing, the settings overlay is opened so the user can configure them.
 * The playerUrl is fetched automatically from the backend on first save — no fallback.
 */
function initApp() {
    const serverUrl = localStorage.getItem(STORAGE_KEYS.serverUrl);
    const apiKey = localStorage.getItem(STORAGE_KEYS.apiKey);
    const playerUrl = localStorage.getItem(STORAGE_KEYS.playerUrl);

    if (!serverUrl || !apiKey || !playerUrl) {
        openSettings();
        return;
    }

    loadPlayer(playerUrl, serverUrl, apiKey);
}

function openSettings() {
    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage) {
        loadingMessage.textContent = 'Configuration required.';
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
}

/**
 * Load the web player in the iframe and send credentials via postMessage.
 */
function loadPlayer(playerUrl, serverUrl, apiKey) {
    const iframe = document.getElementById('contentFrame');
    const loadingMessage = document.getElementById('loadingMessage');

    // The player URL comes from local settings; refuse anything but http(s) so a
    // tampered setting cannot turn the shell into a loader for arbitrary schemes.
    var playerOrigin;
    try {
        var parsed = new URL(playerUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            throw new Error('unsupported scheme ' + parsed.protocol);
        }
        playerOrigin = parsed.origin;
    } catch (error) {
        loadingMessage.textContent = 'Invalid player URL. Open settings and correct it.';
        return;
    }

    iframe.src = playerUrl;

    iframe.onload = function() {
        // Targeted at the player's own origin: with '*' the long-lived screen API
        // key would be readable by whatever page happened to answer the load.
        iframe.contentWindow.postMessage({
            type: 'signage-connect',
            serverUrl: serverUrl,
            apiKey: apiKey
        }, playerOrigin);

        loadingMessage.style.display = 'none';
        iframe.style.display = 'block';
    };

    iframe.onerror = function() {
        loadingMessage.textContent = 'Error loading content. Please check your connection.';
    };
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
