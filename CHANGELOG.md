# Changelog

Notable changes per release, with the operator actions each one requires.
Versions follow the root `package.json`; a release is cut with
`npm run version:patch && git push --follow-tags`.

## 0.23.1

### Fixed — the agent update hint shows on servers running a main build

Every build from `main` reports its version with build metadata, such as
`0.23.0+sha.1bbf9f7`. The server refused that suffix when comparing versions,
took itself for a development build and never flagged an older agent, so the
**update now** button did not appear. Build metadata is now ignored for the
comparison, as SemVer prescribes, and the hint shows the bare version.

**Operator action:** none beyond updating the server. Agents still on 0.22.0
then show the hint, and **update now** pulls the current `stable` image.

## 0.23.0

### Changed — the agent lets a TV settle before starting the app

A TV that was just switched on answers on the network before it has fetched the
time over NTP. Until then every certificate looks invalid to it, and an app the
agent started straight away failed with SSL errors. The agent now leaves a set
alone for three minutes after it starts answering again before it launches the
app or extends Developer Mode. The agent page shows the set as *TV detected ·
app starts around HH:MM* in the meantime. The same wait applies after the agent
itself restarts, since it cannot tell how long a set has been on; the onboarding
wizard and the manual buttons do not wait.

**Operator action:** update the server **before** the agents. The backend
migration (`0026`) adds `screen_remote_controls.app_launch_planned_at` and runs
on start. An updated agent sends a field an older server rejects, which would
drop all of that agent's reports until the server catches up. Once the server
runs 0.23.0, update the agents with **update now** on the dashboard.

## 0.22.0

### Added — update a site agent from the dashboard

Each agent runs in a hardened container and cannot restart itself, so until now
an update meant an SSH session and a manual re-run. The agent detail view now
has an **update now** button, enabled when a newer image is available and the
agent is online. It pushes an `update_agent` command over the existing agent SSE
channel; the agent writes a sentinel file into its bind-mounted state directory,
a host-side systemd path unit runs `podman auto-update`, pulls the rolling image
tag and restarts the container with healthcheck-gated rollback. The request is
audited as `site_agent.update_requested`; the server answers `409` when the
agent is offline or already current.

**Operator action:** re-run `ansible/site-agent.yml` once so the agent follows
the rolling `stable` tag and the new `update.path`/`update.service` units are
installed (a specific version can still be pinned via `-e`). After that,
updates are one click from the dashboard.

## 0.21.0

### Added — a display that changes its address is found again by its MAC

Where the router cannot be configured, every DHCP lease renewal may move a TV,
and the agent kept knocking on the old address. When a display with a MAC
stops answering, the agent now looks for it: it reads its neighbour table, asks
every webOS set to announce itself over SSDP and checks who answered. It adopts
a new address only where the set actually answers, acts on it in the same round
and reports it. The server stores it, writes `screen.remote_address_changed` to
the audit log and the dashboard updates the row live.

While a set stays missing — typically off overnight — the search backs off from
two minutes to 30. **Check now** searches straight away. A TV in standby answers
neither SSDP nor ARP, so it is found once it is on again.

### Added — subnet sweep, off unless switched on

If SSDP does not turn a moved display up, the agent can touch every address of
the subnet the set was last seen in on port 3001. That can look like a port
scan, so it is a per-agent switch on the agent's page (**Allow subnet sweep**)
and off by default. With it off, the agent contacts only sets that answered
SSDP themselves.

**Operator action:** update the server first, then the agents by re-running
`ansible/site-agent.yml`. The backend migration (`0025`) adds
`site_agents.subnet_sweep_enabled` and runs on start. Store the MAC of the
interface each TV actually uses (wired and wireless differ); the IP is still
entered once during setup. The server accepts a new address only for a display
with a MAC stored.

## 0.20.0

### Added — check interval and "Check now" for site agents

How often an agent checks its displays is now set per agent on its page
(**Check interval**, 1–10 minutes, default 1). The agent applies a change
straight away, without a restart. **Check now** runs a round immediately and
clears every backoff, for example right after switching a set back on.

### Changed — a TV that comes back is noticed within one interval

The agent used to stop probing a display while it backed off after failures,
which doubled up to 30 minutes. A set switched on after a long time off could
go unnoticed for that long. The probe now runs every interval. Only the actions
(app launch, Developer Mode extension, wake) back off. A display that does not
answer no longer counts as a failure, and a display that comes back gets a fresh
start.

**Operator action:** update the server first, then the agents by re-running
`ansible/site-agent.yml`. The backend migration (`0024`) adds
`site_agents.probe_interval_minutes` and runs on start. `SITE_AGENT_PROBE_INTERVAL_MS`
is no longer read; remove it from the backend environment. `MNS_PROBE_INTERVAL_MS`
was never read by the agent and is gone from the Ansible template. An agent older
than this release ignores **Check now** and picks up a changed interval only
after a restart.

## 0.19.0

### Added — how a site agent is connected

The agent's card and page show how its machine reaches the venue network:
**LAN** or **Wi-Fi** with the network name, and the address the interface holds.
The agent reads this on every heartbeat from the interface carrying the default
route; the SSID comes from `iw`, which is now part of the agent image and needs
no capability. A bridge, VPN tunnel or bond shows as "network unknown" rather
than as LAN. Whether the address came from DHCP cannot be told from inside the
container and is not shown.

### Added — update hint for site agents

