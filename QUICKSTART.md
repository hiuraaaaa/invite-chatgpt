# 🚀 Quick Start Guide

Panduan cepat untuk menjalankan bot dalam 10 menit!

## 📋 Prerequisites

1. VPS/Server Ubuntu (minimal 1GB RAM)
2. Domain atau subdomain (untuk callback URL)
3. Akun ChatGPT Plus/Team
4. Akun payment gateway (Tripay/Midtrans/Duitku)
5. Bot Telegram token dari @BotFather

## ⚡ Installation (5 menit)

### 1. Upload project ke VPS

```bash
# Upload via SFTP atau clone dari repo
cd /home/yourusername
# Extract file zip atau clone repo
```

### 2. Run installer

```bash
cd chatgpt-invite-bot
chmod +x install.sh
./install.sh
```

Script akan otomatis:
- Install dependencies
- Install Playwright browsers
- Create folder dan .env

### 3. Configure .env

```bash
nano .env
```

**WAJIB DIISI:**
```env
TELEGRAM_BOT_TOKEN=your_bot_token
PAYMENT_PROVIDER=tripay
TRIPAY_API_KEY=your_api_key
TRIPAY_PRIVATE_KEY=your_private_key
TRIPAY_MERCHANT_CODE=your_code
CHATGPT_EMAIL=your_email
CHATGPT_PASSWORD=your_password
CALLBACK_URL=https://yourdomain.com/callback/payment
```

### 4. Setup Nginx (jika belum)

```bash
sudo apt update
sudo apt install nginx -y

# Edit config
sudo nano /etc/nginx/sites-available/default
```

Paste config ini:

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
        proxy_cache_bypass $http_upgrade;
    }
}
```

Restart:

```bash
sudo systemctl restart nginx
```

### 5. Test Run

```bash
npm start
```

Buka Telegram dan test bot dengan `/start`

## 🎯 Production Deploy (2 menit)

### Install PM2

```bash
npm install -g pm2
```

### Start bot

```bash
pm2 start ecosystem.config.js
```

### Auto-start on reboot

```bash
pm2 startup
pm2 save
```

### Monitor

```bash
pm2 status
pm2 logs chatgpt-bot
```

## ✅ Verification Checklist

- [ ] Bot merespon `/start` di Telegram
- [ ] Bisa pilih paket dan generate QRIS
- [ ] Callback URL bisa diakses dari luar
- [ ] Test pembayaran di sandbox mode
- [ ] Invite terkirim setelah bayar
- [ ] Cronjob berjalan (cek logs)

## 🐛 Common Issues

### Bot tidak merespon

```bash
# Check logs
pm2 logs chatgpt-bot

# Restart
pm2 restart chatgpt-bot
```

### Callback tidak masuk

```bash
# Test dengan curl
curl -X POST http://localhost:3000/callback/payment \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Check nginx
sudo nginx -t
sudo systemctl status nginx
```

### Playwright error

```bash
# Reinstall browsers
npx playwright install --with-deps
```

## 📞 Payment Gateway Setup

### Tripay (Recommended)

1. Daftar: https://tripay.co.id/member/signup
2. Verifikasi akun
3. Menu Developer → API Key
4. Copy API Key, Private Key, Merchant Code
5. Set callback URL: `https://yourdomain.com/callback/payment`
6. Test dengan sandbox mode

### Midtrans

1. Daftar: https://dashboard.midtrans.com/register
2. Settings → Access Keys
3. Settings → Configuration → Payment Notification URL
4. Set: `https://yourdomain.com/callback/payment`

### Duitku

1. Daftar: https://passport.duitku.com/register
2. Project → API
3. Callback URL: `https://yourdomain.com/callback/payment`

## 🎓 Bot Commands

### User Commands
- `/start` - Start bot dan lihat menu

### Admin Commands (tambahkan sendiri jika perlu)
- Bisa ditambahkan di `src/bot/telegram.js`

## 📊 Monitoring Production

### Check status

```bash
pm2 status
```

### View logs

```bash
pm2 logs chatgpt-bot --lines 100
```

### Monitor resources

```bash
pm2 monit
```

### Restart bot

```bash
pm2 restart chatgpt-bot
```

## 🔄 Update Bot

```bash
# Stop bot
pm2 stop chatgpt-bot

# Backup database
cp -r data data.backup.$(date +%Y%m%d)

# Update code (jika ada perubahan)
# git pull atau upload file baru

# Install dependencies
npm install

# Restart
pm2 restart chatgpt-bot
```

## 💡 Tips

1. **Gunakan sandbox mode** untuk testing
2. **Backup database** secara berkala
3. **Monitor logs** untuk error
4. **Set reminder** untuk renewal credentials
5. **Test callback** sebelum go-live

## 🆘 Need Help?

1. Cek README.md untuk dokumentasi lengkap
2. Review logs: `pm2 logs chatgpt-bot`
3. Test components individually
4. Check server resources: `htop` atau `free -h`

## 🎉 Done!

Jika semua berjalan lancar:
- Bot aktif 24/7 ✅
- Payment otomatis ✅
- Invite terkirim otomatis ✅
- Cronjob handle expired ✅

**Selamat! Bot kamu sudah siap digunakan! 🚀**

---

Need more details? Read **README.md**
