#!/usr/bin/env bash
# Dumpt de database (scripts/backup-database.mjs) en upload het resultaat naar
# de "The Bridge — App Backups" Drive-folder via rclone (remote "gdrive",
# eenmalig gekoppeld met `rclone config`, root_folder_id staat al ingesteld
# op de juiste folder).
#
# Waarom rclone en niet de Google Drive MCP-tool: die tool kan alleen bestandsinhoud
# accepteren die letterlijk in de tool-aanroep wordt getypt, dus voor een backup van
# honderden KB's zou een AI-agent de hele JSON foutloos moeten overtypen. Dat ging
# mis (1 aug 2026: eerst een placeholder-bestand, toen een versie met lege tabellen
# geupload). rclone leest en verzendt het bestand rechtstreeks van disk, dus die hele
# overtype-stap — en het risico op een stille, corrupte backup — vervalt.
#
# Gebruik: scripts/backup-and-upload.sh
set -euo pipefail
cd "$(dirname "$0")/.."

BACKUP_PATH=$(node scripts/backup-database.mjs)
ROW_COUNTS=$(node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('$BACKUP_PATH')).row_counts, null, 2))")

echo "Backup gegenereerd: $BACKUP_PATH" >&2
echo "$ROW_COUNTS" >&2

LOCAL_MD5=$(md5 -q "$BACKUP_PATH")
FILENAME=$(basename "$BACKUP_PATH")

rclone copy "$BACKUP_PATH" gdrive: --quiet

REMOTE_MD5=$(rclone md5sum gdrive: 2>/dev/null | grep -F "$FILENAME" | awk '{print $1}')

if [ "$LOCAL_MD5" != "$REMOTE_MD5" ]; then
  echo "FOUT: checksum van geuploade bestand ($REMOTE_MD5) komt niet overeen met lokaal bestand ($LOCAL_MD5)." >&2
  echo "Lokaal bestand NIET verwijderd: $BACKUP_PATH" >&2
  exit 1
fi

# Ruim eventuele oudere bestanden met dezelfde naam op (zou niet moeten voorkomen,
# maar Drive staat duplicate filenames toe — voorkomt verwarring/dubbele backups).
rclone dedupe --dedupe-mode largest gdrive: --quiet 2>/dev/null || true

rm "$BACKUP_PATH"
echo "Upload geverifieerd (md5 $LOCAL_MD5) en lokaal bestand verwijderd." >&2
echo "$FILENAME"
