// Sécurité obligatoire : Cloudflare Access, JWT signé, propriétaire unique.
// Sans configuration, refuse TOUS les accès (y compris fichiers statiques).
import { jwtVerify, createRemoteJWKSet } from 'jose';
const jwksCache = new Map();
const jsonHeaders={'cache-control':'no-store','x-content-type-options':'nosniff'};
function deny(message,status){return new Response(message,{status,headers:{'content-type':'text/plain; charset=utf-8',...jsonHeaders}});}
export async function onRequest(context){
  const {request,env}=context;
  const issuer=String(env.CF_ACCESS_TEAM_DOMAIN||'').trim().replace(/\/$/,'');
  const aud=String(env.CF_ACCESS_AUD||'').trim();
  const email=String(env.OWNER_EMAIL||'').trim().toLowerCase();
  if(!/^https:\/\/[a-z0-9.-]+\.cloudflareaccess\.com$/.test(issuer)||!aud||!email){return deny('MSS AI CONTROL non configure : acces bloque.',503);}
  const token=request.headers.get('Cf-Access-Jwt-Assertion');
  if(!token)return deny('Authentification Cloudflare Access obligatoire.',401);
  try{
    if(!jwksCache.has(issuer))jwksCache.set(issuer,createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`)));
    const {payload}=await jwtVerify(token,jwksCache.get(issuer),{issuer,audience:aud,algorithms:['RS256']});
    if(String(payload.email||'').toLowerCase()!==email)return deny('Ce compte n est pas autorise.',403);
    context.data.identity={email};
    const res=await context.next();
    const headers=new Headers(res.headers);headers.set('cache-control','no-store');headers.set('x-content-type-options','nosniff');headers.set('referrer-policy','no-referrer');
    return new Response(res.body,{status:res.status,statusText:res.statusText,headers});
  }catch(e){console.warn('MSS AI CONTROL authentication rejected:',e?.name||'error');return deny('Session non valide. Reconnecte-toi via Cloudflare Access.',401);}
}
