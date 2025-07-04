// Script simples para iniciar o backend
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando Smart-Trade Backend...');

const backend = spawn('npx', ['ts-node', 'src/main.ts'], {
  cwd: path.join(__dirname, 'server'),
  stdio: 'inherit',
  shell: true
});

backend.on('close', (code) => {
  console.log(`Backend encerrado com código ${code}`);
  process.exit(code);
});

backend.on('error', (err) => {
  console.error('Erro ao iniciar backend:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Parando backend...');
  backend.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Parando backend...');
  backend.kill('SIGTERM');
});
