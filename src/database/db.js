const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const fs = require('fs');

// Pastikan folder data ada
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const adapter = new FileSync(path.join(dataDir, 'database.json'));
const db = low(adapter);

// Set default structure
db.defaults({
  users: [],
  transactions: [],
  invites: [],
  settings: {
    pricing: {
      day1: parseInt(process.env.PRICE_1_DAY) || 10000,
      day7: parseInt(process.env.PRICE_7_DAY) || 50000,
      day30: parseInt(process.env.PRICE_30_DAY) || 150000
    }
  }
}).write();

module.exports = db;
