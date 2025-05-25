const axios = require('axios');
const https = require('https');
const { NodeSSH } = require('node-ssh');

const ssh = new NodeSSH();

const PROXMOX_HOST     = '10.144.212.69';
const SSH_USER         = 'root';
const SSH_PASSWORD     = 'G@gant0nya1ex';
const API_TOKEN_ID     = 'admin@pam!admin';
const API_TOKEN_SECRET = '20477125-29d4-4bd1-9e55-88cbc8456f21';
const NODE_NAME        = 'ansidesk';

const STORAGE_TARGET   = 'local-lvm';
const FILENAME         = 'disco.raw';
const FILE_PATH        = `/var/lib/vz/images/${FILENAME}`;
const VM_ID            = 120;
const TARGET_VM_NAME   = 'desde-ssh-importdisk';

const api = axios.create({
  baseURL: `https://${PROXMOX_HOST}:8006/api2/json`,
  headers: {
    'Authorization': `PVEAPIToken=${API_TOKEN_ID}=${API_TOKEN_SECRET}`
  },
  httpsAgent: new https.Agent({ rejectUnauthorized: false })
});

async function main() {
  try {
    console.log(`📦 Creando VM vacía con ID ${VM_ID}...`);
    await api.post(`/nodes/${NODE_NAME}/qemu`, {
      vmid: VM_ID,
      name: TARGET_VM_NAME,
      memory: 2048,
      cores: 2,
      net0: 'virtio,bridge=vmbr0',
      scsihw: 'virtio-scsi-single',
    });

    console.log(`🔐 Conectando vía SSH para importar el disco...`);
    await ssh.connect({
      host: PROXMOX_HOST,
      username: SSH_USER,
      password: SSH_PASSWORD,
      port: 22
    });

    const importCmd = `qm importdisk ${VM_ID} ${FILE_PATH} ${STORAGE_TARGET}`;
    console.log(`📤 Ejecutando: ${importCmd}`);
    let result = await ssh.execCommand(importCmd);

    if (result.stderr && !result.stderr.toLowerCase().includes('warning')) {
      throw new Error(`Error al importar disco:\n${result.stderr}`);
    } else {
      console.log(`⚠️ Warning ignorado durante importdisk:\n${result.stderr}`);
    }

    const setCmd = `qm set ${VM_ID} --scsihw virtio-scsi-single --scsi0 ${STORAGE_TARGET}:vm-${VM_ID}-disk-0 --boot order=scsi0`;
    console.log(`🔗 Ejecutando: ${setCmd}`);
    result = await ssh.execCommand(setCmd);
    if (result.stderr && !result.stderr.toLowerCase().includes('warning')) {
      throw new Error(`Error al asignar disco:\n${result.stderr}`);
    }

    console.log(`✅ Disco importado y asignado correctamente.`);

  } catch (error) {
    console.error('❌ Error general:', error.message || error);
  } finally {
    ssh.dispose();
  }
}

main();
