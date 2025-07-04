// Script simples para iniciar o frontend
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando Smart-Trade Frontend...');

const frontend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'client'),
  stdio: 'inherit',
  shell: true
});

frontend.on('close', (code) => {
  console.log(`Frontend encerrado com código ${code}`);
  process.exit(code);
});

frontend.on('error', (err) => {
  console.error('Erro ao iniciar frontend:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Parando frontend...');
  frontend.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Parando frontend...');
  frontend.kill('SIGTERM');
});
