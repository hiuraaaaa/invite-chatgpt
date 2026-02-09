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
🤖 *ChatGPT Auto Invite Bot*

Halo *${username}*! 👋
Dapatkan akses ChatGPT Plus/Team secara otomatis dan instant!

━━━━━━━━━━━━━━━━━━━━━━━━━

💎 *PAKET TERSEDIA*

*1 Hari* • Rp ${formatPrice(db.get('settings.pricing.day1').value())}
Perfect untuk trial!

*7 Hari* • Rp ${formatPrice(db.get('settings.pricing.day7').value())} ⭐
Best value!

*30 Hari* • Rp ${formatPrice(db.get('settings.pricing.day30').value())}
Full access sebulan!

━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ *CARA ORDER*

1️⃣ Pilih paket yang kamu mau
2️⃣ Bayar via QRIS (semua e-wallet)
3️⃣ Kirim alamat email kamu
4️⃣ Invite langsung masuk inbox! ✉️

━━━━━━━━━━━━━━━━━━━━━━━━━

✨ *Kenapa pilih kami?*
• ⚡ Proses otomatis & cepat
• 🔒 Aman & terpercaya
• 💯 Garansi resend jika invite hilang
• 🤖 Bot aktif 24/7

Yuk pilih paket kamu sekarang! 👇
  `;

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '💎 1 Hari', callback_data: 'package_1' },
          { text: '💎 7 Hari ⭐', callback_data: 'package_7' }
        ],
        [
          { text: '💎 30 Hari', callback_data: 'package_30' }
        ],
        [
          { text: '📊 Cek Status Paket', callback_data: 'check_status' }
        ],
        [
          { text: '❓ Bantuan', callback_data: 'help' },
          { text: '📞 Hubungi Admin', url: 'https://t.me/yourusername' }
        ]
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
  } else if (data.startsWith('confirm_order_')) {
    const days = data.split('_')[2];
    await handleOrderConfirmation(chatId, days, messageId);
  } else if (data === 'check_status') {
    await handleCheckStatus(chatId);
  } else if (data === 'help') {
    await handleHelp(chatId);
  } else if (data.startsWith('confirm_')) {
    const invoiceId = data.split('_')[1];
    await handleConfirmPayment(chatId, invoiceId);
  } else if (data === 'cancel') {
    bot.editMessageText('❌ *Transaksi Dibatalkan*\n\nKetik /start untuk order lagi.', {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown'
    });
    delete userStates[chatId];
  } else if (data === 'main_menu') {
    // Trigger /start again
    const fakeMsg = {
      chat: { id: chatId },
      from: query.from,
      text: '/start'
    };
    bot.emit('message', fakeMsg);
  }
});

// Handle package selection
async function handlePackageSelection(chatId, days, messageId) {
  const pricing = db.get('settings.pricing').value();
  let price, packageName, savings, perDay;

  switch(days) {
    case '1':
      price = pricing.day1;
      packageName = '1 Hari';
      perDay = price;
      savings = '';
      break;
    case '7':
      price = pricing.day7;
      packageName = '7 Hari';
      perDay = Math.round(price / 7);
      savings = `\n💰 *Hemat!* Hanya Rp ${formatPrice(perDay)}/hari`;
      break;
    case '30':
      price = pricing.day30;
      packageName = '30 Hari';
      perDay = Math.round(price / 30);
      savings = `\n💰 *Super hemat!* Hanya Rp ${formatPrice(perDay)}/hari`;
      break;
    default:
      return;
  }

  // Show confirmation message
  const confirmMessage = `
✅ *KONFIRMASI PEMBELIAN*

━━━━━━━━━━━━━━━━━━━━━━━━━

📦 *Paket:* ${packageName}
💰 *Harga:* Rp ${formatPrice(price)}${savings}

━━━━━━━━━━━━━━━━━━━━━━━━━

🎁 *Yang Kamu Dapat:*

• ⚡ Akses ChatGPT Plus selama ${packageName}
• 📧 Auto-invite instant ke email
• 🔄 Garansi resend jika invite hilang
• 💬 Support 24/7
• 🔒 100% aman & terpercaya

━━━━━━━━━━━━━━━━━━━━━━━━━

