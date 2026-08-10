'use strict';

function htmlText(value='') {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&quot;/gi,'"')
    .replace(/&#39;/gi,"'")
    .replace(/\s+/g,' ')
    .trim();
}

function parseNorwegianNumber(value='') {
  const cleaned=String(value)
    .trim()
    .replace(/\s/g,'')
    .replace(/\.(?=\d{3}(?:\D|$))/g,'')
    .replace(',','.');
  const n=Number(cleaned);
  return Number.isFinite(n)?n:0;
}

function normalizeImageUrl(value='') {
  const raw=String(value||'').trim();
  if(!raw)return '';
  const first=raw.split(',')[0].trim().split(/\s+/)[0];
  if(first.startsWith('//'))return `https:${first}`;
  if(first.startsWith('/'))return `https://kassal.app${first}`;
  return first;
}

function imageFromTag(tag='') {
  const attrs=['src','data-src','data-lazy-src','data-original','srcset','data-srcset'];
  for(const attr of attrs){
    const match=String(tag).match(new RegExp(`\\b${attr}=["']([^"']+)["']`,'i'));
    if(match?.[1]){
      const value=normalizeImageUrl(match[1]);
      if(value && !/^data:/i.test(value))return value;
    }
  }
  return '';
}

function nearbyProductImage(source='', linkIndex=0, blockEnd=0) {
  const start=Math.max(0,Number(linkIndex||0)-3500);
  const end=Math.min(String(source).length,Math.max(Number(blockEnd||0),Number(linkIndex||0)+2500));
  const chunk=String(source).slice(start,end);
  const relativeLink=Math.max(0,Number(linkIndex||0)-start);
  const images=[...chunk.matchAll(/<img\b[^>]*>/gi)]
    .map(match=>({index:match.index||0,url:imageFromTag(match[0])}))
    .filter(item=>item.url);
  if(!images.length)return '';
  images.sort((a,b)=>Math.abs(a.index-relativeLink)-Math.abs(b.index-relativeLink));
  return images[0].url;
}

function parseKassalWeeklyHtml(html='') {
  const source=String(html);
  const hrefRe=/href=["'](?:https?:\/\/(?:www\.)?kassal\.app)?\/vare\/([^"'?#]+)["']/gi;
  const matches=[...source.matchAll(hrefRe)];
  const out=[];
  const seen=new Set();

  for(let i=0;i<matches.length;i++){
    const match=matches[i];
    const slug=match[1];
    const eanMatch=slug.match(/-(\d{8,14})$/);
    if(!eanMatch) continue;

    const ean=eanMatch[1];

    const tagClose=source.indexOf('>', match.index + match[0].length);
    if(tagClose<0) continue;

    const blockStart=tagClose+1;
    const blockEnd=matches[i+1]?.index ?? Math.min(source.length,blockStart+8000);
    const block=source.slice(blockStart,blockEnd);
    const text=htmlText(block);

    const before=text.match(/\bfør\s+([\d\s.,]+)\s*kr\s+([\d\s.,]+)/i);
    if(!before) continue;

    const oldPrice=parseNorwegianNumber(before[1]);
    const currentPrice=parseNorwegianNumber(before[2]);
    if(!(oldPrice>0 && currentPrice>0)) continue;

    const diffMatch=text.match(/^\s*kr\s*([\d\s.,]+)/i);
    const diffAbs=diffMatch
      ? parseNorwegianNumber(diffMatch[1])
      : Math.abs(currentPrice-oldPrice);

    let name=text
      .replace(/^\s*kr\s*[\d\s.,]+\s*/i,'')
      .replace(/\s*\bfør\s+[\d\s.,]+\s*kr\s+[\d\s.,]+[\s\S]*$/i,'')
      .trim();

    if(!name){
      name=slug
        .replace(/^\d+-/,'')
        .replace(/-\d{8,14}$/,'')
        .replace(/-/g,' ')
        .trim();
    }

    const image=nearbyProductImage(source,match.index,blockEnd);

    const row={
      ean,
      href:`https://kassal.app/vare/${slug}`,
      name,
      image,
      oldPrice,
      currentPrice,
      diffAbs:Number(diffAbs.toFixed(2)),
      diff:Number((currentPrice-oldPrice).toFixed(2)),
      percent:Number((((currentPrice-oldPrice)/oldPrice)*100).toFixed(1))
    };

    const key=`${row.ean}:${row.oldPrice}:${row.currentPrice}`;
    if(seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }

  return out;
}

module.exports={htmlText,parseNorwegianNumber,normalizeImageUrl,imageFromTag,nearbyProductImage,parseKassalWeeklyHtml};
