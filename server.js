import Anthropic from "@anthropic-ai/sdk";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const KLAVIYO_API_KEY = process.env.KLAVIYO_API_KEY;
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const SHOPIFY_STORE = process.env.SHOPIFY_STORE;

// ============================================
// KLAVIYO API CLIENT
// ============================================

const klaviyoAPI = axios.create({
  baseURL: "https://a.klaviyo.com/api",
  headers: {
    Authorization: `Klaviyo-Revision 2024-05-15`,
    "X-API-Key": KLAVIYO_API_KEY,
  },
});

// ============================================
// SHOPIFY API CLIENT
// ============================================

const shopifyAPI = axios.create({
  baseURL: `https://${SHOPIFY_STORE}/admin/api/2024-01`,
  headers: {
    "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
    "Content-Type": "application/json",
  },
});

// ============================================
// TOOL IMPLEMENTATIONS
// ============================================

async function getKlaviyoLists() {
  try {
    const response = await klaviyoAPI.get("/lists");
    return JSON.stringify(response.data);
  } catch (error) {
    return JSON.stringify({ error: error.message });
  }
}

async function getKlaviyoSegments() {
  try {
    const response = await klaviyoAPI.get("/segments");
    return JSON.stringify(response.data);
  } catch (error) {
    return JSON.stringify({ error: error.message });
  }
}

async function getKlaviyoFlows() {
  try {
    const response = await klaviyoAPI.get("/flows");
    return JSON.stringify(response.data);
  } catch (error) {
    return JSON.stringify({ error: error.message });
  }
}

async function createEmailTemplate(name, subject, html_content) {
  try {
    const response = await klaviyoAPI.post("/email-templates", {
      data: {
        type: "email-template",
        attributes: {
          name,
          subject,
          html: html_content,
        },
      },
    });
    return JSON.stringify(response.data);
  } catch (error) {
    return JSON.stringify({ error: error.message });
  }
}

async function createFlow(name, trigger, description) {
  try {
    const response = await klaviyoAPI.post("/flows", {
      data: {
        type: "flow",
        attributes: {
          name,
          trigger,
          description,
        },
      },
    });
    return JSON.stringify(response.data);
  } catch (error) {
    return JSON.stringify({ error: error.message });
  }
}

async function getShopifyProducts(limit = 50) {
  try {
    const response = await shopifyAPI.get("/products.json", {
      params: { limit },
    });
    return JSON.stringify(response.data);
  } catch (error) {
    return JSON.stringify({ error: error.message });
  }
}

async function getKlaviyoCampaignStats(days = 7) {
  try {
    const response = await klaviyoAPI.get("/campaigns", {
      params: { limit: 20 },
    });
    return JSON.stringify(response.data);
  } catch (error) {
    return JSON.stringify({ error: error.message });
  }
}

async function syncShopifyProductsToKlaviyo() {
  try {
    const products = await getShopifyProducts(100);
    return JSON.stringify({
      status: "syncing",
      message: "Products sync started",
    });
  } catch (error) {
    return JSON.stringify({ error: error.message });
  }
}

// ============================================
// PROCESS TOOL CALL
// ============================================

async function processToolCall(toolName, toolInput) {
  switch (toolName) {
    case "get_klaviyo_lists":
      return await getKlaviyoLists();
    case "get_klaviyo_segments":
      return await getKlaviyoSegments();
    case "get_klaviyo_flows":
      return await getKlaviyoFlows();
    case "create_email_template":
      return await createEmailTemplate(
        toolInput.name,
        toolInput.subject,
        toolInput.html_content
      );
    case "create_flow":
      return await createFlow(
        toolInput.name,
        toolInput.trigger,
        toolInput.description || ""
      );
    case "get_shopify_products":
      return await getShopifyProducts(toolInput.limit || 50);
    case "get_klaviyo_campaign_stats":
      return await getKlaviyoCampaignStats(toolInput.days || 7);
    case "sync_shopify_products_to_klaviyo":
      return await syncShopifyProductsToKlaviyo();
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

// ============================================
// MCP SERVER
// ============================================

const tools = [
  {
    name: "get_klaviyo_lists",
    description: "Get all email lists from Klaviyo",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_klaviyo_segments",
    description: "Get all segments from Klaviyo",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_klaviyo_flows",
    description: "Get all flows (automation sequences) from Klaviyo",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "create_email_template",
    description: "Create a new email template in Klaviyo",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        subject: { type: "string" },
        html_content: { type: "string" },
      },
      required: ["name", "subject", "html_content"],
    },
  },
  {
    name: "create_flow",
    description: "Create a new automation flow",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        trigger: { type: "string" },
        description: { type: "string" },
      },
      required: ["name", "trigger"],
    },
  },
  {
    name: "get_shopify_products",
    description: "Get all products from Shopify store",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number" },
      },
      required: [],
    },
  },
  {
    name: "get_klaviyo_campaign_stats",
    description: "Get statistics for recent campaigns",
    input_schema: {
      type: "object",
      properties: {
        days: { type: "number" },
      },
      required: [],
    },
  },
  {
    name: "sync_shopify_products_to_klaviyo",
    description: "Sync Shopify products to Klaviyo catalog",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

async function startMCPServer() {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  console.log("🚀 MCP Server starting...");
  console.log(`📍 Store: ${SHOPIFY_STORE}`);
  console.log(`🔑 Klaviyo API: Connected`);
  console.log(`🛒 Shopify API: Connected`);
  console.log(`⚙️  Available tools: ${tools.length}`);

  const messages = [
    {
      role: "user",
      content:
        "You are an autonomous marketing agent for Ramo2 furniture brand. You have access to Klaviyo and Shopify APIs. Your job is to analyze campaign performance and provide recommendations. What would you recommend this week for email marketing optimization?",
    },
  ];

  let iteration = 0;
  const maxIterations = 10;

  while (iteration < maxIterations) {
    iteration++;
    console.log(`\n[Iteration ${iteration}]`);

    const response = await client.messages.create({
      model: "claude-opus-4-20250805",
      max_tokens: 4096,
      tools: tools,
      messages: messages,
    });

    console.log(`Stop reason: ${response.stop_reason}`);

    messages.push({
      role: "assistant",
      content: response.content,
    });

    if (response.stop_reason === "end_turn") {
      console.log("\n✅ Agent completed analysis");
      console.log("\n📧 Recommendations:");
      for (const block of response.content) {
        if (block.type === "text") {
          console.log(block.text);
        }
      }
      break;
    }

    if (response.stop_reason === "tool_use") {
      const toolResults = [];

      for (const block of response.content) {
        if (block.type === "tool_use") {
          console.log(`🔧 Tool: ${block.name}`);
          const result = await processToolCall(block.name, block.input);
          console.log(`✓ Result: ${result.substring(0, 100)}...`);

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }

      messages.push({
        role: "user",
        content: toolResults,
      });
    }
  }

  console.log("\n🏁 MCP Server completed");
}

startMCPServer().catch(console.error);
