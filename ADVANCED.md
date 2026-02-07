# 🚀 Advanced Features & Customization

Fitur lanjutan dan cara customize bot sesuai kebutuhan.

## 🎨 Customization

### 1. Ubah Harga Paket

Edit di `.env`:

```env
PRICE_1_DAY=15000
PRICE_7_DAY=75000
PRICE_30_DAY=200000
```

Atau edit langsung di database:

```javascript
db.get('settings.pricing')
  .assign({
    day1: 15000,
    day7: 75000,
    day30: 200000
  })
  .write();
```

### 2. Tambah Paket Custom

Edit `src/bot/telegram.js`:

```javascript
// Tambahkan di welcome message
const keyboard = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '💎 1 Hari', callback_data: 'package_1' }],
      [{ text: '💎 7 Hari', callback_data: 'package_7' }],
      [{ text: '💎 30 Hari', callback_data: 'package_30' }],
      [{ text: '💎 60 Hari', callback_data: 'package_60' }], // NEW
      // ...
    ]
  }
};

// Tambahkan handler
switch(days) {
  case '1':
    price = 10000;
    packageName = '1 Hari';
    break;
  case '60':
    price = 250000;
    packageName = '60 Hari';
    break;
  // ...
}
```

### 3. Custom Welcome Message

Edit di `src/bot/telegram.js` pada command `/start`:

```javascript
const welcomeMessage = `
🤖 *Welcome to My Custom Bot!*

Your custom message here...
`;
```

### 4. Tambah Admin Commands

```javascript
// Tambahkan di src/bot/telegram.js

bot.onText(/\/admin/, async (msg) => {
  const chatId = msg.chat.id;
  const adminIds = [123456789, 987654321]; // ID admin
  
  if (!adminIds.includes(chatId)) {
    bot.sendMessage(chatId, '⛔ Unauthorized');
    return;
  }
  
  // Admin features
  const stats = {
    totalUsers: db.get('users').size().value(),
    activeInvites: db.get('invites').filter({ status: 'active' }).size().value(),
    totalRevenue: db.get('transactions')
      .filter({ status: 'PAID' })
      .sumBy('amount')
      .value()
  };
  
  const message = `
📊 *Admin Dashboard*

👥 Total Users: ${stats.totalUsers}
✅ Active Invites: ${stats.activeInvites}
💰 Total Revenue: Rp ${formatPrice(stats.totalRevenue)}
  `;
  
  bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});
```

## 🔧 Advanced Features

### 1. Referral System

```javascript
// src/helpers/referralHelper.js

function generateReferralCode(chatId) {
  return Buffer.from(chatId.toString()).toString('base64').substring(0, 8);
}

function trackReferral(referrerChatId, newUserChatId) {
  db.get('referrals').push({
    referrer: referrerChatId,
    referred: newUserChatId,
    createdAt: new Date().toISOString(),
    reward: 5000 // Bonus untuk referrer
  }).write();
  
  // Update balance
  db.get('users')
    .find({ chatId: referrerChatId })
    .update('balance', n => (n || 0) + 5000)
    .write();
}

module.exports = { generateReferralCode, trackReferral };
```

### 2. Voucher/Promo Code

```javascript
// src/helpers/voucherHelper.js

function validateVoucher(code) {
  const voucher = db.get('vouchers').find({ code, status: 'active' }).value();
  
  if (!voucher) {
    return { valid: false, message: 'Voucher tidak valid' };
  }
  
  if (new Date() > new Date(voucher.expiredAt)) {
    return { valid: false, message: 'Voucher sudah expired' };
  }
  
  if (voucher.used >= voucher.maxUse) {
    return { valid: false, message: 'Voucher sudah habis' };
  }
  
  return { valid: true, discount: voucher.discount };
}

function applyVoucher(code, amount) {
  const validation = validateVoucher(code);
  
  if (!validation.valid) {
    return { success: false, message: validation.message };
  }
  
  const discount = validation.discount;
  const finalAmount = amount - (amount * discount / 100);
  
  // Increment usage
  db.get('vouchers')
    .find({ code })
    .update('used', n => n + 1)
    .write();
  
  return { success: true, finalAmount, discount };
}
```

### 3. Subscription Auto-Renewal

```javascript
// src/helpers/subscriptionHelper.js

async function autoRenewSubscription(invite) {
  const user = db.get('users').find({ chatId: invite.chatId }).value();
  
  // Cek apakah user memiliki auto-renewal aktif
  if (!user.autoRenewal || !user.paymentMethod) {
    return false;
  }
  
  try {
    // Create invoice otomatis
    const invoice = await createInvoice({
      chatId: invite.chatId,
      package: invite.package,
      days: invite.days,
      amount: invite.amount,
      autoRenewal: true
    });
    
    // Kirim notifikasi
    bot.sendMessage(invite.chatId, `
🔄 *Auto-Renewal Aktif*

Paket kamu akan diperpanjang otomatis.
Invoice telah dibuat: ${invoice.reference}

Untuk membatalkan auto-renewal, ketik /cancel_autorenewal
    `, { parse_mode: 'Markdown' });
    
    return true;
    
  } catch (error) {
    console.error('Auto-renewal failed:', error);
    return false;
  }
}
```