💳 *Metode Pembayaran:*
QRIS (OVO, DANA, GoPay, ShopeePay, LinkAja, dll)

━━━━━━━━━━━━━━━━━━━━━━━━━

Lanjut ke pembayaran?
  `;

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Ya, Lanjut Bayar', callback_data: `confirm_order_${days}` },
        ],
        [
          { text: '🔄 Pilih Paket Lain', callback_data: 'main_menu' }
        ],
        [
          { text: '❌ Batalkan', callback_data: 'cancel' }
        ]
      ]
    }
  };

  bot.editMessageText(confirmMessage, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'Markdown',
    ...keyboard
  });
}

// Handle order confirmation (new function)
async function handleOrderConfirmation(chatId, days, messageId) {
  const pricing = db.get('settings.pricing').value();
  let price, packageName, savings;

  switch(days) {
    case '1':
      price = pricing.day1;
      packageName = '1 Hari';
      savings = '';
      break;
    case '7':
      price = pricing.day7;
      packageName = '7 Hari';
      const perDay7 = Math.round(price / 7);
      savings = `\n💰 Hemat! Hanya Rp ${formatPrice(perDay7)}/hari`;
      break;
    case '30':
      price = pricing.day30;
      packageName = '30 Hari';
      const perDay30 = Math.round(price / 30);
      savings = `\n💰 Super hemat! Hanya Rp ${formatPrice(perDay30)}/hari`;
      break;
    default:
      return;
  }

  // Generate invoice
  bot.editMessageText('⏳ *Memproses...*\n\nSedang membuat invoice pembayaran untuk kamu...', {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'Markdown'
  });

  try {
    const invoice = await createInvoice({
      chatId,
      package: packageName,
      days: parseInt(days),
      amount: price
    });

    const invoiceMessage = `
💳 *INVOICE PEMBAYARAN*

📦 *Paket:* ${packageName}
💰 *Total:* Rp ${formatPrice(price)}${savings}

🔖 *Invoice ID:*
\`${invoice.reference}\`

━━━━━━━━━━━━━━━━━━━━━━━━━

📱 *CARA BAYAR*

1️⃣ Klik tombol *"Lihat QR Code"* di bawah
2️⃣ Scan QR Code dengan aplikasi:
   • OVO • DANA • GoPay • ShopeePay
   • LinkAja • Bank Digital lainnya
3️⃣ Konfirmasi pembayaran
4️⃣ Tunggu notifikasi dari bot ✅

⏰ *Berlaku sampai:* ${invoice.expired_time}

━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ *PENTING:*
Setelah bayar, bot akan *otomatis* mendeteksi pembayaran kamu dan meminta email untuk invite ChatGPT.

Jangan tutup chat ini! 🔔
    `;

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📱 Lihat QR Code', url: invoice.qr_url }],
          [{ text: '🔄 Cek Status Pembayaran', callback_data: `confirm_${invoice.reference}` }],
          [{ text: '❌ Batalkan', callback_data: 'cancel' }],
          [{ text: '🏠 Menu Utama', callback_data: 'main_menu' }]
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
    bot.editMessageText(
      '❌ *Gagal Membuat Invoice*\n\n' +
      'Terjadi kesalahan saat membuat invoice. Silakan coba lagi atau hubungi admin.\n\n' +
      'Ketik /start untuk mencoba lagi.',
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown'
      }
    );
  }
}

