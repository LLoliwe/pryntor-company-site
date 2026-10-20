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
  ['/terms.html',['terms.html','text/html; charset=utf-8']],
]);

async function localServer(){
  const server=createServer(async(req,res)=>{
    const path=new URL(req.url,'http://127.0.0.1').pathname;
    if(!allowed.has(path)){res.writeHead(404);res.end('Not found');return;}
    const [file,mime]=allowed.get(path);
    try{const bytes=await readFile(new URL('../'+file,import.meta.url));res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-store'});res.end(bytes);}
    catch{res.writeHead(404);res.end('Not found');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {server,origin:'http://127.0.0.1:'+server.address().port};
}

test('R6 journey: a physical signal becomes a held evidence review and a directed scene',async()=>{
  const {server,origin}=await localServer();let browser;
  try{
    browser=await chromium.launch({headless:true});
    await mkdir('evidence',{recursive:true});
    for(const width of [320,390,768,1440]){
      const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',acceptDownloads:true});
      try{
        const page=await context.newPage(),errors=[],thirdParty=[];
        page.on('pageerror',error=>errors.push(error.message));
        page.on('request',r=>{if(/^https?:/i.test(r.url())&&!r.url().startsWith(origin+'/'))thirdParty.push(r.url());});
        const response=await page.goto(origin+'/experience.html',{waitUntil:'load'});
        assert.equal(response.status(),200);
        await page.locator('#scene[data-ready=true]').waitFor({timeout:15000});
        assert.equal(await page.locator('#tab-matter').getAttribute('aria-selected'),'true');
        assert.equal(await page.locator('#sound-toggle').getAttribute('aria-pressed'),'false');
        assert.equal(await page.locator('#pause-motion').getAttribute('aria-pressed'),'true');
        assert.equal(await page.locator('#rights').isChecked(),false,'Rights simulate unchecked until visitor opts in');
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,'Horizontal overflow on initial load at '+width);
        assert.match(await page.locator('h1').innerText(),/Ideas aren't/);
        // The causal flow does not fabricate a signal without input.
        await page.locator('#carry-signal').click();
        assert.match(await page.locator('#carry-readout').innerText(),/SEND A PULSE/);
        assert.equal(await page.locator('#receipt-matter').innerText(),'AWAITING ACTION');
        // A deliberate physical interaction is the only entrance to the connected trace.
        await page.locator('#impulse').click();
        await page.locator('#tension').focus();await page.keyboard.press('End');
        assert.equal(await page.locator('#tension-out').innerText(),'150');
        await page.locator('#carry-signal').click();
        assert.equal(await page.locator('#tab-decision').getAttribute('aria-selected'),'true');
        assert.match(await page.locator('#signal-ticket').innerText(),/LOCAL RECEIPT \/ 35 NODES/);
        assert.match(await page.locator('#receipt-matter').innerText(),/SIGNAL \/ 1 ACTION/);
        assert.equal(await page.locator('#chain-matter').getAttribute('data-complete'),'true');
        // Lowering the user-supplied synthetic evidence exposes the first consequential failure.
        assert.match(await page.locator('#gate-status').innerText(),/RIGHTS DECLARATION/);
        await page.locator('#evidence').focus();await page.keyboard.press('Home');
        assert.match(await page.locator('#gate-status').innerText(),/EVIDENCE STRENGTH/);
        await page.locator('#evidence').focus();await page.keyboard.press('End');
        await page.locator('#rights').check();
        assert.match(await page.locator('#gate-status').innerText(),/^CANDIDATE/);
        await page.locator('#rights').uncheck();
        assert.match(await page.locator('#gate-status').innerText(),/RIGHTS DECLARATION/);
        const traceDL=page.waitForEvent('download');await page.locator('#export-trace').click();
        assert.equal((await traceDL).suggestedFilename(),'pryntor-local-trace.json');
        await page.locator('#advance-frame').click();
        assert.equal(await page.locator('#tab-cinema').getAttribute('aria-selected'),'true');
        assert.equal(await page.locator('#light-out').innerText(),'38°');
        assert.match(await page.locator('#cinema-ticket').innerText(),/HOLD \/ UNRESOLVED/);
        assert.equal(await page.locator('#chain-decision').getAttribute('data-complete'),'true');
        await page.locator('#lens').focus();await page.keyboard.press('End');
        await page.locator('#light').focus();await page.keyboard.press('End');
        await page.locator('#cut-angle').click();
        assert.match(await page.locator('#cinema-proof').innerText(),/90 mm \/ 180° key/);
        const png=page.waitForEvent('download');await page.locator('#save-frame').click();
        assert.equal((await png).suggestedFilename(),'pryntor-local-frame.png');
        await page.locator('#finish-journey').click();
        assert.equal(await page.locator('#chain-cinema').getAttribute('data-complete'),'true');
        assert.match(await page.locator('#receipt-decision').innerText(),/ILLUSTRATIVE HOLD/);
        assert.match(await page.locator('#receipt-cinema').innerText(),/90 MM/);
        const sheet=page.waitForEvent('download');await page.locator('#export-journey').click();
        const report=await sheet;assert.equal(report.suggestedFilename(),'pryntor-r6-local-proof.json');
        const exported=JSON.parse(await readFile(await report.path(),'utf8'));
        assert.equal(exported.progress,3);assert.equal(exported.stages.review.status,'HOLD');
        assert.equal(exported.stages.response.tension,150);
        assert.equal(exported.stages.direction.lens,90);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,'Horizontal overflow after journey at '+width);
        if(width===390||width===1440){
          await page.locator('.intro').screenshot({path:`evidence/pryntor-r6-intro-${width}.png`,animations:'disabled'});
          await page.locator('#workbench').screenshot({path:`evidence/pryntor-r6-journey-${width}.png`,animations:'disabled'});
          await page.locator('.applications').screenshot({path:`evidence/pryntor-r6-work-${width}.png`,animations:'disabled'});
          await page.screenshot({path:`evidence/pryntor-r6-full-${width}.png`,fullPage:true,animations:'disabled'});
        }
        await page.locator('#reset-journey').click();
        assert.equal(await page.locator('#receipt-matter').innerText(),'AWAITING ACTION');
        assert.equal(await page.locator('#rights').isChecked(),false);
        assert.equal(await page.locator('#chain-matter').getAttribute('data-complete'),'false');
        assert.deepEqual(errors,[],'JS errors at '+width);
        assert.deepEqual(thirdParty,[],'Unexpected remote calls at '+width);
      }finally{await context.close();}
    }
    // Positive illustrative path uses a measurably different camera cue.
    const positive=await browser.newContext({viewport:{width:1024,height:850},reducedMotion:'reduce'});
    try{
      const page=await positive.newPage();await page.goto(origin+'/experience.html',{waitUntil:'load'});
      await page.locator('#scene[data-ready=true]').waitFor();
      await page.locator('#impulse').click();await page.locator('#carry-signal').click();
      await page.locator('#rights').check();await page.locator('#advance-frame').click();
      assert.equal(await page.locator('#light-out').innerText(),'128°');
      assert.match(await page.locator('#cinema-ticket').innerText(),/CANDIDATE \/ POSSIBILITY/);
    }finally{await positive.close();}
    // Homepage still leads into R6 with one explicit action.
    const home=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
    try{const page=await home.newPage();await page.goto(origin+'/index.html',{waitUntil:'load'});
      const entry=page.locator('.lab-entry');assert.equal(await entry.count(),1);
      await entry.click();assert.match(page.url(),/\/experience\.html$/);
      await page.locator('#scene[data-ready=true]').waitFor();
    }finally{await home.close();}
    // Standard-motion renderer advances only when visible and pauses on request.
    const motion=await browser.newContext({viewport:{width:1280,height:850},reducedMotion:'no-preference'});
    try{const page=await motion.newPage();await page.goto(origin+'/experience.html',{waitUntil:'load'});
      await page.locator('#scene[data-ready=true]').waitFor();
      await page.locator('#scene').scrollIntoViewIfNeeded();
      const before=await page.locator('#frame-counter').innerText();
      await page.waitForFunction(v=>document.getElementById('frame-counter').textContent!==v,before,{timeout:4000});
      await page.locator('#pause-motion').click();const stopped=await page.locator('#frame-counter').innerText();
      await page.waitForTimeout(250);assert.equal(await page.locator('#frame-counter').innerText(),stopped);
    }finally{await motion.close();}
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
});