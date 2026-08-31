import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";

const client = new Client({
  name: "tripwire-test-client",
  version: "1.0.0",
});

try {
  const transport = new StreamableHTTPClientTransport(
    new URL("http://localhost:3001/mcp")
  );

  await client.connect(transport);
 
  console.log("Connected to MCP server");

  // First check what the server actually exposes
  const tools = await client.listTools();


  console.log("TOOLS:");
  console.dir(tools, { depth: null });

  // Call tool
  const result = await client.callTool({
    name: "get_user",
    arguments: {
      userid: "123",
    },
  });

  console.log("RESULT:");
  console.dir(result, { depth: null });

} catch (e) {
  console.error("MCP ERROR:");
  console.error(e);
}