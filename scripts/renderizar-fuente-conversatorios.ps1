param([Parameter(Mandatory=$true)][string]$Documento,[Parameter(Mandatory=$true)][string]$Destino,[Parameter(Mandatory=$true)][int]$Pagina)
$ErrorActionPreference='Stop'
$aplicacionFuente=$null
$presentacionFuente=$null
try {
  # La fuente identifica la parte slideN.xml; no siempre coincide con el orden
  # visual cuando el documento original ha eliminado o reordenado páginas.
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $paqueteFuente=[IO.Compression.ZipFile]::OpenRead($Documento)
  try {
    $lectorFuente=[IO.StreamReader]::new($paqueteFuente.GetEntry('ppt/presentation.xml').Open())
    try{[xml]$ordenFuente=$lectorFuente.ReadToEnd()}finally{$lectorFuente.Dispose()}
    $lectorFuente=[IO.StreamReader]::new($paqueteFuente.GetEntry('ppt/_rels/presentation.xml.rels').Open())
    try{[xml]$relacionesFuente=$lectorFuente.ReadToEnd()}finally{$lectorFuente.Dispose()}
    $relacionFuente=$relacionesFuente.Relationships.Relationship | Where-Object { $_.Target -match ('(^|/)slide'+$Pagina+'\.xml$') }
    if($null -eq $relacionFuente){throw 'Pagina no encontrada en la fuente'}
    $indiceFuente=0
    $posicionFuente=0
    foreach($nodoFuente in $ordenFuente.SelectNodes("//*[local-name()='sldId']")){
      $posicionFuente++
      if($nodoFuente.GetAttribute('id','http://schemas.openxmlformats.org/officeDocument/2006/relationships') -eq $relacionFuente.Id){$indiceFuente=$posicionFuente;break}
    }
    if($indiceFuente -eq 0){throw 'Referencia sin pagina visible'}
  }finally{$paqueteFuente.Dispose()}
  $aplicacionFuente=New-Object -ComObject PowerPoint.Application
  $presentacionFuente=$aplicacionFuente.Presentations.Open($Documento,-1,0,0)
  if($indiceFuente -gt $presentacionFuente.Slides.Count){throw 'Pagina fuera del documento'}
  $altoFuente=[int][Math]::Round(1800*$presentacionFuente.PageSetup.SlideHeight/$presentacionFuente.PageSetup.SlideWidth)
  $presentacionFuente.Slides.Item($indiceFuente).Export($Destino,'PNG',1800,$altoFuente)
  if(-not(Test-Path -LiteralPath $Destino)){throw 'No se genero la imagen'}
} finally {
  if($null -ne $presentacionFuente){$presentacionFuente.Close();[void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($presentacionFuente)}
  if($null -ne $aplicacionFuente){
    if($aplicacionFuente.Presentations.Count -eq 0){$aplicacionFuente.Quit()}
    [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($aplicacionFuente)
  }
}