An agent running an older release than the server is flagged with
**Update available** on its card and page, together with how to update it.
Server and agent ship from the same release, so the server's own version is the
reference; no registry or GitHub call is involved.

**Operator action:** update the server first, then the agents by re-running
`ansible/site-agent.yml`. The backend migration (`0023`) adds four columns to
`site_agents` and runs on start. An agent that reaches a server older than
itself still checks in; it just drops the network report until the server is
updated.

### Changed — smaller things

- `smol-toml` 1.9.0 under nx (GHSA-r4xh-jqrq-34v2).
- Development dependencies: `eslint`, `@types/node`.

## 0.18.0

### Added — Prometheus metrics

The backend exposes `GET /api/metrics`: HTTP requests and latency, BullMQ queues
and job durations, SSE connections, screens, live streams and the Postgres pool.
Site agents push their own series (uptime, memory, connection, per-display
reachability, Dev Mode, launches, wakes) over the session they already hold, so
one scrape target covers the backend and every venue. See
[Observability](docs/observability.md).

HTTP series are recorded when the response finishes, so `401`/`403` from guards
and `500`s from exception filters are counted with the status that went out.

**Operator action:** the endpoint stays disabled (`404`) until a token is set.
Set `metrics_scrape_token` (Ansible Vault) and run `ansible/deploy.yml`, then
scrape the backend on the host at `localhost:50002` with that token as Bearer.
Caddy answers `/api/metrics` with `404` on both public hosts; this needs the
playbook run too, an image update alone does not change the Caddy config.

### Changed — site agents join with a setup code from the dashboard

**Site Agents → Add an agent** shows a short-lived, single-use setup code; it is
pasted on the agent's setup page. The boot PIN in the container log is gone.
`MNS_SERVER_URL` is now required and must be `https://`, because it is the only
thing between an agent and a server impersonating yours on the venue network.
Resetting an agent also needs a fresh setup code.

**Operator action:** an agent container without `MNS_SERVER_URL`, or with an
`http://` address, no longer starts. Set it to the server's `https://` address.
`MNS_ALLOW_INSECURE_SERVER_URL=true` exists for local development only. Agents
that are already connected keep their session.

### Added — unattended agent rollout

An agent started with `MNS_ENROLMENT_TOKEN` (a setup code) and
`MNS_SETUP_PORT=0` joins on its own, without a browser. The code is redeemed
only while no session is stored, so a restart with the variable still set does
not fail on a spent code. `ansible/site-agent.yml` deploys the agent as a
rootless Podman Quadlet on venue hardware, with host networking for
Wake-on-LAN.

### Added — the admin interface in German and English

Every page of the admin SPA is translated, with a DE/EN switch in the top bar.
The choice is remembered per browser; the first visit follows the browser
language. Dates and numbers switch with it, and the date and time fields show
`TT.MM.JJJJ` / 24-hour in German and `MM/DD/YYYY` / AM/PM in English regardless
of the browser's own language, with a calendar picker in the app language.

### Fixed — a new agent shows as online straight away

The dashboard showed a freshly connected agent as offline for up to a minute,
and after every agent restart, because the first heartbeat waited for the
interval. The agent now checks in at start-up and right after enrolment, and
"last seen" updates with the status instead of reading "never" until a reload.

### Changed — smaller things

- The setup code has a copy button right beside it, also for a re-issued code
  on the agent's page.
- `source-map-js` 1.2.2 (GHSA-68fv-2mgg-jv7q).
- Development: the compose stack runs under rootless Podman on SELinux hosts,
  and passes `METRICS_SCRAPE_TOKEN` through to the backend.

## 0.16.0

Everything here came out of running the Site Agent against a real LG television
for the first time. Most of it could not have been found any other way: the
faults were assumptions about the set that no test could contradict.

### Added — the agent installs the player app on a TV

Setting up a display no longer means building a package and pushing it from a
developer machine. The agent fetches it from the server, copies it onto the set
over the Developer Mode connection and hands it to the install service. The
onboarding wizard has a step of its own for it, between the SSH check and the
pairing prompt.

The gain is not the first install, it is every one after: an app installed in
Developer Mode is deleted when the session expires, and the agent can now put it
back without anyone driving to the venue.

**Operator action:** the wizard has nine steps instead of eight, and the numbers
of the later ones shifted. A display part-way through setup continues from a
step one further along than it was; re-run that step if it looks out of place.

### Added — the dashboard shows which app version a TV is running

A screen carries a badge with the version the set reports, and offers the update
when it differs from the one this server has. Nothing updates on its own: an
install restarts the app and interrupts whatever is playing, so it stays
something a person asks for.

### Added — a display configures itself from the launch parameters

The agent hands over the server address when it starts the app, so a freshly
installed display no longer needs a URL typed in with a remote. Only when
nothing is stored — an address that was typed or already confirmed is never
overwritten, so a second agent cannot silently re-point a working display.

### Added — standby from the dashboard

A screen can be sent to standby and woken again. Screen-off is not offered: the
television refuses those calls over the remote-control protocol, and the
Developer Mode account cannot reach them either.

**Operator action:** waking a set over the network needs **Quick Start+** on the
TV (Settings → General → Energy Saving). Without it, only the remote brings it
back — the dialog says so, and does not block the choice, because the setting
cannot be read remotely.

**Operator action:** the TV shows its pairing prompt once more, on every display
already paired with an agent. This is expected. Controlling power needs a
permission the agent did not ask for before, and the set re-confirms when the
request changes. Confirm it with the remote once per display.

