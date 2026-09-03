import { Server } from "@modelcontextprotocol/server";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import express from "express";
import { getAllSchemas,getSchema,saveMcpToolsList } from "./storage.js";
import {translateToolArgs} from "./translator.js"

const app = express();
app.use(express.json());



export default async function StartProxy({ targetUrl, port = 8080, dbPath = "schemas.json" })  {



  const upstream = new Client({
      name: "rebase",
      version: "1.0.0",
    });

  await upstream.connect(
    new StreamableHTTPClientTransport(
      new URL(targetUrl)
    )
  );

  const server = new Server({ name: "rebase",version: "1.0.0",},
   {
    capabilities: {
      tools: {},
    },
  });


  server.setRequestHandler("tools/list", async () => {

  const liveToolsResponse = await upstream.listTools();

  const existingSchemas = getAllSchemas();

  // Only pin to Lowdb if it's the FIRST time seeing tools (or empty)
  if (Object.keys(existingSchemas).length === 0) {
    await saveMcpToolsList(liveToolsResponse.tools);
  }
    
  return {
      tools: liveToolsResponse.tools,
      _meta: {
      rebase: {
        status: "INIT",
        message: "INITIALIZATION",
    },
  },
};

});

  server.setRequestHandler("tools/call", async (req) => {


    const { name, arguments: agentArgs } = req.params;
    const upstreamToolsList = await upstream.listTools();
  
    const liveTool = upstreamToolsList.tools.find(t => t.name === name);
    console.log("live tool",liveTool)
    const frozenSchema = getSchema(name);

    let finalArgs = agentArgs;
    let translationSuccess=false

    //3. If we have both schemas, run translation in-flight
    if (frozenSchema && liveTool?.inputSchema) {
      console.log("translating ........")
      
      
      const [status,generatedArgs] = translateToolArgs(agentArgs, frozenSchema, liveTool.inputSchema);
      console.log(status)
      console.log(generatedArgs)
      if (status==true){
        finalArgs=generatedArgs
        translationSuccess=true
      }
    }

    const schemasAreIdentical = JSON.stringify(frozenSchema) === JSON.stringify(liveTool.inputSchema);
    if(!schemasAreIdentical && translationSuccess==false) {

      throw new McpError(
      ErrorCode.InvalidParams,
      `SCHEMA_ERROR: Tool '${name}' parameter mismatch. Required schema: ${JSON.stringify(liveTool.inputSchema)}`
    );


    }
  
    return  await upstream.callTool({
      name: req.params.name,
      arguments: finalArgs
    })


  });

  app.all("/mcp", async (req, res) => {
    const transport = new NodeStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

   await server.connect(transport);
   await transport.handleRequest(req, res, req.body);
  });

 app.listen(port, () => {
   console.log(`Rebase: running on port ${port} `);
 });


}
