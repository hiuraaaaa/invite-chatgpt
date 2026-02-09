const axios = require('axios');
const crypto = require('crypto');
const db = require('../database/db');

/**
 * Create invoice based on selected payment provider
 */
async function createInvoice(data) {
  const { chatId, package: packageName, days, amount } = data;
  const provider = process.env.PAYMENT_PROVIDER || 'tripay';

  // Generate unique reference
  const reference = `INV-${Date.now()}-${chatId}`;

  // Simpan transaksi ke database
  const transaction = {
    reference,
    chatId,
    package: packageName,
    days,
    amount,
    status: 'UNPAID',
    createdAt: new Date().toISOString(),
    provider
  };

  db.get('transactions').push(transaction).write();

  // Buat invoice sesuai provider
  let invoice;
  
  switch(provider) {
    case 'tripay':
      invoice = await createTripayInvoice(reference, amount);
      break;
    case 'midtrans':
      invoice = await createMidtransInvoice(reference, amount);
      break;
    case 'duitku':
      invoice = await createDuitkuInvoice(reference, amount);
      break;
    default:
      throw new Error('Payment provider tidak didukung');
  }

  // Update transaction dengan invoice data
  db.get('transactions')
    .find({ reference })
    .assign({
      invoiceData: invoice,
      qrUrl: invoice.qr_url,
      expiredTime: invoice.expired_time
    })
    .write();

  return {
    reference,
    qr_url: invoice.qr_url,
    expired_time: invoice.expired_time,
    checkout_url: invoice.checkout_url || invoice.qr_url
  };
}

/**
 * TRIPAY Implementation - FIXED VERSION
 */
async function createTripayInvoice(reference, amount) {
  const apiKey = process.env.TRIPAY_API_KEY;
  const privateKey = process.env.TRIPAY_PRIVATE_KEY;
  const merchantCode = process.env.TRIPAY_MERCHANT_CODE;
  const mode = process.env.TRIPAY_MODE || 'sandbox';

  const baseUrl = mode === 'production' 
    ? 'https://tripay.co.id/api'
    : 'https://tripay.co.id/api-sandbox';

  // Generate signature SEBELUM create data object
  const signature = crypto
    .createHmac('sha256', privateKey)
    .update(merchantCode + reference + amount)
    .digest('hex');

  console.log('🔐 Tripay Signature Generated:', signature);

  const data = {
    method: 'QRISC',
    merchant_ref: reference,
    amount: amount,
    customer_name: 'Customer',
    customer_email: 'customer@example.com',
    order_items: [
      {
        name: 'ChatGPT Invite',
        price: amount,
        quantity: 1
      }
    ],
    callback_url: process.env.CALLBACK_URL,
    return_url: 'https://t.me/yourbotusername',
    expired_time: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 jam
    signature: signature  // ← INI YANG PENTING!
  };

  console.log('📤 Sending request to Tripay:', {
    url: `${baseUrl}/transaction/create`,
    merchant_ref: reference,
    amount: amount,
    signature: signature
  });

  try {
    const response = await axios.post(`${baseUrl}/transaction/create`, data, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Tripay Response:', response.data);

    if (response.data.success) {
      const trxData = response.data.data;
      return {
        qr_url: trxData.qr_url,
        checkout_url: trxData.checkout_url,
        expired_time: new Date(trxData.expired_time * 1000).toLocaleString('id-ID')
      };
    } else {
      throw new Error(response.data.message);
    }
  } catch (error) {
    console.error('❌ Tripay error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * MIDTRANS Implementation
 */
async function createMidtransInvoice(reference, amount) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const mode = process.env.MIDTRANS_MODE || 'sandbox';

  const baseUrl = mode === 'production'
    ? 'https://app.midtrans.com'
    : 'https://app.sandbox.midtrans.com';

  const authString = Buffer.from(serverKey + ':').toString('base64');

  const data = {
    transaction_details: {
      order_id: reference,
      gross_amount: amount
    },
    credit_card: {
      secure: true
    },
    customer_details: {
      email: 'customer@example.com',
      first_name: 'Customer'
    },
    enabled_payments: ['qris']
  };

  try {
    const response = await axios.post(`${baseUrl}/snap/v1/transactions`, data, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      }
    });

    return {
      qr_url: response.data.redirect_url,
      checkout_url: response.data.redirect_url,
      expired_time: new Date(Date.now() + (24 * 60 * 60 * 1000)).toLocaleString('id-ID')
    };
  } catch (error) {
    console.error('Midtrans error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * DUITKU Implementation
 */
async function createDuitkuInvoice(reference, amount) {
  const merchantKey = process.env.DUITKU_MERCHANT_KEY;
  const merchantCode = process.env.DUITKU_MERCHANT_CODE;
  const mode = process.env.DUITKU_MODE || 'sandbox';

  const baseUrl = mode === 'production'
    ? 'https://passport.duitku.com'
    : 'https://sandbox.duitku.com';

  const paymentMethod = 'SP'; // QRIS
  const merchantOrderId = reference;
  const paymentAmount = amount;
  const email = 'customer@example.com';
  const productDetails = 'ChatGPT Invite';
  const callbackUrl = process.env.CALLBACK_URL;
  const returnUrl = 'https://t.me/yourbotusername';
  const expiryPeriod = 1440; // 24 jam dalam menit

  // Generate signature
  const signatureString = `${merchantCode}${merchantOrderId}${paymentAmount}${merchantKey}`;
  const signature = crypto.createHash('md5').update(signatureString).digest('hex');

  const data = {
    merchantCode,
    paymentAmount,
    paymentMethod,
    merchantOrderId,
    productDetails,
    email,
    callbackUrl,
    returnUrl,
    signature,
    expiryPeriod
  };

  try {
    const response = await axios.post(`${baseUrl}/webapi/api/merchant/v2/inquiry`, data, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.statusCode === '00') {
      return {
        qr_url: response.data.qrString,
        checkout_url: response.data.paymentUrl,
        expired_time: new Date(Date.now() + (24 * 60 * 60 * 1000)).toLocaleString('id-ID')
      };
    } else {
      throw new Error(response.data.statusMessage);
    }
  } catch (error) {
    console.error('Duitku error:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { createInvoice };