### Added — an Extend Dev Mode button

The command existed; the button did not. Expect the Developer Mode app to appear
on screen when it runs — that is how the extension works, not a fault.

### Fixed — manual commands did nothing at all

Wake, Start app and Extend Dev Mode were handed to the logic that decides what
is _due_ rather than being carried out. All three refused silently: a wake
unless automatic waking was switched on, a launch unless the player had already
stopped reporting, an extension unless it had fallen due. The button did
nothing, not even fail.

### Fixed — Wake-on-LAN reached the wrong network

The magic packet went only to the global broadcast address, which leaves the
machine over its default route — not necessarily the network the television is
on. It is now also sent to the broadcast address of the interface that covers
the set.

### Fixed — Developer Mode was extended every minute

Whether an extension was due was read from a cached value that never changed, so
it fell due again a minute later, every minute. Each one launched the Developer
Mode app on the screen, and because one action runs per round, the app launch
behind it never happened — which is why pairing never completed on a set that
had Developer Mode switched on.

### Fixed — the setup wizard could not be completed

Three separate faults, each enough on its own. The key-server step asked for the
Developer Mode passphrase one step before the wizard offers to enter it. The
last two steps did their work but reported it in a form the server does not
count, so they never advanced. And the final step read "in progress" forever,
because "done" was derived from being past the furthest step reached — which the
last step cannot be.

### Fixed — a display could not be enrolled where the server address was pinned

Deployments that fix the address in the environment showed no server on the
agent's setup page and rejected the enrolment, because the form posts the field
empty when it cannot be changed.

### Fixed — the player rejected the webOS shell's handover

The player accepted the server address only from an origin that real sets do not
use, so every television fell back to guessing the address from its own
hostname — which cannot work for an address with a port. No display ever got a
pairing code this way.

### Fixed — the screen saver started with the app in the foreground

The television has no switch for it, only a veto the app holds. A registration
left behind by an earlier run of the app blocked the new one, and the old one
belonged to a page that could no longer answer — so nothing vetoed anything.
webOS offers no way to drop such a registration, so each run now registers under
a name of its own.

## 0.15.0

### Fixed — a screen stopped switching after a restart

A player that restarted ran one item and stayed on it. The boundary that ends
an item was armed only from a media `load` event, and the re-anchor that runs
when the clock sync completes puts back the item that is already on screen —
same object, so nothing re-rendered, nothing loaded, and the timer that had
just been cleared was never re-armed. Timing now comes from the shared clock
alone; when a picture happens to decode is not a timing input.

Three more ways the timeline hung on a DOM event are gone with it: one expired
media URL used to stall a screen permanently, a boundary that arrived during a
transition was dropped instead of retried, and a clock correction only took
effect an item later. A screen also no longer anchors to a raw `Date.now()` at
boot — on a TV that has not reached NTP yet, that was minutes off.

### Fixed — a restarted screen in a group played out of step

A screen that reconnected resolved its own anchor while its peers kept theirs,
and nothing reconciled the two: the set showed the right playlist at the wrong
moment, indefinitely. A group's state is now resolved from the group's own
schedule rather than by asking whichever member answered first, a member
arriving re-aligns the whole group, and a recurring schedule rolling into its
next occurrence re-anchors every player instead of only the ones that reconnect.

Nothing to do on the screens: a push that changes neither playlist nor timing
is ignored by the player, so re-alignment is invisible unless a set is actually
out of step.

### Fixed — a fade faded through black

A fade ramped both layers at once, which leaves a quarter of the screen showing
the container behind them at the midpoint — on a TV that reads as two fades
through black rather than one dissolve. Fade, zoom-in and zoom-out now animate
the incoming picture over the outgoing one, which stays put underneath.

Zoom-in and zoom-out were identical to fade in effect, because the scale sat on
the layer the incoming picture covers completely. Cut showed black for as long
as the next picture took to decode. A one-item playlist took twice the
configured duration for a single transition. And editing any playlist setting
restarted playback and replayed an animation, so trying a transition out always
looked like a fade whatever was picked.

### Changed — the transition setting says which end of the item it belongs to

The transition on a row is that item's own way in, not the way the row above it
leaves. Setting it on one of two items therefore left every second switch on
the default, which reads as the setting doing nothing. The field now says so in
its label and tooltip.

## 0.14.1

### Fixed — a display could not actually be given to an agent

0.14.0 shipped the agent and the wizard that connects a TV to it, but nothing in
the dashboard created the row that ties the two together. An agent's page showed
an empty list and there was no way to fill it. Each display now has a remote
control setting reachable from its own tile and from the agent, and that is what
assigns it.

### Fixed — a display or an agent could not be taken back out

The only way to detach a display was to clear the agent in a dropdown, which
left its address, its passphrase and its onboarding progress behind — so the
next agent inherited a previous installation's values and the wizard started
half-done against a set it had never seen. Removing a display is now an explicit
**Remove** on its row, and it forgets all of it: connecting the same TV again
starts at step one with nothing filled in.

An agent can be deleted outright. Its displays are released the same way, so
nothing is left pointing at a service that no longer exists. Both actions, and
revoking an agent's access, ask first in a modal that says what will happen.

### Changed — the onboarding wizard is a stepper

