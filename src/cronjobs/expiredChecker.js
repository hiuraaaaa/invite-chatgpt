const db = require('../database/db');
const { bot } = require('../bot/telegram');
const chatGptHelper = require('../helpers/chatGptHelper');
const moment = require('moment-timezone');

moment.tz.setDefault('Asia/Jakarta');

/**
 * Check and process expired users
 */
async function checkExpiredUsers() {
  console.log('⏰ [CRONJOB] Checking expired users...');

  const now = new Date();
  const invites = db.get('invites')
    .filter({ status: 'active' })
    .value();

  let expiredCount = 0;

  for (const invite of invites) {
    const expiredAt = new Date(invite.expiredAt);

    // Cek jika sudah expired
    if (now >= expiredAt) {
      console.log(`🗑️ Processing expired user: ${invite.email}`);

      try {
        // Remove access dari ChatGPT
        await chatGptHelper.removeAccess(invite.email);

        // Update status di database
        db.get('invites')
          .find({ email: invite.email, chatId: invite.chatId })
          .assign({ 
            status: 'expired',
            removedAt: now.toISOString()
          })
          .write();

        // Kirim notifikasi ke user
        const message = `
⏰ *Paket Kamu Sudah Expired*

📧 Email: ${invite.email}
📦 Paket: ${invite.package}
⏱️ Expired: ${moment(expiredAt).format('DD MMM YYYY HH:mm')}

━━━━━━━━━━━━━━━━━━━━

Access ChatGPT kamu sudah dihapus otomatis.

Ingin perpanjang? Ketik /start untuk order lagi! 🚀
        `;

        await bot.sendMessage(invite.chatId, message, { parse_mode: 'Markdown' });

        expiredCount++;

      } catch (error) {
        console.error(`❌ Failed to remove access for ${invite.email}:`, error);
        
        // Tandai sebagai error tapi tetap set expired
        db.get('invites')
          .find({ email: invite.email, chatId: invite.chatId })
          .assign({ 
            status: 'expired_error',
            error: error.message
          })
          .write();
      }
    }
  }

  console.log(`✅ [CRONJOB] Processed ${expiredCount} expired users`);
  return expiredCount;
}

/**
 * Send reminder 24 hours before expiry
 */
async function sendExpiryReminders() {
  console.log('⏰ [CRONJOB] Sending expiry reminders...');

  const now = new Date();
  const tomorrow = new Date(now.getTime() + (24 * 60 * 60 * 1000));

  const invites = db.get('invites')
    .filter({ status: 'active' })
    .value();

  let reminderCount = 0;

  for (const invite of invites) {
    const expiredAt = new Date(invite.expiredAt);
    
    // Cek apakah expired dalam 24 jam ke depan
    if (expiredAt > now && expiredAt <= tomorrow) {
      
      // Cek apakah sudah pernah dikasih reminder
      if (invite.reminderSent) {
        continue;
      }

      const hoursLeft = Math.floor((expiredAt - now) / (1000 * 60 * 60));

      const message = `
⚠️ *Paket Kamu Akan Segera Expired!*

📧 Email: ${invite.email}
📦 Paket: ${invite.package}
⏱️ Expired dalam: ${hoursLeft} jam
📅 Tanggal: ${moment(expiredAt).format('DD MMM YYYY HH:mm')}

━━━━━━━━━━━━━━━━━━━━

Jangan lupa perpanjang jika masih ingin menggunakan ChatGPT!

Ketik /start untuk order paket baru 🚀
      `;

      try {
        await bot.sendMessage(invite.chatId, message, { parse_mode: 'Markdown' });

        // Tandai sudah dikasih reminder
        db.get('invites')
          .find({ email: invite.email, chatId: invite.chatId })
          .assign({ 
            reminderSent: true,
            reminderSentAt: now.toISOString()
          })
          .write();

        reminderCount++;

      } catch (error) {
        console.error(`❌ Failed to send reminder to ${invite.chatId}:`, error);
      }
    }
  }

  console.log(`✅ [CRONJOB] Sent ${reminderCount} expiry reminders`);
  return reminderCount;
}

/**
 * Auto resend invite if missing (garansi)
 */
async function checkMissingInvites() {
  console.log('⏰ [CRONJOB] Checking missing invites...');

  const invites = db.get('invites')
    .filter({ status: 'active' })
    .value();

  let resendCount = 0;

  for (const invite of invites) {
    try {
      // Cek status invite di ChatGPT
      const status = await chatGptHelper.checkInviteStatus(invite.email);

      // Jika invite hilang/tidak ada, kirim ulang
      if (!status.exists) {
        console.log(`🔄 Resending invite to: ${invite.email}`);

        await chatGptHelper.sendInvite(invite.email);

        // Update log
        const resendLog = invite.resendLog || [];
        resendLog.push({
          resendAt: new Date().toISOString(),
          reason: 'invite_missing'
        });

        db.get('invites')
          .find({ email: invite.email, chatId: invite.chatId })
          .assign({ 
            resendLog,
            lastResendAt: new Date().toISOString()
          })
          .write();

        // Kirim notifikasi ke user
        const message = `
🔄 *Invite Telah Dikirim Ulang*

📧 Email: ${invite.email}

Sistem mendeteksi invite kamu hilang dan sudah mengirim ulang otomatis.

Silakan cek email kamu kembali! 📬
        `;

        await bot.sendMessage(invite.chatId, message, { parse_mode: 'Markdown' });

        resendCount++;
      }

    } catch (error) {
      console.error(`❌ Failed to check/resend for ${invite.email}:`, error);
    }
  }

  console.log(`✅ [CRONJOB] Resent ${resendCount} missing invites`);
  return resendCount;
}

/**
 * Clean up old expired records (optional)
 * Hapus record expired yang sudah lebih dari 30 hari
 */
async function cleanupOldRecords() {
  console.log('⏰ [CRONJOB] Cleaning up old records...');

  const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));

  // Clean expired invites
  const expiredInvites = db.get('invites')
    .filter(invite => {
      if (invite.status.includes('expired')) {
        const expiredAt = new Date(invite.expiredAt);
        return expiredAt < thirtyDaysAgo;
      }
      return false;
    })
    .value();

  if (expiredInvites.length > 0) {
    // Archive dulu sebelum delete (optional)
    const archivePath = './data/archive.json';
    // ... kode archive di sini jika diperlukan

    // Remove from main db
    expiredInvites.forEach(invite => {
      db.get('invites').remove({ email: invite.email, chatId: invite.chatId }).write();
    });

    console.log(`🗑️ Cleaned up ${expiredInvites.length} old records`);
  }

  return expiredInvites.length;
}

// Export functions
module.exports = {
  checkExpiredUsers,
  sendExpiryReminders,
  checkMissingInvites,
  cleanupOldRecords
};

// Jika dijalankan langsung (untuk testing)
if (require.main === module) {
  (async () => {
    console.log('🧪 Running cronjob tests...\n');
    
    await checkExpiredUsers();
    console.log('');
    
    await sendExpiryReminders();
    console.log('');
    
    await checkMissingInvites();
    console.log('');
    
    process.exit(0);
  })();
}
