#!/bin/bash
# Script para instalar ZeroTier y Zabbix Agent en Ubuntu
# Requiere ejecución con sudo

# Reasignación de IP
dhclient -r
dhclient -nw

# Instalación de repositorios
wget https://repo.zabbix.com/zabbix/7.0/ubuntu/pool/main/z/zabbix-release/zabbix-release_7.0-1+ubuntu$(lsb_release -rs)_all.deb -O /tmp/zabbix-release.deb
sudo dpkg -i /tmp/zabbix-release.deb

# --- Instalación de OpenSSH Client ---
echo "Instalando OpenSSH Client..."
apt install openssh-server -y && apt install curl -y

# Verificar que OpenSSH Client se instaló correctamente
if ! command -v ssh &> /dev/null; then
    echo "Error: OpenSSH Client no se instaló correctamente."
    exit 1
fi

# --- Instalación de ZeroTier ---
echo "Instalando ZeroTier..."
curl -s https://install.zerotier.com/ | sudo bash

# Verificar que ZeroTier se instaló correctamente
if ! command -v zerotier-cli &> /dev/null; then
    echo "Error: ZeroTier no se instaló correctamente."
    exit 1
fi

echo "Uniendo a la red ZeroTier (ID: e5cd7a9e1c018cd5)..."
sudo zerotier-cli join e5cd7a9e1c018cd5

# --- Instalación de Zabbix Agent ---
echo "Instalando Zabbix Agent..."
apt install zabbix-agent -y

# --- Configuración del Zabbix Agent ---
echo "Configurando Zabbix Agent..."
cat >> /etc/zabbix/zabbix_agentd.conf << EOL
LogFile=/var/log/zabbix/zabbix_agentd.log
Server=10.144.64.101
ServerActive=10.144.64.101
Hostname=$(hostname)
EOL

# --- Iniciar y habilitar el servicio de Zabbix Agent ---
echo "Iniciando y habilitando Zabbix Agent..."
systemctl restart zabbix-agent
systemctl enable zabbix-agent

systemctl disable ansidesk.service
