# 🔧 Troubleshooting Guide

Panduan mengatasi masalah umum yang mungkin terjadi.

## 🚨 Common Issues

### 1. Bot Tidak Merespon

**Symptoms:**
- Bot tidak merespon `/start`
- Tidak ada respon sama sekali di Telegram

**Diagnosis:**
```bash
# Check if bot is running
pm2 status

# Check logs
pm2 logs chatgpt-bot --lines 50

# Check process
ps aux | grep node
```

**Solutions:**

**A. Bot tidak jalan**
```bash
pm2 start ecosystem.config.js
```

**B. Token salah**
```bash
# Edit .env
nano .env
# Verify TELEGRAM_BOT_TOKEN

# Restart bot
pm2 restart chatgpt-bot
```

**C. Network issue**
```bash
# Test bot token
curl https://api.telegram.org/bot<YOUR_TOKEN>/getMe

# Check firewall
sudo ufw status
```

---

### 2. Payment Callback Tidak Masuk

**Symptoms:**
- Setelah bayar, bot tidak respon
- Status tetap UNPAID
- Tidak ada notif dari bot

**Diagnosis:**
```bash
# Check if callback endpoint accessible
curl -X POST http://localhost:3000/callback/payment \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Check nginx
sudo nginx -t
sudo systemctl status nginx

# Check logs
pm2 logs chatgpt-bot | grep callback
tail -f /var/log/nginx/access.log
```

**Solutions:**

**A. URL callback salah**
- Login ke dashboard payment gateway
- Pastikan callback URL: `https://yourdomain.com/callback/payment`
- Update jika salah

**B. Nginx tidak jalan**
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

**C. Firewall block**
```bash
sudo ufw allow 'Nginx Full'
sudo ufw reload
```

**D. SSL issue**
```bash
# Renew certificate
sudo certbot renew

# Restart nginx
sudo systemctl restart nginx
```

**E. Signature validation gagal**
- Cek credentials di .env
- Pastikan PRIVATE_KEY benar
- Test dengan sandbox mode dulu

---

### 3. Invite Gagal Terkirim

**Symptoms:**
- Error saat kirim invite
- Playwright error
- Browser automation gagal

**Diagnosis:**
```bash
# Test ChatGPT helper
node test.js chatgpt

# Check Playwright
npx playwright --version

# Check logs
pm2 logs chatgpt-bot | grep -i playwright
```

**Solutions:**

**A. Credentials salah**
```bash
# Edit .env
nano .env
# Verify CHATGPT_EMAIL & CHATGPT_PASSWORD

# Test manual login ke ChatGPT
```

**B. Playwright browsers missing**
```bash
npx playwright install
npx playwright install-deps
```

**C. 2FA enabled**
- Disable 2FA di akun ChatGPT
- Atau configure proper 2FA handling

**D. ChatGPT structure changed**
- Buka browser dengan headless: false
- Lihat dimana error terjadi
- Update selector di chatGptHelper.js

```javascript
// Set headless false untuk debugging
this.browser = await chromium.launch({
  headless: false  // Changed from true
});
```

**E. Memory issue**
```bash
# Check memory
free -h

# If low, restart bot
pm2 restart chatgpt-bot
```

---

### 4. Database Error

**Symptoms:**
- Error saat save data
- Data hilang
- Corrupt database

**Diagnosis:**
```bash
# Check database file
ls -lh data/database.json

# View content
cat data/database.json | jq .

# Test database
node test.js database
```

**Solutions:**

**A. Permissions issue**
```bash
# Fix permissions
chmod 600 data/database.json
chown $USER:$USER data/database.json
```

**B. Corrupt database**
```bash
# Restore from backup
cp data.backup/database_YYYYMMDD.json data/database.json

# Or reset (WARNING: loses all data)
rm data/database.json
npm start  # Will create new database
```

**C. Disk full**
```bash
# Check disk space
df -h

# Clean up if needed
pm2 flush  # Clear logs
```

---

### 5. Cronjob Tidak Jalan

**Symptoms:**
- User tidak auto-expired
- Reminder tidak terkirim
- Invite tidak auto-resend

