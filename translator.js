export function translateToolArgs(
  agentArgs = {}, 
  frozenContext = {}, 
  liveContext = {}
) {
  try {
    const frozenSchema = frozenContext.schema || frozenContext || {};
    const frozenProps = frozenSchema.properties || {};

    const liveSchema = liveContext.schema || liveContext || {};
    const liveProps = liveSchema.properties || {};
    const liveKeys = Object.keys(liveProps);

    const normalize = (str = '') => str.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Map normalized live keys to actual keys
    const normalizedLiveMap = {};
    for (const liveKey of liveKeys) {
      normalizedLiveMap[normalize(liveKey)] = liveKey;
    }

    // Map description text / title to actual live keys
    const descriptionLiveMap = {};
    for (const liveKey of liveKeys) {
      const prop = liveProps[liveKey] || {};
      if (prop.description) {
        descriptionLiveMap[normalize(prop.description)] = liveKey;
      }
      if (prop.title) {
        descriptionLiveMap[normalize(prop.title)] = liveKey;
      }
    }

    const tresponse = Object.entries(agentArgs).reduce((acc, [key, value]) => {
      // 1. Direct match in live schema
      if (key in liveProps) {
        acc[key] = value;
        return acc;
      }

      // 2. Normalized key match (e.g., "user_id" -> "userId")
      const normalizedKey = normalize(key);
      if (normalizedLiveMap[normalizedKey]) {
        acc[normalizedLiveMap[normalizedKey]] = value;
        return acc;
      }

      // 3. Match based on property descriptions or titles in frozen vs live schema
      const frozenProp = frozenProps[key] || {};
      const frozenDesc = normalize(frozenProp.description || frozenProp.title || '');

      if (frozenDesc && descriptionLiveMap[frozenDesc]) {
        const matchedLiveKey = descriptionLiveMap[frozenDesc];
        acc[matchedLiveKey] = value;
        return acc;
      }

      // 4. Fallback: keep original key if no mapping found
      acc[key] = value;
      return acc;
    }, {});

    return [true, tresponse];

  } catch (e) {
    console.error("Tool argument translation failed:", e);
    return [false, null];
  }
}