// Handle payment confirmation check
async function handleConfirmPayment(chatId, invoiceId) {
  const transaction = db.get('transactions').find({ reference: invoiceId }).value();

  if (!transaction) {
    bot.sendMessage(chatId, 
      '❌ *Invoice Tidak Ditemukan*\n\n' +
      'Invoice dengan ID tersebut tidak ditemukan di sistem.\n\n' +
      'Ketik /start untuk order baru.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  if (transaction.status === 'PAID') {
    bot.sendMessage(chatId, 
      '✅ *Pembayaran Terverifikasi!*\n\n' +
      'Pembayaran kamu sudah kami terima.\n' +
      'Bot sedang memproses invite kamu...\n\n' +
      'Tunggu sebentar ya! ⏳',
      { parse_mode: 'Markdown' }
    );
  } else if (transaction.status === 'EXPIRED') {
    bot.sendMessage(chatId, 
      '⏰ *Invoice Expired*\n\n' +
      'Invoice ini sudah kadaluarsa.\n' +
      'Silakan buat invoice baru.\n\n' +
      'Ketik /start untuk order lagi.',
      { parse_mode: 'Markdown' }
    );
  } else {
    bot.sendMessage(chatId, 
      '⏳ *Menunggu Pembayaran*\n\n' +
      'Pembayaran kamu belum terdeteksi.\n\n' +
      '📌 *Pastikan:*\n' +
      '• Kamu sudah scan QR Code\n' +
      '• Pembayaran sudah dikonfirmasi\n' +
      '• Tunggu 1-2 menit untuk verifikasi\n\n' +
      'Coba cek lagi dalam beberapa saat.',
      { parse_mode: 'Markdown' }
    );
  }
}

// Handle check status
async function handleCheckStatus(chatId) {
  const invites = db.get('invites')
    .filter({ chatId })
    .sortBy('createdAt')
    .reverse()
    .value();

  if (invites.length === 0) {
    const noPackageMsg = `
📭 *Belum Ada Paket Aktif*

Kamu belum memiliki paket aktif saat ini.

Yuk order sekarang dan dapatkan akses ChatGPT Plus! 🚀

Ketik /start untuk mulai order.
    `;
    
    bot.sendMessage(chatId, noPackageMsg, { parse_mode: 'Markdown' });
    return;
  }

  let statusMessage = `
📊 *STATUS PAKET KAMU*

━━━━━━━━━━━━━━━━━━━━━━━━━

`;

  invites.forEach((inv, index) => {
    const isActive = inv.status === 'active';
    const statusIcon = isActive ? '✅' : '❌';
    const statusText = isActive ? 'AKTIF' : inv.status.toUpperCase();
    const expiredDate = new Date(inv.expiredAt);
    const now = new Date();
    const daysLeft = Math.ceil((expiredDate - now) / (1000 * 60 * 60 * 24));
    
    statusMessage += `${index + 1}. ${statusIcon} *Paket ${inv.package}*\n`;
    statusMessage += `   📧 Email: ${inv.email}\n`;
    statusMessage += `   📅 Expired: ${expiredDate.toLocaleString('id-ID', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}\n`;
    
    if (isActive && daysLeft > 0) {
      statusMessage += `   ⏰ Sisa: ${daysLeft} hari lagi\n`;
    }
    
    statusMessage += `   📌 Status: ${statusText}\n\n`;
  });

  statusMessage += `━━━━━━━━━━━━━━━━━━━\n\n`;
  statusMessage += `💡 *Tips:*\n`;
  statusMessage += `• Paket akan otomatis expired sesuai jadwal\n`;
  statusMessage += `• Kamu akan dapat reminder 1 hari sebelum expired\n`;
  statusMessage += `• Perpanjang kapan saja dengan /start\n`;

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔄 Perpanjang Paket', callback_data: 'main_menu' }],
        [{ text: '🏠 Menu Utama', callback_data: 'main_menu' }]
      ]
    }
  };

  bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown', ...keyboard });
}

