/**
 * myNextScreen — keeps the TV's screen saver off the display.
 *
 * A signage screen must never blank, but webOS has no per-app switch for it.
 * Since webOS 6 it cannot even be switched off in the TV settings any more,
 * and it starts whenever nothing is playing back full screen — which is what a
 * playlist of images, or the pairing code, looks like to the TV.
 *
 * What the system does offer is a veto. A client subscribes to the power
 * service's screen-saver request; the TV announces every attempt to start the
 * saver, and an answer of `ack: false` calls it off. The announcement comes
 * again at the next idle timeout, so the subscription has to stay open for as
 * long as the app runs. Kodi and RetroArch hold the screen the same way.
 *
 * Only while this app is the one on screen: sent to the background it
 * acknowledges instead, so a TV that someone is actually watching still
 * behaves like a TV. Off webOS — a desktop browser — there is no bridge and
 * this does nothing.
 */

(function() {
    var POWER_SERVICE = 'luna://com.webos.service.tvpower';
    var REGISTER_METHOD = POWER_SERVICE + '/power/registerScreenSaverRequest';
    var RESPOND_METHOD = POWER_SERVICE + '/power/responseScreenSaverRequest';

    /**
     * Identifies this registration to the power service. Deliberately *not*
     * the bare app id.
     *
     * The service keeps a registration under its client name until the TV is
     * restarted, and offers no way to drop one: `unregisterScreenSaverRequest`
     * does not exist, and registering the same name again is refused with
     * errorCode -3, "The client is already registered". A relaunched app would
     * therefore inherit a registration belonging to a page that is gone, which
     * can no longer answer the announcements — and an announcement nobody
     * answers lets the screen saver start, with the app still on screen.
     *
     * A name unique to this run always registers, verified against a real set.
     */
    var CLIENT_NAME = 'com.mynextscreen.webos.' + Date.now().toString(36);

    /** Fresh names are cheap; a refusal that repeats is not worth hammering. */
    var MAX_REGISTER_ATTEMPTS = 3;
    var RETRY_DELAY_MS = 2000;
    var attempts = 0;

    /** The screen saver is about to start. Any other state is not ours to answer. */
    var PENDING_STATE = 'Active';

    /** Held for the lifetime of the app: dropping it would end the subscription. */
    var subscription = null;

    /**
     * A bridge to the Luna bus, or null when not running on a TV.
     * `WebOSServiceBridge` is the current name, `PalmServiceBridge` the older
     * one; TVs in the field answer to one or the other.
     */
    function openBridge() {
        var Bridge = window.WebOSServiceBridge || window.PalmServiceBridge;
        return typeof Bridge === 'function' ? new Bridge() : null;
    }

    function parseMessage(payload) {
        try {
            return typeof payload === 'string' ? JSON.parse(payload) : payload;
        } catch (error) {
            console.warn('[keep-awake] unreadable answer from the power service', error);
            return null;
        }
    }

    /**
     * Answers one announcement. `false` calls the screen saver off; the
     * timestamp has to be echoed so the service can match the answer.
     */
    function respond(request, ack) {
        var bridge = openBridge();
        if (bridge === null) {
            return;
        }
        bridge.call(RESPOND_METHOD, JSON.stringify({
            clientName: CLIENT_NAME,
            ack: ack,
            timestamp: request.timestamp
        }));
    }

    function onScreenSaverRequest(payload) {
        var request = parseMessage(payload);
        if (request === null) {
            return;
        }

        if (request.returnValue === false) {
            console.warn('[keep-awake] the power service refused the subscription:', payload);
            // Retried under a new name rather than given up on: without a live
            // subscription nothing vetoes the screen saver, and a signage
            // display that blanks is as good as off.
            if (attempts < MAX_REGISTER_ATTEMPTS) {
                CLIENT_NAME = 'com.mynextscreen.webos.' + Date.now().toString(36);
                setTimeout(keepAwake, RETRY_DELAY_MS);
            } else {
                console.error('[keep-awake] giving up; the screen saver will blank this display');
            }
            return;
        }

        if (request.state !== PENDING_STATE) {
            return;
        }

        // Backgrounded, the display is not ours to hold.
        respond(request, document.visibilityState !== 'visible');
    }

    function keepAwake() {
        attempts++;
        subscription = openBridge();

        if (subscription === null) {
            // A desktop browser during development: nothing to hold here.
            return;
        }

        subscription.onservicecallback = onScreenSaverRequest;
        subscription.call(REGISTER_METHOD, JSON.stringify({
            subscribe: true,
            clientName: CLIENT_NAME
        }));
    }

    keepAwake();
})();
