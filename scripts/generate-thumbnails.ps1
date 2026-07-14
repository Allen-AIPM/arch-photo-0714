$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$imageDir = Join-Path $projectRoot "public\image"
$thumbDir = Join-Path $projectRoot "public\thumbs"
$avatarSource = Join-Path $projectRoot "public\avatar.jpg"
$avatarTarget = Join-Path $projectRoot "public\avatar-small.jpg"

Add-Type -AssemblyName System.Drawing

function New-ResizedJpeg {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Target,
    [Parameter(Mandatory = $true)][int]$MaxSide,
    [int]$Quality = 82
  )

  $directory = Split-Path -Parent $Target
  if (!(Test-Path $directory)) {
    New-Item -ItemType Directory -Path $directory | Out-Null
  }

  $sourceImage = [System.Drawing.Image]::FromFile($Source)
  try {
    $ratio = [Math]::Min($MaxSide / $sourceImage.Width, $MaxSide / $sourceImage.Height)
    if ($ratio -gt 1) { $ratio = 1 }

    $width = [Math]::Max(1, [int][Math]::Round($sourceImage.Width * $ratio))
    $height = [Math]::Max(1, [int][Math]::Round($sourceImage.Height * $ratio))

    $bitmap = New-Object System.Drawing.Bitmap $width, $height
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.Clear([System.Drawing.Color]::White)
        $graphics.DrawImage($sourceImage, 0, 0, $width, $height)
      } finally {
        $graphics.Dispose()
      }

      $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
        Where-Object { $_.MimeType -eq "image/jpeg" } |
        Select-Object -First 1
      $params = New-Object System.Drawing.Imaging.EncoderParameters 1
      $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([int64]$Quality)
      $bitmap.Save($Target, $codec, $params)
      $params.Dispose()
    } finally {
      $bitmap.Dispose()
    }
  } finally {
    $sourceImage.Dispose()
  }
}

if (!(Test-Path $imageDir)) {
  throw "Image folder not found: $imageDir"
}

if (!(Test-Path $thumbDir)) {
  New-Item -ItemType Directory -Path $thumbDir | Out-Null
}

$imageFiles = Get-ChildItem -Path $imageDir -File |
  Where-Object { $_.Extension -match "^\.(jpg|jpeg|png|webp|bmp)$" }

foreach ($file in $imageFiles) {
  $targetName = [System.IO.Path]::GetFileNameWithoutExtension($file.Name) + ".jpg"
  $target = Join-Path $thumbDir $targetName
  New-ResizedJpeg -Source $file.FullName -Target $target -MaxSide 960 -Quality 82
}

if (Test-Path $avatarSource) {
  New-ResizedJpeg -Source $avatarSource -Target $avatarTarget -MaxSide 120 -Quality 84
}

Write-Host "Generated $($imageFiles.Count) thumbnails in public\thumbs"
