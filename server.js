import axios from "axios";
import dotenv from "dotenv";
import http from "http";

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
    "Content-Type": "application/json",
  },
});

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
    const response = await shopifyAPI.get("/products.json", {
      params: { limit },
    });
    return response.data;
  } catch (error) {
    return { error: error.message };
  }
}

async function getKlaviyoCampaignStats(days = 7) {
  try {
    const response = await klaviyoAPI.get("/campaigns", {
      params: { limit: 20 },
    });
    return response.data;
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
        toolInput.description || ""
      );
    case "get_shopify_products":
      return await getShopifyProducts(toolInput.limit || 50);
    case "get_klaviyo_campaign_stats":
      return await getKlaviyoCampaignStats(toolInput.days || 7);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ============================================
// HTTP SERVER (MCP Protocol over HTTP)
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
];

const server = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  if (req.url === "/tools" && req.method === "GET") {
    res.writeHead(200);
    res.end(JSON.stringify({ tools }));
    return;
  }

  if (req.url === "/call" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", async () => {
      try {
        const { toolName, toolInput } = JSON.parse(body);
        const result = await processToolCall(toolName, toolInput);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, result }));
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
    return;
  }

  if (req.url === "/" && req.method === "GET") {
    res.writeHead(200);
    res.end(
      JSON.stringify({
        status: "ok",
        server: "ramo2-klaviyo-mcp",
        tools: tools.length,
      })
    );
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`🚀 MCP HTTP Server listening on port ${PORT}`);
  console.log(`📍 Store: ${SHOPIFY_STORE}`);
  console.log(`🔑 Klaviyo API: Ready`);
  console.log(`🛒 Shopify API: Ready`);
  console.log(`⚙️  Available tools: ${tools.length}`);
  console.log(`\n📝 Endpoints:`);
  console.log(`  GET  / - Server status`);
  console.log(`  GET  /tools - List available tools`);
  console.log(`  POST /call - Execute a tool`);
});