It was a list of instructions with a Check button, and every value it asked for
had to be typed somewhere else. Connecting a display meant walking between two
dialogs while standing in front of a television. The steps are now a menu down
the left with their state on them, and each step carries the fields it needs, so
saving and checking is one action.

Steps ahead of the furthest one reached cannot be clicked; ones already passed
can, so a wrong IP is corrected in place. The four Developer Mode steps are
marked optional and can be skipped together: they exist only so the agent can
keep the session from expiring, and an installation that does not want that
needs none of them.

### Added — a screen group says what it measures as one picture

A video wall of two 1920×1080 displays is a 3840×1080 canvas, and that is the
number you need when you pick content for it. The group card now reads
"2 screens · 3840 × 1080", and the group's own page carries it beside the mode
and the screen count.

Split mode adds the columns' widths and the rows' heights, so portrait walls and
mixed screen sizes come out right; a cell with nothing in it yet counts as the
largest screen the group has, because that is what the wall becomes once it is
filled. Mirror mode has nothing to add up, so it reports the resolution its
screens share and says nothing when they disagree.

### Changed — the edit-screen dialog fits on a laptop

Editing a display stacked the form, what the display reports and two maintenance
sections in one 520px column, which meant scrolling before you could see what
the Save button was attached to. The two kinds of content are side by side now,
in an 880px dialog that needs no scrolling at 1280×800 and up.

And when a dialog does have to scroll, only its body does: the title and the
close button stay where they are. Every other dialog in the app already worked
that way.

### Changed — the same control everywhere it is the same thing

**Going back out of a detail view** was four different controls across five
pages, three of them hand-rolled from raw classes and labelled four different
ways. They are all the site agent's outline button now.

**A dropdown with more than eight options** scrolls and gets a filter box,
focused as it opens, that takes Enter to pick the first match. The time-zone
picker rendered some 400 entries in one unbounded list, which no amount of
scrolling made usable.

**Creating or editing an organisation** is a modal rather than a view that took
over the page, hiding the list it was started from.

**The instance-admin tab bar** was four copies of the same markup. It is one
component, like the settings tabs, and it no longer shows a scrollbar on a strip
that has nothing to scroll.

### Fixed — things that looked right in the markup and did nothing

**A dropdown opened inside a modal was cut off after the first option.** A modal
panel clips its overflow and, because it carries an entry animation on
`transform`, is the containing block for anything positioned inside it — fixed
positioning included. The menu now opens in an overlay outside that subtree, at
the width of its field.

**Escape closed nothing.** The handler sat on the backdrop, which is never
focused when a dialog opens, so the keypress landed on `<body>` and was lost.
It is caught on the document now, and only the innermost open layer acts — a
dropdown over a confirmation over a form closes one at a time.

**The close button was a plus sign rotated 45 degrees.** It reads as an X at
16px and nowhere else; the icon set has a real one now.

**Gaps that the markup asked for never appeared** — on the agent pages, between
a screen group's cards, and on the settings and admin pages. Card and form
components put `display: contents` on their host, which leaves no box for a
margin to sit on, and the `block` that was supposed to undo that could not win:
Tailwind's utilities are layered and an Angular component's styles are not.

**The active instance-admin tab was not marked**, and the sidebar entry went
dark the moment you opened any settings or admin tab other than the first.

### Fixed — status colours on the agent pages were not rendering

Twenty-five components referred to colour tokens that do not exist in the
stylesheet, so online, offline and warning states fell back to inherited text
colour. They now use the tokens the design system actually defines.

## 0.14.0

### Added — a service in the venue that looks after the displays

An LG consumer TV has no autostart, and its Developer Mode session expires —
when it does, the set deletes the installed app. Neither can be dealt with from
the server, and the player heartbeat alone cannot tell _the TV is off_ from _the
TV is on and the app is not running_. Those are different problems with
different fixes, and until now both looked like "offline".

A **site agent** is a new service that runs inside a venue's network and is
paired to one organisation. It probes the displays assigned to it, starts the
app over SSAP when the player is not reporting, wakes a set with Wake-on-LAN
before a schedule begins, and extends the Developer Mode session over SSH — only
while the TV is on, because there is no other way, and before launching the app,
because an expired session means the set has already deleted it.

Everything it needs comes from a configuration it caches on disk, so a venue
keeps being looked after when the uplink is down, including waking a set for a
schedule it already knew about. A command an operator triggers by hand is
refused with a clear error when the agent is not connected rather than queued: a
"start the app now" that fires six hours later is worse than none.

**The TVs' private keys never leave the venue.** The server stores only the
Developer Mode passphrase, encrypted; the agent fetches each key from the set's
own key server and keeps it locally. That passphrase is the only value in the
system delivered to one caller in the clear and masked for another, so the two
payloads are separate types rather than one with a flag.

**Operator actions.** Create the agent under **Site Agents** in the dashboard,
run the container in the venue, and connect it on its own setup page with the
PIN printed to its log. Then connect each display with the eight-step wizard,
which checks every step against the actual TV. Two settings on each set have to
be made on the TV itself — **Quick Start+**, without which the network stack is
dead in standby, and **Mobile TV On** for Wake-on-LAN.

**Set `MNS_SERVER_URL` on every agent you care about.** Without it the server
address lives only in the agent's state file, and the agent presents its real
refresh token to whatever address is written there. With it, the deployment
decides and the setup page cannot be used to move the agent.

Full walkthrough, including what each status means and what to do about it:
[docs/site-agent.md](docs/site-agent.md).

