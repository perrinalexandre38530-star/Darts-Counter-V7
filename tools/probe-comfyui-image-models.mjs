const server=(process.env.COMFYUI_URL||"http://127.0.0.1:8188").replace(/\/$/,"");
async function get(name){const r=await fetch(`${server}/object_info/${name}`);if(!r.ok)return null;return r.json();}
function options(obj,node,input){try{return obj?.[node]?.input?.required?.[input]?.[0]||[];}catch{return [];}}
const [ckpt,unet,clip,vae]=await Promise.all([get("CheckpointLoaderSimple"),get("UNETLoader"),get("CLIPLoader"),get("VAELoader")]);
const out={server,checkpointModels:options(ckpt,"CheckpointLoaderSimple","ckpt_name"),unetModels:options(unet,"UNETLoader","unet_name"),clipModels:options(clip,"CLIPLoader","clip_name"),vaeModels:options(vae,"VAELoader","vae_name")};
console.log(JSON.stringify(out,null,2));
