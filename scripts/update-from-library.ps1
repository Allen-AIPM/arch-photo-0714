$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$libraryRoot = Split-Path -Parent $projectRoot
$sourceImageDir = Join-Path $libraryRoot "image"
$sourceData = Join-Path $libraryRoot "data.js"
$targetImageDir = Join-Path $projectRoot "public\image"
$targetData = Join-Path $projectRoot "public\data.js"

if (!(Test-Path $sourceImageDir)) {
  throw "Source image folder not found: $sourceImageDir"
}

if (!(Test-Path $sourceData)) {
  throw "Source data.js not found: $sourceData"
}

if (!(Test-Path $targetImageDir)) {
  New-Item -ItemType Directory -Path $targetImageDir | Out-Null
}

Copy-Item -Path (Join-Path $sourceImageDir "*") -Destination $targetImageDir -Recurse -Force
Copy-Item -LiteralPath $sourceData -Destination $targetData -Force

python (Join-Path $projectRoot "scripts\prune-missing-data.py")
python (Join-Path $projectRoot "scripts\generate-thumbnails.py")
Write-Host "Library data and thumbnails updated."
