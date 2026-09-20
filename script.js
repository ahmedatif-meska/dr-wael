/* Dr. Wael Samir — site orchestration */
(() => {
  "use strict";

  // Paste the access key from https://web3forms.com (free) — see README.
  const WEB3FORMS_KEY = "YOUR-WEB3FORMS-ACCESS-KEY";

  const html = document.documentElement;
  const body = document.body;
  const params = new URLSearchParams(location.search);
  const RENDER = params.get("render") === "1";
  window.__renderMode = RENDER;
  const reduced = !RENDER && (matchMedia("(prefers-reduced-motion: reduce)").matches || params.get("motion") === "off");
  if (reduced) html.classList.add("reduced");
  const hasGsap = typeof gsap !== "undefined";
  if (hasGsap && typeof ScrollTrigger !== "undefined") gsap.registerPlugin(ScrollTrigger);

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- WebGL capability ---------- */
  const webglWanted = (() => {
    if (reduced || params.get("webgl") === "off") return false;
    if (navigator.connection && navigator.connection.saveData) return false;
    if (navigator.deviceMemory && navigator.deviceMemory < 4) return false;
    try { const c = document.createElement("canvas"); return !!c.getContext("webgl2"); } catch { return false; }
  })();
  body.dataset.webgl = webglWanted ? "on" : "off";

  /* ---------- Anchor navigation (native scroll; no smooth-scroll library) ---------- */
  $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
    const id = a.getAttribute("href"); if (id.length < 2) return;
    const target = $(id); if (!target) return;
    e.preventDefault(); closeNav();
    const top = target.getBoundingClientRect().top + window.scrollY - 60;
    window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
  }));

  /* ---------- Nav ---------- */
  const navToggle = $("#nav-toggle"), navLinks = $("#nav-links");
  const closeNav = () => { navLinks.classList.remove("is-open"); navToggle.setAttribute("aria-expanded", "false"); navToggle.setAttribute("aria-label", "Open menu"); };
  navToggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  $$("a", navLinks).forEach((a) => a.addEventListener("click", closeNav));

  /* ---------- Data-driven sections ---------- */
  async function loadProfile() {
    const res = await fetch("data/profile.json");
    return res.json();
  }

  function renderPillars(p) {
    const grid = $("#pillar-grid");
    p.pillars.forEach((x, i) => {
      const card = el("article", "pillar panel reveal");
      const tag = x.id === "training" ? "Education" : "Advisory";
      card.innerHTML = `<span class="idx">${tag}</span><h3>${esc(x.title)}</h3><p>${esc(x.line)}</p><a class="btn btn-ghost" href="#contact" data-need="${esc(x.title)}">${esc(x.cta)}</a>`;
      grid.append(card);
    });
  }

  function renderImpact(p) {
    const grid = $("#impact-grid");
    p.impact.forEach((x) => {
      const li = el("li", "reveal");
      li.innerHTML = `<span class="num" data-count="${x.value}" data-suffix="${esc(x.suffix)}">0${esc(x.suffix)}</span><span class="lbl">${esc(x.label)}</span><span class="det">${esc(x.detail)}</span><span class="bar" aria-hidden="true"></span>`;
      grid.append(li);
    });
  }

  function renderJourney(p) {
    const track = $("#journey-track");
    p.journey.forEach((j) => {
      const card = el("article", "gate panel-solid");
      card.setAttribute("role", "listitem");
      card.dataset.start = j.start; card.dataset.end = j.end ?? new Date().getFullYear();
      card.innerHTML = `<span class="step">Chapter ${String(j.step).padStart(2, "0")}</span><span class="years">${esc(j.years)}</span><h3>${esc(j.org)}</h3><p>${esc(j.role)}</p>`;
      track.append(card);
    });
  }

  function renderExperience(p) {
    const grid = $("#exp-grid");
    [...p.journey].reverse().forEach((j) => {
      const li = el("li", "exp panel reveal");
      let cs = "";
      if (j.caseStudy) {
        const c = j.caseStudy;
        cs = `<dl class="case">${c.situation ? `<dt>Situation</dt><dd>${esc(c.situation)}</dd>` : ""}${c.approach ? `<dt>Approach</dt><dd>${esc(c.approach)}</dd>` : ""}${c.outcome ? `<dt>Outcome</dt><dd>${esc(c.outcome)}</dd>` : ""}</dl>`;
      }
      li.innerHTML = `<span class="years">${esc(j.years)}</span><h3>${esc(j.org)}</h3><p>${esc(j.role)}</p>${cs}`;
      grid.append(li);
    });
  }

  function renderExpertise(p) {
    const list = $("#network-list");
    window.__profileLinks = Object.fromEntries(p.expertise.map((x) => [x.id, x.links || []]));
    p.expertise.forEach((x, i) => {
      const li = el("li");
      li.dataset.id = x.id;
      li.innerHTML = `<button type="button" class="node" data-id="${esc(x.id)}" aria-pressed="false"><span class="t">${esc(x.title)}</span><span class="d">${esc(x.detail)}</span></button>`;
      list.append(li);
    });
    const detail = el("div", "node-detail panel-solid", `<span class="t">Select a discipline</span><span class="d">Hover or focus a node to see how each area connects.</span>`);
    detail.setAttribute("aria-live", "polite");
    $(".network").after(detail);
    const nodes = $$(".node", list);
    const activate = (id) => {
      nodes.forEach((n) => { const on = n.dataset.id === id; n.classList.toggle("is-active", on); n.setAttribute("aria-pressed", String(on)); });
      const x = p.expertise.find((e) => e.id === id);
      if (x) { $(".t", detail).textContent = x.title; $(".d", detail).textContent = x.detail; }
      window.__networkActivate && window.__networkActivate(id);
    };
    nodes.forEach((n) => {
      n.addEventListener("click", () => activate(n.dataset.id));
      n.addEventListener("focus", () => activate(n.dataset.id));
      n.addEventListener("mouseenter", () => activate(n.dataset.id));
    });
  }

  function renderTraining(p) {
    $("#training-intro").textContent = p.training.intro;
    const inst = $("#institutions");
    p.training.institutions.forEach((x) => inst.append(el("li", "reveal", `<span class="n">${esc(x.name)}</span><span class="l">${esc(x.line)}</span>`)));
    const cred = $("#credentials");
    p.education.forEach((e) => cred.append(el("li", "cred panel reveal", `<span class="s">${esc(e.short)}</span><span class="y">${esc(e.year)}</span><span class="t">${esc(e.title)}</span><span class="i">${esc(e.institution)}</span>`)));
  }

  function renderClients(p) {
    $("#clients-intro").textContent = p.clients.intro;
    $("#clients-outro").textContent = p.clients.outro;
    const wrap = $("#logo-marquee");
    const half = Math.ceil(p.clients.logos.length / 2);
    [p.clients.logos.slice(0, half), p.clients.logos.slice(half)].forEach((row, r) => {
      const track = el("div", "logo-row" + (r ? " logo-row-rev" : ""));
      const tile = (l, dup) => `<li${dup ? ' aria-hidden="true"' : ""}><img src="assets/clients/${esc(l.file)}" alt="${dup ? "" : esc(l.name)}" loading="lazy" decoding="async"></li>`;
      track.innerHTML = `<ul class="logo-set">${row.map((l) => tile(l, false)).join("")}</ul><ul class="logo-set" aria-hidden="true">${row.map((l) => tile(l, true)).join("")}</ul>`;
      wrap.append(track);
    });
  }

  /* ---------- Counters ---------- */
  function countUp(node, duration = 1.6) {
    const to = Number(node.dataset.count), suffix = node.dataset.suffix || "";
    if (!hasGsap || reduced) { node.textContent = to + suffix; return; }
    const o = { v: 0 };
    gsap.to(o, { v: to, duration, ease: "power2.out", onUpdate: () => { node.textContent = Math.round(o.v) + suffix; } });
  }

  /* ---------- Intro ---------- */
  function intro() {
    body.classList.add("is-ready");
    setTimeout(() => { const v = $(".intro-veil"); v && v.remove(); }, 1000);
    const lines = $$(".hero-title .li");
    const stats = $$(".hero-stats .num");
    if (!hasGsap || reduced) { stats.forEach((n) => countUp(n)); return null; }
    gsap.set(lines, { yPercent: 110 });
    gsap.set(["#hero-eyebrow", ".hero-lede", ".hero-ctas", ".hero-stats"], { opacity: 0, y: 18 });
    gsap.set(".hero-portrait", { opacity: 0, y: 40, scale: 1.04 });
    gsap.set(".slabs span", { scaleY: 0 });
    const tl = gsap.timeline({ defaults: { ease: "power3.out" }, paused: RENDER });
    tl.to(".slabs span", { scaleY: 1, duration: 1.4, stagger: { each: 0.05, from: "center" } }, 0)
      .to(".hero-portrait", { opacity: 1, y: 0, scale: 1, duration: 1.4 }, 0.4)
      .to("#hero-eyebrow", { opacity: 1, y: 0, duration: .6 }, 1.0)
      .to(lines, { yPercent: 0, duration: 1.1, stagger: 0.12, ease: "power4.out" }, 1.15)
      .to(".hero-lede", { opacity: 1, y: 0, duration: .7 }, 1.9)
      .to(".hero-ctas", { opacity: 1, y: 0, duration: .6 }, 2.2)
      .to(".hero-stats", { opacity: 1, y: 0, duration: .6 }, 2.5);
    stats.forEach((n) => {
      const to = Number(n.dataset.count), suffix = n.dataset.suffix || "", o = { v: 0 };
      tl.to(o, { v: to, duration: 1.4, ease: "power2.out", onUpdate: () => { n.textContent = Math.round(o.v) + suffix; } }, 2.5);
    });
    tl.to({}, { duration: 2.1 }); // hold at the end state so the exported cut is 6 s
    window.__introTl = tl;
    return tl;
  }

  /* ---------- Scroll effects ---------- */
  function scrollEffects(p) {
    if (!hasGsap || reduced) { $$(".reveal").forEach((n) => n.classList.remove("reveal")); $$("#impact-grid .num").forEach((n) => countUp(n)); $$("#impact-grid .bar").forEach((b) => (b.style.width = "100%")); return; }

    ScrollTrigger.batch(".reveal", { start: "top 88%", once: true, onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: .8, stagger: .08, ease: "power3.out", overwrite: true }) });

    $$("#impact-grid li").forEach((li) => {
      ScrollTrigger.create({ trigger: li, start: "top 80%", once: true, onEnter: () => { countUp($(".num", li), 1.8); gsap.to($(".bar", li), { width: "100%", duration: 1.8, ease: "power2.out" }); } });
    });

    // Hero parallax
    gsap.to(".hero-portrait", { yPercent: 12, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".hero-copy", { yPercent: 18, opacity: 0.2, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

    // Journey: pinned horizontal travel
    const pin = $(".journey-pin"), track = $("#journey-track"), yearEl = $("#journey-year"), prog = $(".journey-progress .bar");
    const gates = $$(".gate", track);
    const first = Number(gates[0].dataset.start), last = Number(gates[gates.length - 1].dataset.end);
    const dist = () => Math.max(0, track.scrollWidth - pin.clientWidth + parseFloat(getComputedStyle(pin).paddingLeft || 0) * 2 + 48);
    gsap.to(track, {
      x: () => -dist(), ease: "none",
      scrollTrigger: {
        trigger: pin, start: "top top", end: () => "+=" + (dist() + window.innerHeight * 0.6), pin: true, scrub: RENDER ? true : 0.25, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: (st) => {
          const pr = st.progress;
          prog.style.setProperty("--p", (pr * 100).toFixed(1) + "%");
          yearEl.textContent = Math.round(first + (last - first) * pr);
          const idx = Math.min(gates.length - 1, Math.floor(pr * gates.length));
          gates.forEach((g, i) => g.classList.toggle("is-current", i === idx));
          window.__journeyProgress && window.__journeyProgress(pr);
        },
      },
    });

    // Sticky CTA + active nav
    const cta = $("#sticky-cta");
    ScrollTrigger.create({ trigger: ".hero", start: "bottom 60%", onEnter: () => showCta(true), onLeaveBack: () => showCta(false) });
    ScrollTrigger.create({ trigger: "#contact", start: "top 70%", onEnter: () => showCta(false), onLeaveBack: () => showCta(true) });
    function showCta(on) { cta.classList.toggle("is-visible", on); cta.setAttribute("aria-hidden", String(!on)); cta.tabIndex = on ? 0 : -1; }

    const links = $$("#nav-links a[href^='#']");
    $$("main section[id]").forEach((sec) => ScrollTrigger.create({ trigger: sec, start: "top 50%", end: "bottom 50%", onToggle: (st) => { if (st.isActive) links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + sec.id)); } }));
  }

  /* ---------- Environment videos (present only after render/veo.mjs + make-video.sh) ---------- */
  async function videos() {
    if (reduced) return;
    let manifest = null;
    try { const r = await fetch("assets/video/manifest.json", { cache: "no-store" }); if (r.ok) manifest = await r.json(); } catch {}
    if (!manifest) return;
    const small = window.innerWidth <= 768;
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      const v = en.target;
      if (en.isIntersecting) {
        if (!v.src) {
          const clip = manifest[v.dataset.clip]; if (!clip) return;
          const can = v.canPlayType('video/webm; codecs="vp9"');
          const file = small ? (can ? clip.webm720 : clip.mp4720) : (can ? clip.webm : clip.mp4);
          v.src = "assets/video/" + file; v.poster = "assets/video/" + clip.poster;
          v.addEventListener("playing", () => v.classList.add("is-live"), { once: true });
        }
        v.play().catch(() => {});
      } else { v.pause(); }
    }), { rootMargin: "200px 0px" });
    $$(".env-video").forEach((v) => io.observe(v));
  }

  /* ---------- WebGL experiences (lazy) ---------- */
  async function webgl() {
    if (!webglWanted) return;
    try {
      const THREE = await import("https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.module.min.js");
      const [hero, journey, network] = await Promise.all([import("./webgl/hero.js"), import("./webgl/journey.js"), import("./webgl/network.js")]);
      const mount = (mod, canvas, opts) => {
        let inst = null;
        const io = new IntersectionObserver((e) => {
          const on = e[0].isIntersecting;
          if (on && !inst) inst = mod.mount(THREE, canvas, opts);
          if (inst) inst.setActive(on);
        }, { rootMargin: "100px 0px" });
        io.observe(canvas.closest("section") || canvas);
        return () => inst;
      };
      mount(hero, $("#hero-canvas"), { reduced });
      const j = mount(journey, $("#journey-canvas"), { count: 7 });
      window.__journeyProgress = (p) => { const i = j(); i && i.setProgress(p); };
      const n = mount(network, $("#network-canvas"), { list: $("#network-list") });
      window.__networkActivate = (id) => { const i = n(); i && i.setActive(true) && i.highlight(id); };
      if (window.__journeyProgress && hasGsap) ScrollTrigger.refresh();
    } catch (err) {
      console.warn("WebGL disabled:", err);
      body.dataset.webgl = "off";
    }
  }

  /* ---------- Contact ---------- */
  function contact() {
    const form = $("#inquiry"), status = $("#form-status"), btn = $("#submit-btn");
    const fields = $$("input[required], select[required]", form);
    const sync = (f) => f.setAttribute("aria-invalid", String(!f.checkValidity()));
    fields.forEach((f) => {
      f.addEventListener("blur", () => sync(f));
      f.addEventListener("input", () => { if (f.hasAttribute("aria-invalid")) sync(f); });
    });
    $$("[data-need]").forEach((a) => a.addEventListener("click", () => { const sel = $("#f-need"); [...sel.options].forEach((o) => { if (o.text.toLowerCase().startsWith(a.dataset.need.toLowerCase().split(" ")[0])) sel.value = o.value; }); }));

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      fields.forEach(sync);
      status.className = "form-status";
      if (!form.checkValidity()) { status.textContent = "Please check the highlighted fields."; status.classList.add("err"); $('[aria-invalid="true"]', form)?.focus(); return; }
      if ($(".hp", form).checked) return;
      btn.disabled = true; status.textContent = "Sending…";
      const data = Object.fromEntries(new FormData(form).entries());
      delete data.botcheck; data.access_key = WEB3FORMS_KEY;
      try {
        const r = await fetch("https://api.web3forms.com/submit", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.success) { status.textContent = "Thank you — your inquiry has been sent. Dr. Wael will be in touch."; status.classList.add("ok"); form.reset(); fields.forEach((f) => f.removeAttribute("aria-invalid")); }
        else throw new Error(j.message || "Delivery failed");
      } catch (err) {
        status.textContent = "We couldn't send your message right now. Please use WhatsApp, or try again in a moment.";
        status.classList.add("err");
      } finally { btn.disabled = false; }
    });
  }

  /* ---------- Boot ---------- */
  (async () => {
    const p = await loadProfile();
    renderPillars(p); renderImpact(p); renderJourney(p); renderExperience(p); renderExpertise(p); renderTraining(p); renderClients(p);
    contact();
    const tl = intro();
    scrollEffects(p);
    videos();
    webgl();
    if (RENDER) { window.__ready = true; }
    else if (tl) {
      // Start the intro only once the tab is actually visible, so it never plays "in the dark".
      const start = () => { if (document.visibilityState === "visible") { tl.play(); document.removeEventListener("visibilitychange", start); } };
      tl.pause(0); document.addEventListener("visibilitychange", start); start();
    }
  })();
})();
