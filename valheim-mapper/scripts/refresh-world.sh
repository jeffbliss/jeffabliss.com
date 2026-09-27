#!/usr/bin/env bash
# Refresh the mapper's world document from the dedicated server: download the world folder over SFTP, decode the
# cartography table, paint biomes from the seed render, and leave import/world.json ready for Edit → Import.
#   scripts/refresh-world.sh            download + decode + paint
#   scripts/refresh-world.sh --offline  skip the download, reuse import/savegame
# Settings come from valheim-mapper/.env (see .env.example). The password never appears on the command line or in git.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || { echo "missing .env — copy .env.example to .env and fill it in" >&2; exit 1; }
set -a; . ./.env; set +a
: "${SFTP_HOST:?set SFTP_HOST in .env}" "${SFTP_USER:?set SFTP_USER in .env}" "${SFTP_PATH:?set SFTP_PATH in .env}"
SFTP_PORT="${SFTP_PORT:-22}"
mkdir -p import

if [ "${1:-}" != "--offline" ]; then
  echo "→ downloading ${SFTP_PATH} from ${SFTP_USER}@${SFTP_HOST}:${SFTP_PORT}"
  rm -rf import/savegame.new
  batch=$(printf 'lcd import/savegame.new\nget -r %s\nbye\n' "$SFTP_PATH")
  mkdir -p import/savegame.new
  if [ -n "${SFTP_PASS:-}" ]; then
    # sftp only takes passwords from a terminal, so expect types it; the password lives only in the environment.
    SFTP_BATCH="$batch" expect <<'EXP'
      set timeout 600
      log_user 0
      spawn sftp -o StrictHostKeyChecking=accept-new -P $env(SFTP_PORT) $env(SFTP_USER)@$env(SFTP_HOST)
      expect {
        -nocase "password" { send "$env(SFTP_PASS)\r" }
        "sftp>" {}
        timeout { puts stderr "sftp: no prompt"; exit 1 }
      }
      expect {
        "sftp>" {}
        -nocase -re "permission denied|password" { puts stderr "sftp: login failed"; exit 1 }
        timeout { puts stderr "sftp: no prompt after login"; exit 1 }
      }
      log_user 1
      foreach line [split $env(SFTP_BATCH) "\n"] {
        if {$line eq ""} continue
        send "$line\r"
        if {$line eq "bye"} break
        expect "sftp>"
      }
      expect eof
EXP
  else
    printf '%s\n' "$batch" | sftp -b - -o StrictHostKeyChecking=accept-new -P "$SFTP_PORT" "$SFTP_USER@$SFTP_HOST"
  fi
  name=$(basename "$SFTP_PATH")
  [ -d "import/savegame.new/$name" ] || { echo "download did not produce import/savegame.new/$name" >&2; exit 1; }
  rm -rf import/savegame && mv "import/savegame.new/$name" import/savegame && rm -rf import/savegame.new
  echo "→ $(ls import/savegame | wc -l | tr -d ' ') files in import/savegame"
fi

node scripts/import-world.mjs import/savegame import/world.json
if [ -f import/seed-map.png ]; then node scripts/paint-biomes.mjs import/world.json import/seed-map.png; else echo "→ no import/seed-map.png: skipping biomes"; fi
echo
echo "Ready: open the map, press E, press Import, choose $(pwd)/import/world.json"
