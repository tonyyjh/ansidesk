// crearVM.js

const axios = require('axios');
const https = require('https');

// ——— Configuración ———
const PROXMOX_HOST       = '10.144.212.69';
const API_TOKEN_ID       = 'admin@pam!admin';
const API_TOKEN_SECRET   = '20477125-29d4-4bd1-9e55-88cbc8456f21';
const NODE_NAME          = 'ansidesk';
const VM_ID              = 104;                          // ID único para tu VM
const ISO_STORAGE        = 'local';                      // storage donde están las ISOs
const DISK_STORAGE       = 'local-lvm';                  // storage para discos
const ISO_FILENAME       = 'ubuntu-desktop24.iso';       // nombre exacto de tu ISO

// Cliente Axios configurado para Proxmox
const api = axios.create({
  baseURL: `https://${PROXMOX_HOST}:8006/api2/json`,
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  headers: {
    Authorization: `PVEAPIToken=${API_TOKEN_ID}=${API_TOKEN_SECRET}`,
  },
});

// Paso 1: probar conexión a la API
async function testApiConnection() {
  try {
    const { data } = await api.get('/version');
    console.log(`✅ API accesible — versión Proxmox ${data.data.version}`);
  } catch (err) {
    console.error('❌ No se pudo conectar a la API:', err.response?.data || err.message);
    process.exit(1);
  }
}

// Paso 2: verificar que el nodo exista
async function verifyNode() {
  try {
    const { data } = await api.get('/nodes');
    const nodes = data.data.map(n => n.node);
    if (!nodes.includes(NODE_NAME)) {
      throw new Error(`Nodo "${NODE_NAME}" no existe. Nodos disponibles: ${nodes.join(', ')}`);
    }
    console.log(`✅ Nodo "${NODE_NAME}" detectado`);
  } catch (err) {
    console.error('❌ Error al verificar nodo:', err.response?.data || err.message);
    process.exit(1);
  }
}

// Paso 3: obtener dinámicamente el volid de la ISO
async function fetchIsoVolid() {
  try {
    const resp = await api.get(
      `/nodes/${NODE_NAME}/storage/${ISO_STORAGE}/content`,
      { params: { content: 'iso' } }
    );
    const entry = resp.data.data.find(i =>
      i.volid === `${ISO_STORAGE}:iso/${ISO_FILENAME}`
    );
    if (!entry) {
      throw new Error(`ISO "${ISO_FILENAME}" no encontrada en ${ISO_STORAGE}`);
    }
    console.log(`✅ ISO encontrada — volid: ${entry.volid}`);
    return entry.volid;
  } catch (err) {
    console.error('❌ Error al listar ISOs:', err.response?.data || err.message);
    process.exit(1);
  }
}

// Paso 4: crear y arrancar la VM
async function createAndStartVM(volid) {
  try {
    console.log(`🚧 Creando VM ${VM_ID}...`);
    const params = new URLSearchParams({
      vmid: VM_ID,
      name: `vm-${VM_ID}`,
      cores: 2,
      memory: 2048,
      net0: 'virtio,bridge=vmbr0',
      ide2: `${volid},media=cdrom`,
      scsihw: 'virtio-scsi-pci',
      scsi0: `${DISK_STORAGE}:20`,  // Disco de 32 GB
      boot: 'cdn',
      bootdisk: 'scsi0',
      ostype: 'l26',
    });

    const { data: createData } = await api.post(
      `/nodes/${NODE_NAME}/qemu`,
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    console.log('✅ VM creada:', createData);

    console.log(`🚀 Iniciando VM ${VM_ID}...`);
    const { data: startData } = await api.post(
      `/nodes/${NODE_NAME}/qemu/${VM_ID}/status/start`
    );
    console.log('✅ VM iniciada:', startData);
  } catch (err) {
    console.error('❌ Error al crear/iniciar VM:', err.response?.data || err.message);
    process.exit(1);
  }
}

// Orquestación principal
(async () => {
  await testApiConnection();
  await verifyNode();
  const isoVolid = await fetchIsoVolid();
  await createAndStartVM(isoVolid);
})();
