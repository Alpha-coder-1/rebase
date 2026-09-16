export function translateToolArgs(agentCall, frozenTool, liveTool) {

  let agentCalledTool = agentCall.name;
  let agentCalledArgs = agentCall.arguments;

  let frozenToolDef = frozenTool.description;
  let liveToolDef = liveTool.description;

  // Default to original arguments
  let translatedArgs = { ...agentCalledArgs };


  if (
    agentCalledTool === liveTool.name &&
    agentCalledTool === frozenTool.name
  ) {

    console.log(
      `[Rebase] Tool name matches in both frozen and live contexts: ${agentCalledTool}`
    );


    if (frozenToolDef === liveToolDef) {

      let frozenArgs = frozenTool.inputSchema.properties;
      let liveArgs = liveTool.inputSchema.properties;

      let Fkeys = Object.keys(frozenArgs);
      let Lkeys = Object.keys(liveArgs);

      const removedKeys = Fkeys.filter(
        key => !Lkeys.includes(key)
      );

      const addedKeys = Lkeys.filter(
        key => !Fkeys.includes(key)
      );




      console.log("[Rebase] Removed keys:", removedKeys);
      console.log("[Rebase] Added keys:", addedKeys);



        if (removedKeys.length === 0 && addedKeys.length === 0) {
                console.log("[Rebase] No key drift. Passing original call.");

            return agentCall;
          }




      for (const oldkey of removedKeys) {

        for (const newkey of addedKeys) {

          // Compare the schema of THESE TWO properties
          if (
            JSON.stringify(frozenArgs[oldkey]) ===
            JSON.stringify(liveArgs[newkey])
          ) {

            if (oldkey in translatedArgs) {

              translatedArgs[newkey] = translatedArgs[oldkey];

              delete translatedArgs[oldkey];

              console.log(
                `[Rebase] Translated argument: ${oldkey} -> ${newkey}`
              );
            }
          }
        }
      }
    }
  }


  return {
    name: agentCall.name,
    arguments: translatedArgs
  };
}
