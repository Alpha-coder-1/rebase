import { JSONFilePreset } from 'lowdb/node';

const db = await JSONFilePreset('schemas.json', { schemas: {} });


/*
export async function initDb(dbPath = 'schemas.json') {
  const defaultData = { schemas: {} };
  db = await JSONFilePreset(path.resolve(dbPath), defaultData);
  return db;
}
*/

export async function saveMcpToolsList(tools) {

  await db.update(({ schemas }) => {
    for (const tool of tools) {
      schemas[tool.name] = tool.inputSchema;
    }
  });
}


export function getSchema(toolName) {
  return db.data.schemas[toolName] || null;
}



export function getAllSchemas() {
  if (!db) return {};
  return db.data.schemas || {};
}