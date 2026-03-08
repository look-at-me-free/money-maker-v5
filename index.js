(() => {
  // =========================
  // CONFIG
  // =========================
  const LIBRARY_FILE = "library.json";

  const UI_PAGE_SIZE = 20;

  const BETWEEN_ZONE = "5865236";
  const END_ZONE = "5865236";
  const END_ADS = 24;
  const BETWEEN_EVERY = 2;
  const BETWEEN_SLOTS = 3;

  const LAZY_ADS = true;
  const SEARCH_DEBOUNCE_MS = 90;
  const SEARCH_MAX_RESULTS = 50;
  const TOP_FLYOUT_CLOSE_DELAY = 180;
  const SCROLL_MAX_MS = 1500;

  // =========================
  // STATE
  // =========================
  let LIBRARY = { works: [] };

  let CURRENT_WORK = null;
  let CURRENT_READER = null;
  let CURRENT_MANIFEST = null;
  let CURRENT_IMAGES = [];
  let CURRENT_UI_PAGE = 1;

  let SEARCH_INDEX = [];
  let searchWired = false;
  let adObserver = null;
  let topFlyoutsWired = false;

  // =========================
  // DOM HELPERS
  // =========================
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function normalizeKey(s) {
    return String(s || "").trim().toLowerCase();
  }

  function titleCaseSlug(slug) {
    return String(slug || "")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase())
      .trim();
  }

  function prettyNodeLabel(label) {
    return String(label || "").trim();
  }

  function currentMetaLine() {
    const parts = [];
    if (CURRENT_MANIFEST?.title) parts.push(CURRENT_MANIFEST.title);
    if (CURRENT_MANIFEST?.subtitle) parts.push(CURRENT_MANIFEST.subtitle);
    return parts.join(" • ");
  }

  // =========================
  // ROUTING
  // =========================
  function clampUiPage(p) {
    const n = parseInt(p, 10);
    if (!Number.isFinite(n) || n < 1) return 1;
    return n;
  }

  function getRoute() {
    const url = new URL(window.location.href);
    return {
      work: url.searchParams.get("work") || "",
      reader: url.searchParams.get("reader") || "",
      p: clampUiPage(url.searchParams.get("p") || "1"),
      hash: (url.hash || "").replace(/^#/, "")
    };
  }

  function setRoute(work, reader, page = 1, hash = "") {
    const url = new URL(window.location.href);
    url.searchParams.set("work", work);
    url.searchParams.set("reader", reader);
    url.searchParams.set("p", String(page));
    url.hash = hash ? `#${hash}` : "";
    history.pushState({}, "", url.toString());
  }

  function replaceRoute(work, reader, page = 1, hash = "") {
    const url = new URL(window.location.href);
    url.searchParams.set("work", work);
    url.searchParams.set("reader", reader);
    url.searchParams.set("p", String(page));
    url.hash = hash ? `#${hash}` : "";
    history.replaceState({}, "", url.toString());
  }

  // =========================
  // FETCH
  // =========================
  async function fetchJson(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Failed to load ${path} (${res.status})`);
    }
    return res.json();
  }

  async function loadLibrary() {
    LIBRARY = await fetchJson(LIBRARY_FILE);
    if (!Array.isArray(LIBRARY.works)) LIBRARY.works = [];
  }

  async function loadReaderManifest(readerUrl) {
    return fetchJson(readerUrl);
  }

  // =========================
  // LIBRARY TREE HELPERS
  // =========================
  function walkNodes(nodes, fn, parents = [], work = null) {
    for (const node of (nodes || [])) {
      fn(node, parents, work);
      if (Array.isArray(node.children) && node.children.length) {
        walkNodes(node.children, fn, [...parents, node], work);
      }
    }
  }

  function getAllReaders() {
    const out = [];

    for (const work of LIBRARY.works) {
      walkNodes(work.children || [], (node, parents) => {
        if (node.type === "reader" && node.reader) {
          out.push({
            work,
            node,
            reader: node.reader,
            label: node.label || "Untitled",
            parents
          });
        }
      }, [], work);
    }

    return out;
  }

  function getAllGroups() {
    const out = [];

    for (const work of LIBRARY.works) {
      walkNodes(work.children || [], (node, parents) => {
        if (node.type === "group" && Array.isArray(node.children) && node.children.length) {
          out.push({
            work,
            node,
            label: node.label || "Group",
            parents
          });
        }
      }, [], work);
    }

    return out;
  }

  function getFirstKnownReader() {
    const all = getAllReaders();
    return all.length ? all[0] : null;
  }

  function getLastKnownReader() {
    const all = getAllReaders();
    return all.length ? all[all.length - 1] : null;
  }

  function resolveReader(workSlug, readerUrl) {
    return getAllReaders().find(x =>
      normalizeKey(x.work.slug) === normalizeKey(workSlug) &&
      normalizeKey(x.reader) === normalizeKey(readerUrl)
    ) || null;
  }

  // =========================
  // MANIFEST / IMAGE HELPERS
  // =========================
  function normalizeBaseUrl(url) {
    return String(url || "").replace(/\/+$/, "");
  }

  function buildImageList(manifest) {
    if (Array.isArray(manifest.images) && manifest.images.length) {
      return manifest.images;
    }

    if (Number.isFinite(manifest.pages) && manifest.pages > 0) {
      const ext = manifest.extension || "jpg";
      const padding = Number.isFinite(manifest.padding) ? manifest.padding : 2;

      return Array.from({ length: manifest.pages }, (_, i) => {
        const n = String(i + 1).padStart(padding, "0");
        return `${n}.${ext}`;
      });
    }

    return [];
  }

  function getImageAbsoluteUrl(base, imageName) {
    return `${normalizeBaseUrl(base)}/${imageName}`;
  }

  // =========================
  // ADS
  // =========================
  function ensureIns(slot) {
    if (slot.dataset.inited) return;
    slot.dataset.inited = "1";

    const ins = document.createElement("ins");
    ins.className = "eas6a97888e2";
    ins.setAttribute("data-zoneid", slot.dataset.zone);
    slot.appendChild(ins);
  }

  function serveAds() {
    (window.AdProvider = window.AdProvider || []).push({ serve: {} });
  }

  function initLazyAds() {
    if (adObserver || !LAZY_ADS) return;

    adObserver = new IntersectionObserver((entries) => {
      let didInit = false;

      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const slot = entry.target;
        ensureIns(slot);
        adObserver.unobserve(slot);
        didInit = true;
      }

      if (didInit) setTimeout(serveAds, 30);
    }, {
      root: null,
      rootMargin: "900px 0px",
      threshold: 0.01
    });

    $$(".exo-slot[data-zone]").forEach(slot => adObserver.observe(slot));
  }

  function observeNewSlots(root) {
    if (!adObserver) return;
    $$(".exo-slot[data-zone]", root).forEach(slot => adObserver.observe(slot));
  }

  function initAllAdsNow() {
    $$(".exo-slot[data-zone]").forEach(ensureIns);
    serveAds();
  }

  function buildBetweenAd(count) {
    const wrap = document.createElement("div");
    wrap.className = "between-ad";

    const grid = document.createElement("div");
    grid.className = "between-grid";

    for (let i = 0; i < count; i++) {
      const slot = document.createElement("div");
      slot.className = "exo-slot";
      slot.dataset.zone = BETWEEN_ZONE;
      grid.appendChild(slot);
    }

    wrap.appendChild(grid);
    return wrap;
  }

  function buildEndAds() {
    const wrap = document.createElement("section");
    wrap.className = "end-ads";
    wrap.id = "endAds";

    const title = document.createElement("p");
    title.className = "end-ads-title";
    title.textContent = "More panels";

    const grid = document.createElement("div");
    grid.className = "end-ads-grid";

    for (let i = 0; i < END_ADS; i++) {
      const slot = document.createElement("div");
      slot.className = "exo-slot";
      slot.dataset.zone = END_ZONE;
      grid.appendChild(slot);
    }

    wrap.appendChild(title);
    wrap.appendChild(grid);
    return wrap;
  }

  // =========================
  // PAGINATION
  // =========================
  function totalUiPages() {
    return Math.max(1, Math.ceil(CURRENT_IMAGES.length / UI_PAGE_SIZE));
  }

  function clampCurrentPage(p) {
    const total = totalUiPages();
    const n = parseInt(p, 10);
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.min(total, n);
  }

  function getUiPageRange(page) {
    const startIdx = (page - 1) * UI_PAGE_SIZE;
    const endIdx = Math.min(CURRENT_IMAGES.length - 1, startIdx + UI_PAGE_SIZE - 1);
    return { startIdx, endIdx };
  }

  function getVisibleImages() {
    const { startIdx, endIdx } = getUiPageRange(CURRENT_UI_PAGE);
    if (endIdx < startIdx) return [];
    return CURRENT_IMAGES.slice(startIdx, endIdx + 1);
  }

  function getUiPageForImageIndex(idx) {
    return Math.floor(idx / UI_PAGE_SIZE) + 1;
  }

  function getUiPageForAnchor(anchor) {
    const idx = CURRENT_IMAGES.findIndex(item => item.anchor === anchor);
    return idx === -1 ? 1 : getUiPageForImageIndex(idx);
  }

  function getUiPageLabel(page) {
    const { startIdx, endIdx } = getUiPageRange(page);
    if (CURRENT_IMAGES.length === 0 || endIdx < startIdx) return `Page ${page}`;

    const startNum = CURRENT_IMAGES[startIdx]?.page || startIdx + 1;
    const endNum = CURRENT_IMAGES[endIdx]?.page || endIdx + 1;

    return `Pg. ${startNum}–${endNum}`;
  }

  function buildPagerSequence(current, total) {
    if (total <= 9) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const set = new Set([1, 2, total - 1, total, current - 1, current, current + 1]);
    const nums = Array.from(set)
      .filter(n => n >= 1 && n <= total)
      .sort((a, b) => a - b);

    const out = [];
    for (let i = 0; i < nums.length; i++) {
      out.push(nums[i]);
      if (i < nums.length - 1 && nums[i + 1] - nums[i] > 1) {
        out.push("...");
      }
    }
    return out;
  }

  function ensureDynamicPagerContainers() {
    const main = $(".center");
    const container = $("#container");
    if (!main || !container) return;

    let top = $("#dynamicTopPager");
    let bottom = $("#dynamicBottomPager");

    if (!top) {
      top = document.createElement("div");
      top.id = "dynamicTopPager";
      top.className = "nav";
      top.style.margin = "0 0 12px";
      main.insertBefore(top, container);
    }

    if (!bottom) {
      bottom = document.createElement("div");
      bottom.id = "dynamicBottomPager";
      bottom.className = "nav";
      bottom.style.margin = "18px 0 0";
      main.appendChild(bottom);
    }
  }

  function renderPagerInto(el) {
    if (!el) return;

    const total = totalUiPages();
    if (total <= 1) {
      el.innerHTML = "";
      el.style.display = "none";
      return;
    }

    const seq = buildPagerSequence(CURRENT_UI_PAGE, total);
    let html = "";

    html += `
      <a
        href="?work=${encodeURIComponent(CURRENT_WORK.slug)}&reader=${encodeURIComponent(CURRENT_READER.reader)}&p=${Math.max(1, CURRENT_UI_PAGE - 1)}"
        data-work="${escapeHtml(CURRENT_WORK.slug)}"
        data-reader="${escapeHtml(CURRENT_READER.reader)}"
        data-page="${Math.max(1, CURRENT_UI_PAGE - 1)}"
      >
        ‹ Prev
      </a>
    `;

    for (const part of seq) {
      if (part === "...") {
        html += `<span class="pager-ellipsis">…</span>`;
      } else {
        const activeClass = part === CURRENT_UI_PAGE ? " active" : "";
        html += `
          <a
            href="?work=${encodeURIComponent(CURRENT_WORK.slug)}&reader=${encodeURIComponent(CURRENT_READER.reader)}&p=${part}"
            class="${activeClass.trim()}"
            data-work="${escapeHtml(CURRENT_WORK.slug)}"
            data-reader="${escapeHtml(CURRENT_READER.reader)}"
            data-page="${part}"
          >
            ${escapeHtml(getUiPageLabel(part))}
          </a>
        `;
      }
    }

    html += `
      <a
        href="?work=${encodeURIComponent(CURRENT_WORK.slug)}&reader=${encodeURIComponent(CURRENT_READER.reader)}&p=${Math.min(total, CURRENT_UI_PAGE + 1)}"
        data-work="${escapeHtml(CURRENT_WORK.slug)}"
        data-reader="${escapeHtml(CURRENT_READER.reader)}"
        data-page="${Math.min(total, CURRENT_UI_PAGE + 1)}"
      >
        Next ›
      </a>
    `;

    el.innerHTML = html;
    el.style.display = "flex";
  }

  function renderDynamicPagers() {
    ensureDynamicPagerContainers();
    renderPagerInto($("#dynamicTopPager"));
    renderPagerInto($("#dynamicBottomPager"));
  }

  // =========================
  // MENU RENDERING
  // =========================
  function renderTopFlyoutNodes(nodes, workSlug, depth = 0) {
    let html = "";

    for (const node of (nodes || [])) {
      const label = prettyNodeLabel(node.label || "Untitled");

      if (node.type === "reader" && node.reader) {
        const active =
          normalizeKey(workSlug) === normalizeKey(CURRENT_WORK?.slug) &&
          normalizeKey(node.reader) === normalizeKey(CURRENT_READER?.reader)
            ? " active"
            : "";

        html += `
          <a
            href="?work=${encodeURIComponent(workSlug)}&reader=${encodeURIComponent(node.reader)}&p=1"
            class="topworks-link${active}"
            data-work="${escapeHtml(workSlug)}"
            data-reader="${escapeHtml(node.reader)}"
            data-page="1"
            style="margin-left:${depth * 12}px"
          >
            ${escapeHtml(label)}
          </a>
        `;
      } else if (node.type === "group" && Array.isArray(node.children) && node.children.length) {
        html += `
          <div
            class="topworks-link"
            style="margin-left:${depth * 12}px; font-weight:700; cursor:default; background:rgba(255,255,255,.08)"
          >
            ${escapeHtml(label)}
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
      const isActive = normalizeKey(work.slug) === normalizeKey(CURRENT_WORK?.slug);
      const activeClass = isActive ? " active" : "";

      html += `
        <div class="topworks-item${activeClass}">
          <button class="topworks-trigger" type="button">
            <span>${escapeHtml(work.label || titleCaseSlug(work.slug))}</span>
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
        }, TOP_FLYOUT_CLOSE_DELAY);
      });
    });

    if (!topFlyoutsWired) {
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".topworks-item")) {
          $$(".topworks-item.open").forEach(el => el.classList.remove("open"));
        }
      });
      topFlyoutsWired = true;
    }
  }

  function renderLibraryNodes(nodes, workSlug, depth = 0) {
    let html = "";

    for (const node of (nodes || [])) {
      const label = prettyNodeLabel(node.label || "Untitled");

      if (node.type === "reader" && node.reader) {
        const active =
          normalizeKey(workSlug) === normalizeKey(CURRENT_WORK?.slug) &&
          normalizeKey(node.reader) === normalizeKey(CURRENT_READER?.reader)
            ? " active"
            : "";

        html += `
          <a
            href="?work=${encodeURIComponent(workSlug)}&reader=${encodeURIComponent(node.reader)}&p=1"
            class="library-flyout-link${active}"
            data-work="${escapeHtml(workSlug)}"
            data-reader="${escapeHtml(node.reader)}"
            data-page="1"
            style="margin-left:${depth * 10}px"
          >
            ${escapeHtml(label)}
          </a>
        `;
      } else if (node.type === "group" && Array.isArray(node.children) && node.children.length) {
        html += `
          <div
            class="library-flyout-link"
            style="margin-left:${depth * 10}px; font-weight:700; cursor:default; background:rgba(255,255,255,.08)"
          >
            ${escapeHtml(label)}
          </div>
        `;
        html += renderLibraryNodes(node.children, workSlug, depth + 1);
      }
    }

    return html;
  }

  function renderLibraryNav() {
    const root = $("#libraryNav");
    if (!root) return;

    const works = [...LIBRARY.works].sort((a, b) =>
      String(a.label || a.slug).localeCompare(String(b.label || b.slug))
    );

    const grouped = new Map();

    for (const work of works) {
      const letter = String(work.label || work.slug).charAt(0).toUpperCase();
      if (!grouped.has(letter)) grouped.set(letter, []);
      grouped.get(letter).push(work);
    }

    let html = "";

    for (const [letter, items] of grouped) {
      html += `<div class="library-letter">${escapeHtml(letter)}</div>`;

      for (const work of items) {
        const itemOpen =
          normalizeKey(work.slug) === normalizeKey(CURRENT_WORK?.slug) ? " open" : "";

        html += `
          <div class="library-item${itemOpen}">
            <button class="library-trigger" type="button">
              <span>${escapeHtml(work.label || titleCaseSlug(work.slug))}</span>
              <span class="library-arrow">▶</span>
            </button>

            <div class="library-flyout">
              <div class="library-flyout-links">
                ${renderLibraryNodes(work.children || [], work.slug, 0)}
              </div>
            </div>
          </div>
        `;
      }
    }

    root.innerHTML = html;
  }

  // =========================
  // SEARCH
  // =========================
  function buildSearchIndex() {
    const readers = getAllReaders();
    const groups = getAllGroups();

    const readerEntries = readers.map(x => ({
      type: "reader",
      label: x.label,
      workLabel: x.work.label || x.work.slug,
      workSlug: x.work.slug,
      reader: x.reader,
      text: `${x.work.label || x.work.slug} ${x.label}`
    }));

    const groupEntries = groups.map(x => ({
      type: "group",
      label: x.label,
      workLabel: x.work.label || x.work.slug,
      workSlug: x.work.slug,
      children: x.node.children || [],
      text: `${x.work.label || x.work.slug} ${x.label}`
    }));

    SEARCH_INDEX = [...readerEntries, ...groupEntries];
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

    return SEARCH_INDEX
      .map(item => {
        const hay = norm(item.text);
        let score = 0;
        if (hay.includes(q)) score += 100;

        const words = q.split(/\s+/).filter(Boolean);
        for (const w of words) {
          if (hay.includes(w)) score += 15;
        }

        return { item, score };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, SEARCH_MAX_RESULTS)
      .map(x => x.item);
  }

  function renderSearchGroupChildren(groupId, children, workSlug) {
    return `
      <div class="nav" id="search-group-${groupId}" style="display:none; width:100%; margin-top:8px;">
        ${children.map(child => {
          if (child.type === "reader" && child.reader) {
            return `
              <a
                href="?work=${encodeURIComponent(workSlug)}&reader=${encodeURIComponent(child.reader)}&p=1"
                data-work="${escapeHtml(workSlug)}"
                data-reader="${escapeHtml(child.reader)}"
                data-page="1"
              >
                ${escapeHtml(child.label || "Reader")}
              </a>
            `;
          }
          return `
            <span class="smallbtn" style="cursor:default;">
              ${escapeHtml(child.label || "Group")}
            </span>
          `;
        }).join("")}
      </div>
    `;
  }

  function updateSearchResults(query) {
    const meta = $("#meta");
    const nav = $("#nav");

    if (!query.trim()) {
      if (nav) {
        nav.innerHTML = "";
        nav.style.display = "none";
      }
      if (meta) meta.textContent = `Pages: ${CURRENT_IMAGES.length} • ${getUiPageLabel(CURRENT_UI_PAGE)}`;
      return;
    }

    const hits = runSearch(query);

    if (meta) {
      meta.textContent = hits.length ? `Matches: ${hits.length}` : "No matches.";
    }

    if (!nav) return;

    let html = "";

    hits.forEach((hit, i) => {
      if (hit.type === "reader") {
        html += `
          <a
            href="?work=${encodeURIComponent(hit.workSlug)}&reader=${encodeURIComponent(hit.reader)}&p=1"
            data-work="${escapeHtml(hit.workSlug)}"
            data-reader="${escapeHtml(hit.reader)}"
            data-page="1"
          >
            ${escapeHtml(hit.workLabel)} • ${escapeHtml(hit.label)}
          </a>
        `;
      } else if (hit.type === "group") {
        const groupId = `g${i}`;
        html += `
          <button
            class="smallbtn"
            type="button"
            data-search-group="${groupId}"
          >
            ${escapeHtml(hit.workLabel)} • ${escapeHtml(hit.label)} ▾
          </button>
        `;
        html += renderSearchGroupChildren(groupId, hit.children || [], hit.workSlug);
      }
    });

    nav.innerHTML = html;
    nav.style.display = hits.length ? "flex" : "none";
  }

  function wireSearchUI() {
    if (searchWired) return;
    searchWired = true;

    const input = $("#q");
    const meta = $("#meta");
    const nav = $("#nav");
    const clearBtn = $("#clear");

    if (meta) {
      meta.textContent = `Pages: ${CURRENT_IMAGES.length} • ${getUiPageLabel(CURRENT_UI_PAGE)}`;
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (input) input.value = "";
        if (nav) {
          nav.innerHTML = "";
          nav.style.display = "none";
        }
        if (meta) {
          meta.textContent = `Pages: ${CURRENT_IMAGES.length} • ${getUiPageLabel(CURRENT_UI_PAGE)}`;
        }
      });
    }

    if (!input) return;

    let tmr = null;

    input.addEventListener("input", () => {
      clearTimeout(tmr);
      tmr = setTimeout(() => {
        updateSearchResults(input.value || "");
      }, SEARCH_DEBOUNCE_MS);
    });

    if (nav) {
      nav.addEventListener("click", (e) => {
        const groupBtn = e.target.closest("[data-search-group]");
        if (groupBtn) {
          e.preventDefault();
          const id = groupBtn.dataset.searchGroup;
          const block = document.getElementById(`search-group-${id}`);
          if (block) {
            block.style.display = block.style.display === "none" ? "flex" : "none";
          }
          return;
        }
      });
    }
  }

  // =========================
  // READER RENDERING
  // =========================
  function imageBlock(src, alt, anchor) {
    const wrap = document.createElement("div");
    wrap.className = "image-wrap";
    wrap.id = anchor;

    const img = document.createElement("img");
    img.src = src;
    img.alt = alt;
    img.loading = "lazy";
    img.decoding = "async";

    wrap.appendChild(img);
    return wrap;
  }

  function renderVisibleItems(container) {
    const visibleItems = getVisibleImages();
    const frag = document.createDocumentFragment();

    const note = document.createElement("div");
    note.className = "note";
    note.textContent = "If anything below ever fails in the wider archive, keep scrolling. I planned for that. The working path is always here.";
    frag.appendChild(note);

    visibleItems.forEach((item, localIdx) => {
      frag.appendChild(
        imageBlock(
          item.src,
          item.alt,
          item.anchor
        )
      );

      const globalPos = ((CURRENT_UI_PAGE - 1) * UI_PAGE_SIZE) + localIdx + 1;
      const isGap =
        globalPos >= 2 &&
        (globalPos % BETWEEN_EVERY === 0) &&
        (localIdx + 1) < visibleItems.length;

      if (isGap) {
        frag.appendChild(buildBetweenAd(BETWEEN_SLOTS));
      }
    });

    container.appendChild(frag);
    observeNewSlots(container);
  }

  function render() {
    const container = $("#container");
    if (!container) return;

    container.replaceChildren();
    renderDynamicPagers();
    renderVisibleItems(container);

    if (!$("#endAds")) {
      container.appendChild(buildEndAds());
    }

    const meta = $("#meta");
    if (meta) {
      meta.textContent = `Pages: ${CURRENT_IMAGES.length} • ${getUiPageLabel(CURRENT_UI_PAGE)}`;
    }

    if (LAZY_ADS) {
      setTimeout(serveAds, 80);
    }
  }

  // =========================
  // LOAD CURRENT READER
  // =========================
  async function switchReader(workSlug, readerUrl, page = 1) {
    const resolved = resolveReader(workSlug, readerUrl);
    if (!resolved) {
      throw new Error(`Unknown reader for work=${workSlug}`);
    }

    const manifest = await loadReaderManifest(readerUrl);
    const imageNames = buildImageList(manifest);
    const base = normalizeBaseUrl(manifest.base_url);

    if (!base) {
      throw new Error(`Manifest missing base_url: ${readerUrl}`);
    }

    if (!imageNames.length) {
      throw new Error(`Manifest has no images: ${readerUrl}`);
    }

    CURRENT_WORK = resolved.work;
    CURRENT_READER = resolved;
    CURRENT_MANIFEST = manifest;
    CURRENT_IMAGES = imageNames.map((name, idx) => ({
      page: idx + 1,
      name,
      anchor: `page-${idx + 1}`,
      src: getImageAbsoluteUrl(base, name),
      alt: `${manifest.title || resolved.work.label || resolved.work.slug} page ${idx + 1}`
    }));

    CURRENT_UI_PAGE = clampCurrentPage(page);

    const currentWorkTitle = $("#currentWorkTitle");
    if (currentWorkTitle) {
      currentWorkTitle.textContent = currentMetaLine() || "Expand • Read • Scroll";
    }

    renderWorksNav();
    renderLibraryNav();
    render();
    openHashTarget();
  }

  // =========================
  // SCROLL
  // =========================
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function smoothScrollToY(targetY, maxMs = SCROLL_MAX_MS) {
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
    if (smooth) smoothScrollToY(y, SCROLL_MAX_MS);
    else window.scrollTo(0, y);
  }

  function openFirstVisibleImage({ scroll = false } = {}) {
    const first = getVisibleImages()[0];
    if (!first) return;

    const el = document.getElementById(first.anchor);
    if (el && scroll) {
      scrollToEl(el, { offset: 12, smooth: true });
    }
  }

  async function openLastWork() {
    const last = getLastKnownReader();
    if (!last) return;

    setRoute(last.work.slug, last.reader, 1, "");
    await switchReader(last.work.slug, last.reader, 1);
  }

  function openHashTarget() {
    const hash = (window.location.hash || "").replace(/^#/, "");
    if (!hash) return;

    const idx = CURRENT_IMAGES.findIndex(item => item.anchor === hash);
    if (idx === -1) return;

    const targetPage = getUiPageForAnchor(hash);
    if (targetPage !== CURRENT_UI_PAGE) {
      CURRENT_UI_PAGE = targetPage;
      replaceRoute(CURRENT_WORK.slug, CURRENT_READER.reader, CURRENT_UI_PAGE, hash);
      render();
    }

    requestAnimationFrame(() => {
      const el = document.getElementById(hash);
      if (!el) return;
      scrollToEl(el, { offset: 12, smooth: true });
    });
  }

  // =========================
  // EVENTS
  // =========================
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

    const libraryTrigger = e.target.closest(".library-trigger");
    if (libraryTrigger) {
      e.preventDefault();
      e.stopPropagation();

      const item = libraryTrigger.closest(".library-item");
      if (!item) return;

      $$(".library-item.open").forEach(el => {
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
      const page = clampUiPage(readerLink.dataset.page || "1");

      if (!work || !reader) return;

      const sameWork = normalizeKey(work) === normalizeKey(CURRENT_WORK?.slug);
      const sameReader = normalizeKey(reader) === normalizeKey(CURRENT_READER?.reader);
      const samePage = page === CURRENT_UI_PAGE;

      if (sameWork && sameReader && samePage) return;

      setRoute(work, reader, page, "");
      switchReader(work, reader, page).catch(err => {
        console.error(err);
        const meta = $("#meta");
        if (meta) meta.textContent = "Failed to load selected reader.";
      });
      return;
    }

    const firstBtn = e.target.closest("#openFirstTop");
    if (firstBtn) {
      e.preventDefault();
      e.stopPropagation();
      openFirstVisibleImage({ scroll: true });
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

    if (!e.target.closest(".library-item")) {
      $$(".library-item.open").forEach(el => el.classList.remove("open"));
    }

    if (!e.target.closest(".topworks-item")) {
      $$(".topworks-item.open").forEach(el => el.classList.remove("open"));
    }
  });

  // =========================
  // BOOT
  // =========================
  async function boot() {
    await loadLibrary();
    buildSearchIndex();

    let { work, reader, p } = getRoute();
    let resolved = resolveReader(work, reader);

    if (!resolved) {
      const first = getFirstKnownReader();
      if (!first) {
        throw new Error("No readable entries found in library.json");
      }
      resolved = first;
      p = 1;
      replaceRoute(resolved.work.slug, resolved.reader, p, "");
    } else if (
      resolved.work.slug !== work ||
      resolved.reader !== reader
    ) {
      replaceRoute(resolved.work.slug, resolved.reader, p, "");
    }

    await switchReader(resolved.work.slug, resolved.reader, p);
    wireSearchUI();

    if (LAZY_ADS) {
      initLazyAds();
      setTimeout(serveAds, 900);
    } else {
      initAllAdsNow();
    }
  }

  window.addEventListener("popstate", () => {
    const { work, reader, p } = getRoute();
    const resolved = resolveReader(work, reader);
    if (!resolved) return;

    switchReader(resolved.work.slug, resolved.reader, p).catch(err => {
      console.error(err);
      const meta = $("#meta");
      if (meta) meta.textContent = "Failed to load archive.";
    });
  });

  window.addEventListener("hashchange", () => {
    openHashTarget();
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
