#!/bin/bash

# Smart-Trade Status Script for Linux
# Autor: Emanuel Luis
# Data: 2025-07-04

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================="
echo "   📊 SMART-TRADE SYSTEM STATUS 📊"
echo -e "==========================================${NC}"
echo

# Verificar PM2
echo -e "${BLUE}🔍 PM2 Processes:${NC}"
if command -v pm2 &> /dev/null; then
    pm2 status
else
    echo -e "${RED}❌ PM2 não encontrado${NC}"
fi

echo
echo -e "${BLUE}🔍 System Resources:${NC}"
echo "Memory Usage:"
free -h
echo
echo "Disk Usage:"
df -h / | tail -1

echo
echo -e "${BLUE}🔍 Network Ports:${NC}"
echo "Smart-Trade Ports:"
netstat -tlnp 2>/dev/null | grep -E ':(3001|3002|80|443)' || echo "Nenhuma porta Smart-Trade encontrada"

echo
echo -e "${BLUE}🔍 Process Information:${NC}"
if pgrep -f "smart-trade" > /dev/null; then
    echo -e "${GREEN}✅ Smart-Trade processes running${NC}"
    ps aux | grep -E "(smart-trade|node.*main)" | grep -v grep
else
    echo -e "${RED}❌ No Smart-Trade processes found${NC}"
fi

echo
echo -e "${BLUE}🔍 Recent Logs (last 10 lines):${NC}"
if command -v pm2 &> /dev/null; then
    pm2 logs --lines 10 2>/dev/null || echo "No PM2 logs available"
else
    echo "PM2 not available for logs"
fi

echo
echo -e "${BLUE}🔍 System Load:${NC}"
uptime

echo
echo -e "${GREEN}=========================================="
echo "💡 USEFUL COMMANDS"
echo -e "==========================================${NC}"
echo "pm2 status          - View process status"
echo "pm2 logs            - View logs"
echo "pm2 monit           - Real-time monitor"
echo "pm2 restart all     - Restart application"
echo "htop                - System monitor"
echo "netstat -tlnp       - Check open ports"
echo
