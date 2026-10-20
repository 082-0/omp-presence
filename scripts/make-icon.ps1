Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$bitmap = [System.Drawing.Bitmap]::new(256, 256)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#211844'))
$violet = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#b99aff'))
$blue = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#7eb4ff'))
$dark = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#211844'))
try {
  # OMP's pi-and-plug mark, with the companion app's purple and blue colors.
  $graphics.FillRectangle($violet, 25, 37, 206, 25)
  $graphics.FillRectangle($violet, 56, 62, 25, 164)
  $graphics.FillRectangle($violet, 159, 62, 25, 116)
  $graphics.FillRectangle($blue, 151, 157, 42, 34)
  $graphics.FillRectangle($dark, 163, 168, 6, 15)
  $graphics.FillRectangle($dark, 175, 168, 6, 15)
  $graphics.FillEllipse($blue, 37, 46, 9, 9)
  $graphics.FillEllipse($blue, 211, 46, 9, 9)
  $pngPath = Join-Path $root 'assets/omp.png'
  $icoPath = Join-Path $root 'assets/omp.ico'
  $bitmap.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $png = [System.IO.File]::ReadAllBytes($pngPath)
  $stream = [System.IO.File]::Create($icoPath)
  $writer = [System.IO.BinaryWriter]::new($stream)
  try {
    $writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]1)
    $writer.Write([byte]0); $writer.Write([byte]0); $writer.Write([byte]0); $writer.Write([byte]0)
    $writer.Write([uint16]1); $writer.Write([uint16]32)
    $writer.Write([uint32]$png.Length); $writer.Write([uint32]22)
    $writer.Write($png)
  } finally { $writer.Dispose() }
} finally {
  $graphics.Dispose(); $bitmap.Dispose(); $violet.Dispose(); $blue.Dispose(); $dark.Dispose()
}
