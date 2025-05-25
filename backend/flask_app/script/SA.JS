const https = require("https");

const PROXMOX_HOST = "10.144.212.69"; // Cambia esto por la dirección de tu servidor Proxmox
const API_TOKEN_ID = "admin@pam!admin"; // Cambia esto por tu ID de token
const API_TOKEN_SECRET = "20477125-29d4-4bd1-9e55-88cbc8456f21"; // Cambia esto por tu secreto de token

const options = {
  hostname: PROXMOX_HOST,
  port: 8006,
  path: "/api2/json",
  method: "GET",
  headers: {
    Authorization: `PVEAPIToken=${API_TOKEN_ID}=${API_TOKEN_SECRET}`,
  },
  rejectUnauthorized: false, 
};

const req = https.request(options, (res) => {
  console.log(`Estado de la respuesta: ${res.statusCode}`);

  let data = "";
  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    if (res.statusCode === 200) {
      console.log("Conexión exitosa con Proxmox:");
      console.log(JSON.parse(data));
    } else {
      console.error("Error al conectar con Proxmox:");
      console.error(data);
    }
  });
});

req.on("error", (error) => {  console.error("Error en la conexión:", error);
});

req.end();