**Diagnosis:**
```bash
# Check logs
pm2 logs chatgpt-bot | grep CRONJOB

# Test manual run
node src/cronjobs/expiredChecker.js
```

**Solutions:**

**A. Bot down**
```bash
pm2 restart chatgpt-bot
```

**B. Timezone issue**
```bash
# Check timezone
timedatectl

# Set timezone
sudo timedatectl set-timezone Asia/Jakarta

# Restart bot
pm2 restart chatgpt-bot
```

**C. Cron schedule salah**
- Edit src/index.js
- Verify cron expressions:
  - `'0 * * * *'` = Every hour
  - `'0 9 * * *'` = Every day at 9 AM

---

### 6. High CPU/Memory Usage

**Symptoms:**
- Server lambat
- Bot unresponsive
- High resource usage

**Diagnosis:**
```bash
# Monitor resources
pm2 monit

# Check top processes
htop

# Check memory
free -h
```

**Solutions:**

**A. Memory leak**
```bash
# Restart bot
pm2 restart chatgpt-bot

# Add restart on memory limit
# Edit ecosystem.config.js
max_memory_restart: '500M'  # Lower if needed
```

**B. Too many browser instances**
- Check chatGptHelper.js
- Ensure browser.close() dipanggil
- Add timeout untuk browser sessions

**C. Log files too big**
```bash
# Clear logs
pm2 flush

# Setup log rotation
pm2 install pm2-logrotate
```

---

### 7. Payment Gateway Issues

#### Tripay

**Problem: Invalid signature**
```bash
# Solution: Check credentials
TRIPAY_API_KEY=xxx
TRIPAY_PRIVATE_KEY=xxx
TRIPAY_MERCHANT_CODE=xxx

# Test signature generation
node -e "const crypto = require('crypto'); console.log(crypto.createHmac('sha256', 'YOUR_PRIVATE_KEY').update('YOUR_MERCHANT_CODE' + 'INV123' + '10000').digest('hex'));"
```

**Problem: Callback not received**
- Check callback URL di Tripay dashboard
- Pastikan URL accessible dari internet
- Test dengan webhook.site

#### Midtrans

**Problem: Snap token error**
```bash
# Check server key
MIDTRANS_SERVER_KEY=xxx

# Verify base64 encoding
node -e "console.log(Buffer.from('YOUR_SERVER_KEY:').toString('base64'));"
```

#### Duitku

**Problem: Signature mismatch**
```bash
# Check merchant key
DUITKU_MERCHANT_KEY=xxx

# Test MD5 hash
node -e "const crypto = require('crypto'); console.log(crypto.createHash('md5').update('TEST').digest('hex'));"
```

---

### 8. SSL/HTTPS Issues

**Symptoms:**
- Payment callback SSL error
- Certificate expired
- Mixed content warning

**Solutions:**

**A. Renew certificate**
```bash
sudo certbot renew
sudo systemctl restart nginx
```

**B. Force HTTPS**
```nginx
# Add to nginx config
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

**C. Check certificate**
```bash
sudo certbot certificates
```

---

### 9. Telegram Bot Flooding

**Symptoms:**
- Too many requests error
- Bot temporarily blocked

**Solutions:**

**A. Add rate limiting**
```javascript
// In telegram.js
const messageQueue = [];
let processing = false;

async function processQueue() {
  if (processing) return;
  processing = true;
  
  while (messageQueue.length > 0) {
    const msg = messageQueue.shift();
    await handleMessage(msg);
    await sleep(100); // Rate limit
  }
  
  processing = false;
}
```

**B. Wait for ban to lift**
- Usually lifts in a few hours
- Reduce message frequency

---

### 10. Email Not Sent (from ChatGPT)

**Symptoms:**
- Invite terkirim tapi email tidak masuk
- Email di spam

**Solutions:**

**A. Check spam folder**
- Minta user cek Spam/Junk

**B. Email typo**
- Validasi email format
- Confirm email sebelum kirim

**C. ChatGPT delay**
- Email bisa delayed sampai 10 menit
- Tunggu atau resend

**D. Gmail blocks**
- Gunakan email domain sendiri
- Atau whitelist OpenAI di Gmail

---

## 🔍 Debugging Tools

### 1. Enable Debug Mode

```bash
# Edit .env
DEBUG=true
NODE_ENV=development

