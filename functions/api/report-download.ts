/**
 * Ephemeral visual-report download for embedded browsers.
 * The file is streamed back as an HTTP attachment. No R2/DB or persistent
 * storage, and the request body never reaches third-party share services.
 */
export async function onRequestPost(context: {request: Request}): Promise<Response> {
  const request=context.request;
  const origin=request.headers.get('Origin');
  const here=new URL(request.url);
  if(origin&&origin!==here.origin)return new Response('Origin denied',{status:403});
  const fail=(message:string,status=400)=>new Response(message,{
    status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},
  });
  const mimeTypes: Record<string,string>={pdf:'application/pdf',png:'image/png'};
  try {
    const headerLength=Number(request.headers.get('Content-Length')||0);
    if(headerLength>22_000_000)return fail('File too large',413);
    const data=await request.formData();
    const format=String(data.get('format')||'');
    const base64=String(data.get('data')||'');
    if(!(format in mimeTypes))return fail('Invalid format');
    if(base64.length<8||base64.length>20_000_000||!(/^[A-Za-z0-9+/]*={0,2}$/).test(base64))
      return fail('Invalid file',413);
    const inputName=String(data.get('filename')||'rapport').replace(/[^a-zA-Z0-9._-]+/g,'_').slice(0,100);
    const name=(inputName.replace(/\.(pdf|png)$/i,'')||'MSS_rapport')+'.'+format;
    const raw=atob(base64);
    if(raw.length>15_000_000)return fail('Too large',413);
    const bytes=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
    const valid=format==='pdf'
      ?raw.startsWith('%PDF-')
      :(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71);
    if(!valid)return fail('Invalid signature');
    return new Response(new Blob([bytes],{type:mimeTypes[format]}),{
      headers:{
        'Content-Type':mimeTypes[format],
        'Content-Disposition':'attachment; filename="'+name+'"',
        'Cache-Control':'private, no-store, max-age=0',
        'X-Content-Type-Options':'nosniff',
        'Content-Security-Policy':'sandbox',
        'Referrer-Policy':'no-referrer',
      },
    });
  }catch(error){
    console.warn('[report-download] rejected request',error);
    return fail('Invalid report payload',400);
  }
}
