#!/usr/bin/env bash
# extend-devmode.sh — extends the LG webOS Developer Mode session on one or more TVs.
#
# Without an extension the session expires and the TV removes every app that was
# installed through Developer Mode. This launches the Developer Mode app with
# params.extend, which is what the "Extend Session Time" button on the TV does.
#
# Two things that look like they would work, but do not:
#   - GET https://developer.lge.com/secure/ResetDevModeSession.dev?sessionToken=...
#     resets LG's backend counter only, not the TV's local timer.
#   - The same call over SSAP (ssap://com.webos.applicationManager/launch) is
#     acknowledged with returnValue:true but the params never reach the app.
#
# The remaining time shown on the TV updates with a delay of minutes. An
# unchanged number right after the call is not a failure.
#
# Arguments are ssh targets — host aliases from ~/.ssh/config, or user@host.
#
#   ./extend-devmode.sh my-tv
#   ./extend-devmode.sh tv-1 tv-2 tv-3
#
# Unattended use needs the keys in an ssh-agent, because the webOS keys are
# encrypted with the code from the Developer Mode app:
#
#   ssh-add ~/.ssh/<tv>_webos
#
set -euo pipefail

readonly LUNA_URI='luna://com.webos.applicationManager/launch'
readonly LUNA_PAYLOAD='{"id":"com.palmdts.devmode","subscribe":false,"params":{"extend":true}}'
readonly SSH_CONNECT_TIMEOUT=8

# Fedora's crypto policy rejects the TV's ssh-rsa host key inside OpenSSL, which
# surfaces as "error in libcrypto". See README.md for the file's contents.
OPENSSL_SHA1_CNF="${OPENSSL_SHA1_CNF:-$HOME/.ssh/openssl-sha1.cnf}"

usage() {
  awk 'NR > 1 && /^#/ { sub(/^# ?/, ""); print; next } NR > 1 { exit }' "$0"
}

if [ "$#" -lt 1 ] || [ "$1" = '-h' ] || [ "$1" = '--help' ]; then
  usage
  [ "$#" -lt 1 ] && exit 1
  exit 0
fi

if [ -r "$OPENSSL_SHA1_CNF" ]; then
  export OPENSSL_CONF="$OPENSSL_SHA1_CNF"
else
  echo "note: $OPENSSL_SHA1_CNF not found — if ssh dies with 'error in libcrypto', create it (see README.md)" >&2
fi

ssh_opts=(-o "ConnectTimeout=${SSH_CONNECT_TIMEOUT}")
# Interactive runs may prompt for the key passphrase; cron runs must not hang.
[ -t 0 ] || ssh_opts+=(-o BatchMode=yes)

exit_code=0

for host in "$@"; do
  printf '%-24s ' "${host}:"

  if ! response=$(ssh "${ssh_opts[@]}" "$host" \
      "luna-send-pub -n 1 ${LUNA_URI} '${LUNA_PAYLOAD}'" 2>&1); then
    echo "ssh failed — ${response##*$'\n'}"
    exit_code=1
    continue
  fi

  case "$response" in
    *'"returnValue":true'*)
      echo 'extended'
      ;;
    *)
      echo "unexpected response — ${response}"
      exit_code=1
      ;;
  esac
done

exit "$exit_code"
