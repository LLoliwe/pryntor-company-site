import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const allowed=new Map([
  ['/experience.html',['experience.html','text/html; charset=utf-8']],
  ['/experience.css',['experience.css','text/css; charset=utf-8']],
  ['/experience-app.mjs',['experience-app.mjs','text/javascript; charset=utf-8']],
  ['/experience-engine.mjs',['experience-engine.mjs','text/javascript; charset=utf-8']],
  ['/index.html',['index.html','text/html; charset=utf-8']],
  ['/privacy.html',['privacy.html','text/html; charset=utf-8']],
  ['/terms.html',['terms.html','text/html; charset=utf-8']]
]);

test('interactive lab: four viewport, three scene, real canvas and offline proof journeys',async()=>{
  const server=createServer(async(req,res)=>{
    const route=new URL(req.url,'http://127.0.0.1').pathname;
    if(!allowed.has(route)){res.writeHead(404);res.end('Not found');return;}
    const [path,mime]=allowed.get(route);
    try{const bytes=await readFile(new URL('../'+path,import.meta.url));res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-store'});res.end(bytes);}
    catch{res.writeHead(404);res.end('Not found');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  let browser;
  try{
    browser=await chromium.launch({headless:true});
    await mkdir('evidence',{recursive:true});
    for(const width of [320,390,768,1440]){
      const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',acceptDownloads:true});
      try{
        const page=await context.newPage();const errors=[],thirdParty=[];
        page.on('pageerror',e=>errors.push(e.message));
        page.on('request',req=>{if(/^https?:/i.test(req.url())&&!req.url().startsWith(origin+'/'))thirdParty.push(req.url());});
        const home=await page.goto(origin+'/experience.html',{waitUntil:'load'});
        assert.equal(home.status(),200);
        await page.locator('#scene[data-ready=true]').waitFor({timeout:15000});
        assert.equal(await page.locator('#tab-matter').getAttribute('aria-selected'),'true');
        assert.equal(await page.locator('#pause-motion').getAttribute('aria-pressed'),'true');
        assert.equal(await page.locator('#sound-toggle').getAttribute('aria-pressed'),'false');
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,'Horizontal overflow at '+width);
        await page.locator('#impulse').click();
        await page.locator('#tension').focus();await page.keyboard.press('End');
        assert.equal(await page.locator('#tension-out').innerText(),'150');
        assert.match(await page.locator('#matter-proof').innerText(),/nodes/);
        if(width===390||width===1440)await page.screenshot({path:`evidence/pryntor-experience-matter-${width}.png`,fullPage:true,animations:'disabled'});
        await page.locator('#tab-decision').click();
        assert.match(await page.locator('#gate-status').innerText(),/^CANDIDATE/);
        await page.locator('#evidence').focus();await page.keyboard.press('Home');
        assert.match(await page.locator('#gate-status').innerText(),/EVIDENCE STRENGTH/);
        assert.equal(await page.locator('#trace li[data-pass=false]').count(),1);
        await page.locator('#evidence').focus();await page.keyboard.press('End');
        await page.locator('#rights').uncheck();
        assert.match(await page.locator('#gate-status').innerText(),/RIGHTS DECLARATION/);
        await page.locator('#rights').check();
        assert.match(await page.locator('#gate-status').innerText(),/^CANDIDATE/);
        const dl=page.waitForEvent('download');await page.locator('#export-trace').click();
        assert.equal((await dl).suggestedFilename(),'pryntor-local-trace.json');
        if(width===390||width===1440)await page.screenshot({path:`evidence/pryntor-experience-decision-${width}.png`,fullPage:true,animations:'disabled'});
        await page.locator('#tab-cinema').click();
        await page.locator('#lens').focus();await page.keyboard.press('End');
        await page.locator('#light').focus();await page.keyboard.press('End');
        await page.locator('#cut-angle').click();
        assert.match(await page.locator('#cinema-proof').innerText(),/90 mm \/ 180° key/);
        const shot=page.waitForEvent('download');await page.locator('#save-frame').click();
        assert.equal((await shot).suggestedFilename(),'pryntor-local-frame.png');
        if(width===390||width===1440)await page.screenshot({path:`evidence/pryntor-experience-cinema-${width}.png`,fullPage:true,animations:'disabled'});
        assert.deepEqual(errors,[],'JS errors at '+width);
        assert.deepEqual(thirdParty,[],'Unexpected external calls at '+width);
      }finally{await context.close();}
    }
    // A visitor can discover the study directly from the existing R4 homepage.
    const entryContext=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
    try{
      const page=await entryContext.newPage();await page.goto(origin+'/index.html',{waitUntil:'load'});
      const entry=page.locator('.lab-entry');
      assert.equal(await entry.count(),1,'Homepage must expose interactive study');
      await entry.click();
      assert.match(page.url(),/\/experience\.html$/);
      await page.locator('#scene[data-ready=true]').waitFor({timeout:15000});
    }finally{await entryContext.close();}
    const context=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'no-preference'});
    try{
      const page=await context.newPage();await page.goto(origin+'/experience.html',{waitUntil:'load'});
      await page.locator('#scene[data-ready=true]').waitFor();
      // The renderer intentionally sleeps offscreen. Scroll it into view before
      // asserting advancing animation frames, then verify pause freezes them.
      await page.locator('#scene').scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      const before=await page.locator('#frame-counter').innerText();await page.waitForTimeout(350);
      const after=await page.locator('#frame-counter').innerText();assert.notEqual(after,before,'Unpaused simulation must render new frames');
      await page.locator('#pause-motion').click();const stopped=await page.locator('#frame-counter').innerText();await page.waitForTimeout(350);
      assert.equal(await page.locator('#frame-counter').innerText(),stopped,'Paused simulation should remain paused');
    }finally{await context.close();}
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
});