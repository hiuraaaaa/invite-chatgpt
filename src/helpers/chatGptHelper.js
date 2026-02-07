const { chromium } = require('playwright');

/**
 * ChatGPT Helper - Automated invite sender
 * Menggunakan Playwright untuk automasi browser
 */

class ChatGPTHelper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.isLoggedIn = false;
  }

  /**
   * Initialize browser and login to ChatGPT
   */
  async initialize() {
    try {
      console.log('🚀 Initializing browser...');
      
      this.browser = await chromium.launch({
        headless: true, // Ubah ke false untuk debugging
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      this.page = await this.browser.newPage();
      
      // Login ke ChatGPT
      await this.login();
      
      this.isLoggedIn = true;
      console.log('✅ Browser initialized and logged in');
      
    } catch (error) {
      console.error('❌ Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Login to ChatGPT
   */
  async login() {
    const email = process.env.CHATGPT_EMAIL;
    const password = process.env.CHATGPT_PASSWORD;

    if (!email || !password) {
      throw new Error('ChatGPT credentials not set in .env');
    }

    console.log('🔐 Logging in to ChatGPT...');

    try {
      // Navigate to ChatGPT
      await this.page.goto('https://chat.openai.com/auth/login', {
        waitUntil: 'networkidle'
      });

      // Click "Log in" button
      await this.page.click('button:has-text("Log in")');
      await this.page.waitForTimeout(2000);

      // Enter email
      await this.page.fill('input[type="email"]', email);
      await this.page.click('button:has-text("Continue")');
      await this.page.waitForTimeout(2000);

      // Enter password
      await this.page.fill('input[type="password"]', password);
      await this.page.click('button:has-text("Continue")');
      
      // Wait for redirect to main page
      await this.page.waitForURL('https://chat.openai.com/**', { timeout: 30000 });
      
      console.log('✅ Successfully logged in');

    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  }

  /**
   * Send invite to email
   */
  async sendInvite(email) {
    if (!this.isLoggedIn) {
      await this.initialize();
    }

    console.log(`📧 Sending invite to: ${email}`);

    try {
      // Navigate to team settings (jika pakai Team)
      // Untuk Plus individual, skip ke bagian sharing
      
      const workspaceId = process.env.CHATGPT_WORKSPACE_ID;
      
      if (workspaceId) {
        // Team/Workspace invite
        await this.sendTeamInvite(email, workspaceId);
      } else {
        // Plus individual - share conversation
        await this.sendPlusInvite(email);
      }

      console.log('✅ Invite sent successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to send invite:', error);
      throw error;
    }
  }

  /**
   * Send team workspace invite
   */
  async sendTeamInvite(email, workspaceId) {
    // Navigate to workspace settings
    await this.page.goto(`https://chat.openai.com/admin/${workspaceId}/members`, {
      waitUntil: 'networkidle'
    });

    await this.page.waitForTimeout(2000);

    // Click "Invite member" button
    await this.page.click('button:has-text("Invite")');
    await this.page.waitForTimeout(1000);

    // Enter email
    await this.page.fill('input[type="email"]', email);
    
    // Select role (member/admin)
    // Default: member
    
    // Click send invite
    await this.page.click('button:has-text("Send invite")');
    
    await this.page.waitForTimeout(2000);
  }

  /**
   * Send Plus individual access (via conversation sharing)
   * Note: Ini workaround untuk Plus individual
   */
  async sendPlusInvite(email) {
    // Untuk Plus individual, kita bisa share conversation dengan custom link
    // Atau bisa gunakan metode lain sesuai kebutuhan
    
    // Navigate to main chat
    await this.page.goto('https://chat.openai.com/', {
      waitUntil: 'networkidle'
    });

    await this.page.waitForTimeout(2000);

    // Create new chat
    await this.page.click('[aria-label="New chat"]');
    await this.page.waitForTimeout(1000);

    // Type welcome message
    await this.page.fill('textarea', `Welcome! Your ChatGPT access is ready. Contact: ${email}`);
    await this.page.keyboard.press('Enter');
    
    await this.page.waitForTimeout(3000);

    // Share conversation
    await this.page.click('button[aria-label="Share"]');
    await this.page.waitForTimeout(1000);

    // Copy link (alternatif method)
    await this.page.click('button:has-text("Copy link")');
    
    // Di sini bisa tambahkan logic untuk kirim link via email API
    // Atau save link ke database untuk diakses user
  }

  /**
   * Remove access (expired)
   */
  async removeAccess(email) {
    if (!this.isLoggedIn) {
      await this.initialize();
    }

    console.log(`🗑️ Removing access for: ${email}`);

    try {
      const workspaceId = process.env.CHATGPT_WORKSPACE_ID;
      
      if (!workspaceId) {
        console.log('⚠️ No workspace ID, skipping removal');
        return false;
      }

      // Navigate to members page
      await this.page.goto(`https://chat.openai.com/admin/${workspaceId}/members`, {
        waitUntil: 'networkidle'
      });

      await this.page.waitForTimeout(2000);

      // Search for user by email
      const memberRow = await this.page.locator(`tr:has-text("${email}")`);
      
      if (await memberRow.count() > 0) {
        // Click options menu
        await memberRow.locator('button[aria-label="Options"]').click();
        await this.page.waitForTimeout(500);

        // Click remove
        await this.page.click('button:has-text("Remove")');
        await this.page.waitForTimeout(500);

        // Confirm removal
        await this.page.click('button:has-text("Confirm")');
        await this.page.waitForTimeout(2000);

        console.log('✅ Access removed successfully');
        return true;
      } else {
        console.log('⚠️ User not found in members list');
        return false;
      }

    } catch (error) {
      console.error('❌ Failed to remove access:', error);
      throw error;
    }
  }

  /**
   * Check if invite is still valid
   */
  async checkInviteStatus(email) {
    if (!this.isLoggedIn) {
      await this.initialize();
    }

    try {
      const workspaceId = process.env.CHATGPT_WORKSPACE_ID;
      
      if (!workspaceId) {
        return { exists: false, status: 'unknown' };
      }

      await this.page.goto(`https://chat.openai.com/admin/${workspaceId}/members`, {
        waitUntil: 'networkidle'
      });

      await this.page.waitForTimeout(2000);

      const memberRow = await this.page.locator(`tr:has-text("${email}")`);
      const exists = await memberRow.count() > 0;

      if (exists) {
        // Check status (active, pending, etc)
        const statusText = await memberRow.locator('td').nth(2).textContent();
        return { exists: true, status: statusText.trim().toLowerCase() };
      }

      return { exists: false, status: 'not_found' };

    } catch (error) {
      console.error('❌ Failed to check status:', error);
      return { exists: false, status: 'error' };
    }
  }

  /**
   * Close browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.isLoggedIn = false;
      console.log('🔒 Browser closed');
    }
  }
}

// Singleton instance
let chatGPTHelper = null;

/**
 * Get or create ChatGPT helper instance
 */
function getChatGPTHelper() {
  if (!chatGPTHelper) {
    chatGPTHelper = new ChatGPTHelper();
  }
  return chatGPTHelper;
}

/**
 * Send invite wrapper
 */
async function sendInvite(email) {
  const helper = getChatGPTHelper();
  return await helper.sendInvite(email);
}

/**
 * Remove access wrapper
 */
async function removeAccess(email) {
  const helper = getChatGPTHelper();
  return await helper.removeAccess(email);
}

/**
 * Check invite status wrapper
 */
async function checkInviteStatus(email) {
  const helper = getChatGPTHelper();
  return await helper.checkInviteStatus(email);
}

module.exports = {
  sendInvite,
  removeAccess,
  checkInviteStatus,
  getChatGPTHelper
};
