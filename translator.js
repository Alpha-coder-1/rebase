
export function translateToolArgs(agentArgs = {}, liveSchema = {}) {

  try {

  const liveProps = liveSchema.properties || {};
  const liveKeys = Object.keys(liveProps);

  const normalize = (key) => key.toLowerCase().replace(/_/g, '');

  const normalizedLiveMap = {};
    for (const liveKey of liveKeys) {
      normalizedLiveMap[normalize(liveKey)] = liveKey;
    }

    const tresponse = Object.entries(agentArgs).reduce((acc, [key, value]) => {
      // 1. If key exists as-is in live schema, keep it
      if (key in liveProps) {
        acc[key] = value;
        return acc;
      }

      // 2. If normalized version matches a live schema key (e.g. userid -> userId), translate it
      const normalizedKey = normalize(key);
      const targetKey = normalizedLiveMap[normalizedKey] || key;

      acc[targetKey] = value;
      return acc;
    }, {});

    return [true, tresponse];
  

  }catch(e){
    console.log(e);
    return [false, null];
  }
}
