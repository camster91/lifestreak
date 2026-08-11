#!/bin/bash
# Android Release Keystore Generator
# Passwords are prompted (or read from env) — never hardcoded.

set -euo pipefail

KEYSTORE_FILE="${KEYSTORE_FILE:-lifestreak-release.keystore}"
KEY_ALIAS="${KEY_ALIAS:-lifestreak}"
VALIDITY_DAYS="${VALIDITY_DAYS:-10000}"

echo "=================================="
echo "Android Release Keystore Generator"
echo "=================================="
echo ""
echo "This will create a release keystore for Google Play submission."
echo "IMPORTANT: Save these credentials securely - you cannot recover them!"
echo ""

if [ -f "$KEYSTORE_FILE" ]; then
    echo "⚠️  Keystore already exists: $KEYSTORE_FILE"
    read -r -p "Overwrite? (y/N): " confirm
    if [[ $confirm != [yY] ]]; then
        echo "Aborted."
        exit 1
    fi
fi

if [ -z "${KEYSTORE_PASSWORD:-}" ]; then
    read -r -s -p "Keystore password: " KEYSTORE_PASSWORD
    echo ""
    read -r -s -p "Confirm keystore password: " KEYSTORE_PASSWORD_CONFIRM
    echo ""
    if [ "$KEYSTORE_PASSWORD" != "$KEYSTORE_PASSWORD_CONFIRM" ]; then
        echo "Passwords do not match."
        exit 1
    fi
fi

if [ -z "${KEY_PASSWORD:-}" ]; then
    read -r -s -p "Key password (Enter to reuse keystore password): " KEY_PASSWORD
    echo ""
    if [ -z "$KEY_PASSWORD" ]; then
        KEY_PASSWORD="$KEYSTORE_PASSWORD"
    fi
fi

if [ ${#KEYSTORE_PASSWORD} -lt 8 ] || [ ${#KEY_PASSWORD} -lt 8 ]; then
    echo "Passwords must be at least 8 characters."
    exit 1
fi

echo "Generating keystore..."
keytool -genkey -v \
    -keystore "$KEYSTORE_FILE" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity "$VALIDITY_DAYS" \
    -storepass "$KEYSTORE_PASSWORD" \
    -keypass "$KEY_PASSWORD" \
    -dname "CN=LifeStreak, OU=Ashbi, O=Ashbi, L=Toronto, ST=ON, C=CA"

echo ""
echo "✅ Keystore created: $KEYSTORE_FILE"
echo ""
echo "=================================="
echo "Next steps (do NOT echo passwords to shell history logs):"
echo "=================================="
echo "1. Move $KEYSTORE_FILE to android/app/"
echo "2. Copy android/keystore.properties.example → android/keystore.properties"
echo "3. Set KEYSTORE_PASSWORD / KEY_PASSWORD env vars (preferred) or fill keystore.properties"
echo "4. Build signed release: cd android && ./gradlew bundleRelease"
echo "=================================="
