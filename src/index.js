require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const db = require('./database/db');
const bot = require('./bot/telegram');
const paymentRoutes = require('./routes/payment');
const expiredChecker = require('./cronjobs/expiredChecker');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/callback', paymentRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    service: 'ChatGPT Auto Invite Bot',
    uptime: process.uptime()
  });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di port ${PORT}`);
  console.log(`📱 Bot Telegram aktif`);
  console.log(`💳 Payment callback ready di /callback/payment`);
});

// Cronjob - Cek expired setiap jam
cron.schedule('0 * * * *', () => {
  console.log('⏰ Menjalankan cronjob: Cek user expired');
  expiredChecker.checkExpiredUsers();
});

// Cronjob - Cek dan kirim reminder 24 jam sebelum expired
cron.schedule('0 9 * * *', () => {
  console.log('⏰ Menjalankan cronjob: Kirim reminder expired');
  expiredChecker.sendExpiryReminders();
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⛔ Shutting down gracefully...');
  process.exit(0);
});

console.log('✅ Bot ChatGPT Auto Invite siap digunakan!');
