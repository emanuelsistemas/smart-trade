#!/bin/bash

# Smart-Trade Deploy Script for Linux VPS
# Autor: Emanuel Luis
# Data: 2025-07-04

set -e  # Exit on any error

echo "🚀 SMART-TRADE DEPLOY SCRIPT FOR LINUX VPS"
echo "=========================================="
echo

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar se está rodando como root ou com sudo
if [[ $EUID -eq 0 ]]; then
   log_warning "Rodando como root. Recomendado usar usuário normal com sudo."
fi

# Verificar Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js não encontrado. Instale Node.js 18+ primeiro."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    log_error "Node.js versão $NODE_VERSION encontrada. Necessário versão 18+."
    exit 1
fi

log_success "Node.js $(node --version) encontrado"

# Verificar PM2
if ! command -v pm2 &> /dev/null; then
    log_info "PM2 não encontrado. Instalando..."
    npm install -g pm2
    log_success "PM2 instalado"
else
    log_success "PM2 $(pm2 --version) encontrado"
fi

# Verificar Git
if ! command -v git &> /dev/null; then
    log_error "Git não encontrado. Instale git primeiro."
    exit 1
fi

log_success "Git $(git --version) encontrado"

# Definir diretório de instalação
INSTALL_DIR="/var/www/smart-trade"
BACKUP_DIR="/var/backups/smart-trade"

# Criar backup se já existir instalação
if [ -d "$INSTALL_DIR" ]; then
    log_info "Instalação existente encontrada. Criando backup..."
    sudo mkdir -p "$BACKUP_DIR"
    BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
    sudo cp -r "$INSTALL_DIR" "$BACKUP_DIR/$BACKUP_NAME"
    log_success "Backup criado em $BACKUP_DIR/$BACKUP_NAME"
fi

# Clonar ou atualizar repositório
if [ -d "$INSTALL_DIR" ]; then
    log_info "Atualizando código existente..."
    cd "$INSTALL_DIR"
    git pull origin master
else
    log_info "Clonando repositório..."
    sudo mkdir -p /var/www
    cd /var/www
    sudo git clone https://github.com/emanuelsistemas/smart-trade.git
    sudo chown -R $USER:$USER smart-trade
    cd smart-trade
fi

log_success "Código atualizado"

# Instalar dependências
log_info "Instalando dependências..."

# Dependências do servidor
cd server
npm install
log_success "Dependências do servidor instaladas"

# Dependências do cliente
cd ../client
npm install
log_success "Dependências do cliente instaladas"

# Dependências compartilhadas
cd ../shared
npm install
log_success "Dependências compartilhadas instaladas"

cd ..

# Build da aplicação
log_info "Fazendo build da aplicação..."

# Build do servidor
cd server
npm run build
log_success "Build do servidor concluído"

# Build do cliente
cd ../client
npm run build
log_success "Build do cliente concluído"

cd ..

# Criar diretórios necessários
log_info "Criando diretórios necessários..."
mkdir -p logs
mkdir -p server/data
log_success "Diretórios criados"

# Configurar PM2
log_info "Configurando PM2..."

# Parar processos existentes
pm2 delete smart-trade-backend 2>/dev/null || true

# Iniciar aplicação
pm2 start ecosystem.linux.config.js

# Salvar configuração PM2
pm2 save

# Configurar PM2 para iniciar no boot (se não configurado)
if ! pm2 startup | grep -q "already"; then
    log_info "Configurando PM2 para iniciar no boot..."
    pm2 startup
    log_warning "Execute o comando mostrado acima para configurar inicialização automática"
fi

log_success "PM2 configurado"

# Verificar status
log_info "Verificando status da aplicação..."
pm2 status

# Verificar se as portas estão abertas
if netstat -tlnp | grep -q ":3001"; then
    log_success "Backend rodando na porta 3001"
else
    log_error "Backend não está rodando na porta 3001"
fi

echo
echo "=========================================="
log_success "DEPLOY CONCLUÍDO COM SUCESSO!"
echo "=========================================="
echo
echo "📊 URLs da aplicação:"
echo "   🔹 Backend:  http://$(hostname -I | awk '{print $1}'):3001"
echo "   🔹 WebSocket: ws://$(hostname -I | awk '{print $1}'):3002"
echo
echo "💡 Próximos passos:"
echo "   1. Configure o Nginx como proxy reverso"
echo "   2. Configure SSL com Let's Encrypt"
echo "   3. Configure o firewall"
echo "   4. Configure backups automáticos"
echo
echo "📋 Comandos úteis:"
echo "   pm2 status          - Ver status dos processos"
echo "   pm2 logs            - Ver logs"
echo "   pm2 monit           - Monitor em tempo real"
echo "   pm2 restart all     - Reiniciar aplicação"
echo
echo "📖 Documentação completa: DEPLOY-VPS-LINUX.md"
echo
