# Script para instalar ZeroTier y Zabbix Agent en Windows
# Requiere ejecución como administrador

Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine -Force

# --- Instalación de ZeroTier ---
Write-Host "Descargando el instalador de ZeroTier..."
$zerotierUrl = "https://download.zerotier.com/RELEASES/1.14.2/dist/ZeroTier%20One.msi"
$zerotierInstaller = "$env:temp\ZeroTierOne.msi"
Invoke-WebRequest -Uri $zerotierUrl -OutFile $zerotierInstaller

Write-Host "Instalando ZeroTier..."
$zeroTierProcess = Start-Process msiexec.exe -ArgumentList "/i `"$zerotierInstaller`" /quiet /norestart" -Wait -PassThru

if ($zeroTierProcess.ExitCode -eq 0) {
    Write-Host "ZeroTier instalado correctamente."
} else {
    Write-Error "Falló la instalación de ZeroTier. Código de salida: $($zeroTierProcess.ExitCode)"
}

# Asegurar que el servicio esté corriendo
Write-Host "Esperando que el servicio de ZeroTier se inicie..."
Start-Sleep -Seconds 10
Start-Service -Name "ZeroTierOneService"

Write-Host "Uniendo a la red ZeroTier (ID: e5cd7a9e1c018cd5)..."
& "C:\Program Files (x86)\ZeroTier\One\zerotier-cli.bat" join e5cd7a9e1c018cd5

# --- Instalación de Zabbix Agent ---
Write-Host "Descargando Zabbix Agent..."
$zabbixUrl = "https://cdn.zabbix.com/zabbix/binaries/stable/7.2/7.2.6/zabbix_agent-7.2.6-windows-amd64-openssl.msi"
$zabbixInstaller = "$env:TEMP\zabbix_agent.msi"
Invoke-WebRequest -Uri $zabbixUrl -OutFile $zabbixInstaller

Write-Host "Instalando Zabbix Agent..."
Start-Process msiexec.exe -ArgumentList "/i $zabbixInstaller /quiet /norestart SERVER=10.144.64.101 SERVERACTIVE=10.144.64.101" -Wait

# --- Configuración del Zabbix Agent ---
Write-Host "Configurando Zabbix Agent..."
$zabbixConf = "C:\Program Files\Zabbix Agent\zabbix_agentd.conf"
$confContent = @"
LogFile=c:\Program Files\Zabbix Agent\zabbix_agentd.log
Server=10.144.64.101
ServerActive=10.144.64.101
Hostname=$env:COMPUTERNAME
"@
Set-Content -Path $zabbixConf -Value $confContent

# --- Iniciar el servicio de Zabbix Agent ---
Write-Host "Iniciando el servicio de Zabbix Agent..."
Start-Service -Name "Zabbix Agent"
Set-Service -Name "Zabbix Agent" -StartupType Automatic

Write-Host "Instalación y configuración completadas."

# Desactiva la tarea programada para que no se ejecute de nuevo
Disable-ScheduledTask -TaskName "Ansidesk"
