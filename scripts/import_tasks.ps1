# Lightweight PowerShell script to create GitHub issues from matex_full_task_list.csv
# Requires: a GitHub personal access token with repo scope in GITHUB_TOKEN env var or passed as argument.

param(
  [string]$Token = $env:GITHUB_TOKEN,
  [string]$Owner = "",
  [string]$Repo = "",
  [string]$CsvPath = "matex_full_task_list.csv"
)

if (-not $Token) { Write-Error "GITHUB_TOKEN not set. Provide -Token or set env var."; exit 1 }
if (-not (Test-Path $CsvPath)) { Write-Error "CSV not found at $CsvPath"; exit 1 }

$lines = Get-Content $CsvPath | Where-Object { $_ -match '\S' }
$header = ($lines[0] -split ',(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)') | ForEach-Object { $_.Trim('" ') }

for ($i = 1; $i -lt $lines.Count; $i++) {
  $cols = ($lines[$i] -split ',(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)') | ForEach-Object { $_.Trim('" ') }
  $row = @{}
  for ($j=0; $j -lt $header.Count; $j++) { $row[$header[$j]] = $cols[$j] }

  $taskId = $row['TaskID'] -or $row['Task'] -or ''
  $titleText = $row['Title'] -or 'Untitled task'
  $title = "$taskId - $titleText"

  $bodyParts = @()
  if ($row['Phase']) { $bodyParts += "**Phase:** $($row['Phase'])" }
  if ($row['Branch']) { $bodyParts += "**Suggested branch:** $($row['Branch'])" }
  if ($row['Commit']) { $bodyParts += "**Suggested commit message:** $($row['Commit'])" }
  if ($row['CopilotPrompt']) { $bodyParts += "**CopilotPrompt:**`n`n$($row['CopilotPrompt'])" }
  $body = ($bodyParts -join "`n`n") + "`n`n---`nImported from `matex_full_task_list.csv`."

  $labels = @()
  if ($row['Phase']) { $labels += ($row['Phase'] -replace '\s+','-') }
  if ($taskId) { $labels += $taskId }

  $post = @{ title = $title; body = $body; labels = $labels }
  $json = $post | ConvertTo-Json -Depth 5

  $uri = "https://api.github.com/repos/$Owner/$Repo/issues"
  try {
    $resp = Invoke-RestMethod -Uri $uri -Method Post -Headers @{ Authorization = "token $Token"; "User-Agent" = "matEx-importer" } -Body $json -ContentType 'application/json'
    Write-Host "Created issue: $($resp.number) - $title"
  } catch {
    Write-Error "Failed to create issue: $($_.Exception.Message)"
  }
}
