/* Optional analytics. The Google library is loaded only after an affirmative choice. */
(function () {
  "use strict";
  var MEASUREMENT_ID = "G-PGBMWHMJJX";
  var KEY = "pryntor.analytics-choice.v1";
  var CHOICE_MS = 90 * 24 * 60 * 60 * 1000;
  var COOKIE_SECONDS = 30 * 24 * 60 * 60;
  var d = document, w = window;
  var banner = d.getElementById("analytics-choice");
  var status = d.getElementById("analytics-status");
  var reset = d.querySelector("[data-analytics-reset]");
  var settings = d.querySelectorAll("[data-analytics-settings]");
  var active = false, loaded = false, script = null, current = null, expiryTimer = null;
  var allowedHost = w.location.protocol === "https:" && /^(www\.)?pryntor\.co\.za$/.test(w.location.hostname);
  if (!banner || !/^G-[A-Z0-9]+$/.test(MEASUREMENT_ID)) return;
  var disableKey = "ga-disable-" + MEASUREMENT_ID;
  w[disableKey] = true;

  function valid(value) {
    return value && value.version === 1 && (value.choice === "granted" || value.choice === "denied") &&
      Number.isFinite(value.expires) && value.expires > Date.now() && value.expires <= Date.now() + CHOICE_MS;
  }
  function readChoice() {
    try {
      var raw = w.localStorage.getItem(KEY), value = JSON.parse(raw);
      if (!valid(value)) return null;
      w.localStorage.setItem(KEY, raw);
      return value;
    }
    catch (error) { return null; }
  }
  function storeChoice(choice) {
    current = { version: 1, choice: choice, expires: Date.now() + CHOICE_MS };
    try { w.localStorage.setItem(KEY, JSON.stringify(current)); } catch (error) {
      try { w.localStorage.removeItem(KEY); } catch (ignored) { /* A later read fails closed if storage remains unwritable. */ }
    }
  }
  function clearCookies() {
    var names = [];
    try { names = d.cookie.split(";").map(function (part) { return part.trim().split("=")[0]; }); } catch (error) { return; }
    names.filter(function (name) { return /^pryntor_ga(?:_|$)/.test(name); }).forEach(function (name) {
      ["", "; Domain=" + w.location.hostname, "; Domain=.pryntor.co.za"].forEach(function (domain) {
        try { d.cookie = name + "=; Max-Age=0; Path=/; SameSite=Lax; Secure" + domain; } catch (error) { /* Browser may block storage. */ }
      });
    });
  }
  function stop() {
    w[disableKey] = true;
    active = false;
    if (expiryTimer) w.clearTimeout(expiryTimer);
    if (script) script.remove();
    if (w.dataLayer && Array.isArray(w.dataLayer)) w.dataLayer.length = 0;
    clearCookies();
  }
  function page() {
    var pages = { "/": ["/", "Home"], "/index.html": ["/", "Home"], "/about.html": ["/about.html", "About"],
      "/method.html": ["/method.html", "Method"], "/privacy.html": ["/privacy.html", "Privacy"],
      "/terms.html": ["/terms.html", "Terms"], "/404.html": ["/404.html", "Page not found"] };
    return Object.prototype.hasOwnProperty.call(pages, w.location.pathname) ? pages[w.location.pathname] : pages["/404.html"];
  }
  function canMeasure() {
    if (!active || !current || current.choice !== "granted" || !valid(current)) return false;
    return allowedHost && !w[disableKey];
  }
  function event(name, extra) {
    if (!canMeasure()) return;
    var p = page();
    w.gtag("event", name, Object.assign({ send_to: MEASUREMENT_ID, page_location: "https://pryntor.co.za" + p[0],
      page_title: p[1], page_referrer: "" }, extra || {}));
  }
  function start() {
    if (loaded || !allowedHost || !current || current.choice !== "granted" || !valid(current)) return;
    loaded = true; active = true; w[disableKey] = false;
    var p = page();
    w.dataLayer = [];
    w.gtag = function () { w.dataLayer.push(arguments); };
    w.gtag("consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    w.gtag("consent", "update", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    w.gtag("set", { allow_google_signals: false, allow_ad_personalization_signals: false, ads_data_redaction: true,
      url_passthrough: false, page_location: "https://pryntor.co.za" + p[0], page_title: p[1], page_referrer: "",
      campaign_id: "", campaign_name: "", campaign_source: "", campaign_medium: "", campaign_term: "", campaign_content: "" });
    w.gtag("js", new Date());
    w.gtag("config", MEASUREMENT_ID, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
      page_location: "https://pryntor.co.za" + p[0], page_title: p[1], page_referrer: "", ignore_referrer: true,
      cookie_prefix: "pryntor", cookie_domain: "none", cookie_path: "/", cookie_expires: COOKIE_SECONDS,
      cookie_update: false, cookie_flags: "SameSite=Lax;Secure" });
    event("page_view");
    script = d.createElement("script");
    script.async = true;
    script.referrerPolicy = "no-referrer";
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(MEASUREMENT_ID);
    script.onerror = function () { stop(); };
    d.head.appendChild(script);
    scheduleExpiry();
  }
  function scheduleExpiry() {
    if (!current || !valid(current)) { stop(); w.location.reload(); return; }
    expiryTimer = w.setTimeout(scheduleExpiry, Math.min(current.expires - Date.now(), 2147483647));
  }
  function show() {
    banner.hidden = false;
    if (reset) reset.hidden = !current;
    status.textContent = current && current.choice === "granted" ? "Your current choice: analytics accepted." : "Analytics is off unless you accept.";
  }
  function finish() {
    banner.hidden = true;
    if (settings[0]) settings[0].focus({ preventScroll: true });
  }
  settings.forEach(function (button) {
    button.hidden = false;
    button.addEventListener("click", function () { show(); d.getElementById("analytics-title").focus({ preventScroll: true }); });
  });
  d.querySelectorAll("[data-analytics-choice]").forEach(function (button) {
    button.addEventListener("click", function () {
      var choice = button.getAttribute("data-analytics-choice");
      if (choice !== "granted" && choice !== "denied") return;
      var wasLoaded = loaded;
      storeChoice(choice);
      if (choice === "granted") { if (wasLoaded && !active) { w.location.reload(); return; } start(); finish(); }
      else { stop(); finish(); if (wasLoaded) w.location.reload(); }
    });
  });
  if (reset) reset.addEventListener("click", function () {
    var wasLoaded = loaded;
    stop(); current = null;
    try { w.localStorage.removeItem(KEY); } catch (error) { /* Default remains off. */ }
    if (wasLoaded) w.location.reload(); else show();
  });
  d.addEventListener("click", function (e) {
    var link = e.target && e.target.closest ? e.target.closest("a[data-analytics-contact]") : null;
    if (!link) return;
    var category = link.getAttribute("data-analytics-contact");
    if (["general", "projects", "website", "privacy"].indexOf(category) !== -1) event("contact_click", { contact_category: category });
  });
  w.addEventListener("storage", function (e) {
    if (e.key !== KEY && e.key !== null) return;
    var next = readChoice();
    if (!next || next.choice !== "granted") {
      var wasLoaded = loaded; stop(); current = next;
      if (wasLoaded) w.location.reload(); else if (!next) show(); else banner.hidden = true;
    } else { current = next; start(); banner.hidden = true; }
  });
  w.addEventListener("pageshow", function (e) {
    if (!e.persisted) return;
    var next = readChoice();
    if (!next || next.choice !== "granted") { stop(); current = next; w.location.reload(); }
    else current = next;
  });
  current = readChoice();
  if (!current) show(); else if (current.choice === "granted") start();
})();
