# 🚀 **GUIA COMPLETO: DEPLOY SMART-TRADE EM VPS LINUX**

## 📋 **ÍNDICE**
1. [Pré-requisitos](#pré-requisitos)
2. [Preparação do Servidor](#preparação-do-servidor)
3. [Instalação de Dependências](#instalação-de-dependências)
4. [Configuração do Projeto](#configuração-do-projeto)
5. [Configuração PM2](#configuração-pm2)
6. [Configuração de Firewall](#configuração-de-firewall)
7. [SSL/HTTPS (Opcional)](#ssl-https)
8. [Monitoramento](#monitoramento)
9. [Backup e Manutenção](#backup-e-manutenção)

---

## 🔧 **PRÉ-REQUISITOS**

### **VPS Recomendado:**
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **RAM**: Mínimo 2GB (Recomendado 4GB+)
- **CPU**: 2 vCPUs
- **Storage**: 20GB SSD
- **Bandwidth**: Ilimitado

### **Acesso Necessário:**
- SSH root ou sudo
- Domínio (opcional, mas recomendado)
- Certificado SSL (Let's Encrypt gratuito)

---

## 🖥️ **PREPARAÇÃO DO SERVIDOR**

### **1. Conectar via SSH**
```bash
ssh root@SEU_IP_VPS
# ou
ssh usuario@SEU_IP_VPS
```

### **2. Atualizar Sistema**
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
# ou (CentOS 8+)
sudo dnf update -y
```

### **3. Instalar Utilitários Básicos**
```bash
# Ubuntu/Debian
sudo apt install -y curl wget git unzip htop nano ufw

# CentOS/RHEL
sudo yum install -y curl wget git unzip htop nano firewalld
```

---

## 📦 **INSTALAÇÃO DE DEPENDÊNCIAS**

### **1. Instalar Node.js (versão 18+)**
```bash
# Usando NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalação
node --version
npm --version
```

### **2. Instalar PM2 Globalmente**
```bash
sudo npm install -g pm2
pm2 --version
```

### **3. Instalar Redis (Opcional - para cache)**
```bash
# Ubuntu/Debian
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Verificar
redis-cli ping
```

### **4. Instalar Nginx (Proxy Reverso)**
```bash
# Ubuntu/Debian
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## 📁 **CONFIGURAÇÃO DO PROJETO**

### **1. Clonar Repositório**
```bash
cd /var/www
sudo git clone https://github.com/emanuelsistemas/smart-trade.git
sudo chown -R $USER:$USER smart-trade
cd smart-trade
```

### **2. Instalar Dependências**
```bash
# Instalar dependências do servidor
cd server
npm install

# Instalar dependências do cliente
cd ../client
npm install

# Instalar dependências compartilhadas
cd ../shared
npm install

# Voltar para raiz
cd ..
```

### **3. Build do Frontend**
```bash
cd client
npm run build
cd ..
```

### **4. Configurar Variáveis de Ambiente**
```bash
# Criar arquivo .env no servidor
cd server
cp .env.example .env
nano .env
```

**Conteúdo do .env:**
```env
NODE_ENV=production
PORT=3001
WEBSOCKET_PORT=3002

# Cedro API
CEDRO_HOST=datafeed1.cedrotech.com
CEDRO_PORT=81
CEDRO_USERNAME=emanuel_socket
CEDRO_PASSWORD=bABqwq

# Database
SQLITE_PATH=./data/smart-trade.db
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=sua-chave-secreta-super-forte-aqui
JWT_EXPIRES_IN=24h

# Logging
LOG_LEVEL=info
MAX_LOG_FILES=10
MAX_LOG_SIZE=10485760
```

---

## ⚙️ **CONFIGURAÇÃO PM2**

### **1. Configurar PM2 Ecosystem**
```bash
# O arquivo ecosystem.config.js já está no projeto
# Verificar configuração
cat ecosystem.config.js
```

### **2. Criar Configuração para Linux**
```bash
nano ecosystem.linux.config.js
```

**Conteúdo do ecosystem.linux.config.js:**
```javascript
module.exports = {
  apps: [
    {
      name: 'smart-trade-backend',
      script: './server/dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        WEBSOCKET_PORT: 3002
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true
    }
  ]
};
```

### **3. Build e Iniciar Aplicação**
```bash
# Build do backend
cd server
npm run build

# Criar diretório de logs
mkdir -p ../logs

# Iniciar com PM2
cd ..
pm2 start ecosystem.linux.config.js

# Verificar status
pm2 status
pm2 logs

# Salvar configuração PM2
pm2 save

# Configurar PM2 para iniciar no boot
pm2 startup
# Execute o comando mostrado pelo PM2
```

---

## 🔥 **CONFIGURAÇÃO DE FIREWALL**

### **Ubuntu/Debian (UFW)**
```bash
# Habilitar UFW
sudo ufw enable

# Permitir SSH
sudo ufw allow ssh

# Permitir HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Permitir portas da aplicação (se necessário acesso direto)
sudo ufw allow 3001
sudo ufw allow 3002

# Verificar status
sudo ufw status
```

### **CentOS/RHEL (Firewalld)**
```bash
# Iniciar firewalld
sudo systemctl enable firewalld
sudo systemctl start firewalld

# Permitir serviços
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https

# Permitir portas específicas
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --permanent --add-port=3002/tcp

# Recarregar
sudo firewall-cmd --reload
```

---

## 🌐 **CONFIGURAÇÃO NGINX**

### **1. Configurar Proxy Reverso**
```bash
sudo nano /etc/nginx/sites-available/smart-trade
```

**Conteúdo da configuração:**
```nginx
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;

    # Frontend (arquivos estáticos)
    location / {
        root /var/www/smart-trade/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # API Backend
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### **2. Ativar Configuração**
```bash
# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/smart-trade /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

---

## 🔒 **SSL/HTTPS COM LET'S ENCRYPT**

### **1. Instalar Certbot**
```bash
# Ubuntu/Debian
sudo apt install -y certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install -y certbot python3-certbot-nginx
```

### **2. Obter Certificado SSL**
```bash
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
```

### **3. Configurar Renovação Automática**
```bash
# Testar renovação
sudo certbot renew --dry-run

# Adicionar ao crontab
sudo crontab -e
# Adicionar linha:
0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 📊 **MONITORAMENTO**

### **1. PM2 Monitoring**
```bash
# Monitorar em tempo real
pm2 monit

# Ver logs
pm2 logs

# Estatísticas
pm2 show smart-trade-backend
```

### **2. Scripts de Monitoramento**
```bash
# Criar script de status
nano /var/www/smart-trade/scripts/status-linux.sh
```

**Conteúdo do status-linux.sh:**
```bash
#!/bin/bash
echo "=== SMART-TRADE SYSTEM STATUS ==="
echo
echo "🔍 PM2 Processes:"
pm2 status

echo
echo "🔍 System Resources:"
free -h
df -h /

echo
echo "🔍 Network Ports:"
netstat -tlnp | grep -E ':(3001|3002|80|443)'

echo
echo "🔍 Recent Logs:"
pm2 logs --lines 10
```

```bash
chmod +x /var/www/smart-trade/scripts/status-linux.sh
```

---

## 💾 **BACKUP E MANUTENÇÃO**

### **1. Script de Backup**
```bash
nano /var/www/smart-trade/scripts/backup.sh
```

**Conteúdo do backup.sh:**
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/smart-trade"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup do banco SQLite
cp /var/www/smart-trade/server/data/smart-trade.db $BACKUP_DIR/smart-trade_$DATE.db

# Backup dos logs
tar -czf $BACKUP_DIR/logs_$DATE.tar.gz /var/www/smart-trade/logs/

# Manter apenas últimos 7 backups
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
chmod +x /var/www/smart-trade/scripts/backup.sh

# Adicionar ao crontab para backup diário
sudo crontab -e
# Adicionar:
0 2 * * * /var/www/smart-trade/scripts/backup.sh
```

### **2. Script de Atualização**
```bash
nano /var/www/smart-trade/scripts/update.sh
```

**Conteúdo do update.sh:**
```bash
#!/bin/bash
cd /var/www/smart-trade

echo "🔄 Updating Smart-Trade System..."

# Backup antes da atualização
./scripts/backup.sh

# Parar aplicação
pm2 stop all

# Atualizar código
git pull origin master

# Instalar dependências
cd server && npm install
cd ../client && npm install && npm run build
cd ..

# Reiniciar aplicação
pm2 restart all

echo "✅ Update completed!"
```

```bash
chmod +x /var/www/smart-trade/scripts/update.sh
```

---

## 🚀 **COMANDOS ÚTEIS**

### **Gerenciamento PM2:**
```bash
pm2 start ecosystem.linux.config.js  # Iniciar
pm2 stop all                          # Parar todos
pm2 restart all                       # Reiniciar todos
pm2 reload all                        # Reload sem downtime
pm2 delete all                        # Deletar todos
pm2 logs                              # Ver logs
pm2 monit                             # Monitor em tempo real
```

### **Nginx:**
```bash
sudo nginx -t                         # Testar configuração
sudo systemctl restart nginx          # Reiniciar
sudo systemctl status nginx           # Status
```

### **Sistema:**
```bash
htop                                  # Monitor de recursos
df -h                                 # Espaço em disco
free -h                               # Memória
netstat -tlnp                         # Portas abertas
```

---

## ⚠️ **TROUBLESHOOTING**

### **Problemas Comuns:**

1. **Porta já em uso:**
   ```bash
   sudo lsof -i :3001
   sudo kill -9 PID
   ```

2. **Permissões:**
   ```bash
   sudo chown -R $USER:$USER /var/www/smart-trade
   ```

3. **Logs de erro:**
   ```bash
   pm2 logs smart-trade-backend --err
   ```

4. **Reiniciar tudo:**
   ```bash
   pm2 delete all
   pm2 start ecosystem.linux.config.js
   ```

---

## 📞 **SUPORTE**

Para suporte adicional:
- 📧 Email: emanuelsistemas@gmail.com
- 📱 GitHub: https://github.com/emanuelsistemas/smart-trade

---

**✅ Sistema Smart-Trade configurado com sucesso em VPS Linux!**
