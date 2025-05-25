const axios = require('axios');
const https = require('https');
const { NodeSSH } = require('node-ssh');

const ssh = new NodeSSH();

//const PROXMOX_HOST = '10.144.212.69';
const PROXMOX_HOST = '10.144.146.82';
const SSH_USER = 'root';
//const SSH_PASSWORD = 'G@gant0nya1ex';
const SSH_PASSWORD = 'alumne';
const API_TOKEN_ID = 'admin@pam!admin';
//const API_TOKEN_SECRET = '20477125-29d4-4bd1-9e55-88cbc8456f21';
const API_TOKEN_SECRET = 'da459c77-43c4-4f08-a8f6-17166e057a00';
//const NODE_NAME = 'ansidesk';
const NODE_NAME = 'proxmox';
const STORAGE_TARGET = 'local-lvm';

// Obtener parámetros desde la línea de comandos

const VM_ID = parseInt(process.argv[2]);
const VM_NAME = process.argv[3];
const CPU = parseInt(process.argv[4]);
const RAM = parseInt(process.argv[5]);
const STORAGE = parseInt(process.argv[6]);
const FILE_PATH = process.argv[7];
if (
  isNaN(VM_ID) ||
  !VM_NAME ||
  isNaN(CPU) ||
  isNaN(RAM) ||
  isNaN(STORAGE) ||
  !FILE_PATH
) {
  console.error('Parámetros inválidos: asegúrate de que VMID, CPU, RAM y STORAGE sean números');
  process.exit(1);
}

const api = axios.create({
  baseURL: `https://${PROXMOX_HOST}:8006/api2/json`,
  headers: {
    'Authorization': `PVEAPIToken=${API_TOKEN_ID}=${API_TOKEN_SECRET}`
  },
  httpsAgent: new https.Agent({ rejectUnauthorized: false })
});

async function main() {
try {
    console.log(`Creando VM vacía con ID ${VM_ID}...`);
    await api.post(`/nodes/${NODE_NAME}/qemu`, {
      vmid: parseInt(VM_ID),
      name: VM_NAME,
      memory: parseInt(RAM),
      cores: parseInt(CPU),
      net0: 'virtio,bridge=vmbr0',
      scsihw: 'virtio-scsi-single'
    });

    console.log(`Conectando vía SSH para importar el disco...`);
    await ssh.connect({
      host: PROXMOX_HOST,
      username: SSH_USER,
      password: SSH_PASSWORD,
      port: 22
    });

    const LOG_FILE = `/tmp/qm-import-${VM_ID}.log`;
    const importCmd = `nohup qm importdisk ${VM_ID} ${FILE_PATH} ${STORAGE_TARGET} > ${LOG_FILE} 2>&1 &`;
    console.log(`🟡 Ejecutando en segundo plano: ${importCmd}`);
    await ssh.execCommand(importCmd);
    
    // Espera unos segundos para que se complete la importación
    console.log("⏳ Esperando 10 segundos para la finalización de importdisk...");
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Lee el log
    const checkLog = await ssh.execCommand(`cat ${LOG_FILE}`);
    const logContent = checkLog.stdout || checkLog.stderr;
    
    const logLower = logContent.toLowerCase();
    
    // Si hay "error" explícito que no sea warning, falla
    if (logLower.includes("error") && !logLower.includes("warning")) {
      throw new Error(`❌ Error detectado en qm importdisk:\n${logContent}`);
    }
    
    // ✅ Ahora considera éxito si aparece esta línea clave:
    if (!logLower.includes('logical volume') || !logLower.includes('created')) {
      console.warn(`⚠️ Advertencia: no se encontró confirmación explícita, pero se ignorarán los warnings conocidos.\nLog:\n${logContent}`);
    } else {
      console.log(`✅ Disco importado correctamente:\n${logContent}`);
    }
    
    // Ejecutar qm set
    const setCmd = `qm set ${VM_ID} --scsihw virtio-scsi-single --scsi0 ${STORAGE_TARGET}:vm-${VM_ID}-disk-0 --boot order=scsi0`;
    console.log(`⚙️ Ejecutando: ${setCmd}`);
    let result = await ssh.execCommand(setCmd);

    if (result.stderr && !result.stderr.toLowerCase().includes("warning")) {
      throw new Error(`❌ Error en qm set:\n${result.stderr}`);
    }
    console.log("✅ qm set ejecutado con éxito.");

    // 👉 Añadir configuración de red (DHCP)
    const networkCmd = `qm set ${VM_ID} --net0 virtio,bridge=vmbr0`;
    console.log(`🌐 Ejecutando: ${networkCmd}`);
    result = await ssh.execCommand(networkCmd);

    if (result.stderr && !result.stderr.toLowerCase().includes('warning')) {
      throw new Error(`❌ Error al configurar red:\n${result.stderr}`);
    }
    console.log("✅ Red configurada con DHCP correctamente.");
    

  } catch (error) {
    console.error('Error general:', error.message || error);
    process.exit(1);
  } finally {
    ssh.dispose();
  }
}

main();