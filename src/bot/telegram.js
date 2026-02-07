const TelegramBot = require('node-telegram-bot-api');
const db = require('../database/db');
const paymentHelper = require('../helpers/paymentHelper');
const { createInvoice } = require('../payment/invoiceHandler');

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// State management untuk tracking user state
const userStates = {};

// Command: /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username || msg.from.first_name;

  // Simpan atau update user
  let user = db.get('users').find({ chatId }).value();
  
  if (!user) {
    db.get('users').push({
      chatId,
      username,
      createdAt: new Date().toISOString()
    }).write();
  }

  const welcomeMessage = `
🤖 *Selamat datang di Bot Auto Invite ChatGPT!*

Halo ${username}! 👋

Bot ini akan membantu kamu mendapatkan akses ke ChatGPT Plus/Team secara otomatis.

━━━━━━━━━━━━━━━━━━━━

✅ *Paket Tersedia:*
💎 1 Hari - Rp ${formatPrice(db.get('settings.pricing.day1').value())}
💎 7 Hari - Rp ${formatPrice(db.get('settings.pricing.day7').value())}
💎 30 Hari - Rp ${formatPrice(db.get('settings.pricing.day30').value())}

━━━━━━━━━━━━━━━━━━━━

⏩ *Cara Order:*
1️⃣ Pilih paket
2️⃣ Bayar via QRIS
3️⃣ Kirim email kamu
4️⃣ Invite otomatis dikirim

━━━━━━━━━━━━━━━━━━━━

Pilih paket yang kamu mau:
  `;

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '💎 1 Hari', callback_data: 'package_1' }],
        [{ text: '💎 7 Hari', callback_data: 'package_7' }],
        [{ text: '💎 30 Hari', callback_data: 'package_30' }],
        [{ text: '📊 Cek Status', callback_data: 'check_status' }],
        [{ text: '❓ Bantuan', callback_data: 'help' }]
      ]
    }
  };

  bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown', ...keyboard });
});

// Handle callback query (tombol)
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const messageId = query.message.message_id;

  // Answer callback query
  bot.answerCallbackQuery(query.id);

  if (data.startsWith('package_')) {
    const days = data.split('_')[1];
    await handlePackageSelection(chatId, days, messageId);
  } else if (data === 'check_status') {
    await handleCheckStatus(chatId);
  } else if (data === 'help') {
    await handleHelp(chatId);
  } else if (data.startsWith('confirm_')) {
    const invoiceId = data.split('_')[1];
    await handleConfirmPayment(chatId, invoiceId);
  } else if (data === 'cancel') {
    bot.editMessageText('❌ Transaksi dibatalkan.', {
      chat_id: chatId,
      message_id: messageId
    });
    delete userStates[chatId];
  }
});

// Handle package selection
async function handlePackageSelection(chatId, days, messageId) {
  const pricing = db.get('settings.pricing').value();
  let price, packageName;

  switch(days) {
    case '1':
      price = pricing.day1;
      packageName = '1 Hari';
      break;
    case '7':
      price = pricing.day7;
      packageName = '7 Hari';
      break;
    case '30':
      price = pricing.day30;
      packageName = '30 Hari';
      break;
    default:
      return;
  }

  // Buat invoice
  bot.editMessageText('⏳ Membuat invoice pembayaran...', {
    chat_id: chatId,
    message_id: messageId
  });

  try {
    const invoice = await createInvoice({
      chatId,
      package: packageName,
      days: parseInt(days),
      amount: price
    });

    const invoiceMessage = `
💳 *Invoice Pembayaran*

📦 Paket: ${packageName}
💰 Total: Rp ${formatPrice(price)}
🔖 Invoice ID: \`${invoice.reference}\`

━━━━━━━━━━━━━━━━━━━━

📱 *Scan QRIS di bawah untuk bayar:*

Atau klik tombol di bawah untuk lihat QR Code.

⏰ Berlaku sampai: ${invoice.expired_time}

━━━━━━━━━━━━━━━━━━━━

Setelah bayar, invoice akan otomatis terverifikasi dan bot akan meminta email kamu.
    `;

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📱 Lihat QR Code', url: invoice.qr_url }],
          [{ text: '🔄 Cek Pembayaran', callback_data: `confirm_${invoice.reference}` }],
          [{ text: '❌ Batal', callback_data: 'cancel' }]
        ]
      }
    };

    bot.editMessageText(invoiceMessage, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      ...keyboard
    });

    // Simpan state
    userStates[chatId] = {
      status: 'waiting_payment',
      invoiceId: invoice.reference,
      package: packageName,
      days: parseInt(days),
      amount: price
    };

  } catch (error) {
    console.error('Error creating invoice:', error);
    bot.editMessageText('❌ Gagal membuat invoice. Silakan coba lagi.', {
      chat_id: chatId,
      message_id: messageId
    });
  }
}

