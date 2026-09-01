#!/bin/bash

set -euo pipefail

: "${KEYSTORE_FILE:?Set KEYSTORE_FILE to the external LifeStreak keystore path.}"
: "${KEYSTORE_PASSWORD:?Set KEYSTORE_PASSWORD.}"
: "${KEY_ALIAS:?Set KEY_ALIAS.}"
: "${EXPECTED_CERT_SHA256:?Set EXPECTED_CERT_SHA256 to the Play-approved certificate fingerprint.}"

if [[ ! -f "$KEYSTORE_FILE" ]]; then
  echo "Keystore does not exist: $KEYSTORE_FILE" >&2
  exit 1
fi

if ! command -v keytool >/dev/null 2>&1; then
  echo "keytool is required to inspect the release certificate." >&2
  exit 1
fi

actual_fingerprint="$({
  keytool -list -v \
    -keystore "$KEYSTORE_FILE" \
    -storepass "$KEYSTORE_PASSWORD" \
    -alias "$KEY_ALIAS"
} | awk -F': ' '/SHA256:/{print $2; exit}' | tr -d ':' | tr '[:lower:]' '[:upper:]')"

expected_fingerprint="$(printf '%s' "$EXPECTED_CERT_SHA256" | tr -d ':' | tr '[:lower:]' '[:upper:]')"

if [[ -z "$actual_fingerprint" ]]; then
  echo "Could not read a SHA-256 certificate fingerprint for alias $KEY_ALIAS." >&2
  exit 1
fi

if [[ "$actual_fingerprint" != "$expected_fingerprint" ]]; then
  echo "Release certificate fingerprint does not match the approved Play identity." >&2
  exit 1
fi

echo "Android release certificate fingerprint verified for alias $KEY_ALIAS."
