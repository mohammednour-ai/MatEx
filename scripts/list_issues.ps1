# List issues for the repo using $env:GITHUB_TOKEN
$token = $env:GITHUB_TOKEN
if (-not $token -or $token.Trim().Length -eq 0) {
    Write-Error "GITHUB_TOKEN not set in environment. Set it using: $env:GITHUB_TOKEN = '<PAT>'"
    exit 1
}
$owner = 'mohammednour-ai'
$repo = 'MatEx'
$headers = @{ Authorization = "token $token"; 'User-Agent' = 'matEx-check' }
try {
    $issues = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/issues?per_page=500" -Headers $headers -ErrorAction Stop
    if ($issues -and $issues.Count -gt 0) {
        $issues | Select-Object number,title | ConvertTo-Json -Depth 4
    } else {
        Write-Output 'No issues found.'
    }
} catch {
    Write-Error "Failed to list issues: $($_.Exception.Message)"
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
        Write-Error "HTTP status: $($_.Exception.Response.StatusCode.Value__)"
    }
    exit 2
}
