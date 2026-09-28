/**
 * myNextScreen — LG webOS Application
 *
 * Thin shell around the web player: it holds the two URLs that a TV cannot
 * guess, loads the player in an iframe and hands the server URL over.
 *
 * It holds no credential. A screen enrols itself by showing a six-digit code
 * that an operator types into the dashboard, so there is no key for anyone to
 * enter here — and nothing on the device worth stealing from the settings
 * overlay, which the remote can open at any time.
 */

const STORAGE_KEYS = {
    serverUrl: 'server_url',
    playerUrl: 'player_url'
};

/** Written by versions up to 0.9.x. Removed on sight; see purgeLegacyApiKey. */
const LEGACY_API_KEY = 'api_key';

/**
 * Initialize the application.
 * Both values (serverUrl, playerUrl) must be present in localStorage. If either
 * is missing, the settings overlay opens so the user can configure them.
 * The playerUrl is fetched automatically from the backend on first save.
 */
function initApp() {
    purgeLegacyApiKey();

    const serverUrl = localStorage.getItem(STORAGE_KEYS.serverUrl);
    const playerUrl = localStorage.getItem(STORAGE_KEYS.playerUrl);

    if (!serverUrl || !playerUrl) {
        openSettings();
        return;
    }

    loadPlayer(playerUrl, serverUrl);
}

/**
 * Drops the screen API key left behind by an earlier version.
 *
 * It is dead weight: the player runs on a rotating session token, and the key
 * would only ever have opened the enrolment route. Leaving it on the TV keeps
 * a long-lived credential in a storage area that the settings overlay, and
 * anyone with the remote, can reach.
 */
function purgeLegacyApiKey() {
    if (localStorage.getItem(LEGACY_API_KEY) !== null) {
        localStorage.removeItem(LEGACY_API_KEY);
    }
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
 * Load the web player in the iframe and hand it the server URL via postMessage.
 */
function loadPlayer(playerUrl, serverUrl) {
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
        // Targeted at the player's own origin rather than '*': the message says
        // which server this display belongs to, and a page that happened to
        // answer the load has no business learning that.
        iframe.contentWindow.postMessage({
            type: 'mynextscreen-connect',
            serverUrl: serverUrl
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