# Restart
pm2 restart chatgpt-bot
```

### 2. Verbose Logging

```javascript
// Add to index.js
console.log('[DEBUG]', JSON.stringify(data, null, 2));
```

### 3. Test Individual Components

```bash
# Test environment
node test.js env

# Test database
node test.js database

# Test payment
node test.js payment

# Test ChatGPT
node test.js chatgpt

# Test cronjobs
node test.js cronjob

# Test all
node test.js all
```

### 4. Monitor Real-time

```bash
# Terminal 1: Logs
pm2 logs chatgpt-bot

# Terminal 2: Resources
pm2 monit

# Terminal 3: Network
sudo tcpdump -i any port 3000
```

---

## 🚑 Emergency Procedures

### Complete Reset

```bash
# 1. Stop bot
pm2 stop chatgpt-bot

# 2. Backup database
cp -r data data.backup.emergency.$(date +%Y%m%d_%H%M%S)

# 3. Clear logs
pm2 flush

# 4. Reinstall dependencies (if needed)
rm -rf node_modules
npm install

# 5. Reinstall Playwright
npx playwright install --with-deps

# 6. Start fresh
pm2 restart chatgpt-bot
```

### Rollback to Backup

```bash
# 1. Stop bot
pm2 stop chatgpt-bot

# 2. Restore database
cp data.backup/database_YYYYMMDD.json data/database.json

# 3. Restart
pm2 restart chatgpt-bot
```

### Factory Reset (DANGER!)

```bash
# WARNING: This deletes ALL data!

# 1. Stop bot
pm2 stop chatgpt-bot
pm2 delete chatgpt-bot

# 2. Backup everything
cp -r chatgpt-invite-bot chatgpt-invite-bot.backup

# 3. Remove data
rm -rf data/*
rm -rf logs/*

# 4. Reinstall
./install.sh

# 5. Reconfigure
nano .env

# 6. Start
pm2 start ecosystem.config.js
```

---

## 📞 Getting Help

### Before Asking for Help

Collect this information:

```bash
# System info
uname -a
node -v
npm -v
pm2 -v

# Bot status
pm2 status
pm2 logs chatgpt-bot --lines 100 > logs_export.txt

# Error details
# Copy specific error messages

# Configuration (HIDE SENSITIVE DATA!)
cat .env.example  # NOT .env!

# Recent changes
# What did you change before error?
```

### Include in Support Request

1. ✅ Error message (exact text)
2. ✅ Steps to reproduce
3. ✅ What you've tried
4. ✅ Logs (sanitized)
5. ✅ System info
6. ❌ Don't share: API keys, passwords, tokens

---

## 🎯 Quick Fixes

| Problem | Quick Fix |
|---------|-----------|
| Bot not responding | `pm2 restart chatgpt-bot` |
| High memory | `pm2 restart chatgpt-bot` |
| Logs full | `pm2 flush` |
| Database locked | `pm2 restart chatgpt-bot` |
| Payment not working | Check .env credentials |
| Invite failing | `npx playwright install` |
| Cron not running | Check timezone, restart bot |
| 404 on callback | Check nginx config |
| SSL error | `sudo certbot renew` |
| Disk full | Clear logs, backups |

---

## 📚 Additional Resources

- **README.md** - Full documentation
- **QUICKSTART.md** - Quick setup guide
- **DEPLOYMENT.md** - Production deployment
- **ADVANCED.md** - Advanced features
- **FLOW-DIAGRAM.md** - System architecture

---

**Still stuck? 🤔**

1. Re-read error messages carefully
2. Check logs: `pm2 logs chatgpt-bot`
3. Test components: `node test.js all`
4. Google the specific error
5. Check if issue exists in GitHub issues (if applicable)

**Remember:** Most issues are configuration-related! 💡
