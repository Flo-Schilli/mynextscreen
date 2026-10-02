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

/** How long to wait for the player's answer to an unpair request. */
const DISCONNECT_ACK_TIMEOUT_MS = 3000;

/**
 * Origin of the player currently in the iframe, or null while none is loaded.
 * Kept so the settings overlay can address the player and recognise its reply.
 */
let playerFrameOrigin = null;

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
        playerFrameOrigin = playerOrigin;

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

/**
 * Asks the player to unpair this display, and reports what it answered.
 *
 * The shell cannot do this itself: the session and the refresh token live in
 * the player's own origin, out of reach from here. It only sends the request —
 * the player checks the sender and the screen's own policy before acting, and
 * a screen whose disconnect is switched off in the dashboard says no.
 *
 * Resolves to `{ ok, reason }`; `reason` is 'no-player', 'not-paired',
 * 'disabled' or 'timeout' when `ok` is false.
 */
function requestPlayerDisconnect() {
    const iframe = document.getElementById('contentFrame');

    if (!playerFrameOrigin || !iframe || !iframe.contentWindow) {
        return Promise.resolve({ ok: false, reason: 'no-player' });
    }

    return new Promise(function(resolve) {
        let timer = null;

        function finish(result) {
            window.removeEventListener('message', onResult);
            if (timer !== null) {
                clearTimeout(timer);
            }
            resolve(result);
        }

        function onResult(event) {
            const data = event.data;
            if (data == null || typeof data !== 'object') {
                return;
            }
            if (data.type !== 'mynextscreen-disconnect-result') {
                return;
            }
            // Only the player we loaded may answer for it.
            if (event.origin !== playerFrameOrigin || event.source !== iframe.contentWindow) {
                return;
            }
            finish({ ok: data.ok === true, reason: data.reason });
        }

        window.addEventListener('message', onResult);
        timer = setTimeout(function() {
            finish({ ok: false, reason: 'timeout' });
        }, DISCONNECT_ACK_TIMEOUT_MS);

        iframe.contentWindow.postMessage({ type: 'mynextscreen-disconnect' }, playerFrameOrigin);
    });
}

window.requestPlayerDisconnect = requestPlayerDisconnect;

/**
 * Takes the server address out of the launch parameters.
 *
 * The agent passes it when it starts the app, so a display that was just
 * installed does not need a URL typed in with a remote. Deliberately only
 * filled in when nothing is stored: a stored address was either typed by
 * someone or already confirmed, and letting a launch overwrite it would mean a
 * different agent could silently re-point a working display. The settings
 * overlay is the way to change it.
 *
 * The player URL is not taken from here — it is fetched from the server the
 * same way the overlay does it, so there is one source for it either way.
 */
async function applyLaunchParams(params) {
    if (!params || typeof params.serverUrl !== 'string' || params.serverUrl === '') {
        return false;
    }
    if (localStorage.getItem(STORAGE_KEYS.serverUrl)) {
        return false;
    }

    var serverUrl = params.serverUrl.replace(/\/+$/, '');
    try {
        var response = await fetch(serverUrl + '/api/config');
        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }
        var data = await response.json();
        if (!data.playerUrl) {
            throw new Error('no playerUrl in the answer');
        }
        localStorage.setItem(STORAGE_KEYS.serverUrl, serverUrl);
        localStorage.setItem(STORAGE_KEYS.playerUrl, data.playerUrl);
        console.log('[launch] configured from launch parameters:', serverUrl);
        return true;
    } catch (error) {
        // Left unconfigured on purpose: a half-written pair would send the
        // settings overlay chasing a player URL that was never resolved.
        console.warn('[launch] could not use the handed server address', error);
        return false;
    }
}

/**
 * Launch parameters, from whichever place this webOS build keeps them.
 *
 * Measured on a real set rather than taken from the docs: `webOSDev` is not
 * there at all (its library is not bundled), the `webOSLaunch` event did not
 * reach a listener registered this late, and the parameters sat in
 * `PalmSystem.launchParams` — as a JSON *string*, not an object. The other two
 * are kept as fallbacks because they are what other generations offer.
 */
function launchParamsFrom(event) {
    if (event && event.detail) {
        return event.detail;
    }
    if (window.webOSDev && typeof window.webOSDev.launchParams === 'function') {
        try {
            return window.webOSDev.launchParams();
        } catch (error) {
            // Falls through to PalmSystem below.
        }
    }
    var raw = window.PalmSystem && window.PalmSystem.launchParams;
    if (typeof raw === 'string' && raw.trim() !== '') {
        try {
            return JSON.parse(raw);
        } catch (error) {
            console.warn('[launch] unreadable launch parameters', error);
            return null;
        }
    }
    return raw && typeof raw === 'object' ? raw : null;
}

/** Both the launch event and DOM-ready can get here; only the first counts. */
var booted = false;

async function bootWith(event) {
    if (booted) {
        return;
    }
    booted = true;
    await applyLaunchParams(launchParamsFrom(event));
    initApp();
}

// webOS fires this once the app is launched; it carries the parameters the
// agent sent. `webOSRelaunch` is the same thing for an app already running.
document.addEventListener('webOSLaunch', bootWith);
document.addEventListener('webOSRelaunch', function (event) {
    // Only interesting while nothing is configured — otherwise a relaunch would
    // tear down a player that is happily running.
    if (!localStorage.getItem(STORAGE_KEYS.serverUrl)) {
        booted = false;
        void bootWith(event);
    }
});

// Initialize when DOM is ready. The launch event may never arrive — off webOS,
// or when it fired before this script ran — so this stays the entry point and
// `applyLaunchParams` is idempotent.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
        void bootWith(null);
    });
} else {
    void bootWith(null);
}