### Changed — the LG helper scripts are no longer the autostart answer

`player-applications/lg-tvos/tools/` told operators to run `launch-tv.mjs
--watch` as a systemd service on the backend host. The site agent does that
properly, for every display in a house, from inside the venue. The scripts stay
for what they are still the answer to: poking at one set by hand, before an
agent is set up or when one cannot reach a TV and you need to find out why.

## 0.13.0

### Fixed — the settings overlay could not be crossed with a TV remote

Entering a server URL on an LG screen needed a Magic Remote pointer. The arrow
keys did nothing: webOS runs a plain web app without spatial navigation, so they
arrive as ordinary keydown events, and a browser only ever moves focus with Tab
— which no remote has.

Moving the focus was not the fix either. On webOS a text field that takes the
focus pops the on-screen keyboard open, and that keyboard then takes the arrow
keys for itself, so every attempt to step to the next control reopened the
keyboard and the remote ended up toggling between the two fields.

The overlay now moves a selection that is not the focus. Arrow keys walk a
highlight over the fields and the buttons, **OK** opens the keyboard on the
highlighted field or presses the highlighted button, **Back** gives the keyboard
up again and leaves the highlight where it was. Nothing is focused until OK asks
for it, so the keyboard only ever appears on request — including when the
overlay opens, which used to focus the Server URL field straight away.

### Added — LG screens no longer fall into the TV's screen saver

Displays blanked after a few idle minutes. webOS gives a web app no switch for
the screen saver, and since webOS 6 it cannot be turned off in the TV settings
either; it starts whenever nothing is playing back full screen, which is exactly
what a playlist of images, or a pairing code, looks like to the TV.

The app now takes the veto the power service does offer: it subscribes to
`com.webos.service.tvpower/power/registerScreenSaverRequest` and answers every
announced start with `ack: false`, the way Kodi and RetroArch hold the screen.
Sent to the background it acknowledges instead, so a TV that someone is watching
still behaves like a TV.

**Operator action:** LG screens do not update themselves. Rebuild the package
(`ares-package player-applications/lg-tvos --outdir ./build`) and install it on
each screen with `ares-install`; pairing survives, the two URLs stay in place.

After installing, confirm the veto took: `ares-inspect --device <tv> --app
com.mynextscreen.webos --open` reports `[keep-awake] the power service refused
the subscription` if the TV denied it. `com.webos.service.tvpower` has no public
ACG, so a screen outside developer mode may refuse the call.

The screen saver is not the TV's only timer. **Auto power off** and the **sleep
timer** under Settings → General switch the set off no matter what an app asks
for, and have to be disabled on the TV itself.

## 0.12.1

### Fixed — invitation links were dead the moment they were sent

An invited user who clicked the link in their email got "Invalid or expired
token", however fresh the link was. Inviting someone wrote the set-password
token into the user row in **plaintext**, while redeeming it looks the token up
by its SHA-256 fingerprint, the way every other mailed token in the codebase is
stored. The two never matched, so `POST /api/auth/set-password` answered 404 for
every invite.

There was no way around it either: an invitee starts unverified, and
forgot-password deliberately no-ops for unverified accounts, so the account
could not be activated at all.

Inviting now persists the token through `UserService.setPasswordResetToken()`,
the single writer that hashes. A regression test redeems the raw token from the
emitted invite event and fails against the old code.

**Operator action:** anyone invited before this release must be **invited again**
— their stored token is a plaintext value that the fixed lookup will not match.
Remove the pending member and add them back; the new invite email works.

## 0.12.0

### Added — unpairing a screen from the remote

The disconnect existed but no TV could reach it. It lives in the player's info
panel, which opens with the **i** key, and a TV remote has no **i**. Nor could a
plain remote have pressed the button: nothing in the player takes focus, so
there was no way to move to it without a Magic Remote pointer.

The webOS shell now owns the entry point. Its settings overlay — **Settings** or
the **Blue** button, the same key that has always opened it — has a **Disconnect
screen** button, and the shell asks the player to unpair over the same
`postMessage` channel it already uses to hand over the server URL.

- The button takes **two presses**: the first arms it for five seconds. Unpairing
  cannot be undone from the remote; the screen has to be claimed again with a new
  code.
- The per-screen **`showDisconnectButton`** toggle governs this too. A screen
  with the disconnect switched off in the dashboard refuses the request, and the
  overlay says so instead of failing silently.
- The unpair request passes the same sender checks as the server-URL handoff
  (allow-listed origin, the embedding window, and that window being the
  top-level document). The one deliberate difference: a handoff is refused once
  a display is paired, an unpair is not — the shell may reset a display, never
  silently re-point it at another server.
- The player answers with the outcome, so the overlay can distinguish a
  successful unpair from a locked screen, an unpaired one, or a player that
  never answered.

**Operator action:** none for the backend. To use it on a TV, repackage and
reinstall the webOS app (`player-applications/lg-tvos/`); older shells keep
working and simply have no disconnect button.

## 0.11.1

### Fixed — the webOS app could not be downloaded

The LG webOS `.ipk` had no download button in the screens help panel, on any
installation. Renaming the project in 0.11.0 changed the application id in
`player-applications/lg-tvos/appinfo.json` to `com.mynextscreen.webos`, and
`ares-package` names the package after it. The backend kept a second, hardcoded
copy of the old id and looked for `com.cbf.webos_0.11.0_all.ipk`, a file CI
never produced, so it reported the download as unavailable and the button never
rendered. The id and version are now read from the manifest — the same file the
packaged name comes from — and cannot drift apart again. A manifest that is
missing or malformed now only costs the download, is logged, and leaves the
setup guide reachable.

