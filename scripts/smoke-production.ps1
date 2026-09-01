[CmdletBinding()]
param(
  [string]$BaseUrl = 'https://lifestreak.ashbi.ca'
)

$ErrorActionPreference = 'Stop'
$base = $BaseUrl.TrimEnd('/')

$response = Invoke-WebRequest -Uri "$base/" -UseBasicParsing
if ($response.StatusCode -ne 200) {
  throw "Expected HTTP 200 from $base/, received $($response.StatusCode)."
}

if ($response.Content -notmatch '<title>LifeStreak</title>') {
  throw 'The production document does not contain the LifeStreak title.'
}

$manifest = Invoke-RestMethod -Uri "$base/manifest.webmanifest"
if ($manifest.name -ne 'LifeStreak') {
  throw "Expected manifest name LifeStreak, received '$($manifest.name)'."
}

$version = Invoke-RestMethod -Uri "$base/version.json"
if ($version.app -ne 'LifeStreak' -or $version.revision -notmatch '^[0-9a-f]{40}$') {
  throw "Invalid or unidentified deployed revision: $($version | ConvertTo-Json -Compress)"
}

$worker = Invoke-WebRequest -Uri "$base/sw.js" -UseBasicParsing
if ($worker.Content -notmatch 'SKIP_WAITING') {
  throw 'The deployed service worker does not expose the approved update protocol.'
}

foreach ($header in @('Content-Security-Policy', 'X-Content-Type-Options', 'Referrer-Policy')) {
  if (-not $response.Headers[$header]) {
    throw "Missing required response header: $header"
  }
}

Write-Output "LifeStreak production smoke passed: $base revision $($version.revision)"
