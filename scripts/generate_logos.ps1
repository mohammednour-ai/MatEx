# Generate resized logo PNGs and favicon.ico from public/matex_logo.png
# Uses .NET System.Drawing (works on Windows PowerShell)

Param(
    [int[]]$sizes = @(32,64,128,256,512),
    [string]$src = "public/matex_logo.png",
    [string]$outDir = "public/icons",
    [string]$favicon = "public/favicon.ico"
)

if (-not (Test-Path $src)) {
    Write-Error "Source logo not found at $src"
    exit 1
}

if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

Add-Type -AssemblyName System.Drawing

try {
    $img = [System.Drawing.Image]::FromFile((Resolve-Path $src))
} catch {
    Write-Error "Failed to load image: $($_.Exception.Message)"
    exit 2
}

foreach ($s in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap $s, $s
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, $s, $s)
    $out = Join-Path $outDir "logo-${s}.png"
    $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Wrote $out"
}

# Create favicon.ico from the largest generated size (or from source if necessary)
$icoSource = Join-Path $outDir "logo-64.png"
if (-not (Test-Path $icoSource)) { $icoSource = (Resolve-Path $src) }
$bmpIco = [System.Drawing.Bitmap]::FromFile((Resolve-Path $icoSource))
$hicon = $bmpIco.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hicon)
$fs = New-Object System.IO.FileStream((Resolve-Path $favicon), [System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()
[System.Runtime.InteropServices.Marshal]::DestroyIcon($hicon)
$bmpIco.Dispose()
Write-Output "Wrote $favicon"

$img.Dispose()

Write-Output 'All logo assets generated.'
