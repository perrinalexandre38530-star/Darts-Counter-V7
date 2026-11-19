// MSS AI CONTROL V28 — test réseau explicite, sans code source ni changement Git.
const MODEL_ID=/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/;
export async function checkModelAccess({apiKey,model='gpt-5-mini',fetchFn=fetch,timeoutMs=12000}={}) {
  if(!apiKey || typeof apiKey!=='string' || !apiKey.trim()) return {status:'BLOCK',reason:'KEY_MISSING',message:'Clé OPENAI_API_KEY absente. Aucun appel effectué.'};
  if(!MODEL_ID.test(model)) return {status:'BLOCK',reason:'MODEL_INVALID',message:'Identifiant du modèle invalide. Aucun appel effectué.'};
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),timeoutMs);
  try {
    // Un GET de métadonnées ne transmet ni mission ni fichier et ne génère pas de texte.
    const response=await fetchFn('https://api.openai.com/v1/models/'+encodeURIComponent(model),{
      method:'GET',headers:{Authorization:`Bearer ${apiKey}`,'Accept':'application/json'},signal:controller.signal
    });
    if(response.ok) return {status:'PASS',reason:'MODEL_VISIBLE',model,message:`Authentification acceptée ; modèle ${model} accessible. Génération, quota et facturation NON testés.`};
    if(response.status===401) return {status:'BLOCK',reason:'AUTH',message:'Authentification refusée (HTTP 401). Vérifier la clé API.'};
    if(response.status===403) return {status:'BLOCK',reason:'ACCESS',message:'Accès interdit (HTTP 403). Vérifier les permissions du projet API.'};
    if(response.status===404) return {status:'BLOCK',reason:'MODEL_NOT_FOUND',message:'Modèle introuvable ou non accessible (HTTP 404).'};
    if(response.status===429) return {status:'BLOCK',reason:'LIMIT',message:'Limitation API (HTTP 429). Réessayer ultérieurement ; quota non vérifié.'};
    return {status:'BLOCK',reason:'HTTP_ERROR',message:`Service API indisponible ou refus (HTTP ${Number(response.status)||'inconnu'}).`};
  } catch(e) {
    return {status:'BLOCK',reason:e?.name==='AbortError'?'TIMEOUT':'NETWORK',message:e?.name==='AbortError'?'Délai réseau dépassé.':'Connexion réseau impossible ou bloquée.'};
  } finally {clearTimeout(timeout);}
}
