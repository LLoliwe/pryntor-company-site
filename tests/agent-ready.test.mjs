import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(join(root,path),'utf8');
const home=read('index.html');
const links=['about.html','privacy.html','terms.html'];
test('Home contains canonical, real markdown alternate and descriptive metadata',()=>{
  assert.match(home,/<link rel="canonical" href="https:\/\/pryntor\.co\.za\/"/);
  assert.match(home,/<link rel="alternate" type="text\/markdown" href="index\.md"/);
  assert.match(home,/<meta property="og:type" content="website"/);
  assert.match(home,/<meta name="description" content="Pryntor is an independent/);
});
test('Home provides meaningful content available without JavaScript',()=>{
  const section=home.match(/<section class="agent-summary"[\s\S]*?<\/section>/);
  assert.ok(section,'Visible company-summary section missing');
  assert.ok(section[0].replace(/<[^>]*>/g,' ').trim().length>=550);
  assert.match(section[0],/research and prototypes/);
  assert.match(section[0],/hello@pryntor\.co\.za/);
});
test('JSON-LD is parseable and truthfully states entity, locality and contact',()=>{
  const json=home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(json);
  const obj=JSON.parse(json[1]);
  assert.equal(obj['@type'],'Organization');
  assert.equal(obj.name,'Pryntor');
  assert.equal(obj.email,'hello@pryntor.co.za');
  assert.equal(obj.address.addressLocality,'Durban');
  assert.ok(!obj.legalName,'Unverified legal identity not allowed');
});
test('Sitemap lists only existing and intentionally public pages',()=>{
  const xml=read('sitemap.xml');
  const urls=[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match=>match[1]);
  assert.equal(urls.length,4);
  for(const url of urls){assert.ok(url.startsWith('https://pryntor.co.za/')); const p=new URL(url).pathname;assert.ok(existsSync(join(root,p==='/'?'index.html':p.slice(1))))}
});
test('Robots permits public access and points to same canonical sitemap',()=>{
  const text=read('robots.txt');
  assert.match(text,/User-agent: \*/);
  assert.match(text,/Allow: \//);
  assert.match(text,/Sitemap: https:\/\/pryntor\.co\.za\/sitemap\.xml/);
  assert.doesNotMatch(text,/Disallow:\s*\//);
});
test('llms.txt is meaningful, references real local pages and makes no invented API claims',()=>{
  const text=read('llms.txt');assert.ok(text.length>500);assert.match(text,/# Pryntor/);
  for(const f of [...links,'index.md'])assert.ok(text.includes('https://pryntor.co.za/'+f));
  assert.match(text,/no public API/);
});
test('Markdown summary is formatted, grounded and links resolve to repo files',()=>{
  const md=read('index.md');assert.match(md,/^---\ntitle:/);assert.match(md,/\n# Pryntor\n/);assert.match(md,/early-stage/i);
  for(const f of [...links,'llms.txt'])assert.ok(md.includes('https://pryntor.co.za/'+f));
});
test('Trust content is present without login gates',()=>{
  for(const f of links){const page=read(f);assert.match(page,/<html lang="en">/);assert.match(page,/<h1/);assert.match(page,/https:\/\/pryntor\.co\.za\//)}
  assert.ok(read('about.html').replace(/<[^>]*>/g,' ').length>700);
});
test('No fabricated API, checkout or agent privilege endpoints published',()=>{
  const text=read('llms.txt')+read('index.md');
  assert.doesNotMatch(text,/https:\/\/pryntor\.co\.za\/(api\/|oauth\/|checkout_sessions|mcp\/)/);
  assert.doesNotMatch(home,/sk_live_|sk-proj-|BEGIN PRIVATE KEY/);
});
