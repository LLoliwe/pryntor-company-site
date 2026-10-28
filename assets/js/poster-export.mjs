export function posterLines(ctx,text,width){
  const lines=[];
  for(const paragraph of text.split('\n')){
    let line='';
    for(const word of paragraph.split(' ')){
      const candidate=line?line+' '+word:word;
      if(ctx.measureText(candidate).width<=width){line=candidate;continue;}
      if(line){lines.push(line);line='';}
      for(const char of word){if(line&&ctx.measureText(line+char).width>width){lines.push(line);line='';}line+=char;}
    }
    lines.push(line);
  }
  return lines;
}

// Export the rendered text and unchanged original character, all same-origin.
export async function downloadPoster(art, textElements, filename='pryntor-your-poster.png') {
  await document.fonts.ready;
  const rect=art.getBoundingClientRect(),canvas=document.createElement('canvas'),scale=2;
  if(!rect.width||!rect.height)throw Error('Poster unavailable');
  canvas.width=Math.round(rect.width*scale);canvas.height=Math.round(rect.height*scale);
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');
  ctx.scale(scale,scale);ctx.fillStyle=getComputedStyle(art).backgroundColor;ctx.fillRect(0,0,rect.width,rect.height);ctx.textBaseline='top';
  for(const el of textElements){
    const style=getComputedStyle(el),box=el.getBoundingClientRect();ctx.fillStyle=style.color;ctx.font=style.fontWeight+' '+style.fontSize+' '+style.fontFamily;if('letterSpacing' in ctx)ctx.letterSpacing=style.letterSpacing;
    const lines=posterLines(ctx,el.textContent,box.width),lineHeight=parseFloat(style.lineHeight)||parseFloat(style.fontSize)*1.2;
    lines.forEach((line,i)=>ctx.fillText(line,box.left-rect.left,box.top-rect.top+i*lineHeight));
  }
  const img=art.querySelector('img');if(!img.complete||!img.naturalWidth)throw Error('Character image unavailable');
  const box=img.getBoundingClientRect(),ratio=Math.min(box.width/img.naturalWidth,box.height/img.naturalHeight),w=img.naturalWidth*ratio,h=img.naturalHeight*ratio;
  ctx.drawImage(img,box.left-rect.left+(box.width-w)/2,box.top-rect.top+(box.height-h)/2,w,h);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Image unavailable');
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
