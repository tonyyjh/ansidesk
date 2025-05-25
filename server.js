const https = require('https');
const fs = require('fs');
const next = require('next');

const app = next({ dev: true }); // Cambia a true si estás en desarrollo
const handle = app.getRequestHandler();

const httpsOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/ansidesk.cat/privkey.pem'), // Ruta al archivo server.key
  cert: fs.readFileSync('/etc/letsencrypt/live/ansidesk.cat/fullchain.pem'), // Ruta al archivo server.crt
};

app.prepare().then(() => {
  
  https.createServer(httpsOptions, (req, res) => {
    handle(req, res);
  }).listen(443, '0.0.0.0', () => {
    console.log('Servidor HTTPS corriendo en https://ansidesk.cat');
  }).on('error', (err) => {
    console.error('Error en el servidor HTTPS:', err);
  });
});