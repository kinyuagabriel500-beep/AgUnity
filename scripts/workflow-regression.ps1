$ErrorActionPreference = 'Stop'

& "$PSScriptRoot\workflow-e2e.ps1"
if ($LASTEXITCODE -ne 0) {
  throw "Workflow regression failed"
}

Write-Output "WORKFLOW_REGRESSION=PASS"
