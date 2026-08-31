
export function translateToolArgs(agentArgs = {}, frozenSchema = {}, liveSchema = {}) {
  const frozenProps = frozenSchema.properties || {};
  const liveProps = liveSchema.properties || {};

  const frozenKeys = Object.keys(frozenProps);
  const liveKeys = Object.keys(liveProps);

  // Find keys removed from old schema and added to new schema
  const removedKeys = frozenKeys.filter(key => !(key in liveProps));
  const addedKeys = liveKeys.filter(key => !(key in frozenProps));

  // Normalize helper: removes underscores and converts to lowercase
  const normalize = (key) => key.toLowerCase().replace(/_/g, '');

  // Build mapping by matching normalized key names
  const renameMap = {};
  for (const oldKey of removedKeys) {
    const match = addedKeys.find(newKey => normalize(oldKey) === normalize(newKey));
    if (match) {
      renameMap[oldKey] = match;
    }
  }

  // Rewrite the agent's payload dictionary
  return Object.entries(agentArgs).reduce((acc, [key, value]) => {
    const targetKey = renameMap[key] || key;
    acc[targetKey] = value;
    return acc;
  }, {});
}