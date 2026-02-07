#!/usr/bin/env node

/**
 * Test Script - Test individual components
 * Usage: node test.js [component]
 * 
 * Components:
 * - database
 * - payment
 * - chatgpt
 * - cronjob
 * - all
 */

require('dotenv').config();
const db = require('./src/database/db');

const tests = {
  database: async () => {
    console.log('\n🧪 Testing Database...\n');
    
    try {
      // Test write
      const testUser = {
        chatId: 999999999,
        username: 'test_user',
        createdAt: new Date().toISOString()
      };
      
      db.get('users').push(testUser).write();
      console.log('✅ Write test passed');
      
      // Test read
      const user = db.get('users').find({ chatId: 999999999 }).value();
      if (user) {
        console.log('✅ Read test passed');
        console.log('   User:', user.username);
      }
      
      // Test update
      db.get('users')
        .find({ chatId: 999999999 })
        .assign({ username: 'updated_user' })
        .write();
      console.log('✅ Update test passed');
      
      // Test delete
      db.get('users').remove({ chatId: 999999999 }).write();
      console.log('✅ Delete test passed');
      
      console.log('\n✅ Database tests completed!\n');
      
    } catch (error) {
      console.error('❌ Database test failed:', error);
    }
  },
  
  payment: async () => {
    console.log('\n🧪 Testing Payment System...\n');
    
    try {
      const { createInvoice } = require('./src/payment/invoiceHandler');
      
      console.log('📝 Creating test invoice...');
      
      const invoice = await createInvoice({
        chatId: 999999999,
        package: 'Test Package',
        days: 1,
        amount: 1000
      });
      
      console.log('✅ Invoice created successfully!');
      console.log('   Reference:', invoice.reference);
      console.log('   QR URL:', invoice.qr_url);
      console.log('   Expired:', invoice.expired_time);
      
      // Cleanup
      db.get('transactions').remove({ reference: invoice.reference }).write();
      
      console.log('\n✅ Payment tests completed!\n');
      
    } catch (error) {
      console.error('❌ Payment test failed:', error);
      console.log('\nℹ️  Make sure you have set up payment gateway credentials in .env');
    }
  },
  
  chatgpt: async () => {
    console.log('\n🧪 Testing ChatGPT Helper...\n');
    
    try {
      const { getChatGPTHelper } = require('./src/helpers/chatGptHelper');
      
      console.log('🔐 Initializing ChatGPT helper...');
      console.log('   This may take a minute...\n');
      
      const helper = getChatGPTHelper();
      await helper.initialize();
      
      console.log('✅ ChatGPT helper initialized successfully!');
      console.log('✅ Login successful!');
      
      console.log('\n🧹 Cleaning up...');
      await helper.close();
      
      console.log('\n✅ ChatGPT tests completed!\n');
      
    } catch (error) {
      console.error('❌ ChatGPT test failed:', error);
      console.log('\nℹ️  Make sure you have set up ChatGPT credentials in .env');
      console.log('   CHATGPT_EMAIL and CHATGPT_PASSWORD');
    }
  },
  
  cronjob: async () => {
    console.log('\n🧪 Testing Cronjobs...\n');
    
    try {
      const expiredChecker = require('./src/cronjobs/expiredChecker');
      
      console.log('⏰ Testing expired checker...');
      await expiredChecker.checkExpiredUsers();
      console.log('✅ Expired checker works!');
      
      console.log('\n⏰ Testing reminder sender...');
      await expiredChecker.sendExpiryReminders();
      console.log('✅ Reminder sender works!');
      
      console.log('\n✅ Cronjob tests completed!\n');
      
    } catch (error) {
      console.error('❌ Cronjob test failed:', error);
    }
  },
  
  env: async () => {
    console.log('\n🧪 Testing Environment Variables...\n');
    
    const required = [
      'TELEGRAM_BOT_TOKEN',
      'PAYMENT_PROVIDER',
      'CHATGPT_EMAIL',
      'CHATGPT_PASSWORD',
      'CALLBACK_URL'
    ];
    
    const missing = [];
    
    required.forEach(key => {
      if (!process.env[key]) {
        missing.push(key);
        console.log(`❌ ${key} is not set`);
      } else {
        console.log(`✅ ${key} is set`);
      }
    });
    
    if (missing.length > 0) {
      console.log('\n⚠️  Missing environment variables:');
      missing.forEach(key => console.log(`   - ${key}`));
      console.log('\nPlease set them in .env file\n');
    } else {
      console.log('\n✅ All required environment variables are set!\n');
    }
  },
  
  all: async () => {
    console.log('\n🧪 Running All Tests...\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await tests.env();
    await tests.database();
    await tests.payment();
    // Skip ChatGPT test in "all" as it takes time
    await tests.cronjob();
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 All tests completed!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
};

// Main
const component = process.argv[2] || 'all';

if (tests[component]) {
  tests[component]()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
} else {
  console.log('\n❌ Unknown component:', component);
  console.log('\nAvailable components:');
  console.log('  - database');
  console.log('  - payment');
  console.log('  - chatgpt');
  console.log('  - cronjob');
  console.log('  - env');
  console.log('  - all');
  console.log('\nUsage: node test.js [component]\n');
  process.exit(1);
}