Second cause, for arm64 hosts only: the arm64 backend image contained no `.ipk`
at all. The package is architecture independent, but it is baked into the image,
and CI built it for the amd64 job alone when the arm64 images were introduced.
Both backend images now carry it.

The module had no tests, which is why a rename could remove a feature unnoticed.
It now has sixteen, including one that fails if the packaged id and the id the
backend expects ever diverge again.

**Operator action:** pull the new backend image. Nothing else changes; no
migration, no configuration.

## 0.11.0

The release that made the repository public: one name, no borrowed marks, and
documentation that matches the code.

### Changed — the project is called myNextScreen

The admin interface has said so for months; everything else still said "Signage
Server", and the webOS app called itself "Digital Signage" with the application
id `com.cbf.webos`. Four names for one product, none of which matched the logo
in the sidebar. They are now one.

Renamed: the product name in emails, `SMTP_FROM`, the package, the Nx path
mapping (`@mynextscreen/shared-types`), browser-storage keys, the postMessage
handoff type, the JWT issuer and audiences, container and unit names, the podman
network, the Caddy access log, the fail2ban jail, the database role and
database, the service user, and the repository itself
(`Flo-Schilli/mynextscreen`), which moves the GHCR image paths with it.

Dropped: `screen.mynextscreen.app` as the built-in default player URL. An
instance that has no `PLAYER_BASE_URL` now says so in the add-screen hint
instead of naming a deployment it has nothing to do with.

Deleted: `docs/`, 54 files of planning and design-handoff material that
documented how the software came to be rather than how to use it. The history
still has them.

Corrected: README, ARCHITECTURE and VISION still described screens as
authenticating with a long-lived API key issued by an org admin. That stopped
being true in 0.10.0.

### Changed — the launcher icon, the favicon and the idle screen are our own

The webOS launcher icon was a third-party logo, and `default-screen.png` — what
a display shows when nothing is scheduled — was a band's. Permission to use a
mark is not permission to ship it to everyone who installs the software, and
AGPL passes on rights to the code, not to a bundled image. All three are now one
drawing, optically sized per use: 80 px for the launcher, 16 px for the tab, and
full screen with the wordmark for an idle display, which also now says it is
idle rather than leaving a bystander to guess it is broken.

Both web apps ship a favicon that survives 16 px. The player referenced one that
never existed and served a 404.

### Fixed — two things a staged demo made visible

- **Dates followed the browser locale, the rest of the UI did not.** Nothing
  here is translated, so `toLocaleDateString()` without a locale localised
  nothing; it mixed languages, rendering "Montag, 28. September" inside a panel
  headed "Schedules". Fifteen call sites now share one locale constant.
- **The unread-notification count fetched before it knew which organisation it
  was counting for**, so the request went out without `X-Organisation-Id` and
  the backend answered 400 — on every page load, in every browser console. It
  now follows the selected organisation, and re-reads when someone switches,
  which it never did before.

### Documentation

The README is a page for someone deciding whether to look at this at all:
screenshots of the running system, three commands to start it. Everything an
operator needs moved into `docs/` (installation, configuration, screens).
ARCHITECTURE and VISION were corrected against the code — both still described
an email provider, a screen registration flow and a local content cache that do
not exist.

### CI

`actions/checkout` and `actions/setup-node` moved to v7, pinned by SHA with the
exact tag written beside each one.

### Required operator actions

This release renames deployment identity. A running instance does not migrate
itself — plan a rebuild rather than an upgrade.

1. **Pull from the new image path.** `ghcr.io/flo-schilli/mynextscreen/{backend,frontend,player}`.
   The old path keeps its existing tags and receives nothing further.
2. **The database role, the database and the service user are now `mynextscreen`.**
   Back up first (`ansible/download_db.yml` against the old host), then restore
   into the new instance.
3. **Quadlet units, the podman network and the env files are renamed.** Remove
   the `signage-*` units before deploying, or the host runs both sets.
4. **Everyone is logged out once.** The JWT issuer and audiences changed, so
   existing access tokens are refused. Users simply log in again.
5. **Every screen re-pairs, and every webOS TV needs the new app.** The
   application id changed, which makes it a new app to the TV: the old one stays
   installed and the new one starts empty. Browser-storage keys changed too, so
   a paired display starts over.

## 0.10.1

### Changed — the webOS shell stops asking for an API key

0.10.0 left the key field in the shell's settings overlay and kept the key on
the TV, on the argument that the shell's storage survives an app update of the
player iframe. That argument no longer holds: the dashboard stopped handing out
keys at all, so there is nothing for an operator to type into that field. A
screen is enrolled by the six-digit code it shows on the display.

- The settings overlay asks for the **Server URL** and an optional Player URL,
  and explains that the code on screen is what enrols the display.
- The key written by 0.9.x is **deleted from the TV** on the first start.
- The handoff message carries only `serverUrl`. The player takes it, persists it
  and pairs against it — which also fixes the case where the player guessed
  `api.<its own hostname>` and got it wrong.
- **The handoff can no longer enrol a display.** An `apiKey` in the message is
  ignored. It used to be honoured for shells from 0.9.x, which also meant any
  sender past the trust check could enrol a display with a key it invented.
