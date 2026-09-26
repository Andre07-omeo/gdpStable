# ============================================
# test-localisation.ps1
# Test des 10 APIs de localisation
# ============================================

$BASE = "http://localhost:3000"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  TEST DES APIs LOCALISATION" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# RÉCUPÉRATION AUTOMATIQUE DU TOKEN
# ============================================
Write-Host "🔑 Recherche du token dans les cookies..." -ForegroundColor Yellow
$TOKEN = $null

# Essayer plusieurs chemins de cookies
$cookiePaths = @(
    "$env:USERPROFILE\AppData\Local\Google\Chrome\User Data\Default\Cookies",
    "$env:USERPROFILE\AppData\Local\Microsoft\Edge\User Data\Default\Cookies"
)

Write-Host ""
Write-Host "⚠️  IMPORTANT : Copie ton token manuellement" -ForegroundColor Yellow
Write-Host ""
Write-Host "Comment faire :" -ForegroundColor White
Write-Host "  1. Ouvre http://localhost:3000 dans ton navigateur" -ForegroundColor Gray
Write-Host "  2. Connecte-toi (login)" -ForegroundColor Gray
Write-Host "  3. Appuie sur F12 > onglet 'Application' > Cookies" -ForegroundColor Gray
Write-Host "  4. Cherche 'auth_token' et copie sa valeur" -ForegroundColor Gray
Write-Host ""

$TOKEN = Read-Host "🔑 Colle ton token ici"

if ([string]::IsNullOrWhiteSpace($TOKEN)) {
    Write-Host "❌ Token vide, arrêt du test" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Token récupéré (${($TOKEN.Length)} caractères)" -ForegroundColor Green
Write-Host ""

# ============================================
# HEADERS
# ============================================
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $TOKEN"
    "Cookie" = "auth_token=$TOKEN"
}

# ============================================
# COMPTEURS
# ============================================
$script:OK = 0
$script:FAIL = 0
$script:ERRORS = @()

function Test-Api {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [string]$Body = $null
    )
    
    try {
        $params = @{
            Uri = "$BASE$Url"
            Headers = $headers
            Method = $Method
            ErrorAction = "Stop"
        }
        
        if ($Body) {
            $params.Body = $Body
        }
        
        $response = Invoke-RestMethod @params
        
        $script:OK++
        Write-Host "  ✅ $Name" -ForegroundColor Green -NoNewline
        Write-Host " - $($response.message -replace '.*', '$&')" -ForegroundColor Gray
        
        return $response
    }
    catch {
        $script:FAIL++
        $errMsg = $_.Exception.Message
        $script:ERRORS += "$Name : $errMsg"
        
        Write-Host "  ❌ $Name" -ForegroundColor Red -NoNewline
        Write-Host " - $errMsg" -ForegroundColor DarkRed
        
        return $null
    }
}

# ============================================
# 1. PAYS
# ============================================
Write-Host "=== 1. PAYS ===" -ForegroundColor Magenta

$r = Test-Api -Name "GET  /pays" -Method "GET" -Url "/api/superviseurs/localisation/pays"
if ($r) {
    Write-Host "     → $($r.data.Count) pays trouvés" -ForegroundColor DarkGray
}

$uniqueSuffix = Get-Random -Minimum 1000 -Maximum 9999
$r = Test-Api -Name "POST /pays" -Method "POST" -Url "/api/superviseurs/localisation/pays" `
    -Body (@{ nom = "TestPays_$uniqueSuffix"; code = "TP$uniqueSuffix" } | ConvertTo-Json)
$paysId = if ($r) { $r.data.id_pays } else { $null }
if ($paysId) { Write-Host "     → ID créé : $paysId" -ForegroundColor DarkGray }

# ============================================
# 2. PROVINCES
# ============================================
Write-Host ""
Write-Host "=== 2. PROVINCES ===" -ForegroundColor Magenta

$r = Test-Api -Name "GET  /provinces" -Method "GET" -Url "/api/superviseurs/localisation/provinces"
if ($r) { Write-Host "     → $($r.data.Count) provinces trouvées" -ForegroundColor DarkGray }

$provinceId = $null
if ($paysId) {
    $r = Test-Api -Name "POST /provinces" -Method "POST" -Url "/api/superviseurs/localisation/provinces" `
        -Body (@{ nom = "TestProv_$uniqueSuffix"; code = "TPR$uniqueSuffix"; pays_id = $paysId } | ConvertTo-Json)
    $provinceId = if ($r) { $r.data.id_province } else { $null }
    if ($provinceId) { Write-Host "     → ID créé : $provinceId" -ForegroundColor DarkGray }
}

# ============================================
# 3. DISTRICTS
# ============================================
Write-Host ""
Write-Host "=== 3. DISTRICTS ===" -ForegroundColor Magenta

$r = Test-Api -Name "GET  /districts" -Method "GET" -Url "/api/superviseurs/localisation/districts"
if ($r) { Write-Host "     → $($r.data.Count) districts trouvés" -ForegroundColor DarkGray }

