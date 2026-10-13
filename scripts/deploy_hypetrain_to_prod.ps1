# Deploys @HypeTrain and @HypeTrainSoundFix to production after Workshop upload.
# Usage: edit the $HYPETRAIN_SOUNDFIX_ID below, then run from this machine.

$HYPETRAIN_ID            = '3115714092'
$HYPETRAIN_SOUNDFIX_ID   = '<FILL_IN_AFTER_WORKSHOP_UPLOAD>'

$prod = '\\server\c$\gameservers\dayz'
$updateMods   = "$prod\update_mods.ps1"
$startServer  = "$prod\start_server.bat"

if ($HYPETRAIN_SOUNDFIX_ID -match '<') {
    Write-Error 'Set HYPETRAIN_SOUNDFIX_ID at the top of this script first.'
    exit 1
}

Write-Host '=== Patching update_mods.ps1 (add two new mod entries before ServerInformationPanel) ==='
$ump = Get-Content $updateMods -Raw
$insertBlock = @"
    @{ Id = '$HYPETRAIN_ID'; Name = '@HypeTrain' },
    @{ Id = '$HYPETRAIN_SOUNDFIX_ID'; Name = '@HypeTrainSoundFix' },
    @{ Id = '1680019590'; Name = '@ServerInformationPanel' }
"@
$ump = $ump -replace "    @\{ Id = '1680019590'; Name = '@ServerInformationPanel' \}", $insertBlock
$ump | Set-Content $updateMods -NoNewline
Write-Host '  update_mods.ps1 patched'

Write-Host '=== Patching start_server.bat (add to -mod chain just before @ServerInformationPanel) ==='
$ssb = Get-Content $startServer -Raw
$ssb = $ssb -replace ';@ServerInformationPanel', ';@HypeTrain;@HypeTrainSoundFix;@ServerInformationPanel'
$ssb | Set-Content $startServer -NoNewline
Write-Host '  start_server.bat patched'

Write-Host ''
Write-Host '=== Running update_mods on the server to download both new mods ==='
Write-Host 'NEXT STEP: SSH/PowerShell into the server and run:'
Write-Host '  C:\gameservers\dayz\update_mods.bat'
Write-Host ''
Write-Host '=== After update_mods finishes, restart prod with start_server.bat ==='
Write-Host '(You handle restarting prod yourself per the no-touching-prod-processes rule.)'