- **A handoff is accepted only from the top-level embedding window.** The shell
  is one; a page faking the shell's opaque origin by framing through a
  `sandbox="allow-scripts"` document is not. Deployments without the webOS shell
  should drop the opaque origin entirely — `window.__SIGNAGE_TRUSTED_ORIGINS__`
  in the player's `index.html`, which now documents itself.

### Changed — disconnect moves into the info panel

It was a button pinned to the top-right corner of the content at all times, on a
device whose entire purpose is to show content. It now sits in the info panel
(the **i** key), next to the screen, playlist and status it belongs with. The
per-screen `showDisconnectButton` toggle still governs it.

The panel no longer auto-hides once it has been opened deliberately; only the
informational flash on start does. Five seconds is not enough to find and hit a
button with a TV remote.

### Required operator actions

1. **Reinstall the webOS app on every TV that runs the 0.9.x shell.** Its handoff
   can no longer enrol a display. Screens that are already paired keep running on
   their session and are not affected; a screen that has to enrol again with an
   old shell will sit on a pairing code until the app is updated.

A screen whose storage is cleared shows a code again; enrol it with **Repair**
on the existing screen, which keeps its name, playlists and schedules.

## 0.10.0

The screen API key stops being a permanent credential, and the backend container
stops running as root. Eight commits; `v0.9.0..v0.10.0` for the full list.

### Required operator actions

1. **Add `UserNS=keep-id:uid=1000,gid=1000` to the backend unit.** The image now
   runs as a non-root user, and under rootless podman a plain non-root uid lands
   in the subuid range and cannot write the media bind mount. The shipped quadlet
   template has the line; a hand-written unit without it fails every upload,
   transcode and slice with a permission error. `CHOWN` and `DAC_OVERRIDE` are
   dropped from its capabilities.
2. **Screens re-enrol themselves, but only if they can reach the new session
   route.** The API key is now accepted on `POST /screens/session` and nowhere
   else. A player from before 0.10.0 cannot authenticate at all against a
   0.10.0 backend — deploy both together.

### Changed — the screen API key is now an enrolment credential

Previously it was issued once at pairing, never renewed, had no expiry and no
revocation, and travelled on every request. It sat in the player's localStorage,
in the webOS shell's storage — shown in cleartext in a settings overlay
reachable from the remote — and as `?token=` in every media URL, which put it in
the DOM, the `Referer` chain and every access log line.

- **Media URLs carry a signed grant** instead of a credential: HMAC over screen
  id and path, key derived from `JWT_ACCESS_SECRET`. Bucketed to a day with a
  per-screen offset so the URL stays byte-stable and `max-age=86400` keeps
  working; only the path is signed.
- **Screens hold a session**: a 15-minute access token with its own JWT
  audience, plus a rotating refresh token in Postgres (not Redis — a lost
  snapshot would strand the fleet). A 60-second grace window makes concurrent
  refreshes from the player's five independent consumers legitimate rather than
  a replay; a real replay is refused and logged without revoking the family.
- **The player keeps no key on disk** once a session exists, renews on a 401
  rather than on a clock a TV cannot be trusted with, and jitters its SSE
  reconnect so a fleet does not come back in lockstep.
- **The heartbeat reports the player build**, shown in the admin screen detail.
- The webOS key field is a password input and is never pre-filled; empty means
  "keep the stored key". The shell still holds the key on purpose — its storage
  is what survives an app update of the player iframe.
- `?token=` is gone as an authentication mechanism.

### Fixed

- The backend container runs as a non-root user. FFmpeg parses user-uploaded
  media in it, so a parser bug was root inside the container.
- SSRF: the per-org SMTP send path and live-stream start now run the resolved
  address check that until then only the test endpoints did.
- The screen API key is redacted from the Caddy and nginx access logs.
- Two player bugs surfaced by the above: hls.js froze the credential in a
  closure at attach time, and the Safari native-HLS branch could never have
  worked.

## 0.9.0

Security and dependency hardening across the whole stack, from a full audit of
0.8.4. 27 commits; the ones worth naming are referenced below.

### Required operator actions

Read this before deploying. Four of these will stop a deployment that ignores
them.

1. **Set `vault_signage_postgres_password`.** The production database password
   no longer falls back to `signage`; the playbook now aborts without the vault
   variable (`bc38ebf`). **Rotate the password on the live host while doing
   this** — until now it was very likely still the default.
2. **`JWT_ACCESS_SECRET` must be at least 32 characters.** The backend refuses
   to start otherwise (`8f0f5b0`). Generate with `openssl rand -base64 48`.
3. **`PUBLIC_BASE_URL` is required in production.** CORS now fails closed
   rather than reflecting any origin alongside `credentials: true` (`8f0f5b0`).
   Set `PLAYER_BASE_URL` too if the player runs on its own origin.
4. **The nginx images listen on 8080 and run as UID 101.** The frontend and
   player containers no longer run as root (`3cf4933`). The shipped quadlets
   publish `127.0.0.1:50001:8080` / `127.0.0.1:50003:8080`; a hand-written unit
   or compose file that still maps to container port 80 has to be updated.
5. **All published container ports bind to loopback.** Anything reaching the
   backend, frontend or player other than through Caddy has to go through the
   reverse proxy from now on (`3cf4933`).
6. **Migration `0016` invalidates links that are in flight.** Email
   verification, password reset and email change tokens are stored hashed, so
   the plaintext values already mailed out stop working (`0842f4a`). Affected
   users request a new link; nothing else is lost.
