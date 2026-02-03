const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const SOURCE_PORT = 3001;
const TARGET_PORT = 3000;
const KEY_PATH = 'localhost-key.pem';
const CERT_PATH = 'localhost.pem';

console.log('🔒 Starting HTTPS Proxy Setup...');

// 1. Generate Certificates if missing
if (!fs.existsSync(KEY_PATH) || !fs.existsSync(CERT_PATH)) {
    console.log('Generating self-signed certificates...');
    try {
        execSync(
            `openssl req -x509 -newkey rsa:2048 -keyout ${KEY_PATH} -out ${CERT_PATH} -days 365 -nodes -subj "/CN=localhost"`,
            { stdio: 'inherit' }
        );
        console.log('✅ Certificates generated.');
    } catch (e) {
        console.error('❌ Failed to generate certificates. Ensure "openssl" is installed.');
        process.exit(1);
    }
} else {
    console.log('✅ Certificates found.');
}

// 2. Run local-ssl-proxy
console.log(`🚀 Starting HTTPS Proxy: https://localhost:${SOURCE_PORT} -> http://localhost:${TARGET_PORT}`);
console.log(`👉 Access the app at: https://<YOUR_IP_ADDRESS>:${SOURCE_PORT}`);

const proxy = spawn('npx', [
    'local-ssl-proxy',
    '--source', SOURCE_PORT,
    '--target', TARGET_PORT,
    '--cert', CERT_PATH,
    '--key', KEY_PATH,
    '--hostname', '0.0.0.0'
], { stdio: 'inherit' });

proxy.on('close', (code) => {
    console.log(`Proxy process exited with code ${code}`);
});
