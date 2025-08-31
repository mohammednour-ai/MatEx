# Dispatch import_tasks.yml workflow and list created issues.
# Requires GITHUB_TOKEN in environment with repo+workflow scope.

$token = $env:GITHUB_TOKEN
if (-not $token -or $token.Trim().Length -eq 0) {
    Write-Error "GITHUB_TOKEN not set in environment. Set it using: $env:GITHUB_TOKEN = '<PAT>'"
    exit 1
}

$owner = 'mohammednour-ai'
$repo = 'MatEx'
$workflow = 'import_tasks.yml'
$headers = @{ Authorization = "token $token"; 'User-Agent' = 'matEx-dispatch' }

try {
    # Dispatch workflow
    Write-Output "Dispatching workflow $workflow on $owner/$repo (ref: main)..."
    Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/actions/workflows/$workflow/dispatches" -Method Post -Headers $headers -Body (ConvertTo-Json @{ ref = 'main' }) -ErrorAction Stop
    Write-Output "Dispatched. Waiting for run to appear..."
} catch {
    Write-Error "Failed to dispatch workflow: $($_.Exception.Message)"
    exit 2
}

# Wait for the run to appear
$run = $null
$runsUrl = "https://api.github.com/repos/$owner/$repo/actions/workflows/$workflow/runs?per_page=10"
for ($i=0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    $resp = Invoke-RestMethod -Uri $runsUrl -Headers $headers -ErrorAction SilentlyContinue
    if ($resp -and $resp.workflow_runs -and $resp.workflow_runs.Count -gt 0) {
        $run = $resp.workflow_runs | Select-Object -First 1
        break
    }
}

if (-not $run) { Write-Error 'No workflow run found after dispatch.'; exit 3 }
Write-Output "Found run id: $($run.id) status: $($run.status) created_at: $($run.created_at)"

# Poll until completion (max ~5 minutes)
$runId = $run.id
for ($j=0; $j -lt 75; $j++) {
    Start-Sleep -Seconds 4
    $detail = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/actions/runs/$runId" -Headers $headers -ErrorAction SilentlyContinue
    if (-not $detail) { continue }
    $wr = $detail.workflow_run
    Write-Output "status=$($wr.status) conclusion=$($wr.conclusion) updated_at=$($wr.updated_at)"
    if ($wr.status -eq 'completed') { break }
}

if ($wr.status -ne 'completed') { Write-Error 'Workflow did not complete in time'; exit 4 }
Write-Output "Workflow completed with conclusion: $($wr.conclusion)"

# Fetch issues created
$issues = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/issues?per_page=500" -Headers $headers -ErrorAction Stop
if ($issues -and $issues.Count -gt 0) {
    $issues | Select-Object number,title | ConvertTo-Json -Depth 4
} else {
    Write-Output 'No issues returned.'
}
