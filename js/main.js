(function () {
  "use strict";
  var C = window.KHULDULI;
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var lang = "en";

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  function tr(o) { return o && typeof o === "object" ? (o[lang] || o.en) : o; }
  // Film title for the current language. English mode never shows Nepali script.
  function ttl(f) { return lang === "ne" ? f.title : (f.titleEn || f.title); }

  var ICONS = {
    facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.5V4.4c-.3 0-1.200-.1-2.200-.1-2.300 0-3.800 1.400-3.800 3.900v2.300H8v3h2.600V21z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.2" cy="6.8" r="1.2" fill="currentColor"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14.5 3h2.700c.200 1.900 1.300 3.300 3.300 3.600v2.800c-1.200 0-2.300-.3-3.300-.9v6.300c0 3.200-2.300 5.200-5.100 5.200-2.700 0-4.900-2-4.900-4.800 0-3 2.600-5.200 5.700-4.700v2.900c-1.400-.4-2.800.4-2.800 1.800 0 1.100.9 1.900 2 1.900 1.300 0 2.400-.8 2.400-2.600z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.600 7.600c-.200-.900-.900-1.600-1.800-1.800C18.200 5.400 12 5.400 12 5.400s-6.200 0-7.800.4c-.900.200-1.600.9-1.800 1.800C2 9.200 2 12 2 12s0 2.800.4 4.400c.200.900.9 1.600 1.800 1.800 1.600.4 7.800.4 7.800.4s6.200 0 7.800-.4c.900-.200 1.600-.900 1.800-1.800.4-1.600.4-4.400.4-4.400s0-2.800-.4-4.400zM10 15V9l5.200 3z"/></svg>'
  };
  var NAMES = { facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube" };
  var PLAY = '<span class="play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span>';
  // "Opens elsewhere" arrow for links that leave the page. Drawn, not a font glyph, so it centres the same in every font.
  var OUT = '<svg class="out" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 16L16 8M9 8h7v7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ---------- render from config ---------- */
  function posterImg(src, alt, cls) {
    return src ? '<img class="' + (cls || "") + '" src="' + esc(src) + '" alt="' + esc(alt) + '" loading="lazy" onerror="this.parentNode.classList.remove(\'has-img\');this.remove()">' : "";
  }

  // A film plays on the page if it has a local video file, a YouTube id or a TikTok id.
  function playable(f) { return !!(f.video || f.yt || f.tiktok); }
  function posterOf(f) { return f.poster || (f.yt ? "https://i.ytimg.com/vi/" + f.yt + "/oar2.jpg" : ""); }
  var TONES = [["#ff7a1a", "#5a1206"], ["#3f7cff", "#0a1436"], ["#19c3a6", "#04201f"], ["#e5484d", "#2a0508"], ["#b98cff", "#1b0d33"]];
  var feed = C.shorts.concat(C.moreReels || []);
  var reelFeed = feed.filter(playable);

  function renderShorts() {
    var T = [-0.5, 0.4, -0.3, 0.55, -0.4, 0.3, -0.55, 0.4, -0.3, 0.5];
    $("#shortsRail").innerHTML = feed.map(function (f, i) {
      var tone = f.tone || TONES[i % TONES.length], p = posterOf(f), ri = reelFeed.indexOf(f), t0 = T[i % T.length];
      return '<a class="card tilt" style="--t0:' + t0 + ";--l0:" + Math.abs(t0) + ";--c1:" + tone[0] + ";--c2:" + tone[1] + '" href="' + esc(f.link) + '" target="_blank" rel="noopener"' + (ri > -1 ? ' data-reel="' + ri + '"' : "") + ">" +
        '<span class="card-no" aria-hidden="true">' + ("0" + (i + 1)).slice(-2) + "</span>" +
        '<div class="card-poster' + (p ? " has-img" : "") + '" data-glyph="' + esc(ttl(f).charAt(0)) + '"' + (ri > -1 ? ' data-pv="' + i + '"' : "") + ">" +
        posterImg(p, ttl(f)) + '<div class="pv"></div>' +
        '<span class="card-platform">' + esc(f.platform || "Reel") + "</span>" +
        (f.lead ? '<span class="card-star" title="Lead film">★</span>' : "") +
        '<span class="card-title">' + esc(ttl(f)) + "</span>" + PLAY + "</div>" +
        (f.result ? '<span class="card-stamp"><b>' + esc(f.result) + "</b><i>" + esc(tr(f.unit)) + "</i></span>" : "") +
        '<div class="card-cap"><span><b>' + esc(ttl(f)) + "</b>" + esc(f.en) +
        (f.extra ? "<small>" + esc(f.extra) + "</small>" : "") + "</span><i>" + (ri > -1 ? "▶" : "↗") + "</i></div></a>";
    }).join("");
  }

  function renderLong() {
    $("#longList").innerHTML = C.longform.map(function (f, i) {
      return '<article class="lf-item reveal" data-scrub>' +
        '<div class="lf-screen" data-pv="lf' + i + '" data-link="' + esc(f.link) + '">' +
        posterImg(f.poster, f.title) + '<div class="pv"></div>' +
        '<i class="tick tl"></i><i class="tick tr"></i><i class="tick bl"></i><i class="tick br"></i>' +
        '<span class="lf-coords">' + esc(f.coords) + "</span>" + PLAY + "</div>" +
        '<div class="lf-info"><span class="lf-tag">' + esc(tr(f.tag)) + "</span>" +
        "<h3>" + esc(f.title) + "</h3>" + (lang === "ne" ? '<p class="lf-ne" lang="ne">' + esc(f.ne) + "</p>" : "") +
        '<p class="lf-meta">' + esc(f.meta) + "</p>" +
        '<div class="lf-actions"><button class="btn btn-fs" type="button" data-fs="' + i + '">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        "<span>" + (lang === "ne" ? "पूरा स्क्रिन" : "Full screen") + "</span></button>" +
        '<a class="btn" href="' + esc(f.link) + '" target="_blank" rel="noopener"><span>' + (lang === "ne" ? "YouTube मा हेर्नुहोस्" : "Watch on YouTube") + "</span>" + OUT + "</a></div></div></article>";
    }).join("");
  }

  function renderReach() {
    $("#reachCards").innerHTML = C.reach.map(function (r, i) {
      // Each platform rises and counts a beat after the one before it.
      return '<div class="rc reveal" style="--d:' + (160 + i * 120) + "ms;--w:" + r.share + '">' +
        '<div class="rc-top">' + ICONS[r.key] + "<span>" + esc(r.name) + "</span></div>" +
        '<b><span class="count" data-delay="' + (160 + i * 120) + '" data-to="' + r.value + '" data-dec="' + r.decimals + '">' + r.value.toFixed(r.decimals) + "</span>" + esc(r.suffix) + "</b>" +
        "<small>" + (lang === "ne" ? "भ्युज" : "views") + "</small>" +
        "<p>" + esc(tr(r)) + '</p><div class="bar"><i></i></div></div>';
    }).join("");
    $("#statsNote").textContent = tr(C.statsNote);
    $("#headline").dataset.to = C.headline.value;
    $("#headlineSuffix").textContent = C.headline.suffix;
  }

  function renderContact() {
    $$(".js-email").forEach(function (a) { a.textContent = C.email; a.href = "mailto:" + C.email; });
    $("#social").innerHTML = Object.keys(C.socials).map(function (k) {
      return '<li><a href="' + esc(C.socials[k]) + '" target="_blank" rel="noopener">' + ICONS[k] + "<span>" + NAMES[k] + "</span></a></li>";
    }).join("");
  }

  // The film in the frame at the top: the one flagged `latest` in the config.
  function latestFilm() { return feed.filter(function (f) { return f.latest; })[0] || reelFeed[0] || feed[0]; }
  function renderLead() {
    var L = latestFilm(), p = $("#leadPoster"), ri = reelFeed.indexOf(L), img = posterOf(L);
    p.href = L.link || "#";
    p.dataset.openReels = ri > -1 ? ri : "";
    $("#leadTitle").textContent = ttl(L);
    $("#leadSub").textContent = lang === "ne" ? "" : (L.en || "");
    $("#leadBadge").textContent = L.platform || "Reel";
    if (img && !$("img.poster-img", p)) p.insertAdjacentHTML("afterbegin", posterImg(img, ttl(L), "poster-img"));
  }

  /* ---------- theme: dark by default, light on request, remembered ----------
     The <head> script sets data-theme before the styles load, so there is no flash. */
  var themeBtn = $("#theme"), themeMeta = $('meta[name="theme-color"]');
  function applyTheme(t) {
    root.dataset.theme = t;
    themeBtn.setAttribute("aria-pressed", t === "light" ? "true" : "false");
    if (themeMeta) themeMeta.setAttribute("content", t === "light" ? "#f4ede1" : "#070504");
  }
  function themeTitle() { themeBtn.title = lang === "ne" ? "उज्यालो थिम" : "Light theme"; }

  /* ---------- language ---------- */
  function applyLang() {
    root.dataset.lang = lang;
    root.lang = lang === "ne" ? "ne" : "en";
    $$("[data-ne]").forEach(function (el) {
      if (el.dataset.en === undefined) el.dataset.en = el.innerHTML.trim();
      el.innerHTML = lang === "ne" ? el.dataset.ne : el.dataset.en;
    });
    themeTitle();
  }
  function setLang(l) {
    lang = l;
    try { localStorage.setItem("khulduli-lang", l); } catch (e) {}
    applyLang(); renderLead(); renderShorts(); renderLong(); renderReach();
    bindDynamic(true);
    scrubSetup();
    var rc = $("#reelsBtnCount"); if (rc) rc.textContent = reelFeed.length;
  }

  /* ---------- motion ---------- */
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      $$(".count", e.target).forEach(countUp);
      if (e.target.classList.contains("count")) countUp(e.target);
      io.unobserve(e.target);
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" }) : null;

  // Counts once from zero to the exact figure, after an optional data-delay (ms). Reduced motion: the figure, at once.
  function countUp(el) {
    if (el.dataset.done) return;
    el.dataset.done = "1";
    var to = parseFloat(el.dataset.to), dec = parseInt(el.dataset.dec || "0", 10);
    if (isNaN(to)) return;
    if (reduce) { el.textContent = to.toFixed(dec); return; }
    var wait = parseInt(el.dataset.delay || "0", 10), dur = 1300;
    el.textContent = (0).toFixed(dec);
    setTimeout(function () {
      var t0 = performance.now();
      (function step(now) {
        var p = Math.min(1, Math.max(0, (now - t0) / dur)), v = to * (1 - Math.pow(1 - p, 4));
        el.textContent = v.toFixed(dec);
        if (p < 1) requestAnimationFrame(step); else el.textContent = to.toFixed(dec);
      })(t0);
    }, wait);
  }

  function bindDynamic(instant) {
    $$(".reveal:not(.in)").forEach(function (el) {
      if (!io || instant) { el.classList.add("in"); $$(".count", el).forEach(countUp); }
      else io.observe(el);
    });
    if (window.matchMedia("(hover: hover)").matches && !reduce) {
      $$(".tilt").forEach(function (el) {
        if (el.dataset.tilt) return; el.dataset.tilt = "1";
        el.addEventListener("pointermove", function (e) {
          var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
          el.style.setProperty("--ry", ((x - 0.5) * 14).toFixed(2) + "deg");
          el.style.setProperty("--rx", ((0.5 - y) * 10).toFixed(2) + "deg");
          el.style.setProperty("--gx", (x * 100).toFixed(1) + "%");
          el.style.setProperty("--gy", (y * 100).toFixed(1) + "%");
        });
        el.addEventListener("pointerleave", function () { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); });
      });
      $$(".spot").forEach(function (el) {
        if (el.dataset.spot) return; el.dataset.spot = "1";
        el.addEventListener("pointermove", function (e) {
          var r = el.getBoundingClientRect();
          el.style.setProperty("--mx", (e.clientX - r.left) + "px");
          el.style.setProperty("--my", (e.clientY - r.top) + "px");
        });
      });
    }
    if (!canEmbed) $$(".lf-screen").forEach(function (b) {
      b.addEventListener("click", function () { window.open(b.dataset.link, "_blank", "noopener"); });
    });
    pvBind();
  }

  /* nav + progress */
  var nav = $("#nav"), bar = $(".progress span"), ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY, h = document.documentElement.scrollHeight - window.innerHeight;
      nav.classList.toggle("scrolled", y > 30);
      bar.style.transform = "scaleX(" + (h > 0 ? y / h : 0) + ")";
      scrubTick();
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  /* drag to scroll on the rail (mouse only, touch scrolls natively) */
  (function () {
    var rail = $("#shortsRail"), down = false, sx = 0, sl = 0, moved = 0;
    rail.addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse") return; down = true; moved = 0; sx = e.clientX; sl = rail.scrollLeft; });
    window.addEventListener("pointermove", function (e) {
      if (!down) return; var dx = e.clientX - sx; moved = Math.abs(dx);
      if (moved > 6) { rail.classList.add("drag"); rail.scrollLeft = sl - dx; }
    });
    window.addEventListener("pointerup", function () { down = false; setTimeout(function () { rail.classList.remove("drag"); }, 0); });
    rail.addEventListener("click", function (e) {
      if (moved > 6) { e.preventDefault(); e.stopPropagation(); return; }
      var card = e.target.closest ? e.target.closest(".card[data-reel]") : null;
      if (card) { e.preventDefault(); openReels(parseInt(card.dataset.reel, 10)); }
    }, true);
    rail.addEventListener("dragstart", function (e) { e.preventDefault(); });
  })();

  /* ---------- player ---------- */
  var player = $("#player"), frame = $("#playerFrame");
  function openPlayer(yt, link) {
    // YouTube refuses embeds on file:// pages, so open the link there instead.
    if (!yt || location.protocol === "file:") { window.open(link, "_blank", "noopener"); return; }
    frame.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(yt) + '?autoplay=1&rel=0" title="Film" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
    player.hidden = false; document.body.style.overflow = "hidden";
    $("#playerClose").focus();
  }
  function closePlayer() { player.hidden = true; frame.innerHTML = ""; document.body.style.overflow = ""; }
  $("#playerClose").addEventListener("click", closePlayer);
  player.addEventListener("click", function (e) { if (e.target === player) closePlayer(); });
  window.addEventListener("keydown", function (e) { if (e.key === "Escape" && !player.hidden) closePlayer(); });

  /* ---------- reel mode: scroll through the films, playing on the page ---------- */
  var reels = $("#reels"), track = $("#reelsTrack"), reelNow = -1, soundOn = false, reelIO = null;

  function buildReels() {
    track.innerHTML = reelFeed.map(function (f, i) {
      var p = posterOf(f), where = f.tiktok && !f.video && !f.yt ? "TikTok" : f.yt && !f.video ? "YouTube" : "";
      return '<div class="reel" data-i="' + i + '">' +
        (p ? '<img src="' + esc(p) + '" alt="" loading="lazy" onerror="this.remove()">' : "") +
        '<div class="reel-media"></div><div class="reel-shade"></div>' +
        '<div class="reel-cap"><b>' + esc(ttl(f)) + "</b><span>" + esc(f.en || "") + "</span>" +
        (f.result ? "<em>" + esc(f.result) + " " + esc(tr(f.unit)) + "</em>" : "") +
        (f.link ? '<a href="' + esc(f.link) + '" target="_blank" rel="noopener"><span>' + (lang === "ne" ? "प्लेटफर्ममा खोल्नुहोस्" : "Open" + (where ? " on " + where : "")) + "</span>" + OUT + "</a>" : "") +
        "</div></div>";
    }).join("");
    if (reelIO) reelIO.disconnect();
    reelIO = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) activate(parseInt(e.target.dataset.i, 10)); });
    }, { root: track, threshold: 0.6 });
    $$(".reel", track).forEach(function (el) { reelIO.observe(el); });
  }

  // mode "reel": reel mode player. "pv": silent looping preview on the page. "lf": documentary, with controls.
  function mediaHTML(f, mode) {
    var muted = mode !== "reel" || !soundOn;
    if (f.video) return '<video src="' + esc(f.video) + '" playsinline loop autoplay' + (muted ? " muted" : "") + "></video>";
    var allow = ' allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" title="' + esc(ttl(f)) + '"';
    var yt = f.yt || f.youtube;
    if (yt) return '<iframe data-kind="yt" src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(yt) + "?autoplay=1&mute=1&playsinline=1&rel=0&enablejsapi=1" +
      (mode === "lf" ? "" : "&loop=1&playlist=" + encodeURIComponent(yt) + "&controls=0&disablekb=1&fs=0&iv_load_policy=3") + '"' + allow + "></iframe>";
    return '<iframe data-kind="tt" src="https://www.tiktok.com/player/v1/' + encodeURIComponent(f.tiktok) + '?autoplay=1&loop=1&controls=0&progress_bar=0&play_button=0&volume_control=0&fullscreen_button=0&timestamp=0&music_info=0&description=0&rel=0&native_context_menu=0&closed_caption=0"' + allow + "></iframe>";
  }

  function tell(el, cmds) {
    if (!el) return;
    if (el.tagName === "VIDEO") {
      cmds.forEach(function (c) {
        if (c === "play") { var pr = el.play(); if (pr && pr.catch) pr.catch(function () {}); }
        else if (c === "pause") el.pause(); else el.muted = c === "mute";
      });
      return;
    }
    var w = el.contentWindow; if (!w) return;
    var YT = { play: "playVideo", pause: "pauseVideo", mute: "mute", unmute: "unMute" }, TT = { play: "play", pause: "pause", mute: "mute", unmute: "unMute" };
    cmds.forEach(function (c) {
      if (el.dataset.kind === "yt") w.postMessage(JSON.stringify({ event: "command", func: YT[c], args: [] }), "*");
      else w.postMessage({ type: TT[c], "x-tiktok-player": true }, "*");
    });
  }

  /* ---------- previews: films play silently on the page as soon as they are in view ---------- */
  var pvSeen = [], pvHalt = false;
  var canEmbed = location.protocol !== "file:";
  function pvFilm(el) {
    var k = el.dataset.pv;
    if (k === "lead") { var L = latestFilm(); return playable(L) ? L : null; }
    if (k.indexOf("lf") === 0) return C.longform[parseInt(k.slice(2), 10)];
    return feed[parseInt(k, 10)];
  }
  function pvStart(el) {
    var f = pvFilm(el), box = $(".pv", el);
    if (pvHalt || reduce || !f || !box) return;
    if (!f.video && !canEmbed) return;
    if (box.firstChild) { tell(box.firstChild, ["play"]); return; }
    var isLf = el.dataset.pv.indexOf("lf") === 0;
    box.innerHTML = mediaHTML(f, isLf ? "lf" : "pv");
    var m = box.firstChild;
    m.addEventListener(m.tagName === "VIDEO" ? "playing" : "load", function () {
      setTimeout(function () { if (box.firstChild === m) { el.classList.add("playing"); tell(m, ["mute", "play"]); } }, 700);
    });
  }
  function pvStop(el) {
    var box = $(".pv", el); if (!box || !box.firstChild) return;
    // Documentaries keep their place. Short loops are removed to keep the page light.
    if (el.dataset.pv.indexOf("lf") === 0) { tell(box.firstChild, ["pause"]); return; }
    box.innerHTML = ""; el.classList.remove("playing");
  }
  var pvIO = "IntersectionObserver" in window ? new IntersectionObserver(function (en) {
    en.forEach(function (e) {
      var at = pvSeen.indexOf(e.target);
      if (e.isIntersecting) { if (at < 0) pvSeen.push(e.target); pvStart(e.target); }
      else { if (at > -1) pvSeen.splice(at, 1); pvStop(e.target); }
    });
  }, { threshold: 0.55 }) : null;
  function pvBind() {
    if (!pvIO) return;
    pvSeen = pvSeen.filter(function (el) { return document.body.contains(el); });
    $$("[data-pv]").forEach(function (el) { if (!el.dataset.pvOn) { el.dataset.pvOn = "1"; pvIO.observe(el); } });
  }
  function pvPauseAll(halt) {
    pvHalt = halt;
    pvSeen.forEach(function (el) { if (halt) pvStop(el); else pvStart(el); });
  }
  document.addEventListener("visibilitychange", function () { if (reels.hidden) pvPauseAll(document.hidden); });

  // Full screen for a documentary: the same player that is already running on the page.
  document.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-fs]") : null; if (!b) return;
    var i = parseInt(b.dataset.fs, 10), f = C.longform[i], scr = $$(".lf-screen")[i];
    if (!canEmbed) { window.open(f.link, "_blank", "noopener"); return; }
    pvStart(scr);
    var fr = $(".pv iframe", scr);
    if (fr && fr.requestFullscreen) {
      var pr = fr.requestFullscreen();
      if (pr && pr.catch) pr.catch(function () { openPlayer(f.youtube, f.link); });
      [0, 600, 1500].forEach(function (t) { setTimeout(function () { tell(fr, ["unmute", "play"]); }, t); });
    } else openPlayer(f.youtube, f.link);
  });
  document.addEventListener("fullscreenchange", function () {
    if (!document.fullscreenElement) $$(".lf-screen .pv iframe").forEach(function (fr) { tell(fr, ["mute"]); });
  });

  // Tell the current player to play, and to mute or unmute.
  function syncSound() {
    tell($(".reel.on .reel-media > *", track), ["play", soundOn ? "unmute" : "mute"]);
  }

  function activate(i) {
    if (i === reelNow || reels.hidden) return;
    reelNow = i;
    $$(".reel", track).forEach(function (el) {
      var on = parseInt(el.dataset.i, 10) === i;
      el.classList.toggle("on", on);
      $(".reel-media", el).innerHTML = on ? mediaHTML(reelFeed[i], "reel") : "";
      if (on) {
        var m = $(".reel-media > *", el);
        m.addEventListener(m.tagName === "VIDEO" ? "playing" : "load", function () {
          el.classList.add("ready");
          [300, 1200, 2500].forEach(function (t) { setTimeout(function () { if (reelNow === i) syncSound(); }, t); });
        });
      } else el.classList.remove("ready");
    });
    $("#reelsCount").textContent = ("0" + (i + 1)).slice(-2) + " / " + ("0" + reelFeed.length).slice(-2);
  }

  function goReel(i, smooth) {
    i = Math.max(0, Math.min(reelFeed.length - 1, i));
    var el = $$(".reel", track)[i]; if (!el) return;
    track.scrollTo({ top: el.offsetTop, behavior: smooth && !reduce ? "smooth" : "auto" });
  }

  function setSound(on) {
    soundOn = on;
    reels.classList.toggle("sound", on);
    $("#reelsSound").setAttribute("aria-pressed", on ? "true" : "false");
    syncSound();
  }

  function openReels(i) {
    if (!reelFeed.length) return;
    // Players from YouTube and TikTok refuse to run on file:// pages.
    if (location.protocol === "file:" && !reelFeed[i].video) { window.open(reelFeed[i].link, "_blank", "noopener"); return; }
    buildReels();
    pvPauseAll(true);
    reels.hidden = false; document.body.style.overflow = "hidden";
    reelNow = -1; goReel(i || 0, false); activate(i || 0);
    $("#reelsClose").focus();
  }
  function closeReels() {
    reels.hidden = true; track.innerHTML = ""; reelNow = -1; document.body.style.overflow = "";
    pvPauseAll(false);
  }

  $("#reelsClose").addEventListener("click", closeReels);
  $("#reelsSound").addEventListener("click", function () { setSound(!soundOn); });
  $("#reelsPrev").addEventListener("click", function () { goReel(reelNow - 1, true); });
  $("#reelsNext").addEventListener("click", function () { goReel(reelNow + 1, true); });
  track.addEventListener("click", function (e) { if (e.target.closest("a")) return; setSound(!soundOn); });
  reels.addEventListener("click", function (e) { if (e.target === reels) closeReels(); });
  window.addEventListener("keydown", function (e) {
    if (reels.hidden) return;
    if (e.key === "Escape") closeReels();
    else if (e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); goReel(reelNow + 1, true); }
    else if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); goReel(reelNow - 1, true); }
    else if (e.key === "m" || e.key === "M") setSound(!soundOn);
  });
  $$("[data-open-reels]").forEach(function (b) {
    b.addEventListener("click", function (e) {
      if (b.dataset.openReels === "") return;
      var i = parseInt(b.dataset.openReels, 10) || 0;
      if (!reelFeed.length) return;
      e.preventDefault(); openReels(i);
    });
  });

  /* ---------- contact ---------- */
  $("#copy").addEventListener("click", function () {
    var b = this, label = $("span", b), old = label.innerHTML;
    var done = function () { b.classList.add("done"); label.textContent = lang === "ne" ? "कपी भयो" : "Copied"; setTimeout(function () { b.classList.remove("done"); label.innerHTML = old; }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(C.email).then(done, function () {});
  });
  $$("[data-service]").forEach(function (a) {
    a.addEventListener("click", function () { $("#serviceSelect").value = a.dataset.service; });
  });
  $("#form").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target;
    if (!f.name.value.trim() || !f.message.value.trim()) { (f.name.value.trim() ? f.message : f.name).focus(); return; }
    var subject = "Quote request: " + f.service.value + (f.brand.value ? " (" + f.brand.value + ")" : "");
    var body = f.message.value + "\n\n" + f.name.value + (f.brand.value ? "\n" + f.brand.value : "");
    location.href = "mailto:" + C.email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  });

  /* ---------- embers ---------- */
  (function () {
    var cv = $("#embers"); if (!cv || reduce) return;
    var ctx = cv.getContext("2d"), W, H, dpr, parts = [], on = true, mx = -999, my = -999;
    function size() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(36, W / 36));
      parts = []; for (var i = 0; i < n; i++) parts.push(make(true));
    }
    function make(anywhere) {
      return { x: Math.random() * W, y: anywhere ? Math.random() * H : H + 10, r: Math.random() * 1.5 + 0.4, vy: Math.random() * 0.45 + 0.12, vx: (Math.random() - 0.5) * 0.3, a: Math.random() * 0.4 + 0.12, t: Math.random() * 6.28, hue: 18 + Math.random() * 26 };
    }
    function frame() {
      if (!on) return;
      ctx.clearRect(0, 0, W, H);
      var light = root.dataset.theme === "light";
      ctx.globalCompositeOperation = light ? "source-over" : "lighter";
      ctx.shadowBlur = light ? 0 : 5;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.t += 0.02; p.y -= p.vy; p.x += p.vx + Math.sin(p.t) * 0.25;
        var dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
        if (d2 < 14000) { var f = (14000 - d2) / 14000; p.x += dx * 0.02 * f; p.y += dy * 0.02 * f; }
        if (p.y < -10 || p.x < -20 || p.x > W + 20) parts[i] = p = make(false);
        var a = p.a * (0.6 + 0.4 * Math.sin(p.t * 3)) * Math.min(1, p.y / (H * 0.5));
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283);
        ctx.fillStyle = "hsla(" + p.hue + "," + (light ? "80%,42%," + (a * 0.6).toFixed(3) : "100%,62%," + a.toFixed(3)) + ")";
        if (!light) ctx.shadowColor = "hsla(" + p.hue + ",100%,55%,.6)";
        ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    size();
    var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(size, 200); });
    $(".hero").addEventListener("pointermove", function (e) { var r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
    if ("IntersectionObserver" in window) new IntersectionObserver(function (en) {
      var was = on; on = en[0].isIntersecting; if (on && !was) requestAnimationFrame(frame);
    }).observe(cv);
    requestAnimationFrame(frame);
  })();

  /* ---------- scroll motion ----------
     Every [data-scrub] and [data-pin] element gets --p (0 to 1) as it moves through the screen.
     The CSS does the rest. Pinned blocks are tall wrappers around a sticky screen. */
  var scrubEls = [], hs = $("#hscroll"), hsRail = $("#shortsRail"), hsOver = 0, craft = $("#craft");
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  // The 3D scene: a pagoda made of plain boxes, assembled by scrolling.
  function box(w, h, d, cls) {
    function face(fw, fh, t) { return '<u style="width:' + fw + "px;height:" + fh + "px;margin:" + (-fh / 2) + "px 0 0 " + (-fw / 2) + "px;transform:" + t + '"></u>'; }
    return '<div class="box ' + (cls || "") + '">' +
      face(w, h, "translateZ(" + d / 2 + "px)") + face(w, h, "rotateY(180deg) translateZ(" + d / 2 + "px)") +
      face(d, h, "rotateY(90deg) translateZ(" + w / 2 + "px)") + face(d, h, "rotateY(-90deg) translateZ(" + w / 2 + "px)") +
      face(w, d, "rotateX(90deg) translateZ(" + h / 2 + "px)") + face(w, d, "rotateX(-90deg) translateZ(" + h / 2 + "px)") + "</div>";
  }
  function buildPagoda() {
    var el = $("#pagoda"); if (!el || el.firstChild) return;
    var parts = [], y = 150, n = 0;
    function add(w, h, cls) { y -= h / 2; parts.push('<div class="part" style="--y:' + y + "px;--e:" + (n++ * 30) + 'px">' + box(w, h, w, cls) + "</div>"); y -= h / 2; }
    add(260, 14, "roof");
    [[196, 52], [146, 46], [100, 42], [60, 38]].forEach(function (t) { add(t[0], t[1], ""); add(Math.round(t[0] * 1.5), 9, "roof"); });
    add(12, 50, "roof");
    el.innerHTML = '<div class="ground"></div>' + parts.join("");
  }

  // About: the opening line lights up word by word.
  function splitLede() {
    $$(".lede").forEach(function (el) {
      var words = el.textContent.trim().split(/\s+/);
      el.innerHTML = words.map(function (w) { return '<span class="w">' + esc(w) + "</span>"; }).join(" ");
      el._words = $$(".w", el); el._lit = -1;
    });
  }

  function scrubSetup() {
    buildPagoda(); splitLede();
    if (hs && !reduce) {
      hs.classList.add("pinned");
      hsRail.style.transform = "";
      hsOver = Math.max(0, hsRail.scrollWidth - window.innerWidth);
      hs.style.height = (window.innerHeight + hsOver) + "px";
    }
    scrubEls = $$("[data-scrub],[data-pin]");
    scrubTick();
  }

  function scrubTick() {
    if (reduce) return;
    var vh = window.innerHeight, vw = window.innerWidth;
    scrubEls.forEach(function (el) {
      var r = el.getBoundingClientRect(), p;
      if (r.bottom < -vh || r.top > vh * 2) {
        // Jumped past the intro (a menu link, a reload lower down): the page is already lit.
        if (el.id === "intro" && r.bottom < 0) root.style.setProperty("--L", "1");
        return;
      }
      if (el.hasAttribute("data-pin")) p = -r.top / Math.max(1, r.height - vh);
      else if (el.dataset.scrub === "exit") p = -r.top / Math.max(1, r.height);
      else p = (vh - r.top) / (vh + r.height);
      p = clamp01(p);
      el.style.setProperty("--p", p.toFixed(4));

      if (el === hs) {
        hsRail.style.transform = "translate3d(" + (-p * hsOver).toFixed(1) + "px,0,0)";
        $$(".card", hsRail).forEach(function (c) {
          var cr = c.getBoundingClientRect(), d = (cr.left + cr.width / 2 - vw / 2) / (vw * 0.62);
          d = d < -1 ? -1 : d > 1 ? 1 : d;
          c.style.setProperty("--d", d.toFixed(3)); c.style.setProperty("--d2", (d * d).toFixed(3));
        });
      } else if (el.id === "intro") {
        // L: how lit the diyo is. C: what the light then reveals.
        var L = clamp01(p / 0.5), Cq = clamp01((p - 0.42) / 0.4);
        el.style.setProperty("--L", L.toFixed(4)); el.style.setProperty("--C", Cq.toFixed(4));
        root.style.setProperty("--L", L.toFixed(4));
      } else if (el === craft) {
        var step = p < 1 / 3 ? 0 : p < 2 / 3 ? 1 : 2;
        if (el.dataset.step !== String(step)) el.dataset.step = step;
        el.style.setProperty("--a", clamp01(p * 3 / 0.85).toFixed(4));
        el.style.setProperty("--b", clamp01((p * 3 - 1) / 0.85).toFixed(4));
        el.style.setProperty("--c", clamp01((p * 3 - 2) / 0.85).toFixed(4));
      } else if (el._words) {
        var n = Math.round(clamp01((vh * 0.9 - r.top) / (r.height + vh * 0.4)) * el._words.length);
        if (n !== el._lit) { el._lit = n; el._words.forEach(function (w, i) { w.classList.toggle("lit", i < n); }); }
      }
    });
  }
  (function () { var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(scrubSetup, 200); }); })();

  /* ---------- boot ---------- */
  try { var saved = localStorage.getItem("khulduli-lang"); if (saved === "ne" || saved === "en") lang = saved; } catch (e) {}
  renderLead(); renderContact(); applyLang(); renderShorts(); renderLong(); renderReach();
  bindDynamic(false);
  scrubSetup();
  onScroll();
  (function () { var rc = $("#reelsBtnCount"); if (rc) rc.textContent = reelFeed.length; })();
  $("#lang").addEventListener("click", function () { setLang(lang === "en" ? "ne" : "en"); });
  applyTheme(root.dataset.theme === "light" ? "light" : "dark");
  themeBtn.addEventListener("click", function () {
    var t = root.dataset.theme === "light" ? "dark" : "light";
    try { localStorage.setItem("khulduli-theme", t); } catch (e) {}
    applyTheme(t);
  });
})();
