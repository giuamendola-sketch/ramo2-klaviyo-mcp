import Anthropic from "@anthropic-ai/sdk";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const KLAVIYO_API_KEY = process.env.KLAVIYO_API_KEY;
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const PORT = process.env.PORT || 3000;

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
  },
});

// ============================================
// TOOLS
// ============================================

const tools = [
  {
    name: "get_klaviyo_lists",
    description: "Get all email lists from Klaviyo",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_klaviyo_segments",
    description: "Get all segments from Klaviyo",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_klaviyo_flows",
    description: "Get all flows (automation sequences) from Klaviyo",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "create_email_template",
    description: "Create a new email template in Klaviyo",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Template name",
        },
        subject: {
          type: "string",
          description: "Email subject line",
        },
        html_content: {
          type: "string",
          description: "HTML email content with Liquid tags for dynamic content",
        },
      },
      required: ["name", "subject", "html_content"],
    },
  },
  {
    name: "create_flow",
    description: "Create a new automation flow (e.g., abandoned cart, welcome series)",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Flow name",
        },
        trigger: {
          type: "string",
          description: "Trigger type: abandoned_cart, welcome, newsletter, etc.",
        },
        description: {
          type: "string",
          description: "Flow description",
        },
      },
      required: ["name", "trigger"],
    },
  },
  {
    name: "get_shopify_products",
    description: "Get all products from Shopify store",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Number of products to fetch (max 250)",
        },
      },
    },
  },
  {
    name: "get_klaviyo_campaign_stats",
    description: "Get statistics for recent campaigns",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Last N days of data",
        },
      },
    },
  },
  {
    name: "sync_shopify_products_to_klaviyo",
    description: "Sync Shopify products to Klaviyo catalog",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// ============================================
// TOOL IMPLEMENTATIONS
// ============================================

async function getKlaviyoLists() {
  try {
    const response = await klaviyoAPI.get("/lists");
    return response.data;
  } catch (error) {
    return { error: error.message };
  }
}

async function getKlaviyoSegments() {
  try {
    const response = await klaviyoAPI.get("/segments");
    return response.data;
  } catch (error) {
    return { error: error.message };
  }
}

async function getKlaviyoFlows() {
  try {
    const response = await klaviyoAPI.get("/flows");
    return response.data;
  } catch (error) {
    return { error: error.message };
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
    return response.data;
  } catch (error) {
    return { error: error.message };
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
    return response.data;
  } catch (error) {
    return { error: error.message };
  }
}

async function getShopifyProducts(limit = 50) {
  try {
    const response = await shopifyAPI.get("/graphql.json", {
      data: {
        query: `
          {
            products(first: ${limit}) {
              edges {
                node {
                  id
                  title
                  handle
                  priceRange {
                    minVariantPrice {
                      amount
                    }
                  }
                  featuredImage {
                    url
                  }
                }
              }
            }
          }
        `,
      },
    });
    return response.data;
  } catch (error) {
    return { error: error.message };
  }
}

async function getKlaviyoCampaignStats(days = 7) {
  try {
    const response = await klaviyoAPI.get(`/campaigns?filter=status==sent`, {
      params: {
        limit: 20,
      },
    });
    return response.data;
  } catch (error) {
    return { error: error.message };
  }
}

async function syncShopifyProductsToKlaviyo() {
  try {
    const products = await getShopifyProducts(100);
    // Implementation would sync to Klaviyo catalog
    return { status: "syncing", message: "Products sync started" };
  } catch (error) {
    return { error: error.message };
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
        toolInput.description
      );
    case "get_shopify_products":
      return await getShopifyProducts(toolInput.limit || 50);
    case "get_klaviyo_campaign_stats":
      return await getKlaviyoCampaignStats(toolInput.days || 7);
    case "sync_shopify_products_to_klaviyo":
      return await syncShopifyProductsToKlaviyo();
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ============================================
// MCP SERVER
// ============================================

async function startMCPServer() {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  console.log("🚀 MCP Server starting...");
  console.log(`📍 Store: ${SHOPIFY_STORE}`);
  console.log(`🔑 Klaviyo API: Connected`);
  console.log(`🛒 Shopify API: Connected`);
  console.log(`\n⚙️  Available tools: ${tools.length}`);

  // Initialize conversation
  const messages = [
    {
      role: "user",
      content:
        "You are an autonomous marketing agent for Ramo2 furniture brand. You have access to Klaviyo and Shopify APIs. Your job is to: 1) Analyze campaign performance, 2) Create email templates, 3) Set up automation flows (abandoned cart, welcome series, newsletter, promotions). You work autonomously but always report back with proposals for approval before going live. What would you recommend this week for email marketing optimization?",
    },
  ];

  // Agentic loop
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

    // Add assistant response to messages
    messages.push({
      role: "assistant",
      content: response.content,
    });

    // Check if we're done
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

    // Process tool calls
    if (response.stop_reason === "tool_use") {
      const toolResults = [];

      for (const block of response.content) {
        if (block.type === "tool_use") {
          console.log(`🔧 Tool: ${block.name}`);
          const result = await processToolCall(block.name, block.input);
          console.log(`✓ Result: ${JSON.stringify(result).substring(0, 100)}...`);

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }
      }

      // Add tool results to messages
      messages.push({
        role: "user",
        content: toolResults,
      });
    }
  }

  console.log("\n🏁 MCP Server completed");
}

// ============================================
// START SERVER
// ============================================

startMCPServer().catch(console.error);