### 4. Multi-Language Support

```javascript
// src/helpers/languageHelper.js

const translations = {
  en: {
    welcome: 'Welcome to ChatGPT Bot!',
    choosePackage: 'Choose your package:',
    paymentSuccess: 'Payment successful!'
  },
  id: {
    welcome: 'Selamat datang di Bot ChatGPT!',
    choosePackage: 'Pilih paket kamu:',
    paymentSuccess: 'Pembayaran berhasil!'
  }
};

function translate(key, lang = 'id') {
  return translations[lang][key] || translations['id'][key];
}

module.exports = { translate };
```

### 5. Analytics & Reporting

```javascript
// src/helpers/analyticsHelper.js

function getDailyStats(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  
  const transactions = db.get('transactions')
    .filter(t => {
      const createdAt = new Date(t.createdAt);
      return createdAt >= start && createdAt <= end && t.status === 'PAID';
    })
    .value();
  
  const revenue = transactions.reduce((sum, t) => sum + t.amount, 0);
  
  return {
    date: date.toISOString().split('T')[0],
    totalTransactions: transactions.length,
    revenue,
    packages: {
      day1: transactions.filter(t => t.days === 1).length,
      day7: transactions.filter(t => t.days === 7).length,
      day30: transactions.filter(t => t.days === 30).length
    }
  };
}

function generateMonthlyReport(year, month) {
  const stats = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    stats.push(getDailyStats(date));
  }
  
  return stats;
}
```

### 6. Webhook untuk Notifikasi External

```javascript
// src/routes/webhook.js

router.post('/discord', async (req, res) => {
  const { event, data } = req.body;
  
  // Kirim ke Discord webhook
  if (event === 'payment_success') {
    await axios.post(process.env.DISCORD_WEBHOOK_URL, {
      content: `💰 New payment: ${data.package} - Rp ${data.amount}`
    });
  }
  
  res.json({ success: true });
});
```

## 🔐 Security Enhancements

### 1. Rate Limiting

```javascript
// src/middleware/rateLimit.js

const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.'
});

// Apply to routes
app.use('/callback', limiter);
```

### 2. IP Whitelist untuk Callback

```javascript
// src/middleware/ipWhitelist.js

const ipWhitelist = (req, res, next) => {
  const allowedIPs = [
    '103.xxx.xxx.xxx', // IP Payment Gateway
    '127.0.0.1'
  ];
  
  const clientIP = req.ip || req.connection.remoteAddress;
  
  if (!allowedIPs.includes(clientIP)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  
  next();
};

router.post('/payment', ipWhitelist, callbackHandler);
```

### 3. Request Signature Validation

Sudah diimplementasi di `src/routes/payment.js` untuk semua provider.

## 📊 Database Optimization

### 1. Indexing (jika pakai MongoDB)

```javascript
// Create indexes
db.collection('transactions').createIndex({ reference: 1 });
db.collection('invites').createIndex({ chatId: 1, status: 1 });
db.collection('users').createIndex({ chatId: 1 });
```

### 2. Database Backup Script

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cp ./data/database.json $BACKUP_DIR/database_$DATE.json

# Keep only last 7 days
find $BACKUP_DIR -name "database_*.json" -mtime +7 -delete

echo "Backup completed: database_$DATE.json"
```

Tambahkan ke crontab:

```bash
0 2 * * * /path/to/backup.sh
```

## 🚀 Performance Optimization

### 1. Caching dengan Redis

```javascript
// src/helpers/cache.js

const redis = require('redis');
const client = redis.createClient();

async function getCache(key) {
  return new Promise((resolve, reject) => {
    client.get(key, (err, data) => {
      if (err) reject(err);
      resolve(JSON.parse(data));
    });
  });
}

async function setCache(key, data, expiry = 3600) {
  return new Promise((resolve, reject) => {
    client.setex(key, expiry, JSON.stringify(data), (err) => {
      if (err) reject(err);
      resolve(true);
    });
  });
}
```

### 2. Queue System untuk Invite

```javascript
// src/helpers/queueHelper.js

const Queue = require('bull');
const inviteQueue = new Queue('invite-processing');

inviteQueue.process(async (job) => {
  const { email } = job.data;
  await chatGptHelper.sendInvite(email);
});

// Add to queue instead of direct processing
async function queueInvite(email, chatId) {
  await inviteQueue.add({ email, chatId });
}
```

## 📱 WhatsApp Bot Alternative

```javascript
// src/bot/whatsapp.js

const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client();

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('WhatsApp bot ready!');
});

client.on('message', async (msg) => {
  if (msg.body === '!start') {
    await msg.reply('Welcome to ChatGPT Bot! 🤖');
  }
});

client.initialize();
```

## 🎯 Tips & Best Practices

1. **Always backup database** before major changes
2. **Test in sandbox mode** before production
3. **Monitor logs regularly** for errors
4. **Set up alerts** for critical errors
5. **Keep credentials secure** - never commit .env
6. **Use PM2 for production** deployment
7. **Implement proper error handling**
8. **Add logging for debugging**
9. **Regular security audits**
10. **Keep dependencies updated**

---

**Need more features? Customize sesuai kebutuhan! 🚀**
