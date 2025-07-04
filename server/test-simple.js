// Teste simples para verificar se o Node.js está funcionando
console.log('🧪 Teste simples iniciado...');

try {
  console.log('✅ Node.js versão:', process.version);
  console.log('✅ Diretório atual:', process.cwd());
  
  // Testar imports básicos
  const fs = require('fs');
  console.log('✅ FS module carregado');
  
  const path = require('path');
  console.log('✅ Path module carregado');
  
  // Verificar se o arquivo main.ts existe
  if (fs.existsSync('./src/main.ts')) {
    console.log('✅ Arquivo main.ts encontrado');
  } else {
    console.log('❌ Arquivo main.ts NÃO encontrado');
  }
  
  // Verificar package.json
  if (fs.existsSync('./package.json')) {
    console.log('✅ Package.json encontrado');
    const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    console.log('✅ Package name:', pkg.name);
  } else {
    console.log('❌ Package.json NÃO encontrado');
  }
  
  console.log('🎉 Teste simples concluído com sucesso!');
  
} catch (error) {
  console.error('❌ Erro no teste simples:', error);
}
