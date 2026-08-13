[CmdletBinding()]
param(
  [string]$BaseUrl = 'https://jw.cstack67.win/'
)

$ErrorActionPreference = 'Stop'
$uri = $BaseUrl.TrimEnd('/') + '/'
$response = Invoke-WebRequest -Uri $uri -UseBasicParsing -MaximumRedirection 5

if ($response.StatusCode -ne 200) {
  throw "Successor is not ready: expected HTTP 200 from $uri, received $($response.StatusCode)."
}

if ($response.Content -notmatch '<title>') {
  throw "Successor is not ready: $uri did not return an HTML application shell."
}

Write-Output "Successor availability check passed: $uri"