// Handle help
async function handleHelp(chatId) {
  const helpMessage = `
❓ *BANTUAN & FAQ*

━━━━━━━━━━━━━━━━━━━━━━━━━

*Q: Invite masuk berapa lama?*
A: Biasanya *langsung* setelah pembayaran terverifikasi, maksimal *5 menit*.

*Q: Apa yang harus saya lakukan setelah bayar?*
A: Tunggu notifikasi dari bot, lalu kirim email kamu ketika diminta.

*Q: Bisa pakai email apa saja?*
A: Ya! Bisa pakai *Gmail, Yahoo, Outlook*, atau email lain. Yang penting email aktif.

*Q: Kalau invite hilang gimana?*
A: Tenang! Sistem akan *otomatis kirim ulang* invite selama paket masih aktif. 🔄

*Q: Bot aktif 24 jam?*
A: Ya, bot berjalan *otomatis 24/7*. Bisa order kapan aja!

*Q: Apakah aman?*
A: 100% aman! Data kamu dienkripsi dan tidak disimpan setelah transaksi selesai. 🔒

*Q: Cara perpanjang paket?*
A: Ketik /start dan pilih paket baru sebelum paket lama expired.

*Q: Support pembayaran apa aja?*
A: QRIS mendukung semua e-wallet:
• OVO • DANA • GoPay • ShopeePay
• LinkAja • dan bank digital lainnya

━━━━━━━━━━━━━━━━━━━━━━━━━

💬 *Masih ada pertanyaan?*
Hubungi admin: @yourusername

🏠 Ketik /start untuk kembali ke menu utama
  `;

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📞 Hubungi Admin', url: 'https://t.me/yourusername' }],
        [{ text: '🏠 Menu Utama', callback_data: 'main_menu' }]
      ]
    }
  };

  bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown', ...keyboard });
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
      bot.sendMessage(chatId, 
        '❌ *Format Email Tidak Valid*\n\n' +
        'Email yang kamu kirim tidak valid.\n\n' +
        '📌 *Contoh email yang benar:*\n' +
        '• nama@gmail.com\n' +
        '• email@yahoo.com\n' +
        '• user@outlook.com\n\n' +
        'Silakan kirim email yang benar.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const processingMsg = await bot.sendMessage(chatId, 
      '⏳ *Memproses Invite...*\n\n' +
      '🔄 Sedang mengirim invite ke email kamu\n' +
      '📧 Email: ' + text + '\n\n' +
      'Tunggu sebentar ya... Biasanya 10-30 detik. ⏱️',
      { parse_mode: 'Markdown' }
    );

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

      // Delete processing message
      bot.deleteMessage(chatId, processingMsg.message_id);

      const successMessage = `
✅ *INVITE BERHASIL DIKIRIM!*

🎉 Selamat! Invite sudah dikirim ke email kamu!

━━━━━━━━━━━━━━━━━━━━━━━━━

📧 *Email:* ${text}
📦 *Paket:* ${state.package}
⏰ *Aktif sampai:* ${expiredDate.toLocaleString('id-ID', {
  day: '2-digit',
  month: 'short', 
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}

━━━━━━━━━━━━━━━━━━━━━━━━━

📬 *LANGKAH SELANJUTNYA*

1️⃣ Cek *inbox* email kamu
2️⃣ Buka email dari *ChatGPT Team*
3️⃣ Klik tombol *"Accept Invitation"*
4️⃣ Login dan mulai pakai ChatGPT Plus! 🚀

━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ *Catatan Penting:*
• Jika tidak ada di inbox, cek folder *Spam/Junk*
• Email invite valid selama 7 hari
• Sistem garansi: invite akan auto-resend jika hilang

━━━━━━━━━━━━━━━━━━━━━━━━━

💡 *Tips:*
• Kamu akan dapat reminder 1 hari sebelum expired
• Perpanjang kapan saja dengan /start
• Simpan chat ini untuk referensi

🙏 *Terima kasih sudah menggunakan layanan kami!*

Selamat menikmati ChatGPT Plus! ✨
      `;

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📊 Cek Status Paket', callback_data: 'check_status' }],
            [{ text: '💎 Order Lagi', callback_data: 'main_menu' }],
            [{ text: '❓ Bantuan', callback_data: 'help' }]
          ]
        }
      };

      bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown', ...keyboard });

      // Clear state
      delete userStates[chatId];

    } catch (error) {
      console.error('Error sending invite:', error);
      
      // Delete processing message
      bot.deleteMessage(chatId, processingMsg.message_id);
      
      bot.sendMessage(chatId, 
        '❌ *Gagal Mengirim Invite*\n\n' +
        'Terjadi kesalahan saat mengirim invite.\n\n' +
        '📞 *Silakan hubungi admin:*\n' +
        '@yourusername\n\n' +
        'Sertakan Invoice ID:\n' +
        `\`${state.invoiceId}\`\n\n` +
        'Kami akan segera membantu! 🙏',
        { parse_mode: 'Markdown' }
      );
    }
  }
});

// Export bot dan userStates
module.exports = { bot, userStates };

// Helper function
function formatPrice(price) {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
