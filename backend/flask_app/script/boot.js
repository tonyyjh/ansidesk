const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const PROXMOX_HOST = '10.144.212.69';
const SSH_USER = 'root';
const SSH_PASSWORD = 'G@gant0nya1ex';
const STORAGE_TARGET = 'local-lvm';

const [, , VM_ID] = process.argv;

async function main() {
  try {
    await ssh.connect({
      host: PROXMOX_HOST,
      username: SSH_USER,
      password: SSH_PASSWORD,
      port: 22
    });

    const setCmd = `qm set ${VM_ID} --scsihw virtio-scsi-single --scsi0 ${STORAGE_TARGET}:vm-${VM_ID}-disk-0 --boot order=scsi0`;
    console.log(`Ejecutando: ${setCmd}`);

    const result = await ssh.execCommand(setCmd);

    if (result.stderr && !result.stderr.toLowerCase().includes('warning')) {
      throw new Error(`Error al asignar disco:\n${result.stderr}`);
    }

    console.log('Boot order asignado correctamente');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  } finally {
    ssh.dispose();
  }
}

main();