7. **Set `SECRETS_ENCRYPTION_KEY`** (`openssl rand -base64 32`) to encrypt the
   per-org SMTP passwords and ntfy tokens at rest (`8706fa8`). Optional: without
   it they are stored in plaintext as before, and the backend warns at boot.
   Existing rows are read either way and re-encrypted on their next write.
8. **Deployments pin the image tag to the version in `package.json`**, not
   `latest` (`11bfbdc`). Deploy from the checkout of the release you want, or
   pass `-e signage_image_tag=1.2.3`.

### Fixed — tenancy

- Cross-tenant takeover through `organisations/:orgId/members`: an org admin of
  any organisation could add themselves to any other one. The `RolesGuard` now
  resolves the organisation from route params and is default-deny, so a route
  without an access declaration is refused instead of allowed (`76199ff`).
- Cross-tenant read/write of the notification config (including SMTP
  credentials), `schedules/current` without org scoping, unauthorised screen SSE
  subscriptions, live-stream HLS routes without a tenancy check, and screen
  impersonation inside an organisation (`76199ff`).
- Super-admin member routes returned raw user rows — password hashes and live
  reset tokens included (`c616646`).

### Fixed — authentication

- Password change and reset now revoke every existing session. The acting
  device keeps working; all others are signed out (`da00a0e`).
- Verification, reset and email-change tokens are stored as SHA-256
  fingerprints (`0842f4a`).
- JWTs pin algorithm, issuer and audience on both sign and verify; passwords are
  length-bounded; failed logins spend the same time whether or not the account
  exists (`8f0f5b0`).
- Screen authentication looks up an indexed key fingerprint instead of
  bcrypt-comparing against every screen row — a scaling defect and a cheap CPU
  exhaustion vector (`5ce6602`).

### Fixed — input and outbound traffic

- SSRF through org-configurable targets: `ntfyUrl`, per-org `smtpHost` and
  live-stream `sourceUrl` are checked for scheme and for private, loopback,
  link-local and CGNAT addresses — at save time and again against the resolved
  addresses before each request. Internal hosts can be allow-listed with
  `OUTBOUND_ALLOWED_HOSTS` (`2ab90d8`).
- Stored XSS through `image/svg+xml`: uploads are typed from their magic bytes,
  SVG cannot match, and downloads send a derived content type with `nosniff`
  (`4758534`).
- Upload size is enforced while the body is read (Multer) and capped in nginx
  via `MAX_UPLOAD_SIZE` (`4758534`).
- Storage quota accounting is atomic; parallel uploads can no longer overshoot
  the limit or corrupt the counter (`995a55f`).

### Fixed — player, media and runtime

- The player accepts a `signage-connect` handoff only from an allow-listed
  origin, only from the embedding window, and only while unconnected. The LG
  webOS shell posts to the player's own origin instead of `*` (`42a178a`).
- FFmpeg processes are terminated on shutdown, escalated to SIGKILL when they
  ignore SIGTERM, capped in number (`MAX_CONCURRENT_LIVE_STREAMS`, default 4)
  and given an input timeout; protocol allow-lists are explicit (`dc94924`).
- Video-wall slices are written inside the organisation's media directory, so
  they count against the quota and are removed with the organisation
  (`d5f34d9`).
- `helmet` sets security headers on the API itself, and rate limiting keys on
  the real client IP instead of the proxy — the login limit was platform-wide,
  which made a five-request lockout of every user possible (`14f0523`).

### Changed — dependencies and build

- All runtime advisories closed: Angular 21.2.24, axios 1.20.0, NestJS 11.2.6
  (multer 2.4.0), nodemailer 10, postcss, body-parser, qs, form-data, nanoid,
  Nx 22.7.12 (`9d7678b`, `abfdaa6`, `dd6eded`). `npm audit --omit=dev` is empty.
- **`npm ci` requires npm 11.6.2**, the version pinned in `package.json`. CI and
  all three Dockerfiles install it first; npm 10 cannot install this lockfile
  (`3cf4933`).
- CI gates on `npm audit --omit=dev --audit-level=high` and a Trivy image scan
  that runs before the push, publishes an SBOM and provenance, and pins every
  action to a commit SHA. Dependabot and `SECURITY.md` added (`11bfbdc`). A
  CodeQL workflow is in place but stays skipped: code scanning needs GitHub
  Advanced Security on a private repository, so it activates by itself if this
  repository is made public.
- Fonts are self-hosted. They were loaded from Google and blocked by the
  production CSP, so the UI had been falling back to system fonts (`3cf4933`).
- Dev compose binds Postgres, Redis and Mailpit to `127.0.0.1` (`ec91148`).

### New environment variables

All optional unless noted.

| Variable                      | Purpose                                                                    |
| ----------------------------- | -------------------------------------------------------------------------- |
| `SECRETS_ENCRYPTION_KEY`      | Encrypts per-org SMTP passwords and ntfy tokens at rest (32 bytes, base64) |
| `OUTBOUND_ALLOWED_HOSTS`      | Comma-separated hosts allowed past the SSRF guard (internal ntfy/SMTP)     |
| `MAX_CONCURRENT_LIVE_STREAMS` | Cap on simultaneous FFmpeg encoders (default 4)                            |
| `MAX_UPLOAD_SIZE`             | nginx request-body cap in the frontend image (default `100m`)              |
