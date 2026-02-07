# ✅ Deployment Checklist

Checklist lengkap untuk deploy bot ke production.

## 📋 Pre-Deployment

### 1. Server Requirements
- [ ] VPS/Server Ubuntu 20.04+ (minimal 1GB RAM, 20GB storage)
- [ ] Root/sudo access
- [ ] Public IP address
- [ ] Domain atau subdomain (untuk callback URL)

### 2. Software Installation
- [ ] Node.js v16+ installed
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt-get install -y nodejs
  node -v  # Verify
  ```
- [ ] NPM installed (comes with Node.js)
  ```bash
  npm -v  # Verify
  ```
- [ ] Git installed (optional)
  ```bash
  sudo apt install git -y
  ```

### 3. Web Server Setup
- [ ] Nginx installed
  ```bash
  sudo apt update
  sudo apt install nginx -y
  sudo systemctl status nginx
  ```
- [ ] Firewall configured
  ```bash
  sudo ufw allow 'Nginx Full'
  sudo ufw allow OpenSSH
  sudo ufw enable
  ```
- [ ] Domain DNS configured (A record pointing to VPS IP)

### 4. SSL Certificate (Recommended)
- [ ] Certbot installed
  ```bash
  sudo apt install certbot python3-certbot-nginx -y
  ```
- [ ] SSL certificate obtained
  ```bash
  sudo certbot --nginx -d yourdomain.com
  ```

## 🔑 Account Setup

### 1. Payment Gateway
- [ ] Account created (Tripay/Midtrans/Duitku)
- [ ] Account verified
- [ ] API credentials obtained:
  - [ ] API Key
  - [ ] Private/Secret Key
  - [ ] Merchant Code/ID
- [ ] Callback URL configured in dashboard
- [ ] Test mode (sandbox) working

### 2. Telegram Bot
- [ ] Bot created via @BotFather
- [ ] Bot token obtained
- [ ] Bot username noted
- [ ] Bot commands configured:
  ```
  start - Mulai bot
  ```

### 3. ChatGPT Account
- [ ] ChatGPT Plus or Team account active
- [ ] Login credentials ready
- [ ] Workspace ID noted (if Team)
- [ ] 2FA disabled or configured properly

## 📦 Bot Installation

### 1. Upload Project
- [ ] Project files uploaded to `/home/username/chatgpt-invite-bot`
- [ ] Ownership correct
  ```bash
  sudo chown -R $USER:$USER /home/username/chatgpt-invite-bot
  ```

### 2. Run Installation Script
- [ ] Install script executed
  ```bash
  cd /home/username/chatgpt-invite-bot
  chmod +x install.sh
  ./install.sh
  ```
- [ ] All dependencies installed successfully
- [ ] Playwright browsers installed
- [ ] No errors in installation

### 3. Environment Configuration
- [ ] `.env` file created from `.env.example`
- [ ] All required variables filled:
  ```bash
  nano .env
  ```
  - [ ] `TELEGRAM_BOT_TOKEN`
  - [ ] `PAYMENT_PROVIDER`
  - [ ] Payment gateway credentials
  - [ ] `CHATGPT_EMAIL`
  - [ ] `CHATGPT_PASSWORD`
  - [ ] `CALLBACK_URL`
  - [ ] Pricing configured
- [ ] File saved with correct values

## 🌐 Web Server Configuration

### 1. Nginx Configuration
- [ ] Configuration file edited
  ```bash
  sudo nano /etc/nginx/sites-available/default
  ```
- [ ] Reverse proxy configured:
  ```nginx
  server {
      listen 80;
      server_name yourdomain.com;

      location / {
          proxy_pass http://localhost:3000;
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection 'upgrade';
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_cache_bypass $http_upgrade;
      }
  }
  ```
- [ ] Configuration tested
  ```bash
  sudo nginx -t
  ```
- [ ] Nginx restarted
  ```bash
  sudo systemctl restart nginx
  ```

### 2. SSL Configuration (if applicable)
- [ ] SSL certificate configured
- [ ] HTTPS working
- [ ] HTTP redirect to HTTPS enabled

## 🧪 Testing Phase

### 1. Environment Test
- [ ] Run environment check
  ```bash
  node test.js env
  ```
- [ ] All required variables present

### 2. Database Test
- [ ] Run database test
  ```bash
  node test.js database
  ```
- [ ] Database operations successful

### 3. Payment Test
- [ ] Run payment test
  ```bash
  node test.js payment
  ```
- [ ] Invoice creation successful
- [ ] Sandbox mode working

### 4. Bot Test
- [ ] Start bot in development mode
  ```bash
  npm start
  ```
- [ ] Open Telegram and test bot
- [ ] `/start` command working
- [ ] Package selection working
- [ ] Invoice generation working
- [ ] Test payment in sandbox
- [ ] Callback received
- [ ] Email request received
- [ ] Invite sent successfully

### 5. ChatGPT Test (Optional)
- [ ] Run ChatGPT test
  ```bash
  node test.js chatgpt
  ```
- [ ] Login successful
- [ ] Browser automation working

### 6. Cronjob Test
- [ ] Run cronjob manually
  ```bash
  node src/cronjobs/expiredChecker.js
  ```
- [ ] No errors

## 🚀 Production Deployment

### 1. PM2 Setup
- [ ] PM2 installed globally
  ```bash
  npm install -g pm2
  ```
- [ ] Bot started with PM2
  ```bash
  pm2 start ecosystem.config.js
  ```
- [ ] Status checked
  ```bash
  pm2 status
  ```
- [ ] Logs verified
  ```bash
  pm2 logs chatgpt-bot --lines 50
  ```

### 2. Auto-Start Configuration
- [ ] PM2 startup configured
  ```bash
  pm2 startup
  # Follow the instructions shown
  ```
- [ ] Current state saved
  ```bash
  pm2 save
  ```

### 3. Log Rotation
- [ ] PM2 log rotation installed
  ```bash
  pm2 install pm2-logrotate
  pm2 set pm2-logrotate:max_size 10M
  pm2 set pm2-logrotate:retain 7
  ```

## 🔍 Final Verification

### 1. Bot Functionality
- [ ] Bot responds to `/start`
- [ ] All packages visible
- [ ] Invoice generation works
- [ ] QR code accessible
- [ ] Payment callback received
- [ ] Status updates correctly
- [ ] Email validation works
- [ ] Invite sent successfully

### 2. Payment Gateway
- [ ] Callback URL accessible from internet
  ```bash
  curl -X POST https://yourdomain.com/callback/payment \
    -H "Content-Type: application/json" \
    -d '{"test": "data"}'
  ```
- [ ] Signature validation working
- [ ] Test transaction successful
- [ ] Real transaction successful (with small amount)

### 3. Automation
- [ ] ChatGPT login working
- [ ] Invite sending successful
- [ ] Access removal working
- [ ] Status checking working

### 4. Cronjobs
- [ ] Expired checker running
- [ ] Reminders being sent
- [ ] Auto-removal working
- [ ] Logs show cronjob activity

### 5. Monitoring
- [ ] PM2 monitoring active
  ```bash
  pm2 monit
  ```
- [ ] Logs accessible
  ```bash
  pm2 logs chatgpt-bot
  ```
- [ ] No recurring errors

## 🔐 Security Check

- [ ] `.env` file not publicly accessible
- [ ] File permissions correct
  ```bash
  chmod 600 .env
  ```
- [ ] Database file secured
  ```bash
  chmod 600 data/database.json
  ```
- [ ] Firewall configured properly
- [ ] Only necessary ports open
- [ ] Payment callback signature validated
- [ ] No sensitive data in logs
- [ ] SSL certificate active (if production)

## 💾 Backup Setup

### 1. Database Backup
- [ ] Backup script created
  ```bash
  nano backup.sh
  ```
- [ ] Backup script executable
  ```bash
  chmod +x backup.sh
  ```
- [ ] Crontab configured
  ```bash
  crontab -e
  # Add: 0 2 * * * /path/to/backup.sh
  ```
- [ ] Test backup
  ```bash
  ./backup.sh
  ```

### 2. Manual Backup
- [ ] Initial backup created
  ```bash
  cp -r data data.backup.$(date +%Y%m%d)
  ```

## 📊 Monitoring Setup

### 1. Basic Monitoring
- [ ] PM2 monitoring enabled
- [ ] Logs being written
- [ ] Disk space monitored
  ```bash
  df -h
  ```
- [ ] Memory usage monitored
  ```bash
  free -h
  ```

### 2. Alerts (Optional)
- [ ] Email alerts configured for errors
- [ ] Discord/Telegram webhook for notifications
- [ ] Resource usage alerts

## 📝 Documentation

- [ ] Admin credentials documented
- [ ] API credentials stored securely
- [ ] Backup location documented
- [ ] Recovery procedure documented
- [ ] Support contacts noted

## 🎯 Go-Live Checklist

### Pre-Launch
- [ ] All tests passed
- [ ] Backup created
- [ ] Monitoring active
- [ ] Payment gateway in production mode
- [ ] Bot username shared with users

### Launch
- [ ] Bot made public
- [ ] First real transaction tested
- [ ] All flows working correctly
- [ ] Support channel ready

### Post-Launch
- [ ] Monitor for first 24 hours
- [ ] Check logs regularly
- [ ] Verify cronjobs running
- [ ] Test support flow
- [ ] Document any issues

## 🆘 Emergency Contacts

```
Payment Gateway Support: __________________
VPS Provider Support: __________________
Your Contact: __________________
Admin Telegram: __________________
```

## 📱 Quick Commands Reference

```bash
# Status
pm2 status
pm2 logs chatgpt-bot

# Restart
pm2 restart chatgpt-bot

# Stop
pm2 stop chatgpt-bot

# Monitor
pm2 monit

# Backup
cp -r data data.backup.$(date +%Y%m%d)

# View logs
tail -f logs/out.log
tail -f logs/err.log

# Test components
node test.js all
```

## ✅ Final Sign-Off

- [ ] All checklist items completed
- [ ] System fully tested
- [ ] Backups in place
- [ ] Monitoring active
- [ ] Documentation complete
- [ ] Emergency procedures ready

**Deployment Date:** _____________

**Deployed By:** _____________

**Notes:**
```
_________________________________________________
_________________________________________________
_________________________________________________
```

---

## 🎉 Congratulations!

Your ChatGPT Auto Invite Bot is now live!

**Remember:**
- Monitor logs regularly
- Keep backups updated
- Test periodically
- Update dependencies
- Review security

**Support:** Check README.md for troubleshooting

---

**Good luck with your bot! 🚀**