// Handle payment confirmation check
async function handleConfirmPayment(chatId, invoiceId) {
  const transaction = db.get('transactions').find({ reference: invoiceId }).value();

  if (!transaction) {
    bot.sendMessage(chatId, '❌ Invoice tidak ditemukan.');
    return;
  }

  if (transaction.status === 'PAID') {
    bot.sendMessage(chatId, '✅ Pembayaran sudah terverifikasi! Silakan tunggu bot memproses.');
  } else if (transaction.status === 'EXPIRED') {
    bot.sendMessage(chatId, '⏰ Invoice sudah expired. Silakan buat invoice baru.');
  } else {
    bot.sendMessage(chatId, '⏳ Pembayaran belum terdeteksi. Silakan coba lagi dalam beberapa saat.');
  }
}

// Handle check status
async function handleCheckStatus(chatId) {
  const invite = db.get('invites')
    .filter({ chatId })
    .sortBy('createdAt')
    .reverse()
    .value();

  if (invite.length === 0) {
    bot.sendMessage(chatId, '📭 Kamu belum memiliki paket aktif.');
    return;
  }

  let statusMessage = '📊 *Status Paket Kamu:*\n\n';

  invite.forEach((inv, index) => {
    const status = inv.status === 'active' ? '✅' : '❌';
    const expiredDate = new Date(inv.expiredAt).toLocaleString('id-ID');
    
    statusMessage += `${status} *Paket ${inv.package}*\n`;
    statusMessage += `   📧 Email: ${inv.email}\n`;
    statusMessage += `   ⏰ Expired: ${expiredDate}\n`;
    statusMessage += `   📌 Status: ${inv.status}\n\n`;
  });

  bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
}

// Handle help
async function handleHelp(chatId) {
  const helpMessage = `
❓ *Bantuan & FAQ*

━━━━━━━━━━━━━━━━━━━━

*Q: Invite masuk berapa lama?*
A: Biasanya langsung setelah pembayaran terverifikasi, maksimal 5 menit.

*Q: Apa yang harus saya lakukan setelah bayar?*
A: Tunggu notifikasi dari bot, lalu kirim email kamu ketika diminta.

*Q: Bisa pakai email apa saja?*
A: Ya, bisa pakai Gmail, Yahoo, atau email lain.

*Q: Kalau invite hilang gimana?*
A: Sistem akan otomatis kirim ulang invite selama paket masih aktif.

*Q: Bot aktif 24 jam?*
A: Ya, bot berjalan otomatis 24/7.

━━━━━━━━━━━━━━━━━━━━

Butuh bantuan lain? Hubungi admin: @yourusername
  `;

  bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
}

// Handle text messages (untuk email)
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Skip jika command
  if (text && text.startsWith('/')) return;

  // Cek state user
  const state = userStates[chatId];

  if (state && state.status === 'waiting_email') {
    // Validasi email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(text)) {
      bot.sendMessage(chatId, '❌ Format email tidak valid. Silakan kirim email yang benar.');
      return;
    }

    bot.sendMessage(chatId, '⏳ Sedang mengirim invite ke email kamu...');

    // Proses invite
    const chatGptHelper = require('../helpers/chatGptHelper');
    
    try {
      await chatGptHelper.sendInvite(text);

      // Simpan ke database
      const now = new Date();
      const expiredDate = new Date(now.getTime() + (state.days * 24 * 60 * 60 * 1000));

      db.get('invites').push({
        chatId,
        email: text,
        package: state.package,
        days: state.days,
        status: 'active',
        createdAt: now.toISOString(),
        expiredAt: expiredDate.toISOString(),
        invoiceId: state.invoiceId
      }).write();

      // Update transaction
      db.get('transactions')
        .find({ reference: state.invoiceId })
        .assign({ email: text, inviteSent: true })
        .write();

      const successMessage = `
✅ *Invite Berhasil Dikirim!*

📧 Email: ${text}
📦 Paket: ${state.package}
⏰ Aktif sampai: ${expiredDate.toLocaleString('id-ID')}

━━━━━━━━━━━━━━━━━━━━

Silakan cek inbox email kamu dan accept invite dari ChatGPT.

Jika tidak ada di inbox, cek folder Spam/Junk.

━━━━━━━━━━━━━━━━━━━━

Terima kasih sudah menggunakan layanan kami! 🙏
      `;

      bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });

      // Clear state
      delete userStates[chatId];

    } catch (error) {
      console.error('Error sending invite:', error);
      bot.sendMessage(chatId, '❌ Gagal mengirim invite. Silakan hubungi admin.');
    }
  }
});

// Export bot dan userStates
module.exports = { bot, userStates };

// Helper function
function formatPrice(price) {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
