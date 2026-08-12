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

foreach ($header in @('Content-Security-Policy', 'X-Content-Type-Options', 'Referrer-Policy')) {
  if (-not $response.Headers[$header]) {
    throw "Missing required response header: $header"
  }
}

Write-Output "LifeStreak production smoke passed: $base"
