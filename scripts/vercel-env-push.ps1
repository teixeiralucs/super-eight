# Envia as variáveis do .env local para o projeto na Vercel (Production e Preview),
# sem imprimir nenhum valor. Rode na raiz do projeto, depois de `vercel link`:
#
#   powershell -ExecutionPolicy Bypass -File scripts/vercel-env-push.ps1
#
# Só sobem as variáveis que a aplicação usa em produção (earlySetup.md §7.3).
# DIRECT_URL (só para migrações locais) e DEV_LOGIN_EMAIL (só dev) ficam de fora.

$ErrorActionPreference = 'Stop'

# Usa o Node 24 do fnm direto (o CLI da Vercel não aceita Node 26, e alguns terminais
# deste PC não acham o `vercel` no PATH). Sem fnm, cai no `vercel` do PATH.
$node24 = Join-Path $env:APPDATA 'fnm
ode-versions24.21.0\installation'
$vc = Join-Path $node24 'node_modulesercel\distc.js'
function Invoke-Vercel {
	if (Test-Path $vc) { & (Join-Path $node24 'node.exe') $vc @args }
	else { & vercel @args }
}

$public = @('PUBLIC_SUPABASE_URL', 'PUBLIC_SUPABASE_ANON_KEY')
$secret = @('DATABASE_URL', 'TMDB_READ_ACCESS_TOKEN', 'CRON_SECRET')
$targets = @('production', 'preview')

if (-not (Test-Path '.env')) { throw 'Arquivo .env não encontrado na pasta atual.' }
if (-not (Test-Path '.vercel/project.json')) { throw 'Projeto não está ligado à Vercel. Rode `vercel link` antes.' }

# KEY=valor (aspas opcionais); ignora comentários e linhas vazias.
$values = @{}
foreach ($line in Get-Content '.env' -Encoding UTF8) {
	if ($line -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$') {
		$value = $Matches[2].Trim()
		if ($value.Length -ge 2 -and (($value[0] -eq '"' -and $value[-1] -eq '"') -or ($value[0] -eq "'" -and $value[-1] -eq "'"))) {
			$value = $value.Substring(1, $value.Length - 2)
		}
		$values[$Matches[1]] = $value
	}
}

$missing = ($public + $secret) | Where-Object { -not $values[$_] }
if ($missing) { throw "Sem valor no .env: $($missing -join ', ')" }

foreach ($name in $public + $secret) {
	$kind = if ($secret -contains $name) { '--sensitive' } else { '--no-sensitive' }
	foreach ($target in $targets) {
		Invoke-Vercel env add $name $target --value $values[$name] --force $kind --yes *> $null
		if ($LASTEXITCODE -ne 0) { throw "Falhou ao enviar $name ($target)." }
		Write-Host "ok  $name  ($target)"
	}
}
Write-Host ''
Write-Host 'Pronto. As variaveis foram enviadas (nenhum valor foi exibido).'