$districtId = $null
if ($provinceId) {
    $r = Test-Api -Name "POST /districts" -Method "POST" -Url "/api/superviseurs/localisation/districts" `
        -Body (@{ nom = "TestDist_$uniqueSuffix"; code = "TD$uniqueSuffix"; province_id = $provinceId } | ConvertTo-Json)
    $districtId = if ($r) { $r.data.id_district } else { $null }
    if ($districtId) { Write-Host "     → ID créé : $districtId" -ForegroundColor DarkGray }
}

# ============================================
# 4. VILLES
# ============================================
Write-Host ""
Write-Host "=== 4. VILLES ===" -ForegroundColor Magenta

$r = Test-Api -Name "GET  /villes" -Method "GET" -Url "/api/superviseurs/localisation/villes"
if ($r) { Write-Host "     → $($r.data.Count) villes trouvées" -ForegroundColor DarkGray }

$villeId = $null
if ($provinceId) {
    $r = Test-Api -Name "POST /villes" -Method "POST" -Url "/api/superviseurs/localisation/villes" `
        -Body (@{ nom = "TestVille_$uniqueSuffix"; code = "TV$uniqueSuffix"; province_id = $provinceId } | ConvertTo-Json)
    $villeId = if ($r) { $r.data.id_ville } else { $null }
    if ($villeId) { Write-Host "     → ID créé : $villeId" -ForegroundColor DarkGray }
}

# ============================================
# 5. COMMUNES
# ============================================
Write-Host ""
Write-Host "=== 5. COMMUNES ===" -ForegroundColor Magenta

$r = Test-Api -Name "GET  /communes" -Method "GET" -Url "/api/superviseurs/localisation/communes"
if ($r) { Write-Host "     → $($r.data.Count) communes trouvées" -ForegroundColor DarkGray }

$communeId = $null
if ($villeId) {
    $r = Test-Api -Name "POST /communes" -Method "POST" -Url "/api/superviseurs/localisation/communes" `
        -Body (@{ nom = "TestCom_$uniqueSuffix"; code = "TC$uniqueSuffix"; ville_id = $villeId; district_id = $districtId } | ConvertTo-Json)
    $communeId = if ($r) { $r.data.id_commune } else { $null }
    if ($communeId) { Write-Host "     → ID créé : $communeId" -ForegroundColor DarkGray }
}

# ============================================
# 6. GET par ID
# ============================================
Write-Host ""
Write-Host "=== 6. GET par ID ===" -ForegroundColor Magenta

if ($paysId) {
    $r = Test-Api -Name "GET  /pays/$paysId" -Method "GET" -Url "/api/superviseurs/localisation/pays/$paysId"
}
if ($provinceId) {
    $r = Test-Api -Name "GET  /provinces/$provinceId" -Method "GET" -Url "/api/superviseurs/localisation/provinces/$provinceId"
}
if ($districtId) {
    $r = Test-Api -Name "GET  /districts/$districtId" -Method "GET" -Url "/api/superviseurs/localisation/districts/$districtId"
}
if ($villeId) {
    $r = Test-Api -Name "GET  /villes/$villeId" -Method "GET" -Url "/api/superviseurs/localisation/villes/$villeId"
}
if ($communeId) {
    $r = Test-Api -Name "GET  /communes/$communeId" -Method "GET" -Url "/api/superviseurs/localisation/communes/$communeId"
}

# ============================================
# 7. PUT
# ============================================
Write-Host ""
Write-Host "=== 7. PUT (modification) ===" -ForegroundColor Magenta

if ($paysId) {
    $r = Test-Api -Name "PUT  /pays/$paysId" -Method "PUT" -Url "/api/superviseurs/localisation/pays/$paysId" `
        -Body (@{ nom = "Modified_$uniqueSuffix"; code = "M$uniqueSuffix" } | ConvertTo-Json)
}
if ($communeId) {
    $r = Test-Api -Name "PUT  /communes/$communeId" -Method "PUT" -Url "/api/superviseurs/localisation/communes/$communeId" `
        -Body (@{ nom = "ModifiedCom_$uniqueSuffix"; code = "MC$uniqueSuffix"; ville_id = $villeId; district_id = $districtId } | ConvertTo-Json)
}

# ============================================
# 8. DELETE (ordre inverse)
# ============================================
Write-Host ""
Write-Host "=== 8. DELETE (nettoyage) ===" -ForegroundColor Magenta

if ($communeId) {
    $r = Test-Api -Name "DELETE /communes/$communeId" -Method "DELETE" -Url "/api/superviseurs/localisation/communes/$communeId"
}
if ($villeId) {
    $r = Test-Api -Name "DELETE /villes/$villeId" -Method "DELETE" -Url "/api/superviseurs/localisation/villes/$villeId"
}
if ($districtId) {
    $r = Test-Api -Name "DELETE /districts/$districtId" -Method "DELETE" -Url "/api/superviseurs/localisation/districts/$districtId"
}
if ($provinceId) {
    $r = Test-Api -Name "DELETE /provinces/$provinceId" -Method "DELETE" -Url "/api/superviseurs/localisation/provinces/$provinceId"
}
if ($paysId) {
    $r = Test-Api -Name "DELETE /pays/$paysId" -Method "DELETE" -Url "/api/superviseurs/localisation/pays/$paysId"
}

# ============================================
# RÉSUMÉ FINAL
# ============================================
Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  📊 RÉSULTATS : $script:OK ✅  |  $script:FAIL ❌" -ForegroundColor $(if ($script:FAIL -eq 0) { "Green" } else { "Yellow" })
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan

if ($script:FAIL -gt 0) {
    Write-Host ""
    Write-Host "❌ Détail des erreurs :" -ForegroundColor Red
    foreach ($err in $script:ERRORS) {
        Write-Host "  - $err" -ForegroundColor DarkRed
    }
}

Write-Host ""
Write-Host "Appuie sur une touche pour fermer..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")