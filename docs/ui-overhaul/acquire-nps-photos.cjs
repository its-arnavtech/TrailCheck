const fs=require('node:fs/promises');
const sharp=require('../../frontend/trailcheck-web/node_modules/sharp');
const decode=value=>value.replace(/&#x([0-9a-f]+);/gi,(_,v)=>String.fromCodePoint(parseInt(v,16))).replaceAll('&amp;','&').replaceAll('&quot;','"');
(async()=>{
 const registry=await fs.readFile('backend/trailcheck-api/src/parks/park-registry.ts','utf8');
 const codes=registry.match(/const PARK_CODES:[\s\S]*?\n};/)[0];
 let queue=[...codes.matchAll(/^\s*['"]?([\w-]+)['"]?: '([a-z]+)'/gm)].map(match=>({slug:match[1],code:match[2]}));
 queue=queue.map(park=>park.slug==='kings-canyon'?{...park,code:'seki'}:park);
 if(process.argv.length>2)queue=queue.filter(park=>process.argv.slice(2).includes(park.slug));
 const credits=process.argv.length>2?JSON.parse(await fs.readFile('frontend/trailcheck-web/lib/park-photo-credits.json','utf8')):{};const failures=[];
 await fs.mkdir('frontend/trailcheck-web/public/images/parks',{recursive:true});
 await Promise.all(Array.from({length:4},async()=>{
  while(queue.length){const park=queue.shift();try{
   const pageUrl=`https://www.nps.gov/${park.code}/index.htm`;
   const response=await fetch(pageUrl,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error(`Page ${response.status}`);
   const html=await response.text();
   const figures=[...html.matchAll(/<div class="swiper-slide--full"[\s\S]*?<\/figure>/g)].map(match=>match[0]);
   const candidates=figures.map(figure=>({url:decode(figure.match(/<img\s[\s\S]*?src="([^"]+)"/)?.[1]??''),alt:decode(figure.match(/<img\s[\s\S]*?alt="([^"]*)"/)?.[1]??''),credit:decode(figure.match(/<span class="credit">([\s\S]*?)<\/span>/)?.[1]?.trim()??'')})).filter(image=>/^NPS\b/i.test(image.credit)&&!/(courtesy|copyright|used with permission)/i.test(image.credit)&&image.url);
   let chosen=candidates.find(image=>!/(man |woman |couple|seated|bloom|flower|person|people|visitor|ranger|bus|building|sign|owl|bear|bison|deer|tent|illustration)/i.test(image.alt))??candidates[0];
   if(park.slug==='kings-canyon')chosen=candidates.find(image=>/canyon/i.test(image.alt))??chosen;
   if(park.slug==='sequoia')chosen=candidates.find(image=>/steep granite slope/i.test(image.alt))??chosen;
   if(park.slug==='yosemite')chosen=candidates.find(image=>/Glaciated valley/i.test(image.alt))??chosen;
   if(!chosen)throw new Error('No explicitly NPS-credited gallery photograph');
   const sourceUrl=new URL(chosen.url,'https://www.nps.gov');sourceUrl.search='?maxWidth=1800&maxHeight=1200&quality=90';
   const imageResponse=await fetch(sourceUrl,{signal:AbortSignal.timeout(30000)});if(!imageResponse.ok)throw new Error(`Image ${imageResponse.status}`);
   const bytes=Buffer.from(await imageResponse.arrayBuffer());
   const imagePath=`/images/parks/${park.slug}.webp`;
   const result=await sharp(bytes).resize({width:1600,withoutEnlargement:true}).webp({quality:85}).toFile(`frontend/trailcheck-web/public${imagePath}`);
   credits[park.slug]={imageUrl:imagePath,imageAlt:chosen.alt,credit:chosen.credit,pageUrl,sourceUrl:sourceUrl.toString(),width:result.width,height:result.height};
   console.log(`${park.slug}: ${result.width}x${result.height}, ${chosen.credit}`);
  }catch(error){failures.push({slug:park.slug,error:error.message});console.log(`${park.slug}: retained original (${error.message})`);}}
 }));
 await fs.writeFile('frontend/trailcheck-web/lib/park-photo-credits.json',JSON.stringify(credits,null,2)+'\n');
 await fs.writeFile('docs/ui-overhaul/photo-import-results.json',JSON.stringify({downloaded:Object.keys(credits).length,failures},null,2)+'\n');
})();
