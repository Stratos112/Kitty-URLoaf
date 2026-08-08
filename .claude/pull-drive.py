#!/usr/bin/env python3
"""
Sync a Google Drive folder → local directory, replacing all files.
After sync, runs crop-pants.sh + generate-anims.sh automatically.

First-time setup:
  1. console.cloud.google.com → new project → enable "Google Drive API"
  2. APIs & Services → Credentials → Create → OAuth 2.0 Client ID → Desktop app
  3. Download JSON → save as .claude/credentials.json
  4. Run this script — browser opens once to authorize, token cached after.

Usage:
  python3 .claude/pull-drive.py
  python3 .claude/pull-drive.py --no-rebuild   (skip crop+anim rebuild)
"""

import io
import os
import sys
import subprocess
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

# ── config ────────────────────────────────────────────────────────────────────
DRIVE_FOLDER_ID = "1u2YtwXf8GQbAJG5zpPu5rbDUNuXnOm7n"  # from Drive URL: /folders/<this part>
LOCAL_PATH      = "static/Pants"         # relative to repo root
# ─────────────────────────────────────────────────────────────────────────────

SCOPES      = ["https://www.googleapis.com/auth/drive.readonly"]
HERE        = Path(__file__).resolve().parent
ROOT        = HERE.parent
CREDS_FILE  = HERE / "credentials.json"
TOKEN_FILE  = HERE / "token.json"
LOCAL_ROOT  = ROOT / LOCAL_PATH


def auth():
    creds = None
    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CREDS_FILE.exists():
                sys.exit(f"Missing {CREDS_FILE} — see setup instructions in this file.")
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDS_FILE), SCOPES)
            creds = flow.run_local_server(port=0)
        TOKEN_FILE.write_text(creds.to_json())
    return creds


def list_folder(service, folder_id):
    """Yield (name, id, mimeType) for everything directly in folder_id."""
    page_token = None
    while True:
        resp = service.files().list(
            q=f"'{folder_id}' in parents and trashed = false",
            fields="nextPageToken, files(id, name, mimeType)",
            pageToken=page_token,
            pageSize=1000,
        ).execute()
        yield from resp.get("files", [])
        page_token = resp.get("nextPageToken")
        if not page_token:
            break


def download_file(service, file_id, dest: Path):
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = service.files().get_media(fileId=file_id)
    buf = io.BytesIO()
    dl  = MediaIoBaseDownload(buf, req)
    done = False
    while not done:
        _, done = dl.next_chunk()
    dest.write_bytes(buf.getvalue())


def sync_folder(service, folder_id, local_dir: Path, prefix=""):
    local_dir.mkdir(parents=True, exist_ok=True)
    items = list(list_folder(service, folder_id))
    for item in items:
        name      = item["name"]
        is_folder = item["mimeType"] == "application/vnd.google-apps.folder"
        label     = f"{prefix}{name}{'/' if is_folder else ''}"
        if is_folder:
            sync_folder(service, item["id"], local_dir / name, prefix=f"{prefix}{name}/")
        else:
            dest = local_dir / name
            print(f"  {'new' if not dest.exists() else 'upd'}  {label}")
            download_file(service, item["id"], dest)
    print(f"  {len(items)} items in {'root' if not prefix else prefix.rstrip('/')}")


def main():
    rebuild = "--no-rebuild" not in sys.argv

    if DRIVE_FOLDER_ID == "YOUR_FOLDER_ID_HERE":
        sys.exit("Set DRIVE_FOLDER_ID at the top of this script first.")

    print(f"Authenticating...")
    service = build("drive", "v3", credentials=auth())

    print(f"Syncing Drive:{DRIVE_FOLDER_ID} → {LOCAL_PATH}/")
    sync_folder(service, DRIVE_FOLDER_ID, LOCAL_ROOT)

    if rebuild:
        print("\nRunning crop + anim rebuild...")
        subprocess.run(["bash", str(HERE / "crop-pants.sh")],  check=True)
        subprocess.run(["bash", str(HERE / "generate-anims.sh")], check=True)

    print("\ndone.")


if __name__ == "__main__":
    main()
