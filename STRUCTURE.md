# 📁 Project Structure

```
chatgpt-invite-bot/
│
├── src/
│   ├── index.js                    # Main entry point
│   │
│   ├── bot/
│   │   └── telegram.js             # Telegram bot logic
│   │
│   ├── database/
│   │   └── db.js                   # Database handler (LowDB)
│   │
│   ├── payment/
│   │   └── invoiceHandler.js       # Payment invoice creation
│   │
│   ├── routes/
│   │   └── payment.js              # Payment callback routes
│   │
│   ├── helpers/
│   │   ├── chatGptHelper.js        # ChatGPT automation (Playwright)
│   │   └── paymentHelper.js        # Payment utilities
│   │
│   └── cronjobs/
│       └── expiredChecker.js       # Auto-check expired users
│
├── data/
│   └── database.json               # JSON database (auto-created)
│
├── logs/
│   ├── out.log                     # Output logs
│   └── err.log                     # Error logs
│
├── .env                            # Environment variables (IMPORTANT!)
├── .env.example                    # Environment template
├── .gitignore                      # Git ignore rules
│
├── package.json                    # NPM dependencies
├── ecosystem.config.js             # PM2 configuration
│
├── install.sh                      # Installation script
├── test.js                         # Component testing script
│
├── README.md                       # Main documentation
├── QUICKSTART.md                   # Quick start guide
└── ADVANCED.md                     # Advanced features guide
```

## 📝 File Descriptions

### Core Files

**src/index.js**
- Main application entry point
- Initializes Express server
- Sets up cronjobs
- Starts Telegram bot

**src/bot/telegram.js**
- Handles all Telegram bot interactions
- Command handlers (/start, etc)
- Callback query handlers (buttons)
- Message processing (email input)
- State management for user flows

**src/database/db.js**
- Database initialization
- LowDB adapter setup
- Default schema creation

### Payment System

**src/payment/invoiceHandler.js**
- Creates payment invoices
- Supports multiple providers (Tripay/Midtrans/Duitku)
- Generates QR codes
- Manages invoice expiry

**src/routes/payment.js**
- Express routes for payment callbacks
- Signature validation
- Status mapping
- Triggers email request after payment

### Automation

**src/helpers/chatGptHelper.js**
- Playwright browser automation
- ChatGPT login automation
- Send invite functionality
- Remove access functionality
- Invite status checking

**src/cronjobs/expiredChecker.js**
- Check expired users (hourly)
- Auto-remove access
- Send expiry reminders
- Resend missing invites
- Database cleanup

### Utilities

**src/helpers/paymentHelper.js**
- Signature generation/validation
- Price formatting
- Email validation
- Utility functions

## 🗄️ Database Schema

```javascript
{
  "users": [
    {
      "chatId": 123456789,
      "username": "john_doe",
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
      "inviteSent": true,
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
      "invoiceId": "INV-1706860800000-ABC123",
      "reminderSent": false,
      "resendLog": []
    }
  ],
  "settings": {
    "pricing": {
      "day1": 10000,
      "day7": 50000,
      "day30": 150000
    }
  }
}
```

## 🔄 Data Flow

### 1. User Orders Package

```
User → /start → Bot shows packages → User selects → Create invoice
```

### 2. Payment Process

```
Invoice created → User pays → Gateway callback → Verify signature → Update status
```

### 3. Invite Process

```
Payment verified → Request email → User sends email → Send invite → Update database
```

### 4. Expiry Process

```
Cronjob runs → Check expired → Remove access → Send notification → Update status
```

## 🔐 Environment Variables

Required in `.env`:

```
TELEGRAM_BOT_TOKEN          # Bot token dari @BotFather
PORT                        # Server port (default: 3000)

PAYMENT_PROVIDER            # tripay/midtrans/duitku
TRIPAY_API_KEY             # Tripay credentials
TRIPAY_PRIVATE_KEY
TRIPAY_MERCHANT_CODE
TRIPAY_MODE                # sandbox/production

CHATGPT_EMAIL              # ChatGPT login email
CHATGPT_PASSWORD           # ChatGPT login password
CHATGPT_WORKSPACE_ID       # (Optional) untuk Team

PRICE_1_DAY                # Harga paket 1 hari
PRICE_7_DAY                # Harga paket 7 hari
PRICE_30_DAY               # Harga paket 30 hari

CALLBACK_URL               # URL untuk payment callback
```

## 📊 Status Values

### Transaction Status
- `UNPAID` - Belum dibayar
- `PAID` - Sudah dibayar
- `EXPIRED` - Invoice expired
- `FAILED` - Payment gagal

### Invite Status
- `active` - Invite aktif
- `expired` - Sudah expired
- `expired_error` - Error saat remove access
- `cancelled` - Dibatalkan manual

## 🚀 Deployment Checklist

- [ ] VPS/Server ready
- [ ] Node.js installed (v16+)
- [ ] Domain/subdomain configured
- [ ] Nginx installed and configured
- [ ] SSL certificate (recommended)
- [ ] Payment gateway account setup
- [ ] Telegram bot created
- [ ] ChatGPT account ready
- [ ] .env file configured
- [ ] Dependencies installed
- [ ] Playwright browsers installed
- [ ] Test run successful
- [ ] PM2 configured
- [ ] Cronjobs running
- [ ] Monitoring setup
- [ ] Backup strategy in place

## 🔍 Important Directories

### /data
- Contains `database.json`
- Auto-created on first run
- **Must be backed up regularly**
- Not committed to git

### /logs
- PM2 logs stored here
- `out.log` - Standard output
- `err.log` - Error output
- Rotated automatically with pm2-logrotate

### /node_modules
- NPM packages
- Auto-installed
- Not committed to git

## 🛠️ Scripts

### Development
```bash
npm start          # Start bot normally
npm run dev        # Start with nodemon (auto-reload)
```

### Testing
```bash
node test.js env      # Test environment variables
node test.js database # Test database
node test.js payment  # Test payment system
node test.js chatgpt  # Test ChatGPT automation
node test.js all      # Run all tests
```

### Production
```bash
pm2 start ecosystem.config.js  # Start with PM2
pm2 stop chatgpt-bot          # Stop bot
pm2 restart chatgpt-bot       # Restart bot
pm2 logs chatgpt-bot          # View logs
pm2 monit                     # Monitor resources
```

### Maintenance
```bash
./install.sh                  # Initial installation
node src/cronjobs/expiredChecker.js  # Manual cronjob run
```

## 📦 Dependencies Overview

### Production Dependencies
- `express` - Web framework
- `node-telegram-bot-api` - Telegram bot
- `dotenv` - Environment variables
- `axios` - HTTP client
- `node-cron` - Cronjob scheduler
- `lowdb` - JSON database
- `moment` - Date/time manipulation
- `playwright` - Browser automation

### Dev Dependencies
- `nodemon` - Auto-reload during development

## 🎯 Key Features by File

| Feature | File | Description |
|---------|------|-------------|
| Bot Commands | `bot/telegram.js` | /start, callbacks |
| Payment | `payment/invoiceHandler.js` | Create invoices |
| Callbacks | `routes/payment.js` | Handle webhooks |
| Automation | `helpers/chatGptHelper.js` | Send/remove invites |
| Scheduling | `cronjobs/expiredChecker.js` | Auto-expire |
| Database | `database/db.js` | Data persistence |

---

**This structure is optimized for:**
- ✅ Easy maintenance
- ✅ Clear separation of concerns
- ✅ Scalability
- ✅ Easy debugging
- ✅ Simple deployment
