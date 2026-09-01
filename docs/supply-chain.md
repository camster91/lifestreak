# LifeStreak supply-chain policy

## Immutable inputs and least privilege

Every third-party GitHub Action is pinned to a reviewed 40-character commit SHA with its readable release tag in a comment. Every Docker base is pinned to a multi-architecture manifest digest while retaining the readable tag. `npm run supply-chain:check` fails when either contract drifts, when a workflow lacks a read-only default token, when `pull_request_target` or named secrets appear in a pull-request workflow, when Dependabot loses npm/Actions/Docker coverage, or when release provenance is removed.

Write permissions are declared only on the job that publishes packages/attestations, signs native artifacts, or manages sanitized synthetic incidents. Signing workflows run only for protected `v*` tags or manual dispatch through the `production` environment. The container publisher runs only on trusted main/master pushes, tags, or explicitly trusted reusable-workflow callers. Fork pull requests receive read-only tokens and no package, environment, signing, deployment, or store credential path.

GitHub Code Scanning is not enabled for this private repository, so a CodeQL workflow cannot upload results and is not treated as a working gate. The supported source-security gates are the high-severity npm advisory check, pinned Trivy source scan, repository supply-chain contract, and GitGuardian; published image digests receive a separate pinned Trivy vulnerability/secret/misconfiguration scan. Reintroduce CodeQL only after the repository has an eligible Code Scanning entitlement and a successful upload is verified.

## Update and release gates

Dependabot opens weekly npm, GitHub Actions, and Docker updates. Representative updates must pass formatting, type checking, lint, unit tests, production build, product identity, permissions, signing contract, immutable-input enforcement, license review, `npm audit`, Trivy filesystem scanning, Android debug compilation, and unsigned iOS compilation where runners are available. Release workflows repeat the relevant gates after protected secrets become available.

Container publication attaches BuildKit SBOM and provenance to the immutable image digest. The published image is then scanned by digest. Native release archives retain checksums, source/version/build/runner metadata, GitHub provenance attestations, and 30-day artifacts as documented in the signing runbooks.

## Advisory and license triage

- High or critical npm advisories and Trivy findings fail CI/release when a fix exists. Critical issues target acknowledgement within one business day and remediation or release suspension within three days; high issues target acknowledgement within three business days and remediation within fourteen days.
- The package-lock license inventory is allowlisted in `scripts/check-supply-chain.mjs`. A missing or new license expression fails the contract and requires review. Copyleft runtime obligations must be documented before adding the dependency.
- No silent exceptions are allowed. A temporary advisory waiver must identify the package/advisory, affected version and surface, compensating control, owner, tracking issue, approval date, and expiry no later than 30 days. The hard gate may change only in the same reviewed change that records the waiver; expiry restores the block automatically. There are currently no waivers.
- Triage records must not contain LifeStreak user content or credentials. Security-sensitive dependency findings belong in a private GitHub security advisory until disclosure is safe.

## Verification still requiring hosted infrastructure

Before closing #80, exercise a Dependabot npm update, action SHA update, and Docker digest update through the full hosted matrix; verify a fork PR cannot read protected secrets; inject a known test advisory and confirm the gate blocks; then trace one web image and one native archive from source revision through checksum/SBOM/provenance to the retained artifact.
