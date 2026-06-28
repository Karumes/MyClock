@echo off
cd /d "%~dp0"
:: セキュリティによる実行制限をバイパスして、上記のPowerShellスクリプトを実行します
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0register-screensaver.ps1"
pause