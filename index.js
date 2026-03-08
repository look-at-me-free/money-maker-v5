(() => {
  const LIBRARY_FILE = "library.json";

  const AD_ZONES = {
    topBanner: "5865232",
    leftRail: "5865238",
    rightRail: "5865240",
    between: "5865236",
    end: "5865236"
  };

  const DEFAULTS = {
    betweenEvery: 2,
    betweenSlots: 3,
    finalBlock: 12,
    scrollMaxMs: 1500,
    searchDebounceMs: 90,
    searchMaxResults: 50,
    topFlyoutCloseDelay: 180
  };

  let LIBRARY = { works: [] };
  let CURRENT_WORK = null;
  let CURRENT_ENTRY = null;
  let CURRENT_MANIFEST = null;
  let CURRENT_IMAGES = [];
  let SEARCH_INDEX = [];
  let SEARCH_WIRED = false;
  let TOP_FLYOUTS_WIRED = false;
  let AD_OBSERVER = null;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function normalizeKey(s) {
    return String(s || "").trim().toLowerCase();
  }

  function safeText(s, fallback = "") {
    const out = String(s || "").trim();
    return out || fallback;
  }

  function titleCaseSlug(slug) {
    return String(slug || "")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase())
      .trim();
  }

  function currentHeroLine() {
    const work = safeText(CURRENT_WORK?.label, "");
    const id = safeText(CURRENT_ENTRY?.id, "");
    return [work, id].filter(Boolean).join(" • ") || "Expand • Read • Scroll";
  }

  function getRoute() {
    const url = new URL(window.location.href);
    return {
      work: url.searchParams.get("work") || "",
      reader: url.searchParams.get("reader") || "",
      hash: (url.hash || "").replace(/^#/, "")
    };
  }

  function setRoute(work, reader, hash = "") {
    const url = new URL(window.location.href);
    url.searchParams.set("work", work);
    url.searchParams.set("reader", reader);
    url.hash = hash ? `#${hash}` : "";
    history.pushState({}, "", url.toString());
  }

  function replaceRoute(work, reader, hash = "") {
    const url = new URL(window.location.href);
    url.searchParams.set("work", work);
    url.searchParams.set("reader", reader);
    url.hash = hash ? `#${hash}` : "";
    history.replaceState({}, "", url.toString());
  }

  async function fetchJson(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Failed to load ${path} (${res.status})`);
    }
    return res.json();
  }

  async function loadLibrary() {
    const data = await fetchJson(LIBRARY_FILE);
    LIBRARY = {
      works: Array.isArray(data?.works) ? data.works : []
    };
  }

  async function loadManifest(readerUrl) {
    return fetchJson(readerUrl);
  }

  function walkNodes(nodes, visitor, parents = [], work = null) {
    for (const node of nodes || []) {
      visitor(node, parents, work);
      if (Array.isArray(node.children) && node.children.length) {
        walkNodes(node.children, visitor, [...parents, node], work);
      }
    }
  }

  function getAllReaderEntries() {
    const out = [];
    for (const work of LIBRARY.works) {
      walkNodes(work.children || [], (node, parents) => {
        if (node.type === "reader" && node.reader) {
          out.push({
            work,
            node,
            id: safeText(node.id || node.label, "Untitled"),
            slug: safeText(node.slug, ""),
            reader: node.reader,
            parents
          });
        }
      }, [], work);
    }
    return out;
  }

  function resolveReaderEntry(workSlug, readerUrl) {
    return getAllReaderEntries().find(entry =>
      normalizeKey(entry.work.slug) === normalizeKey(workSlug) &&
      normalizeKey(entry.reader) === normalizeKey(readerUrl)
    ) || null;
  }

  function getFirstReaderEntry() {
    const all = getAllReaderEntries();
    return all[0] || null;
  }

  function getLastReaderEntry() {
    const all = getAllReaderEntries();
    return all[all.length - 1] || null;
  }

  function getReaderEntriesForWork(work) {
    const out = [];
    walkNodes(work?.children || [], (node) => {
      if (node.type === "reader" && node.reader) out.push(node);
    }, [], work);
    return out;
  }

  function getTraversalWindow(nodes, currentIndex) {
    if (nodes.length <= 6) {
      return nodes.map((_, i) => i);
    }
    const set = new Set([
      currentIndex - 2,
      currentIndex - 1,
      currentIndex,
      currentIndex + 1,
      currentIndex + 2
    ]);
    return Array.from(set)
      .filter(i => i >= 0 && i < nodes.length)
      .sort((a, b) => a - b);
  }

  function buildSearchIndex() {
    const out = [];
    for (const work of LIBRARY.works) {
      walkNodes(work.children || [], (node) => {
        if (node.type === "reader" && node.reader) {
          out.push({
            workSlug: work.slug,
            workLabel: safeText(work.label || work.work_title, titleCaseSlug(work.slug)),
            entryId: safeText(node.id || node.label, "Untitled"),
            entrySlug: safeText(node.slug, ""),
            reader: node.reader,
            text: `${safeText(work.label || work.work_title, titleCaseSlug(work.slug))} ${safeText(node.id || node.label, "Untitled")} ${safeText(node.slug, "")}`.trim()
          });
        }
      }, [], work);
    }
    SEARCH_INDEX = out;
  }

  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function runSearch(query) {
    const q = norm(query);
    if (!q) return [];
    const words = q.split(/\s+/).filter(Boolean);

    return SEARCH_INDEX.map(item => {
      const hay = norm(item.text);
      let score = 0;
      if (hay.includes(q)) score += 100;
      for (const word of words) {
        if (hay.includes(word)) score += 15;
      }
      return { item, score };
    })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, DEFAULTS.searchMaxResults)
      .map(x => x.item);
  }

  function normalizeBaseUrl(url) {
    return String(url || "").replace(/\/+$/, "");
  }

  function buildImageList(manifest) {
    if (Array.isArray(manifest.images) && manifest.images.length) {
      return manifest.images.map((file, idx) => ({
        file,
        anchor: `page-${idx + 1}`
      }));
    }

    if (Number.isFinite(manifest.pages) && manifest.pages > 0) {
      const ext = manifest.extension || "jpg";
      const padding = Number.isFinite(manifest.padding) ? manifest.padding : 2;
      return Array.from({ length: manifest.pages }, (_, idx) => ({
        file: `${String(idx + 1).padStart(padding, "0")}.${ext}`,
        anchor: `page-${idx + 1}`
      }));
    }

    return [];
  }

  function currentAdSettings() {
    const ads = CURRENT_MANIFEST?.ads || {};
    return {
      betweenEvery: Number.isFinite(ads.between_every) ? ads.between_every : DEFAULTS.betweenEvery,
      betweenSlots: Number.isFinite(ads.between_slots) ? ads.between_slots : DEFAULTS.betweenSlots,
      finalBlock: Number.isFinite(ads.final_block) ? ads.final_block : DEFAULTS.finalBlock
    };
  }

  function ensureIns(slot) {
    if (!slot || slot.dataset.inited) return;
    slot.dataset.inited = "1";
    const ins = document.createElement("ins");
    ins.className = "eas6a97888e2";
    ins.setAttribute("data-zoneid", slot.dataset.zone);
    slot.appendChild(ins);
  }

  function serveAds() {
    (window.AdProvider = window.AdProvider || []).push({ serve: {} });
  }

  function observeSlots(root = document) {
    if (!AD_OBSERVER) return;
    $$(".exo-slot[data-zone]", root).forEach(slot => AD_OBSERVER.observe(slot));
  }

  function initLazyAds() {
    if (AD_OBSERVER) return;

    AD_OBSERVER = new IntersectionObserver((entries) => {
      let didInit = false;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        ensureIns(entry.target);
        AD_OBSERVER.unobserve(entry.target);
        didInit = true;
      }
      if (didInit) setTimeout(serveAds, 30);
    }, {
      root: null,
      rootMargin: "900px 0px",
      threshold: 0.01
    });

    observeSlots(document);
  }

  function buildBetweenAd(count) {
    const wrap = document.createElement("div");
    wrap.className = "between-ad";

    const grid = document.createElement("div");
    grid.className = "between-grid";

    for (let i = 0; i < count; i++) {
      const slot = document.createElement("div");
      slot.className = "exo-slot";
      slot.dataset.zone = AD_ZONES.between;
      grid.appendChild(slot);
    }

    wrap.appendChild(grid);
    return wrap;
  }

  function buildFinalAdBlock(count) {
    const wrap = document.createElement("section");
    wrap.className = "end-ads";

    const title = document.createElement("p");
    title.className = "end-ads-title";
    title.textContent = "More panels";

    const grid = document.createElement("div");
    grid.className = "end-ads-grid";

    for (let i = 0; i < count; i++) {
      const slot = document.createElement("div");
      slot.className = "exo-slot";
      slot.dataset.zone = AD_ZONES.end;
      grid.appendChild(slot);
    }

    wrap.appendChild(title);
    wrap.appendChild(grid);
    return wrap;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function smoothScrollToY(targetY, maxMs = DEFAULTS.scrollMaxMs) {
    const startY = window.scrollY || window.pageYOffset || 0;
    const distance = targetY - startY;

    if (Math.abs(distance) < 2) {
      window.scrollTo(0, targetY);
      return;
    }

    const base = 650;
    const extra = Math.min(850, Math.abs(distance) * 0.25);
    const duration = Math.min(maxMs, base + extra);
    const start = performance.now();

    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const e = easeOutCubic(t);
      window.scrollTo(0, Math.round(startY + distance * e));
      if (t < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  function scrollToEl(el, { offset = 10, smooth = true } = {}) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const y = Math.max(0, rect.top + (window.scrollY || 0) - offset);
    if (smooth) smoothScrollToY(y, DEFAULTS.scrollMaxMs);
    else window.scrollTo(0, y);
  }

  function scrollToTopSmooth() {
    smoothScrollToY(0);
  }

  function scrollToBottomSmooth() {
    const target = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    smoothScrollToY(target);
  }

  function scrollToSearchSmooth() {
    const searchSection = $("#searchSection");
    if (searchSection) scrollToEl(searchSection, { offset: 12, smooth: true });
  }

  function renderTopFlyoutNodes(nodes, workSlug, depth = 0) {
    let html = "";
    for (const node of nodes || []) {
      if (node.type === "reader" && node.reader) {
        const active =
          normalizeKey(workSlug) === normalizeKey(CURRENT_WORK?.slug) &&
          normalizeKey(node.reader) === normalizeKey(CURRENT_ENTRY?.reader)
            ? " active"
            : "";

        html += `
          <a
            href="?work=${encodeURIComponent(workSlug)}&reader=${encodeURIComponent(node.reader)}"
            class="topworks-link${active}"
            data-work="${escapeHtml(workSlug)}"
            data-reader="${escapeHtml(node.reader)}"
            style="margin-left:${depth * 10}px"
          >
            ${escapeHtml(safeText(node.id || node.label, "Untitled"))}
          </a>
        `;
      } else if (node.type === "group" && Array.isArray(node.children) && node.children.length) {
        html += `
          <div
            class="topworks-link"
            style="margin-left:${depth * 10}px; cursor:default; background:rgba(255,255,255,.08); font-weight:700;"
          >
            ${escapeHtml(safeText(node.id || node.label, "Group"))}
          </div>
        `;
        html += renderTopFlyoutNodes(node.children, workSlug, depth + 1);
      }
    }
    return html;
  }

  function renderWorksNav() {
    const nav = $("#worksNav");
    if (!nav) return;

    let html = "";
    for (const work of LIBRARY.works) {
      const workLabel = safeText(work.label || work.work_title, titleCaseSlug(work.slug));
      const active = normalizeKey(work.slug) === normalizeKey(CURRENT_WORK?.slug) ? " active" : "";

      html += `
        <div class="topworks-item${active}">
          <button class="topworks-trigger" type="button">
            <span>${escapeHtml(workLabel)}</span>
            <span class="topworks-caret"></span>
          </button>
          <div class="topworks-flyout">
            <div class="topworks-links">
              ${renderTopFlyoutNodes(work.children || [], work.slug, 0)}
            </div>
          </div>
        </div>
      `;
    }

    nav.innerHTML = html;
    wireTopFlyouts();
  }

  function wireTopFlyouts() {
    const items = $$(".topworks-item");
    if (!items.length) return;

    let closeTimer = null;

    function closeAll(except = null) {
      items.forEach(item => {
        if (item !== except) item.classList.remove("open");
      });
    }

    items.forEach(item => {
      item.addEventListener("mouseenter", () => {
        if (closeTimer) {
          clearTimeout(closeTimer);
          closeTimer = null;
        }
        closeAll(item);
        item.classList.add("open");
      });

      item.addEventListener("mouseleave", () => {
        if (closeTimer) clearTimeout(closeTimer);
        closeTimer = setTimeout(() => {
          item.classList.remove("open");
        }, DEFAULTS.topFlyoutCloseDelay);
      });
    });

    if (!TOP_FLYOUTS_WIRED) {
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".topworks-item")) {
          $$(".topworks-item.open").forEach(el => el.classList.remove("open"));
        }
      });
      TOP_FLYOUTS_WIRED = true;
    }
  }

  function renderSearchResults(query) {
    const meta = $("#meta");
    const nav = $("#nav");
    if (!nav) return;

    if (!query.trim()) {
      nav.innerHTML = "";
      nav.style.display = "none";
      if (meta) meta.textContent = `${CURRENT_IMAGES.length} pages`;
      return;
    }

    const hits = runSearch(query);
    if (meta) meta.textContent = hits.length ? `Matches: ${hits.length}` : "No matches.";

    nav.innerHTML = hits.map(hit => `
      <a
        href="?work=${encodeURIComponent(hit.workSlug)}&reader=${encodeURIComponent(hit.reader)}"
        data-work="${escapeHtml(hit.workSlug)}"
        data-reader="${escapeHtml(hit.reader)}"
      >
        ${escapeHtml(`${hit.workLabel} • ${hit.entryId}`)}
      </a>
    `).join("");

    nav.style.display = hits.length ? "flex" : "none";
  }

  function wireSearchUI() {
    if (SEARCH_WIRED) return;
    SEARCH_WIRED = true;

    const input = $("#q");
    const clearBtn = $("#clear");
    const nav = $("#nav");
    const meta = $("#meta");

    if (meta) meta.textContent = `${CURRENT_IMAGES.length} pages`;

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (input) input.value = "";
        if (nav) {
          nav.innerHTML = "";
          nav.style.display = "none";
        }
        if (meta) meta.textContent = `${CURRENT_IMAGES.length} pages`;
      });
    }

    if (!input) return;

    let timer = null;

    input.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        renderSearchResults(input.value || "");
      }, DEFAULTS.searchDebounceMs);
    });

    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const hits = runSearch(input.value || "");
      if (hits[0]) {
        e.preventDefault();
        setRoute(hits[0].workSlug, hits[0].reader, "");
        switchReader(hits[0].workSlug, hits[0].reader).catch(console.error);
      }
    });
  }

  function renderTraversalBar() {
    const readers = getReaderEntriesForWork(CURRENT_WORK || {});
    if (!readers.length || !CURRENT_ENTRY) return "";

    const currentIndex = readers.findIndex(node =>
      normalizeKey(node.reader) === normalizeKey(CURRENT_ENTRY.reader)
    );

    if (currentIndex === -1) return "";

    const prev = readers[currentIndex - 1] || null;
    const next = readers[currentIndex + 1] || null;
    const windowIndexes = getTraversalWindow(readers, currentIndex);

    let html = `<div class="entry-traversal">`;

    if (prev) {
      html += `
        <a
          href="?work=${encodeURIComponent(CURRENT_WORK.slug)}&reader=${encodeURIComponent(prev.reader)}"
          class="entry-traversal-link"
          data-work="${escapeHtml(CURRENT_WORK.slug)}"
          data-reader="${escapeHtml(prev.reader)}"
        >
          ‹ Previous
        </a>
      `;
    } else {
      html += `<span class="entry-traversal-ghost">‹ Previous</span>`;
    }

    for (const idx of windowIndexes) {
      const node = readers[idx];
      const label = safeText(node.id || node.label, `Entry ${idx + 1}`);

      if (idx === currentIndex) {
        html += `<span class="entry-traversal-current">${escapeHtml(label)}</span>`;
      } else {
        html += `
          <a
            href="?work=${encodeURIComponent(CURRENT_WORK.slug)}&reader=${encodeURIComponent(node.reader)}"
            class="entry-traversal-link"
            data-work="${escapeHtml(CURRENT_WORK.slug)}"
            data-reader="${escapeHtml(node.reader)}"
          >
            ${escapeHtml(label)}
          </a>
        `;
      }
    }

    if (next) {
      html += `
        <a
          href="?work=${encodeURIComponent(CURRENT_WORK.slug)}&reader=${encodeURIComponent(next.reader)}"
          class="entry-traversal-link"
          data-work="${escapeHtml(CURRENT_WORK.slug)}"
          data-reader="${escapeHtml(next.reader)}"
        >
          Next ›
        </a>
      `;
    } else {
      html += `<span class="entry-traversal-ghost">Next ›</span>`;
    }

    html += `</div>`;
    return html;
  }

  function renderReader() {
    const container = $("#container");
    if (!container) return;

    container.replaceChildren();

    const settings = currentAdSettings();
    const traversalHtml = renderTraversalBar();

    if (traversalHtml) {
      const topWrap = document.createElement("div");
      topWrap.innerHTML = traversalHtml;
      container.appendChild(topWrap.firstElementChild);
    }

    const note = document.createElement("div");
    note.className = "note";
    note.textContent = "If anything isn’t working, keep scrolling. I planned for that. The working path is always here.";
    container.appendChild(note);

    CURRENT_IMAGES.forEach((item, idx) => {
      const wrap = document.createElement("div");
      wrap.className = "image-wrap";
      wrap.id = item.anchor;

      const img = document.createElement("img");
      img.src = item.src;
      img.alt = item.alt;
      img.loading = "lazy";
      img.decoding = "async";

      wrap.appendChild(img);
      container.appendChild(wrap);

      const pageNumber = idx + 1;
      const shouldInsertBetween =
        settings.betweenEvery > 0 &&
        pageNumber >= 2 &&
        pageNumber % settings.betweenEvery === 0 &&
        pageNumber < CURRENT_IMAGES.length;

      if (shouldInsertBetween) {
        container.appendChild(buildBetweenAd(settings.betweenSlots));
      }
    });

    if (traversalHtml) {
      const bottomWrap = document.createElement("div");
      bottomWrap.innerHTML = traversalHtml;
      container.appendChild(bottomWrap.firstElementChild);
    }

    if (settings.finalBlock > 0) {
      container.appendChild(buildFinalAdBlock(settings.finalBlock));
    }

    observeSlots(container);
    setTimeout(serveAds, 80);
  }

  async function switchReader(workSlug, readerUrl) {
    const resolved = resolveReaderEntry(workSlug, readerUrl);
    if (!resolved) {
      throw new Error(`Unknown reader: work=${workSlug} reader=${readerUrl}`);
    }

    const manifest = await loadManifest(readerUrl);
    const base = normalizeBaseUrl(manifest.base_url);
    const images = buildImageList(manifest);

    if (!base) throw new Error(`Manifest missing base_url: ${readerUrl}`);
    if (!images.length) throw new Error(`Manifest has no images: ${readerUrl}`);

    CURRENT_WORK = resolved.work;
    CURRENT_ENTRY = {
      id: safeText(resolved.node.id || resolved.node.label, "Untitled"),
      slug: safeText(resolved.node.slug, ""),
      reader: resolved.reader
    };
    CURRENT_MANIFEST = manifest;
    CURRENT_IMAGES = images.map((img, idx) => ({
      anchor: img.anchor,
      src: `${base}/${img.file}`,
      alt: `${safeText(manifest.work_title, safeText(CURRENT_WORK.label, "Work"))} ${safeText(CURRENT_ENTRY.id, "Page")} ${idx + 1}`
    }));

    const heroLine = currentHeroLine();

    const currentWorkTitle = $("#currentWorkTitle");
    if (currentWorkTitle) currentWorkTitle.textContent = heroLine;

    const meta = $("#meta");
    if (meta) meta.textContent = `${CURRENT_IMAGES.length} pages`;

    const q = $("#q");
    if (q) q.value = "";

    const nav = $("#nav");
    if (nav) {
      nav.innerHTML = "";
      nav.style.display = "none";
    }

    renderWorksNav();
    renderReader();
  }

  async function openLastWork() {
    const last = getLastReaderEntry();
    if (!last) return;
    setRoute(last.work.slug, last.reader, "");
    await switchReader(last.work.slug, last.reader);
  }

  document.addEventListener("click", (e) => {
    const topTrigger = e.target.closest(".topworks-trigger");
    if (topTrigger) {
      e.preventDefault();
      e.stopPropagation();

      const item = topTrigger.closest(".topworks-item");
      if (!item) return;

      $$(".topworks-item.open").forEach(el => {
        if (el !== item) el.classList.remove("open");
      });

      item.classList.toggle("open");
      return;
    }

    const readerLink = e.target.closest("[data-work][data-reader]");
    if (readerLink) {
      e.preventDefault();
      e.stopPropagation();

      const work = readerLink.dataset.work;
      const reader = readerLink.dataset.reader;
      if (!work || !reader) return;

      const same =
        normalizeKey(work) === normalizeKey(CURRENT_WORK?.slug) &&
        normalizeKey(reader) === normalizeKey(CURRENT_ENTRY?.reader);

      if (same) return;

      setRoute(work, reader, "");
      switchReader(work, reader).catch(err => {
        console.error(err);
        const meta = $("#meta");
        if (meta) meta.textContent = "Failed to load selected work.";
      });
      return;
    }

    const floatingFirstBtn = e.target.closest("#floatingFirstBtn");
    if (floatingFirstBtn) {
      e.preventDefault();
      e.stopPropagation();
      scrollToTopSmooth();
      return;
    }

    const floatingLastBtn = e.target.closest("#floatingLastBtn");
    if (floatingLastBtn) {
      e.preventDefault();
      e.stopPropagation();
      scrollToBottomSmooth();
      return;
    }

    const floatingSearchBtn = e.target.closest("#floatingSearchBtn");
    if (floatingSearchBtn) {
      e.preventDefault();
      e.stopPropagation();
      scrollToSearchSmooth();
      return;
    }

    const firstBtn = e.target.closest("#openFirstTop");
    if (firstBtn) {
      e.preventDefault();
      e.stopPropagation();
      scrollToTopSmooth();
      return;
    }

    const lastWorkBtn = e.target.closest("#openLastWorkTop");
    if (lastWorkBtn) {
      e.preventDefault();
      e.stopPropagation();
      openLastWork().catch(err => {
        console.error(err);
        const meta = $("#meta");
        if (meta) meta.textContent = "Failed to load last work.";
      });
      return;
    }

    if (!e.target.closest(".topworks-item")) {
      $$(".topworks-item.open").forEach(el => el.classList.remove("open"));
    }
  });

  async function boot() {
    await loadLibrary();
    buildSearchIndex();
    wireSearchUI();

    let { work, reader } = getRoute();
    let resolved = resolveReaderEntry(work, reader);

    if (!resolved) {
      resolved = getFirstReaderEntry();
      if (!resolved) {
        throw new Error("No readable entries found in library.json");
      }
      replaceRoute(resolved.work.slug, resolved.reader, "");
    }

    await switchReader(resolved.work.slug, resolved.reader);

    initLazyAds();
    setTimeout(serveAds, 900);
  }

  window.addEventListener("popstate", () => {
    const { work, reader } = getRoute();
    const resolved = resolveReaderEntry(work, reader);
    if (!resolved) return;

    switchReader(resolved.work.slug, resolved.reader).catch(err => {
      console.error(err);
      const meta = $("#meta");
      if (meta) meta.textContent = "Failed to load archive.";
    });
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      boot().catch(err => {
        console.error(err);
        const meta = $("#meta");
        if (meta) meta.textContent = "Failed to load archive.";
      });
    }, { once: true });
  } else {
    boot().catch(err => {
      console.error(err);
      const meta = $("#meta");
      if (meta) meta.textContent = "Failed to load archive.";
    });
  }
})();
