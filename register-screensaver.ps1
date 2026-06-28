# 1. Admin check
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "This script must be run as Administrator."
    Exit
}

Write-Host "Searching for compiler..."
$csc = $null
$paths = @(
    "$env:SystemRoot\Microsoft.NET\Framework64\v4.0.30319\csc.exe",
    "$env:SystemRoot\Microsoft.NET\Framework\v4.0.30319\csc.exe"
)
foreach ($p in $paths) {
    if (Test-Path $p) {
        $csc = $p
        break
    }
}

if ($null -eq $csc) {
    Write-Error "C# compiler not found on this system."
    Exit
}

Write-Host "Generating launcher code..."
$code = @'
using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

class Program {
    static void Main(string[] args) {
        string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        string[] paths = new string[] {
            Path.Combine(localAppData, @"Programs\KarumesClock\KarumesClock.exe"),
            Path.Combine(localAppData, @"Programs\karumes-clock\KarumesClock.exe"),
            Path.Combine(localAppData, @"Programs\myclock\KarumesClock.exe"),
            Path.Combine(localAppData, @"Programs\myclock\myclock.exe")
        };
        string appPath = "";
        foreach (var p in paths) {
            if (File.Exists(p)) {
                appPath = p;
                break;
            }
        }
        if (string.IsNullOrEmpty(appPath)) {
            MessageBox.Show("Karumes Clock is not installed. Please run the standard installer first.", "Screensaver Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return;
        }
        string arguments = "";
        if (args.Length > 0) {
            string arg = args[0].ToLower();
            if (arg.StartsWith("/s")) {
                arguments = "/s";
            } else if (arg.StartsWith("/c")) {
                arguments = "/c";
            } else if (arg.StartsWith("/p")) {
                return;
            }
        } else {
            arguments = "/c";
        }
        ProcessStartInfo startInfo = new ProcessStartInfo();
        startInfo.FileName = appPath;
        startInfo.Arguments = arguments;
        try {
            Process.Start(startInfo);
        } catch (Exception ex) {
            MessageBox.Show("Failed to launch: " + ex.Message);
        }
    }
}
'@

$tempCs = "$env:TEMP\Launcher.cs"
$tempScr = "$env:TEMP\KarumesClock.scr"
[System.IO.File]::WriteAllText($tempCs, $code)

Write-Host "Compiling launcher..."
$argList = @(
    "/target:winexe",
    "/out:$tempScr",
    $tempCs,
    "/reference:System.Windows.Forms.dll,System.dll"
)
Start-Process -FilePath $csc -ArgumentList $argList -NoNewWindow -Wait

if (-not (Test-Path $tempScr)) {
    Write-Error "Compilation failed."
    Exit
}

Write-Host "Placing files in Windows directories..."
Copy-Item -Path $tempScr -Destination "$env:SystemRoot\System32\KarumesClock.scr" -Force
if (Test-Path "$env:SystemRoot\SysWOW64") {
    Copy-Item -Path $tempScr -Destination "$env:SystemRoot\SysWOW64\KarumesClock.scr" -Force
}
Copy-Item -Path $tempScr -Destination "$env:SystemRoot\KarumesClock.scr" -Force

# Clean up
Remove-Item $tempCs -Force
Remove-Item $tempScr -Force

Write-Host "Configuring registry..."
Set-ItemProperty -Path "HKCU:\Control Panel\Desktop" -Name "SCRNSAVE.EXE" -Value "$env:SystemRoot\System32\KarumesClock.scr" -Force
Set-ItemProperty -Path "HKCU:\Control Panel\Desktop" -Name "ScreenSaveActive" -Value "1" -Force

Write-Host "[SUCCESS] Screensaver registered successfully!" -ForegroundColor Green
Write-Host "Opening Windows Screensaver settings..."

Start-Process "control" -ArgumentList "desk.cpl,,@screensaver"