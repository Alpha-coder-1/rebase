import { hash } from "node:crypto";


export async function HashMCPToolList(toollist) {

    //const normalized = [...tools].sort((a, b) =>
      //  a.name.localeCompare(b.name)
  //);

  return hash(
    "sha256",
    JSON.stringify(toollist)
  );
  
    
}


export async function CompareMCPToolList(previoushash,toollist) {

    const newHash=(toollist) => hash("sha256", JSON.stringify(toollist));
    if (previoushash !== newHash) {
                console.log("🚨 TOOL DRIFT");
    }

    
}


