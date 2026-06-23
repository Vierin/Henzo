# Creates Play upload keystore. Run once from repo root or apps/mobile/android.
# After creation: copy key.properties.example → key.properties and set passwords.

$ErrorActionPreference = "Stop"
$appDir = Join-Path $PSScriptRoot ".." "app"
$keystore = Join-Path $appDir "upload-keystore.jks"

if (Test-Path $keystore) {
    Write-Host "Keystore already exists: $keystore"
    exit 0
}

$keytool = Get-Command keytool -ErrorAction SilentlyContinue
if (-not $keytool) {
    Write-Error "keytool not found. Install JDK and add to PATH."
}

Write-Host "Creating upload keystore (you will be prompted for passwords)..."
& keytool -genkeypair -v `
    -storetype PKCS12 `
    -keystore $keystore `
    -alias upload `
    -keyalg RSA `
    -keysize 2048 `
    -validity 10000 `
    -dname "CN=Henzo, OU=Mobile, O=Henzo, L=Unknown, ST=Unknown, C=VN"

Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Copy android/key.properties.example → android/key.properties"
Write-Host "  2. Set storePassword / keyPassword to match keytool prompts"
Write-Host "  3. Register SHA-1: keytool -list -v -keystore $keystore -alias upload"
Write-Host "  4. Add SHA-1 to Firebase (com.henzo.mobile) and Google OAuth Android client"
