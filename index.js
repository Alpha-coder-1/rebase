import { Server } from "@modelcontextprotocol/server";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import express from "express";
import { translateToolArgs } from "./translator.js";
import {JSONFilePreset} from 'lowdb/node';
import * as path from "path";



const app = express();
app.use(express.json());


const dbPath= path.resolve("./db.json");
const db = await JSONFilePreset(dbPath, {frozenTools:{}});
  



export default async function StartProxy({ targetUrl, port = 8080 }) {




  const upstream = new Client({
    name: "Rebase",
    version: "1.0.0",
  });

  await upstream.connect(
    new StreamableHTTPClientTransport(
      new URL(targetUrl)
    )
  );

  const server = new Server(
    { name: "rebase", version: "1.0.0" },
    {
      capabilities: {
        tools: {},
      },
    }
  );


/*

  server.setRequestHandler("tools/list", async () => {



    const liveToolsResponse = await upstream.listTools();
  
    await db.read();
    for (const tool of liveToolsResponse.tools) {
      db.data.frozenTools[tool.name] = tool;
    }
    await db.write(); // Commit changes securely to db.json

    return {
      tools: liveToolsResponse.tools,
      _meta: {
        rebase: {
          status: "READY",
          message: "PROXY_ACTIVE",
        },
      },
    };
  });
*/



server.setRequestHandler("tools/list", async () => {

  const liveToolsResponse = await upstream.listTools();

  await db.read();

  for (const tool of liveToolsResponse.tools) {

    // Freeze ONLY the first version
    if (!db.data.frozenTools[tool.name]) {

      db.data.frozenTools[tool.name] = structuredClone(tool);

      console.log(
        `[Rebase] Frozen initial schema for: ${tool.name}`
      );
    } else {

      console.log(
        `[Rebase] Existing frozen schema preserved for: ${tool.name}`
      );
    }
  }

  await db.write();

  return {
    tools: liveToolsResponse.tools,
    _meta: {
      rebase: {
        status: "READY",
        message: "PROXY_ACTIVE",
      },
    },
  };
});




  server.setRequestHandler("tools/call", async (req) => {


    const { name, arguments: agentArgs } = req.params;
    
    
    const upstreamToolsList = await upstream.listTools();
    const liveTool = upstreamToolsList.tools.find(t => t.name === name);


    if (!liveTool) {
      throw new Error(`TOOL_NOT_FOUND: Tool '${name}' does not exist on upstream server.`);
    }

    
    await db.read();
    const frozenToolContext = db.data.frozenTools[name] || null;

    if (!frozenToolContext) {
      console.warn(`[rebase] No frozen context found in lowdb for tool: ${name}. Using live comparison fallback.`);
    }

    

    console.log(`[Rebase] Evaluating payload translation for tool: ${name}`);

    
    const generatedCall = translateToolArgs( {name:name,arguments:agentArgs},frozenToolContext,liveTool);
    return await upstream.callTool(generatedCall);


  });




  app.all("/mcp", async (req, res) => {
    const transport = new NodeStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.listen(port, () => {
    console.log(`rebase: Live proxy running on port ${port}`);
  });
}
