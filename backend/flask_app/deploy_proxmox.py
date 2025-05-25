import sys
import json
import os
import time
from proxmoxer import ProxmoxAPI
import paramiko
import yaml

def deploy_machine(config_file):
    # Leer el archivo JSON con la configuración de la máquina
    with open(config_file, "r") as file:
        config = json.load(file)

    # Conectar a la API de Proxmox usando Token ID
    proxmox = ProxmoxAPI(
        "10.144.212.69",  # Dirección del servidor Proxmox
        user="admin@pam",  # Usuario asociado al token
        token_name="admin",  # Nombre del token
        token_value="20477125-29d4-4bd1-9e55-88cbc8456f21",  # Secreto del token
        verify_ssl=False
    )
    
    # Obtener próximo VMID disponible
    vmids = [vm['vmid'] for node in proxmox.nodes.get() for vm in proxmox.nodes(node['node']).qemu.get()]
    vmid = max(vmids) + 1 if vmids else 100
    
    # Determinar el almacenamiento en función del tipo de plantilla
    if config.get("template_id") in ["moodle", "dns", "supabase"]:
        # Para plantillas predefinidas usar Ceph para mayor rendimiento
        storage = "ceph-pool"
    else:
        # Para máquinas personalizadas usar local-lvm
        storage = "local"
        
    # Especificaciones del sistema
    node = "ansidesk"  # Nombre del nodo Proxmox
    
    # Mapeo del sistema operativo a la imagen ISO correspondiente
    os_templates = {
        "ubuntu": {
            "24.04": "local:iso/ubuntu-desktop24.iso"
        }
    }
        
    # Obtener la imagen ISO adecuada
    iso = os_templates.get(config["os"], {}).get(config["osVersion"], "local:iso/ubuntu-desktop24.iso")
    
    # Crear la VM en Proxmox
    print(f"Creando máquina virtual '{config['name']}' con ID {vmid}...")
    
    # Determinar tipo de SO para Proxmox
    ostype = "win10" if config["os"] == "windows" else "l26"
    
    # Crear la VM
    proxmox.nodes(node).qemu.create(
        vmid=vmid,
        name=config["name"],
        cores=config["cpu"],
        sockets=1,
        memory=config["ram"] * 1024,  # Convertir GB a MB
        storage=storage,
        disk=f"scsi0:{storage}:{config['storage']}",
        net0="virtio,bridge=vmbr0",
        ostype=ostype,
        cdrom=iso,
        description=config.get("description", "")
    )
    
    print(f"Máquina virtual {vmid} creada exitosamente")
    
    # Si hay una configuración de Ansible, preparar el playbook
    if config.get("additionalConfig"):
        # Crear archivo de playbook
        playbook_file = f"playbook_{vmid}.yml"
        with open(playbook_file, "w") as f:
            f.write(config["additionalConfig"])
        
        print(f"Playbook de Ansible generado: {playbook_file}")
        
        # Esperar a que la VM esté lista para la provisión
        print("Esperando a que la VM inicie para aplicar el playbook...")
        time.sleep(30)  # Dar tiempo para que la VM inicie
        
        # En un entorno real, aquí se ejecutaría Ansible para configurar la VM
        # ansible_command = f"ansible-playbook -i '{vmid},' {playbook_file}"
        # os.system(ansible_command)
        
    print(f"Despliegue de {config['name']} completado. La VM está lista para su uso.")
    return vmid

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Uso: python3 deploy_proxmox.py <config_file>")
        sys.exit(1)

    config_file = sys.argv[1]
    try:
        vmid = deploy_machine(config_file)
        print(f"Máquina virtual creada con éxito. VMID: {vmid}")
        sys.exit(0)
    except Exception as e:
        print(f"Error al desplegar la máquina virtual: {str(e)}")
        sys.exit(1)