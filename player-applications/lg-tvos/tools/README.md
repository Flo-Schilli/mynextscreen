# Remote control for LG webOS TVs

Consumer TVs have no autostart — that is a signage-display feature. This directory
holds the tooling that replaces it: start the app from the outside, keep the
Developer Mode session alive, and wake the TV from standby.

> **For running a venue, use the [site agent](../../../docs/site-agent.md)**, not
> these. It does all of this unattended, for every display in a house, from
> inside that venue's network, and reports back what it found. These scripts are
> for poking at one set by hand — before an agent is set up, or when one cannot
> reach a TV and you need to find out why.
>
> The rest of this file is the record of what LG's protocols actually do, most
> of it learned against a real set. The agent's implementation relies on these
> findings, so they are worth keeping whether or not you ever run the scripts.

Everything here talks **SSAP**, LG's WebSocket remote-control protocol. No npm
packages required; Node 22 ships a global `WebSocket`.

## Quick reference

```bash
# start the app once
node launch-tv.mjs --host 192.168.1.50

# keep it in the foreground (autostart replacement)
node launch-tv.mjs --host 192.168.1.50 --watch

node launch-tv.mjs --help

# extend the Developer Mode session (SSH, not SSAP — see below)
./extend-devmode.sh my-tv
./extend-devmode.sh tv-1 tv-2 tv-3
```

| Option | Env | Default | Meaning |
| --- | --- | --- | --- |
| `--host <ip>` | `TV_HOST` | — | TV address, required |
| `--port <3000\|3001>` | `TV_PORT` | `3001` | 3001 = `wss`, 3000 = plain `ws` |
| `--app <id>` | `TV_APP_ID` | `com.mynextscreen.webos` | App to launch |
| `--key-file <path>` | `TV_KEY_FILE` | `tools/.lgtv-key` | Where the client key is stored |
| `--watch` | — | off | Stay connected, relaunch on foreground change |
| `--strict-tls` | — | off | Verify the TV certificate (fails on self-signed) |

## SSAP basics

| Port | Scheme | Note |
| --- | --- | --- |
| 3000 | `ws://` | Plain. Disabled on firmware from roughly model year 2023 |
| 3001 | `wss://` | TLS with a self-signed certificate |

On 3001 the script sets `NODE_TLS_REJECT_UNAUTHORIZED=0` **for its own process
only** and prints a warning. `--strict-tls` disables that.

The first connection triggers a pairing prompt on the TV. Confirm it with the
remote; the TV then returns a client key that is stored in `tools/.lgtv-key`
(mode 600, gitignored). Every later connection is silent.

## TV settings

| Setting | Path | Why |
| --- | --- | --- |
| **Quick Start+** | Settings → General → Energy Saving → Quick Start+ | Without it the network stack is dead in standby and SSAP does not answer |
| **Mobile TV On** | Settings → General → Devices → External Devices → Mobile TV On → *Turn on via Wi-Fi* | Wake-on-LAN. On webOS 4.x/5.x: Settings → General → Mobile TV On |

Menu paths move with every webOS generation. Searching the settings for
`Mobile` is faster than clicking through.

## Wake-on-LAN

Get the MAC from Settings → General → About This TV, or from the router, or
while the TV is on:

```bash
ping -c1 <TV-IP> >/dev/null; ip neigh show <TV-IP>
```

**LAN and Wi-Fi have different MAC addresses.** Use the one for the interface the
TV actually uses.

```bash
# Fedora: sudo dnf install wol
wol -i 192.168.1.255 AA:BB:CC:DD:EE:FF
```

Without installing anything:

```bash
node -e 'const d=require("dgram"),m=process.argv[1].split(/[:-]/).map(h=>parseInt(h,16)),
p=Buffer.concat([Buffer.alloc(6,0xff),...Array(16).fill(Buffer.from(m))]),s=d.createSocket("udp4");
s.bind(()=>{s.setBroadcast(true);s.send(p,9,"192.168.1.255",()=>s.close())})' AA:BB:CC:DD:EE:FF
```

Full sequence — the TV needs roughly 15 seconds before it accepts SSAP:

```bash
wol -i 192.168.1.255 AA:BB:CC:DD:EE:FF
sleep 15
node launch-tv.mjs --host <TV-IP>
```

**Trap:** after the TV was fully disconnected from power, Wake-on-LAN stays dead
until it has been switched on once with the remote.

## Developer Mode session

