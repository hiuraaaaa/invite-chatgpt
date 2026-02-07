# 🤖 Bot Auto Invite ChatGPT

Bot otomatis untuk mengirim invite ChatGPT Plus/Team dengan sistem pembayaran QRIS terintegrasi.

## ⚡ Fitur

✅ Bot Telegram 24/7
✅ Pembayaran QRIS otomatis (Tripay/Midtrans/Duitku)
✅ Auto invite ChatGPT setelah pembayaran
✅ Sistem garansi - resend invite otomatis jika hilang
✅ Auto remove access saat expired
✅ Reminder sebelum expired
✅ Database lengkap untuk tracking

## 📋 Requirement

- Node.js v16 atau lebih baru
- VPS/Server dengan akses 24/7
- Akun ChatGPT Plus atau Team
- Payment Gateway account (pilih salah satu):
  - Tripay
  - Midtrans
  - Duitku
- Bot Telegram (dapatkan token dari @BotFather)

## 🚀 Instalasi

### 1. Clone atau Download Project

```bash
cd /home/yourusername
# Upload folder project ke VPS
```

### 2. Install Dependencies

```bash
cd chatgpt-invite-bot
npm install
```

### 3. Install Playwright Browsers

```bash
npx playwright install
npx playwright install-deps
```

### 4. Setup Environment Variables

```bash
cp .env.example .env
nano .env
```

Isi semua konfigurasi yang diperlukan:

```env
# BOT CONFIGURATION
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
PORT=3000

# PAYMENT GATEWAY
PAYMENT_PROVIDER=tripay  # tripay, midtrans, atau duitku

# TRIPAY
TRIPAY_API_KEY=your_api_key
TRIPAY_PRIVATE_KEY=your_private_key
TRIPAY_MERCHANT_CODE=your_merchant_code
TRIPAY_MODE=sandbox  # atau production

# CHATGPT CREDENTIALS
CHATGPT_EMAIL=your_email@gmail.com
CHATGPT_PASSWORD=your_password
CHATGPT_WORKSPACE_ID=  # Kosongkan jika Plus individual

# PRICING (Rupiah)
PRICE_1_DAY=10000
PRICE_7_DAY=50000
PRICE_30_DAY=150000

# CALLBACK URL
CALLBACK_URL=https://yourdomain.com/callback/payment
```

### 5. Setup Callback URL

Pastikan VPS kamu bisa diakses dari luar:

```bash
# Install nginx (jika belum)
sudo apt install nginx

# Setup reverse proxy
sudo nano /etc/nginx/sites-available/default
```

Tambahkan konfigurasi:

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

Restart nginx:

```bash
sudo systemctl restart nginx
```

### 6. Test Run

```bash
npm start
```

Cek apakah bot berjalan tanpa error.

### 7. Setup PM2 (untuk produksi)

```bash
# Install PM2
npm install -g pm2

# Start bot
pm2 start src/index.js --name chatgpt-bot

# Auto start on reboot
pm2 startup
pm2 save

# Monitor
pm2 logs chatgpt-bot
pm2 status
```

## 📊 Struktur Database

Database disimpan di `data/database.json`:

```json
{
  "users": [
    {
      "chatId": 123456789,
      "username": "user123",
      "createdAt": "2025-02-02T10:00:00.000Z"
    }
  ],
  "transactions": [
    {
      "reference": "INV-1706860800000-ABC123",
      "chatId": 123456789,
      "package": "7 Hari",
      "days": 7,
      "amount": 50000,
      "status": "PAID",
      "email": "user@example.com",
      "createdAt": "2025-02-02T10:00:00.000Z",
      "paidAt": "2025-02-02T10:05:00.000Z"
    }
  ],
  "invites": [
    {
      "chatId": 123456789,
      "email": "user@example.com",
      "package": "7 Hari",
      "days": 7,
      "status": "active",
      "createdAt": "2025-02-02T10:05:00.000Z",
      "expiredAt": "2025-02-09T10:05:00.000Z",
      "invoiceId": "INV-1706860800000-ABC123"
    }
  ]
}
```

