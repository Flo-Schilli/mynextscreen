/**
 * myNextScreen — remote-control navigation for the settings overlay.
 *
 * Two things a TV does differently, and both have to be handled here:
 *
 * 1. webOS runs a plain web app without spatial navigation. The arrow keys of
 *    the remote arrive as ordinary keydown events and nothing moves, because
 *    the only key a browser moves focus with is Tab — and the remote has none.
 * 2. Putting the DOM focus on a text field pops the on-screen keyboard open,
 *    and that keyboard then takes the arrow keys for itself. So focus cannot
 *    be what navigation moves around: reaching a field would trap the remote
 *    in the keyboard, and leaving it would only land in the next field.
 *
 * Hence a selection that is not the focus. The arrow keys move a highlight
 * (`.nav-selected`) over the controls; nothing is focused, so no keyboard
 * appears. OK presses the highlighted button, or opens the keyboard on the
 * highlighted field — that is the one moment a field takes the focus. Back
 * gives it up again, and the highlight is still where it was.
 *
 * Rows come from the markup: every direct child of the settings box that holds
 * a control is one row (the two fields, then the button group).
 */

(function() {
    var SELECTED_CLASS = 'nav-selected';

    var FOCUSABLE_SELECTOR = 'input, button, select, textarea, a[href]';

    var ARROW_KEYS = {
        ArrowLeft: 'left',
        ArrowUp: 'up',
        ArrowRight: 'right',
        ArrowDown: 'down'
    };

    /** Older webOS builds report keys only as codes, without `key`. */
    var ARROW_KEY_CODES = {
        37: 'left',
        38: 'up',
        39: 'right',
        40: 'down'
    };

    /** Remote "Back"; Escape keeps the overlay usable in a desktop browser. */
    var BACK_KEYS = ['GoBack', 'Back', 'XF86Back', 'BrowserBack', 'Escape'];
    var BACK_KEY_CODES = [461, 27];

    /** The highlighted control — where the next OK press lands. */
    var selected = null;

    /** The field that currently holds the focus, i.e. has the keyboard up. */
    var editing = null;

    function settingsBox() {
        var overlay = document.getElementById('settingsOverlay');
        if (!overlay || overlay.style.display === 'none') {
            return null;
        }
        return overlay.querySelector('.settings-box');
    }

    function isTextField(element) {
        return element != null && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA');
    }

    function directionOf(event) {
        return ARROW_KEYS[event.key] || ARROW_KEY_CODES[event.keyCode] || null;
    }

    function isConfirmKey(event) {
        return event.key === 'Enter' || event.keyCode === 13;
    }

    function isBackKey(event) {
        return BACK_KEYS.indexOf(event.key) !== -1 || BACK_KEY_CODES.indexOf(event.keyCode) !== -1;
    }

    /** A control the remote can reach: enabled and actually rendered. */
    function isReachable(element) {
        return !element.disabled && element.offsetParent !== null;
    }

    /** The reachable controls of the box, grouped row by row in DOM order. */
    function rowsOf(box) {
        var rows = [];

        for (var i = 0; i < box.children.length; i++) {
            var controls = Array.prototype.filter.call(
                box.children[i].querySelectorAll(FOCUSABLE_SELECTOR),
                isReachable
            );
            if (controls.length > 0) {
                rows.push(controls);
            }
        }

        return rows;
    }

    function locate(rows, element) {
        for (var row = 0; row < rows.length; row++) {
            var column = rows[row].indexOf(element);
            if (column !== -1) {
                return { row: row, column: column };
            }
        }
        return null;
    }

    /** Wraps top to bottom, so no press ever leaves the remote without effect. */
    function wrap(index, length) {
        return ((index % length) + length) % length;
    }

    /**
     * The control one step away, or null when the row ends there.
     * Moving between rows keeps the column where the target row is wide enough.
     */
    function neighbourOf(rows, position, direction) {
        if (direction === 'up' || direction === 'down') {
            var row = wrap(position.row + (direction === 'down' ? 1 : -1), rows.length);
            return rows[row][Math.min(position.column, rows[row].length - 1)];
        }

        var current = rows[position.row];
        var column = position.column + (direction === 'right' ? 1 : -1);

        return column < 0 || column >= current.length ? null : current[column];
    }

    function highlight(element) {
        if (selected === element) {
            return;
        }
        if (selected !== null) {
            selected.classList.remove(SELECTED_CLASS);
        }
        selected = element;
        if (selected !== null) {
            selected.classList.add(SELECTED_CLASS);
        }
    }

    /** Hands the field to the on-screen keyboard. */
    function startEditing(field) {
        editing = field;
        field.focus();
    }

    /** Takes it back, which is what closes the keyboard. */
    function stopEditing() {
        if (editing === null) {
            return;
        }
        var field = editing;
        editing = null;
        field.blur();
    }

    /** OK on the highlighted control: type into a field, press a button. */
    function activate(element) {
        if (element === null) {
            return;
        }
        if (isTextField(element)) {
            if (editing === element) {
                stopEditing();
            } else {
                startEditing(element);
            }
            return;
        }
        stopEditing();
        element.click();
    }

    /** Puts the highlight somewhere valid, and reports the rows it sits in. */
    function ensureSelection(box) {
        var rows = rowsOf(box);
        if (rows.length === 0) {
            return null;
        }
        if (selected === null || locate(rows, selected) === null) {
            highlight(rows[0][0]);
        }
        return rows;
    }

    function onKeyDown(event) {
        var box = settingsBox();
        if (box === null) {
            return;
        }

        var rows = ensureSelection(box);
        if (rows === null) {
            return;
        }

        var direction = directionOf(event);

        if (direction !== null) {
            // While the field has the focus, left/right belong to the caret.
            if (editing !== null && (direction === 'left' || direction === 'right')) {
                return;
            }

            event.preventDefault();
            stopEditing();

            var target = neighbourOf(rows, locate(rows, selected), direction);
            if (target !== null) {
                highlight(target);
            }
            return;
        }

        if (isConfirmKey(event)) {
            event.preventDefault();
            activate(selected);
            return;
        }

        if (isBackKey(event)) {
            event.preventDefault();

            // Back belongs to the keyboard first: it only gives the field up.
            if (editing !== null) {
                stopEditing();
                return;
            }

            if (typeof window.toggleSettings === 'function') {
                window.toggleSettings(false);
            }
        }
    }

    /**
     * Keeps selection and keyboard state true when something else moves the
     * focus — a pointer click from a Magic Remote, or webOS closing the
     * keyboard by blurring the field.
     */
    function onFocusIn(event) {
        var box = settingsBox();
        if (box === null || !box.contains(event.target)) {
            return;
        }
        if (isTextField(event.target)) {
            editing = event.target;
        }
        highlight(event.target);
    }

    function onFocusOut(event) {
        if (editing === event.target) {
            editing = null;
        }
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);

    window.remoteNav = {
        /** Highlights a control without focusing it, so no keyboard opens. */
        select: function(element) {
            if (element == null) {
                return;
            }
            stopEditing();
            highlight(element);
        },

        /** Starts at the first control; used when the overlay opens. */
        selectFirst: function() {
            var box = settingsBox();
            if (box === null) {
                return;
            }
            highlight(null);
            ensureSelection(box);
        },

        /** Drops highlight and keyboard; used when the overlay closes. */
        reset: function() {
            stopEditing();
            highlight(null);
        }
    };
})();
