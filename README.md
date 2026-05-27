# Ramo2 Klaviyo MCP Server

MCP Server for autonomous email marketing management with Klaviyo and Shopify.

## Features

- 📧 Create email templates with dynamic Shopify product content
- 🔄 Manage automation flows (abandoned cart, welcome, newsletter, promotions)
- 📊 Analyze campaign performance
- 🛒 Sync Shopify products to Klaviyo catalog
- 🤖 Autonomous agent for weekly marketing recommendations

## Setup

1. Clone repo
2. Install dependencies: `npm install`
3. Create `.env` file with:
   - `KLAVIYO_API_KEY`
   - `SHOPIFY_ADMIN_TOKEN`
   - `SHOPIFY_STORE`
   - `ANTHROPIC_API_KEY`

4. Run: `npm start`

## Deployment on Railway

1. Connect GitHub repo to Railway
2. Set environment variables in Railway dashboard
3. Deploy

## Usage

The server runs autonomously and provides recommendations via Claude for email marketing optimization.