## 🔄 Cronjob Schedule

Bot menjalankan cronjob otomatis:

- **Setiap jam** - Cek dan hapus akses user yang expired
- **Setiap hari jam 9 pagi** - Kirim reminder 24 jam sebelum expired
- **Setiap 6 jam** (optional) - Cek invite yang hilang dan kirim ulang

## 🧪 Testing

### Test Bot Telegram

1. Cari bot kamu di Telegram
2. Ketik `/start`
3. Pilih paket
4. Test pembayaran (gunakan sandbox mode)

### Test Payment Callback

```bash
# Test dengan curl
curl -X POST http://localhost:3000/callback/payment \
  -H "Content-Type: application/json" \
  -d '{
    "merchant_ref": "INV-1706860800000-TEST",
    "status": "PAID"
  }'
```

### Test Cronjob

```bash
node src/cronjobs/expiredChecker.js
```

## 📱 Command Bot

- `/start` - Mulai bot dan tampilkan menu
- Tombol inline untuk navigasi

## 🛠️ Troubleshooting

### Bot tidak merespon

```bash
# Cek logs
pm2 logs chatgpt-bot

# Restart bot
pm2 restart chatgpt-bot
```

### Payment callback tidak masuk

1. Cek apakah URL callback sudah benar di payment gateway
2. Cek firewall VPS (buka port 80/443)
3. Cek logs nginx: `sudo tail -f /var/log/nginx/error.log`

### Invite gagal terkirim

1. Cek credentials ChatGPT di .env
2. Cek apakah browser bisa login (set `headless: false` untuk debugging)
3. Cek logs Playwright

### Database corrupt

```bash
# Backup dulu
cp data/database.json data/database.backup.json

# Reset database
rm data/database.json
npm start  # Akan create database baru
```

## 🔐 Security

- **Jangan commit file .env** ke Git
- Gunakan HTTPS untuk callback URL
- Validasi signature payment callback
- Rate limiting untuk API endpoint
- Sanitasi input user

## 📈 Monitoring

### Setup Monitoring Dashboard

```bash
# Install PM2 Plus (optional)
pm2 plus

# Monitoring metrics
pm2 monit
```

### Log Rotation

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## 💰 Payment Gateway Setup

### Tripay

1. Daftar di https://tripay.co.id
2. Dapatkan API Key dan Private Key
3. Setup callback URL di dashboard Tripay
4. Test dengan sandbox mode dulu

### Midtrans

1. Daftar di https://midtrans.com
2. Dapatkan Server Key dan Client Key
3. Setup notification URL
4. Test dengan sandbox mode

### Duitku

1. Daftar di https://duitku.com
2. Dapatkan Merchant Key dan Code
3. Setup callback URL
4. Test dengan sandbox mode

## ⚠️ Disclaimer

**PENTING:**

Sistem ini melakukan automasi yang kemungkinan melanggar Terms of Service OpenAI. Gunakan dengan risiko Anda sendiri.

Risiko yang mungkin terjadi:
- Akun ChatGPT bisa di-ban
- Suspend permanen
- Masalah hukum

Disarankan untuk:
- Gunakan untuk testing pribadi
- Pertimbangkan alternatif legal (OpenAI API)
- Baca ToS OpenAI dengan teliti

## 📝 License

MIT License - Gunakan dengan tanggung jawab sendiri.

## 🤝 Support

Jika ada masalah atau butuh bantuan:
- Check documentation
- Review logs
- Open issue (jika ada repo)

## 🔄 Update

```bash
# Backup database
cp -r data data.backup

# Pull updates (jika ada)
git pull

# Install new dependencies
npm install

# Restart
pm2 restart chatgpt-bot
```

---

**Happy Coding! 🚀**

*Remember: Test everything in sandbox mode first!*
