# LifeStreak on Coolify

This migrates hosting for the existing independent LifeStreak PWA. Preserve
`https://lifestreak.ashbi.ca` and its local browser records. Do not redirect to JW
Companion, clear localStorage/IndexedDB, or access real user habit data.

## Private candidate

Use a raw Compose application with `deploy/coolify.yml`, a free private loopback
port (default 13100), and `LIFESTREAK_IMAGE` set to an independently verified
immutable image digest already present on the VPS. Use the existing Dockerfile
and CI image publication process after their required source gates pass; do not
substitute an old image for an updated GitHub revision.

The configuration refuses implicit pulls/builds. It serves image-contained
static files as NGINX UID/GID 101, with read-only files and owned ephemeral
runtime directories. Verify this identity for the selected image. No server
database, persistent volume or outbound server network is introduced. Browser
network features retain the app's existing policy; no provider test is automatic.

## Backup guard

Attach `bash deploy/helper-before-deploy.sh <application-uuid> backup` as the
before-deployment command for an image-only candidate. Qualify the command in
the actual Coolify helper before promotion. It uses the already-installed exact
helper image, host Docker socket, private recovery directory and maintenance
lock. Only preceding static files/config/image are inspected; no browser data.

Before first attachment, verify the private `/opt/retired-deployments` and
`/run/ashbi-docker-capacity` directories exist with approved ownership/mode. The
wrapper's temporary helper shares the host lock, has no network, checks for one
matching Compose `app` container, and otherwise uses the known original
LifeStreak container. Any unexpected mounts or inconsistent file hashes block
the rollout. It verifies restored file hashes and retains identical preceding
image filesystem layers. Recovery files remain private on the server.

`build` mode additionally enforces the existing below-80-percent disk policy.
Do not authorize a source build by selecting `backup` mode. At 82 percent usage,
CI-built immutable images are the preferred release route.

## Release and main auto-deploy

Existing CI Build and Build and Push Image workflows are manually disabled;
activation approval is pending. Do not create replacement workflows to bypass
this gate. This deployment branch updates compatible dependencies and replaces
the development-only glob-matching proxy wrapper with its existing HTTP proxy
engine. Local HTTP/body/WebSocket/error fixtures qualify that replacement; the
updated lockfile must continue passing the existing high-severity audit gate.

After source checks and immutable publication pass, provision/verify the image
on the VPS, set its expected digest, and qualify actual guard attachment and
candidate startup. Verify `/version.json` matches the accepted commit and check
all built public assets, SPA deep links, service-worker policy and security
headers. Browser/offline and previous-version local-data compatibility need
synthetic acceptance tests separately from static HTTP checks.

Wire the accepted main image-publication event to exactly one signed Coolify
deployment of the expected digest, preserving fresh pre-deploy recovery. Record
the event, deployment job, running image and `/version.json` revision. This
pipeline is still pending; an enabled toggle is not proof of automatic updates.

The original shared Traefik route uses loopback 18100. Obtain approval for the
exact route diff before changing it. Verify original-domain HTTPS and app
behavior, then retain the preceding deployment through the observation window
and real main deployment proof before retirement.

## Rollback

Keep the verified preceding static archive, NGINX configuration, image and route
backup. Restore hosting on the same origin using the approved route rollback.
Do not roll back or clear browser records; prove that a preceding app safely
leaves newer/unknown records untouched. Never delete Docker volumes.
