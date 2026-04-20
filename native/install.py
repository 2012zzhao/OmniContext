#!/usr/bin/env python3
"""
ContextDrop Native Host Installer

This script installs the Native Messaging Host configuration for Chrome or Edge.
Run this script once to enable the extension to communicate with the local server.

Usage:
    python install.py --extension-id=YOUR_EXTENSION_ID [--browser=chrome|edge|all]

Browser options:
    chrome  - Install for Google Chrome (default)
    edge    - Install for Microsoft Edge
    all     - Install for both Chrome and Edge

On Linux, the manifest will be installed to:
    Chrome: ~/.config/google-chrome/NativeMessagingHosts/com.contextdrop.host.json
    Edge:   ~/.config/microsoft-edge/NativeMessagingHosts/com.contextdrop.host.json

On macOS:
    Chrome: ~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.contextdrop.host.json
    Edge:   ~/Library/Application Support/Microsoft Edge/NativeMessagingHosts/com.contextdrop.host.json

On Windows, you need to add a registry key:
    Chrome: HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\com.contextdrop.host
    Edge:   HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts\\com.contextdrop.host
"""

import sys
import json
import argparse
from pathlib import Path


def get_native_host_path() -> Path:
    """Get the absolute path to the native host script."""
    script_dir = Path(__file__).parent.resolve()
    return script_dir / "native_host.py"


BROWSER_PATHS = {
    'chrome': {
        'linux': [
            ".config/google-chrome/NativeMessagingHosts/com.contextdrop.host.json",
            ".config/chromium/NativeMessagingHosts/com.contextdrop.host.json",
        ],
        'darwin': [
            "Library/Application Support/Google/Chrome/NativeMessagingHosts/com.contextdrop.host.json",
        ],
        'win32_registry': r"Software\Google\Chrome\NativeMessagingHosts\com.contextdrop.host",
    },
    'edge': {
        'linux': [
            ".config/microsoft-edge/NativeMessagingHosts/com.contextdrop.host.json",
        ],
        'darwin': [
            "Library/Application Support/Microsoft Edge/NativeMessagingHosts/com.contextdrop.host.json",
        ],
        'win32_registry': r"Software\Microsoft\Edge\NativeMessagingHosts\com.contextdrop.host",
    },
}

BROWSER_NAMES = {
    'chrome': 'Google Chrome',
    'edge': 'Microsoft Edge',
}


def get_manifest_paths(browser: str):
    """Get manifest installation paths for the specified browser based on OS."""
    home = Path.home()
    paths = BROWSER_PATHS.get(browser)

    if not paths:
        return []

    if sys.platform == 'win32':
        return None

    platform_key = 'darwin' if sys.platform == 'darwin' else 'linux'
    relative_paths = paths.get(platform_key, [])

    return [home / p for p in relative_paths]


def create_manifest(extension_id: str) -> dict:
    """Create the Native Messaging Host manifest."""
    native_host_path = get_native_host_path()

    manifest = {
        "name": "com.contextdrop.host",
        "description": "ContextDrop Native Host - Local memory storage service connector",
        "path": str(native_host_path),
        "type": "stdio",
        "allowed_origins": [
            f"chrome-extension://{extension_id}/"
        ]
    }

    return manifest


def install_linux_macos(extension_id: str, browser: str) -> bool:
    """Install manifest for Linux/macOS."""
    manifest = create_manifest(extension_id)
    paths = get_manifest_paths(browser)
    browser_name = BROWSER_NAMES.get(browser, browser)

    if paths is None:
        print(f"Unsupported platform for {browser_name} automatic installation")
        return False

    installed = False
    for path in paths:
        try:
            path.parent.mkdir(parents=True, exist_ok=True)

            with open(path, 'w') as f:
                json.dump(manifest, f, indent=2)

            print(f"[{browser_name}] Installed manifest to: {path}")
            installed = True

        except PermissionError:
            print(f"[{browser_name}] Permission denied for: {path}")
        except Exception as e:
            print(f"[{browser_name}] Failed to install to {path}: {e}")

    return installed


def print_windows_instructions(extension_id: str, browser: str):
    """Print installation instructions for Windows."""
    manifest = create_manifest(extension_id)
    browser_info = BROWSER_PATHS.get(browser, {})
    browser_name = BROWSER_NAMES.get(browser, browser)
    registry_key = browser_info.get('win32_registry', '')

    temp_manifest_path = Path(__file__).parent / f"com.contextdrop.host.{browser}.json"

    with open(temp_manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)

    print("\n" + "=" * 60)
    print(f"WINDOWS INSTALLATION INSTRUCTIONS ({browser_name})")
    print("=" * 60)
    print(f"\n1. A manifest file has been created at:")
    print(f"   {temp_manifest_path}")
    print("\n2. Open Registry Editor (regedit)")
    print("\n3. Navigate to or create the key:")
    print(f"   HKCU\\{registry_key}")
    print("\n4. Set the default value of this key to the manifest file path:")
    print(f"   {temp_manifest_path}")
    print(f"\n5. Restart {browser_name}")
    print("\n" + "=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description="Install ContextDrop Native Messaging Host"
    )
    parser.add_argument(
        '--extension-id',
        required=True,
        help='Extension ID (e.g., abcdefghijklmnopqrstuvwxyz123456)'
    )
    parser.add_argument(
        '--browser',
        default='chrome',
        choices=['chrome', 'edge', 'all'],
        help='Target browser: chrome (default), edge, or all'
    )

    args = parser.parse_args()

    browsers = ['chrome', 'edge'] if args.browser == 'all' else [args.browser]

    print(f"Installing ContextDrop Native Host for extension: {args.extension_id}")
    print(f"Native host script: {get_native_host_path()}")
    print()

    for browser in browsers:
        browser_name = BROWSER_NAMES.get(browser, browser)
        print(f"--- {browser_name} ---")

        if sys.platform == 'win32':
            print_windows_instructions(args.extension_id, browser)
        else:
            if not install_linux_macos(args.extension_id, browser):
                print(f"\n{browser_name} installation failed.")
                sys.exit(1)

        print()

    print("Installation complete! Please restart your browser(s) to apply changes.")


if __name__ == '__main__':
    main()
