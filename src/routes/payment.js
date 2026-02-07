const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../database/db');
const { bot, userStates } = require('../bot/telegram');

/**
 * Main payment callback endpoint
 * Supports: Tripay, Midtrans, Duitku
 */
router.post('/payment', async (req, res) => {
  const provider = process.env.PAYMENT_PROVIDER || 'tripay';

  console.log('📥 Callback received from:', provider);
  console.log('Body:', req.body);

  try {
    let result;

    switch(provider) {
      case 'tripay':
        result = await handleTripayCallback(req);
        break;
      case 'midtrans':
        result = await handleMidtransCallback(req);
        break;
      case 'duitku':
        result = await handleDuitkuCallback(req);
        break;
      default:
        return res.status(400).json({ message: 'Provider not supported' });
    }

    if (result.success) {
      res.status(200).json({ message: 'Callback processed' });
    } else {
      res.status(400).json({ message: result.message });
    }
  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * Handle Tripay Callback
 */
async function handleTripayCallback(req) {
  const callbackSignature = req.headers['x-callback-signature'];
  const json = req.body;

  // Validasi signature
  const privateKey = process.env.TRIPAY_PRIVATE_KEY;
  const signature = crypto
    .createHmac('sha256', privateKey)
    .update(JSON.stringify(json))
    .digest('hex');

  if (signature !== callbackSignature) {
    console.error('❌ Invalid signature');
    return { success: false, message: 'Invalid signature' };
  }

  const reference = json.merchant_ref;
  const status = json.status;

  // Update transaksi
  const transaction = db.get('transactions').find({ reference }).value();

  if (!transaction) {
    console.error('❌ Transaction not found:', reference);
    return { success: false, message: 'Transaction not found' };
  }

  // Mapping status Tripay
  let newStatus = 'UNPAID';
  if (status === 'PAID') {
    newStatus = 'PAID';
  } else if (status === 'EXPIRED') {
    newStatus = 'EXPIRED';
  } else if (status === 'FAILED') {
    newStatus = 'FAILED';
  }

  db.get('transactions')
    .find({ reference })
    .assign({ 
      status: newStatus,
      paidAt: newStatus === 'PAID' ? new Date().toISOString() : null
    })
    .write();

  // Jika PAID, minta email ke user
  if (newStatus === 'PAID') {
    await sendEmailRequest(transaction.chatId, reference);
  } else if (newStatus === 'EXPIRED') {
    bot.sendMessage(transaction.chatId, '⏰ Invoice kamu sudah expired. Silakan buat invoice baru.');
  }

  return { success: true };
}

/**
 * Handle Midtrans Callback
 */
async function handleMidtransCallback(req) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const json = req.body;

  // Validasi signature
  const signatureKey = json.signature_key;
  const orderId = json.order_id;
  const statusCode = json.status_code;
  const grossAmount = json.gross_amount;

  const mySignature = crypto
    .createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex');

  if (mySignature !== signatureKey) {
    console.error('❌ Invalid signature');
    return { success: false, message: 'Invalid signature' };
  }

  const reference = orderId;
  const transactionStatus = json.transaction_status;

  const transaction = db.get('transactions').find({ reference }).value();

  if (!transaction) {
    console.error('❌ Transaction not found:', reference);
    return { success: false, message: 'Transaction not found' };
  }

  let newStatus = 'UNPAID';
  if (transactionStatus === 'settlement' || transactionStatus === 'capture') {
    newStatus = 'PAID';
  } else if (transactionStatus === 'expire') {
    newStatus = 'EXPIRED';
  } else if (transactionStatus === 'cancel' || transactionStatus === 'deny') {
    newStatus = 'FAILED';
  }

  db.get('transactions')
    .find({ reference })
    .assign({ 
      status: newStatus,
      paidAt: newStatus === 'PAID' ? new Date().toISOString() : null
    })
    .write();

  if (newStatus === 'PAID') {
    await sendEmailRequest(transaction.chatId, reference);
  } else if (newStatus === 'EXPIRED') {
    bot.sendMessage(transaction.chatId, '⏰ Invoice kamu sudah expired. Silakan buat invoice baru.');
  }

  return { success: true };
}

/**
 * Handle Duitku Callback
 */
async function handleDuitkuCallback(req) {
  const merchantKey = process.env.DUITKU_MERCHANT_KEY;
  const json = req.body;

  // Validasi signature
  const merchantCode = json.merchantCode;
  const amount = json.amount;
  const merchantOrderId = json.merchantOrderId;
  const signature = json.signature;

  const signatureString = `${merchantCode}${amount}${merchantOrderId}${merchantKey}`;
  const mySignature = crypto.createHash('md5').update(signatureString).digest('hex');

  if (mySignature !== signature) {
    console.error('❌ Invalid signature');
    return { success: false, message: 'Invalid signature' };
  }

  const reference = merchantOrderId;
  const resultCode = json.resultCode;

  const transaction = db.get('transactions').find({ reference }).value();

  if (!transaction) {
    console.error('❌ Transaction not found:', reference);
    return { success: false, message: 'Transaction not found' };
  }

  let newStatus = 'UNPAID';
  if (resultCode === '00') {
    newStatus = 'PAID';
  } else if (resultCode === '01') {
    newStatus = 'EXPIRED';
  } else {
    newStatus = 'FAILED';
  }

  db.get('transactions')
    .find({ reference })
    .assign({ 
      status: newStatus,
      paidAt: newStatus === 'PAID' ? new Date().toISOString() : null
    })
    .write();

  if (newStatus === 'PAID') {
    await sendEmailRequest(transaction.chatId, reference);
  } else if (newStatus === 'EXPIRED') {
    bot.sendMessage(transaction.chatId, '⏰ Invoice kamu sudah expired. Silakan buat invoice baru.');
  }

  return { success: true };
}

/**
 * Send email request to user after payment success
 */
async function sendEmailRequest(chatId, invoiceId) {
  const transaction = db.get('transactions').find({ reference: invoiceId }).value();

  const message = `
✅ *Pembayaran Berhasil!*

📦 Paket: ${transaction.package}
💰 Total: Rp ${formatPrice(transaction.amount)}

━━━━━━━━━━━━━━━━━━━━

Sekarang silakan kirim *email kamu* untuk menerima invite ChatGPT.

Contoh:
\`nama@gmail.com\`

⚠️ Pastikan email yang kamu kirim benar dan aktif!
  `;

  await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

  // Update user state
  userStates[chatId] = {
    status: 'waiting_email',
    invoiceId,
    package: transaction.package,
    days: transaction.days,
    amount: transaction.amount
  };
}

function formatPrice(price) {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

module.exports = router;
