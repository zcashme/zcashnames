param(
  [string]$WorkerUrl = "http://localhost:3000/api/campaign-worker",
  [int]$SleepSeconds = 2,
  [switch]$ContinueOnFailedBatch
)

$ErrorActionPreference = "Stop"

Write-Host "Starting campaign worker loop against $WorkerUrl"
Write-Host "Press Ctrl+C to stop."

while ($true) {
  try {
    $result = Invoke-RestMethod -Method Post -Uri $WorkerUrl
  }
  catch {
    Write-Error "Worker request failed: $($_.Exception.Message)"
    exit 1
  }

  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Write-Host "[$timestamp] $($result | ConvertTo-Json -Depth 6 -Compress)"

  if (-not $result.ok) {
    Write-Error "Worker returned ok=false. Stopping."
    exit 1
  }

  if (-not $result.processed) {
    Write-Host "No eligible batch was processed. Stopping."
    exit 0
  }

  if ($result.status -eq "failed" -and -not $ContinueOnFailedBatch) {
    Write-Error "A batch was processed with status=failed. Stopping."
    exit 1
  }

  Start-Sleep -Seconds $SleepSeconds
}
