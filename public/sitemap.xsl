<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
 xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
 xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9"
 xmlns:xhtml="http://www.w3.org/1999/xhtml">
 <xsl:output method="html" encoding="UTF-8"/>
 <xsl:template match="/">
  <html lang="en">
   <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>MULTISPORTS SCORING – Sitemap</title>
    <style>
     *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top left,#102652 0,#070b15 36%,#05070d 100%);color:#f4f7ff;font:15px/1.5 Inter,Arial,sans-serif}.wrap{max-width:1220px;margin:auto;padding:32px 18px 64px}.hero,.panel{background:linear-gradient(145deg,rgba(20,34,58,.92),rgba(7,12,24,.94));border:1px solid #223350;border-radius:22px;box-shadow:0 24px 70px rgba(0,0,0,.38)}.hero{padding:30px;margin-bottom:18px}.brand{font-weight:900;letter-spacing:.07em}.brand:before{content:'';display:inline-block;width:10px;height:10px;border-radius:50%;background:#62cfff;box-shadow:0 0 0 6px rgba(98,207,255,.12);margin-right:12px}h1{font-size:clamp(2.4rem,7vw,4.6rem);line-height:1;margin:18px 0 12px}p{color:#c7d1e8}.panel{padding:22px;overflow:auto}.badge{display:inline-block;background:#132a47;border:1px solid #2c527d;color:#bfe8ff;padding:7px 12px;border-radius:999px;font-weight:800}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{text-align:left;padding:12px 10px;border-bottom:1px solid #202b3e;vertical-align:top}th{color:#fff;background:#0d1525;position:sticky;top:0}a{color:#7ed3ff;text-decoration:none}a:hover{text-decoration:underline}.muted{color:#8f9ab1}@media(max-width:760px){.wrap{padding:16px 10px 40px}.hero,.panel{border-radius:16px}.hero{padding:22px}.hide-mobile{display:none}td,th{padding:10px 7px;font-size:13px}}
    </style>
   </head>
   <body>
    <main class="wrap">
     <header class="hero">
      <div class="brand">MULTISPORTS SCORING · SITEMAP</div>
      <h1>Public URL index</h1>
      <p>Multilingual public pages exposed to search engines and AI search systems.</p>
      <span class="badge"><xsl:value-of select="count(s:urlset/s:url)"/> URLs</span>
     </header>
     <section class="panel">
      <table>
       <thead><tr><th>#</th><th>URL</th><th class="hide-mobile">Last modified</th><th class="hide-mobile">Priority</th><th class="hide-mobile">Languages</th></tr></thead>
       <tbody>
        <xsl:for-each select="s:urlset/s:url">
         <tr>
          <td><xsl:value-of select="position()"/></td>
          <td><a href="{s:loc}"><xsl:value-of select="s:loc"/></a></td>
          <td class="hide-mobile muted"><xsl:value-of select="s:lastmod"/></td>
          <td class="hide-mobile muted"><xsl:value-of select="s:priority"/></td>
          <td class="hide-mobile muted"><xsl:value-of select="count(xhtml:link)"/></td>
         </tr>
        </xsl:for-each>
       </tbody>
      </table>
     </section>
    </main>
   </body>
  </html>
 </xsl:template>
</xsl:stylesheet>
