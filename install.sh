#!/bin/bash

echo "🚀 Installing ChatGPT Auto Invite Bot..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found!"
    echo "Please install Node.js v16 or higher first."
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Install Playwright browsers
echo "🎭 Installing Playwright browsers..."
npx playwright install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install Playwright browsers"
    exit 1
fi

echo "✅ Playwright browsers installed"
echo ""

# Install Playwright dependencies
echo "📚 Installing Playwright system dependencies..."
npx playwright install-deps

echo ""

# Create data directory
echo "📁 Creating data directory..."
mkdir -p data
mkdir -p logs

echo "✅ Directories created"
echo ""

# Copy .env.example to .env if not exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created"
    echo "⚠️  Please edit .env file and fill in your credentials!"
else
    echo "ℹ️  .env file already exists"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Installation complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. Edit .env file: nano .env"
echo "2. Fill in all required credentials"
echo "3. Test run: npm start"
echo "4. Deploy with PM2: pm2 start ecosystem.config.js"
echo ""
echo "📖 For detailed instructions, read README.md"
echo ""
