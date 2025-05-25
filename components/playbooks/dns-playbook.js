export const adPlaybook = `# Script para instalar y configurar Active Directory y DNS en Windows Server

# Variables de configuración
$DomainName = "example.local"
$NetbiosName = "EXAMPLE"
$SafeModePassword = ConvertTo-SecureString "SecurePassw0rd123!" -AsPlainText -Force

# Paso 1: Configurar IP estática (ajústala según tu red)
$InterfaceAlias = "Ethernet"
$IPAddress = "192.168.1.10"
$PrefixLength = 24
$DefaultGateway = "192.168.1.1"
$DnsServer = "127.0.0.1"  # Apuntará a sí mismo después de instalar DNS

Write-Host "Configurando IP estática..."
New-NetIPAddress -InterfaceAlias $InterfaceAlias -IPAddress $IPAddress -PrefixLength $PrefixLength -DefaultGateway $DefaultGateway
Set-DnsClientServerAddress -InterfaceAlias $InterfaceAlias -ServerAddresses $DnsServer

# Paso 2: Instalar el rol de Active Directory Domain Services
Write-Host "Instalando Active Directory Domain Services..."
Install-WindowsFeature -Name AD-Domain-Services -IncludeManagementTools

# Paso 3: Instalar el rol de DNS
Write-Host "Instalando DNS Server..."
Install-WindowsFeature -Name DNS -IncludeManagementTools

# Paso 4: Promover el servidor a controlador de dominio
Write-Host "Promoviendo el servidor a controlador de dominio..."
Install-ADDSForest \\
    -DomainName $DomainName \\
    -DomainNetbiosName $NetbiosName \\
    -SafeModeAdministratorPassword $SafeModePassword \\
    -InstallDns \\
    -Force:$true

# Paso 5: Reiniciar el servidor
Write-Host "El servidor se reiniciará para completar la configuración..."
Restart-Computer -Force
`