A dev-mode installed app is removed when the session expires — webosbrew
documents a limit of **1000 hours** for current webOS. Older LG docs say 50
hours; that number is stale but still circulates.

### What extends it

Launching the Developer Mode app with `params.extend` over the **public Luna
bus**. That is what the *Extend Session Time* button on the TV does:

```sh
luna-send-pub -n 1 luna://com.webos.applicationManager/launch \
  '{"id":"com.palmdts.devmode","subscribe":false,"params":{"extend":true}}'
```

`luna-send-pub` is available to the jailed `prisoner` user, so this needs neither
root nor the session token. `extend-devmode.sh` wraps it for one or more TVs.

If the app is already running, a `launch` is a relaunch and the parameters may be
ignored. Close it first if nothing happens:

```sh
luna-send-pub -n 1 luna://com.webos.applicationManager/close '{"id":"com.palmdts.devmode"}'
sleep 2
```

### What does not extend it

The same call over **SSAP**:

```
ssap://com.webos.applicationManager/launch
{"id":"com.palmdts.devmode","params":{"extend":true}}
```

The TV acknowledges it with `returnValue: true` and the Developer Mode app opens,
but the parameters never reach the app and the session is not extended. Verified
on a real TV — do not rebuild this into `launch-tv.mjs`.

The HTTP endpoint:

```
GET https://developer.lge.com/secure/ResetDevModeSession.dev?sessionToken=<token>
```

This resets **LG's backend counter only**. `CheckDevModeSession.dev` will happily
report `999:58:40` afterwards while the TV keeps counting down from its own local
timer. See [webosbrew/dev-manager-desktop#256](https://github.com/webosbrew/dev-manager-desktop/issues/256).

Two more reasons not to build on that endpoint:

- The session token lives in `/var/luna/preferences/devmode_enabled`. On newer
  firmware the SSH session runs in a jail, and the jailed `prisoner` user cannot
  read that path. `ls` in the home directory shows only `apps`, `jail_app.conf`,
  `log`, `temp`, `tmp`.
- webOS Dev Manager shows its remaining time from that same backend endpoint, not
  from the TV. Its display and the TV's display are two different numbers.

### Judging success

**The remaining time shown on the TV updates with a long delay.** Do not treat an
unchanged number right after the call as failure — check again minutes later.

## SSH to the TV

Only needed for `ares-*` and Luna calls, not for SSAP.

```
Host my-tv
    Hostname 192.168.1.50
    Port 9922
    User prisoner
    HostkeyAlgorithms +ssh-rsa
    PubkeyAcceptedAlgorithms +ssh-rsa
    IdentityFile ~/.ssh/my-tv_webos
    IdentitiesOnly yes
```

Three things bite in this order:

**1. `ssh_dispatch_run_fatal: ... error in libcrypto`**

The TV runs OpenSSH 6.1 and offers `ssh-rsa` — RSA with SHA-1 — as its only host
key algorithm. Fedora's DEFAULT crypto policy forbids SHA-1 signatures in
**OpenSSL**, so the connection dies right after the host key is verified. The
`HostkeyAlgorithms +ssh-rsa` line above does not help: the rejection happens one
layer below OpenSSH.

Create `~/.ssh/openssl-sha1.cnf`:

```
.include /etc/ssl/openssl.cnf

[ evp_properties ]
rh-allow-sha1-signatures = yes
```

Then prefix the call, which limits the exception to that one process:

```bash
OPENSSL_CONF=~/.ssh/openssl-sha1.cnf ssh my-tv
```

System-wide alternative: `sudo update-crypto-policies --set DEFAULT:SHA1`.

**2. The key is ignored silently**

webOS keys are often written with mode 0644. SSH then skips them without a useful
message and you end up at `Permission denied (publickey)`.

```bash
chmod 600 ~/.ssh/my-tv_webos
```

**3. Passphrase**

The key is encrypted with the six-character code from the Developer Mode app.
For unattended use, load it into an agent once (`ssh-add`) or decrypt a temporary
copy:

```bash
ssh-keygen -p -P "<passphrase>" -N '' -f "$TMPKEY"
```

Note that `-vvv` must come **before** the remote command; behind it, ssh passes it
to the TV instead of enabling debug output.

## Why not the browser

`ssap://system.launcher/open` with `{"target":"https://…"}` opens the built-in
browser on the player URL — no installation, no Developer Mode. It costs exactly
what the native app provides: browser chrome on screen, no
`registerScreenSaverRequest` (so the screen saver blanks the display), and no
remote navigation.
