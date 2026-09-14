import { Server } from "@modelcontextprotocol/server";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import express from "express";
import { LowPreset } from "lowdb/presets"; // Use built-in lowdb JSON preset
import { translateToolArgs } from "./translator.js";

const app = express();
app.use(express.json());

// Initialize file-backed database with lowdb
const db = await LowPreset("db.json", { frozenTools: {} });

export default async function StartProxy({ targetUrl, port = 8080 }) {

  const upstream = new Client({
    name: "wireape",
    version: "1.0.0",
  });

  await upstream.connect(
    new StreamableHTTPClientTransport(
      new URL(targetUrl)
    )
  );

  const server = new Server(
    { name: "wireape", version: "1.0.0" },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler("tools/list", async () => {
    const liveToolsResponse = await upstream.listTools();
    
    // Save/Update the frozen T1 context in the file-based DB
    await db.read();
    for (const tool of liveToolsResponse.tools) {
      db.data.frozenTools[tool.name] = tool;
    }
    await db.write(); // Commit changes securely to db.json

    return {
      tools: liveToolsResponse.tools,
      _meta: {
        wireape: {
          status: "READY",
          message: "PROXY_ACTIVE",
        },
      },
    };
  });

  server.setRequestHandler("tools/call", async (req) => {
    const { name, arguments: agentArgs } = req.params;
    
    // Fetch the latest live tools from upstream at T3
    const upstreamToolsList = await upstream.listTools();
    const liveTool = upstreamToolsList.tools.find(t => t.name === name);

    if (!liveTool) {
      throw new Error(`TOOL_NOT_FOUND: Tool '${name}' does not exist on upstream server.`);
    }

    // Retrieve the frozen T1 context from the database
    await db.read();
    const frozenToolContext = db.data.frozenTools[name] || null;

    if (!frozenToolContext) {
      console.warn(`[WireApe] No frozen context found in lowdb for tool: ${name}. Using live comparison fallback.`);
    }

    let finalArgs = agentArgs;

    console.log(`[WireApe] Evaluating payload translation for tool: ${name}`);

    // Run dynamic translation passing the frozen context alongside live definition
    const [status, generatedArgs] = translateToolArgs(
      agentArgs,
      frozenToolContext, // Frozen T1 context from lowdb passed here
      liveTool           // Live tool definition
    );

    if (status === true && generatedArgs) {
      finalArgs = generatedArgs;
      console.log("[WireApe] Successfully translated payload:", finalArgs);
    } else {
      console.log("[WireApe] Dynamic translation skipped or matches original interface.");
    }

    // Execute upstream tool call with translated args
    return await upstream.callTool({
      name: req.params.name,
      arguments: finalArgs,
    });
  });

  app.all("/mcp", async (req, res) => {
    const transport = new NodeStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.listen(port, () => {
    console.log(`WireApe (rebase_x): Live proxy running on port ${port}`);
  });
}
