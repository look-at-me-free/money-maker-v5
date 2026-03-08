(() => {
  const LIBRARY_URL = "library.json";

  const ZONES = {
    topBanner: 5865232,
    leftRail: 5865238,
    rightRail: 5865240,
    betweenMulti: 5867482
  };

  const UI_IMAGE_PAGE_SIZE = 20;
  const BETWEEN_AFTER_IMAGES = 2;
  const BETWEEN_SLOTS = 3;
  const TOP_WORKS_LIMIT = 10;

  let LIBRARY = { works: [] };
  let READERS = [];
  let CURRENT_READER = null;
  let CURRENT_READER_INDEX = -1;
  let CURRENT_MANIFEST = null;
  let topFlyoutsWired = false;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function normalizeKey(value) {
    return String(value ?? "").trim().toLowerCase();
  }

  function humanizeUnderscoreLabel(value) {
    return String(value ?? "")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase())
      .trim();
  }

  function getUrlState() {
    const url = new URL(window.location.href);
    return {
      reader: url.searchParams.get("reader") || "",
      imagePage: clampImagePage(url.searchParams.get("p") || "1")
    };
  }

  function setUrlState(readerUrl, imagePage = 1) {
    const url = new URL(window.location.href);
    url.searchParams.set("reader", readerUrl);
    url.searchParams.set("p", String(clampImagePage(imagePage)));
    history.pushState({}, "", url.toString());
  }

  function replaceUrlState(readerUrl, imagePage = 1) {
    const url = new URL(window.location.href);
    url.searchParams.set("reader", readerUrl);
    url.searchParams.set("p", String(clampImagePage(imagePage)));
    history.replaceState({}, "", url.toString());
  }

  function clampImagePage(value) {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n) || n < 1) return 1;
    return n;
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Failed to load ${url} (${res.status})`);
    }
    return res.json();
  }

  function serveAds() {
    (window.AdProvider = window.AdProvider || []).push({ serve: {} });
  }

  function makeIns(zoneId, sub = 1, sub2 = 1, sub3 = 1) {
    const ins = document.createElement("ins");
    ins.className = "eas6a97888e38";
    ins.setAttribute("data-zoneid", String(zoneId));
    ins.setAttribute("data-sub", String(sub));
    ins.setAttribute("data-sub2", String(sub2));
    ins.setAttribute("data-sub3", String(sub3));
    return ins;
  }

  function fillSlot(el, zoneId, sub = 1, sub2 = 1, sub3 = 1) {
    if (!el) return;
    el.innerHTML = "";
    el.appendChild(makeIns(zoneId, sub, sub2, sub3));
    serveAds();
  }

  function getManifestSubids(manifest) {
    const fallbackWork = Number(manifest?.id) || 1;
    return {
      work: manifest?.subids?.work ?? fallbackWork,
      top: manifest?.subids?.top ?? fallbackWork + 10,
      left: manifest?.subids?.left ?? fallbackWork + 20,
      right: manifest?.subids?.right ?? fallbackWork + 30,
      between: manifest?.subids?.between ?? fallbackWork + 40
    };
  }

  function fillRailAds(manifest) {
    const subids = getManifestSubids(manifest);

    fillSlot($("#topBannerSlot"), ZONES.topBanner, subids.top, subids.work, 1);

    fillSlot($("#leftRailSlot1"), ZONES.leftRail, subids.left, subids.work, 1);
    fillSlot($("#leftRailSlot2"), ZONES.leftRail, subids.left, subids.work, 2);
    fillSlot($("#leftRailSlot3"), ZONES.leftRail, subids.left, subids.work, 3);

    fillSlot($("#rightRailSlot1"), ZONES.rightRail, subids.right, subids.work, 1);
    fillSlot($("#rightRailSlot2"), ZONES.rightRail, subids.right, subids.work, 2);
    fillSlot($("#rightRailSlot3"), ZONES.rightRail, subids.right, subids.work, 3);
  }

  function buildImageList(manifest) {
    if (Array.isArray(manifest?.images) && manifest.images.length) {
      return manifest.images.slice();
    }

    if (Number.isFinite(manifest?.pages) && manifest.pages > 0) {
      const ext = manifest.extension || "jpg";
      const padding = Number.isFinite(manifest.padding) ? manifest.padding : 2;

      return Array.from({ length: manifest.pages }, (_, i) => {
        return `${String(i + 1).padStart(padding, "0")}.${ext}`;
      });
    }

    return [];
  }

  function normalizeBaseUrl(url) {
    return String(url || "").replace(/\/+$/, "");
  }

  function imageBlock(src, alt) {
    const wrap = document.createElement("div");
    wrap.className = "image-wrap";

    const img = document.createElement("img");
    img.src = src;
    img.alt = alt;
    img.loading = "lazy";
    img.decoding = "async";

    wrap.appendChild(img);
    return wrap;
  }

  function betweenAd(manifest, groupNumber) {
    const subids = getManifestSubids(manifest);

    const wrap = document.createElement("div");
    wrap.className = "between-ad-block";

    const grid = document.createElement("div");
    grid.className = "between-grid";

    for (let i = 1; i <= BETWEEN_SLOTS; i++) {
      const slot = document.createElement("div");
      slot.className = "slot";

      slot.appendChild(
        makeIns(
          ZONES.betweenMulti,
          subids.between,
          subids.work,
          Number(`${groupNumber}${i}`)
        )
      );

      grid.appendChild(slot);
    }

    wrap.appendChild(grid);
    return wrap;
  }

  function flattenReaders() {
    const out = [];

    const works = Array.isArray(LIBRARY?.works) ? LIBRARY.works : [];

    for (const work of works) {
      const workLabel = work?.label || humanizeUnderscoreLabel(work?.slug || "Work");
      const workSlug = work?.slug || "";

      walkChildren(work?.children || [], {
        workSlug,
        workLabel,
        path: [workLabel]
      }, out);
    }

    return out;
  }

  function walkChildren(nodes, ctx, out) {
    if (!Array.isArray(nodes)) return;

    for (const node of nodes) {
      if (!node) continue;

      const label = node.label || "Untitled";
      const nextPath = [...ctx.path, label];

      if (node.type === "reader" && node.reader) {
        out.push({
          workSlug: ctx.workSlug,
          workLabel: ctx.workLabel,
          label,
          fullLabel: nextPath.join(" • "),
          shortLabel: nextPath.slice(1).join(" • ") || label,
          reader: node.reader,
          path: nextPath
        });
        continue;
      }

      if (node.type === "group" && Array.isArray(node.children)) {
        walkChildren(node.children, {
          ...ctx,
          path: nextPath
        }, out);
      }
    }
  }

  function getTopWorks() {
    const works = Array.isArray(LIBRARY?.works) ? LIBRARY.works : [];
    return works.slice(0, TOP_WORKS_LIMIT);
  }

  function findReaderByUrl(readerUrl) {
    const target = normalizeKey(readerUrl);
    return READERS.findIndex(x => normalizeKey(x.reader) === target);
  }

  function getCurrentWindowReaders(radius = 2) {
    if (CURRENT_READER_INDEX < 0) return [];
    const start = Math.max(0, CURRENT_READER_INDEX - radius);
    const end = Math.min(READERS.length - 1, CURRENT_READER_INDEX + radius);
    return READERS.slice(start, end + 1);
  }

  function renderHeaderInfo() {
    const titleEl = $("#currentWorkTitle");
    const metaEl = $("#meta");

    if (titleEl) {
      const parts = [];
      if (CURRENT_MANIFEST?.title) parts.push(CURRENT_MANIFEST.title);
      if (CURRENT_MANIFEST?.subtitle) parts.push(CURRENT_MANIFEST.subtitle);
      titleEl.textContent = parts.join(" • ") || "Reader";
    }

    if (metaEl) {
      const images = buildImageList(CURRENT_MANIFEST);
      metaEl.textContent = `${images.length} pages`;
    }
  }

  function renderTopWorksNav() {
    const nav = $("#worksNav");
    if (!nav) return;

    const works = getTopWorks();

    let html = "";

    for (const work of works) {
      const workLabel = work?.label || humanizeUnderscoreLabel(work?.slug || "Work");
      const children = Array.isArray(work?.children) ? work.children : [];
      const active = CURRENT_READER?.workSlug && normalizeKey(work.slug) === normalizeKey(CURRENT_READER.workSlug);

      html += `
        <div class="topworks-item${active ? " active" : ""}">
          <button class="topworks-trigger" type="button">
            <span>${escapeHtml(workLabel)}</span>
            <span class="topworks-caret"></span>
          </button>
          <div class="topworks-flyout">
            <div class="topworks-links">
              ${renderNodeLinks(children)}
            </div>
          </div>
        </div>
      `;
    }

    nav.innerHTML = html;
    wireTopFlyouts();
  }

  function renderNodeLinks(nodes) {
    if (!Array.isArray(nodes)) return "";

    let html = "";

    for (const node of nodes) {
      if (!node) continue;

      if (node.type === "reader" && node.reader) {
        const active = CURRENT_READER && normalizeKey(node.reader) === normalizeKey(CURRENT_READER.reader);
        html += `
          <a
            href="?reader=${encodeURIComponent(node.reader)}"
            class="topworks-link${active ? " active" : ""}"
            data-reader="${escapeHtml(node.reader)}"
          >
            ${escapeHtml(node.label || "Untitled")}
          </a>
        `;
        continue;
      }

      if (node.type === "group" && Array.isArray(node.children)) {
        html += `
          <div class="topworks-group">
            <div class="topworks-group-label">${escapeHtml(node.label || "Group")}</div>
            <div class="topworks-group-links">
              ${renderNodeLinks(node.children)}
            </div>
          </div>
        `;
      }
    }

    return html;
  }

  function wireTopFlyouts() {
    if (topFlyoutsWired) return;

    const closeAll = (except = null) => {
      $$(".topworks-item.open").forEach(el => {
        if (el !== except) el.classList.remove("open");
      });
    };

    document.addEventListener("mouseenter", (e) => {
      const item = e.target.closest(".topworks-item");
      if (!item) return;
      closeAll(item);
      item.classList.add("open");
    }, true);

    document.addEventListener("mouseleave", (e) => {
      const item = e.target.closest(".topworks-item");
      if (!item) return;
      item.classList.remove("open");
    }, true);

    document.addEventListener("click", (e) => {
      const trigger = e.target.closest(".topworks-trigger");
      if (!trigger) {
        if (!e.target.closest(".topworks-item")) closeAll();
        return;
      }

      e.preventDefault();
      const item = trigger.closest(".topworks-item");
      if (!item) return;

      const willOpen = !item.classList.contains("open");
      closeAll(item);
      item.classList.toggle("open", willOpen);
    });

    topFlyoutsWired = true;
  }

  function traversalWindow(radius = 2) {
    return getCurrentWindowReaders(radius);
  }

  function renderTraversal(containerId) {
    const root = document.getElementById(containerId);
    if (!root) return;

    if (!CURRENT_READER || CURRENT_READER_INDEX < 0) {
      root.innerHTML = "";
      return;
    }

    const prev = READERS[CURRENT_READER_INDEX - 1] || null;
    const next = READERS[CURRENT_READER_INDEX + 1] || null;
    const nearby = traversalWindow(2);

    root.innerHTML = `
      <nav class="work-traversal-shell" aria-label="Reader traversal">
        <div class="work-traversal">
          ${
            prev
              ? `<a href="?reader=${encodeURIComponent(prev.reader)}" class="trav-btn" data-reader="${escapeHtml(prev.reader)}">‹ Previous</a>`
              : `<span class="trav-btn disabled">‹ Previous</span>`
          }

          <div class="trav-strip">
            ${nearby.map(item => {
              const active = normalizeKey(item.reader) === normalizeKey(CURRENT_READER.reader);
              return `
                <a
                  href="?reader=${encodeURIComponent(item.reader)}"
                  class="trav-pill${active ? " active" : ""}"
                  data-reader="${escapeHtml(item.reader)}"
                  title="${escapeHtml(item.fullLabel)}"
                >
                  ${escapeHtml(item.shortLabel)}
                </a>
              `;
            }).join("")}
          </div>

          ${
            next
              ? `<a href="?reader=${encodeURIComponent(next.reader)}" class="trav-btn" data-reader="${escapeHtml(next.reader)}">Next ›</a>`
              : `<span class="trav-btn disabled">Next ›</span>`
          }
        </div>
      </nav>
    `;
  }

  function scrollToElement(el, offset = 12) {
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({
      top: Math.max(0, y),
      behavior: "smooth"
    });
  }

  function wireQuickNav() {
    $("#quickFirst")?.addEventListener("click", () => {
      scrollToElement($("#topTraversal") || $("#reader"), 12);
    });

    $("#quickLast")?.addEventListener("click", () => {
      scrollToElement($("#bottomTraversal") || $("#readerEndAnchor") || $("#reader"), 12);
    });

    $("#quickSearch")?.addEventListener("click", () => {
      const searchWrap = $("#searchSection") || $(".search-zone") || $(".search");
      scrollToElement(searchWrap, 12);

      const input = $("#q") || searchWrap?.querySelector("input");
      if (input) {
        setTimeout(() => input.focus(), 220);
      }
    });
  }

  function buildSearchIndex() {
    return READERS.map((reader, index) => ({
      index,
      reader,
      text: normalizeKey([
        reader.workLabel,
        reader.label,
        reader.fullLabel,
        reader.shortLabel
      ].join(" "))
    }));
  }

  function runSearch(query) {
    const q = normalizeKey(query);
    if (!q) return [];

    const index = buildSearchIndex();
    const tokens = q.split(/\s+/).filter(Boolean);

    const scored = index.map(entry => {
      let score = 0;

      if (entry.text.includes(q)) score += 100;

      for (const token of tokens) {
        if (entry.text.includes(token)) score += 20;
      }

      return { ...entry, score };
    });

    return scored
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }

  function renderSearchResults(results) {
    const nav = $("#nav");
    if (!nav) return;

    if (!results.length) {
      nav.innerHTML = "";
      nav.style.display = "none";
      return;
    }

    nav.innerHTML = results.map(result => `
      <a
        href="?reader=${encodeURIComponent(result.reader.reader)}"
        data-reader="${escapeHtml(result.reader.reader)}"
        class="search-pill"
      >
        ${escapeHtml(result.reader.fullLabel)}
      </a>
    `).join("");

    nav.style.display = "flex";
  }

  function wireSearch() {
    const input = $("#q");
    const clearBtn = $("#clear");

    if (!input) return;

    input.addEventListener("input", () => {
      const results = runSearch(input.value || "");
      renderSearchResults(results);
    });

    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const results = runSearch(input.value || "");
      if (!results.length) return;

      e.preventDefault();
      openReader(results[0].reader.reader, 1);
    });

    clearBtn?.addEventListener("click", () => {
      input.value = "";
      renderSearchResults([]);
      input.focus();
    });
  }

  function totalImageUiPages(images) {
    return Math.max(1, Math.ceil(images.length / UI_IMAGE_PAGE_SIZE));
  }

  function getVisibleImages(images, pageNumber) {
    const safePage = Math.max(1, Math.min(totalImageUiPages(images), clampImagePage(pageNumber)));
    const start = (safePage - 1) * UI_IMAGE_PAGE_SIZE;
    const end = Math.min(images.length, start + UI_IMAGE_PAGE_SIZE);
    return {
      page: safePage,
      total: totalImageUiPages(images),
      slice: images.slice(start, end),
      start,
      end
    };
  }

  function renderImagePager(images, currentPage) {
    const total = totalImageUiPages(images);
    if (total <= 1) return "";

    const prev = Math.max(1, currentPage - 1);
    const next = Math.min(total, currentPage + 1);

    const pills = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(total, currentPage + 2);

    for (let p = start; p <= end; p++) {
      pills.push(`
        <a
          href="?reader=${encodeURIComponent(CURRENT_READER.reader)}&p=${p}"
          data-reader="${escapeHtml(CURRENT_READER.reader)}"
          data-image-page="${p}"
          class="image-page-pill${p === currentPage ? " active" : ""}"
        >
          Pages ${((p - 1) * UI_IMAGE_PAGE_SIZE) + 1}–${Math.min(images.length, p * UI_IMAGE_PAGE_SIZE)}
        </a>
      `);
    }

    return `
      <div class="image-page-pager">
        <a
          href="?reader=${encodeURIComponent(CURRENT_READER.reader)}&p=${prev}"
          data-reader="${escapeHtml(CURRENT_READER.reader)}"
          data-image-page="${prev}"
          class="image-page-nav${currentPage === 1 ? " disabled" : ""}"
        >
          ‹ Prev
        </a>

        <div class="image-page-strip">
          ${pills.join("")}
        </div>

        <a
          href="?reader=${encodeURIComponent(CURRENT_READER.reader)}&p=${next}"
          data-reader="${escapeHtml(CURRENT_READER.reader)}"
          data-image-page="${next}"
          class="image-page-nav${currentPage === total ? " disabled" : ""}"
        >
          Next ›
        </a>
      </div>
    `;
  }

  function renderReader(manifest, imagePage = 1) {
    const reader = $("#reader");
    if (!reader) return;

    const images = buildImageList(manifest);
    const base = normalizeBaseUrl(manifest.base_url);

    if (!base) {
      throw new Error("Manifest missing base_url");
    }

    if (!images.length) {
      throw new Error("Manifest contains no images");
    }

    const { page, slice, total, start } = getVisibleImages(images, imagePage);

    const topPager = renderImagePager(images, page);
    const bottomPager = renderImagePager(images, page);

    reader.innerHTML = "";

    if (topPager) {
      const topPagerWrap = document.createElement("div");
      topPagerWrap.className = "reader-image-pager-wrap";
      topPagerWrap.innerHTML = topPager;
      reader.appendChild(topPagerWrap);
    }

    const note = document.createElement("div");
    note.className = "note";
    note.textContent = "If anything below ever fails in the wider archive, keep scrolling. I planned for that. The working path is always here.";
    reader.appendChild(note);

    let groupNumber = 0;

    for (let i = 0; i < slice.length; i++) {
      const globalIndex = start + i;
      reader.appendChild(
        imageBlock(
          `${base}/${slice[i]}`,
          `${manifest.title || "Work"} page ${globalIndex + 1}`
        )
      );

      const notLastVisible = i < slice.length - 1;
      const shouldInsertBetween = ((i + 1) % BETWEEN_AFTER_IMAGES === 0) && notLastVisible;

      if (shouldInsertBetween) {
        groupNumber += 1;
        reader.appendChild(betweenAd(manifest, groupNumber));
      }
    }

    const endAnchor = document.createElement("div");
    endAnchor.id = "readerEndAnchor";
    endAnchor.className = "reader-end-anchor";
    reader.appendChild(endAnchor);

    if (bottomPager) {
      const bottomPagerWrap = document.createElement("div");
      bottomPagerWrap.className = "reader-image-pager-wrap bottom";
      bottomPagerWrap.innerHTML = bottomPager;
      reader.appendChild(bottomPagerWrap);
    }

    serveAds();

    const metaEl = $("#meta");
    if (metaEl) {
      metaEl.textContent = `${images.length} pages • image set ${page} of ${total}`;
    }
  }

  async function openReader(readerUrl, imagePage = 1, usePushState = true) {
    const idx = findReaderByUrl(readerUrl);
    if (idx < 0) {
      throw new Error(`Reader not found in library.json: ${readerUrl}`);
    }

    CURRENT_READER_INDEX = idx;
    CURRENT_READER = READERS[idx];
    CURRENT_MANIFEST = await fetchJson(CURRENT_READER.reader);

    if (usePushState) {
      setUrlState(CURRENT_READER.reader, imagePage);
    } else {
      replaceUrlState(CURRENT_READER.reader, imagePage);
    }

    renderHeaderInfo();
    renderTopWorksNav();
    renderTraversal("topTraversal");
    renderTraversal("bottomTraversal");
    fillRailAds(CURRENT_MANIFEST);
    renderReader(CURRENT_MANIFEST, imagePage);
  }

  function handleDelegatedClicks() {
    document.addEventListener("click", async (e) => {
      const readerLink = e.target.closest("[data-reader]");
      if (readerLink) {
        const readerUrl = readerLink.dataset.reader;
        const imagePage = clampImagePage(readerLink.dataset.imagePage || "1");

        if (readerUrl) {
          e.preventDefault();
          try {
            await openReader(readerUrl, imagePage, true);
          } catch (err) {
            console.error(err);
            const reader = $("#reader");
            if (reader) {
              reader.innerHTML = `<div class="note">Failed to load this work. Please check library.json and the reader manifest path.</div>`;
            }
          }
        }
      }
    });
  }

  async function boot() {
    LIBRARY = await fetchJson(LIBRARY_URL);
    READERS = flattenReaders();

    if (!READERS.length) {
      throw new Error("library.json contains no reader nodes");
    }

    const { reader, imagePage } = getUrlState();
    const initialReader = findReaderByUrl(reader) >= 0 ? reader : READERS[0].reader;

    if (normalizeKey(initialReader) !== normalizeKey(reader || "")) {
      replaceUrlState(initialReader, 1);
    }

    renderTopWorksNav();
    wireSearch();
    wireQuickNav();
    handleDelegatedClicks();

    await openReader(initialReader, imagePage, false);
  }

  window.addEventListener("popstate", async () => {
    const { reader, imagePage } = getUrlState();
    if (!reader) return;

    try {
      await openReader(reader, imagePage, false);
    } catch (err) {
      console.error(err);
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      boot().catch(err => {
        console.error(err);
        const reader = $("#reader");
        if (reader) {
          reader.innerHTML = `<div class="note">Failed to load archive. Please check library.json and manifest URLs.</div>`;
        }
      });
    }, { once: true });
  } else {
    boot().catch(err => {
      console.error(err);
      const reader = $("#reader");
      if (reader) {
        reader.innerHTML = `<div class="note">Failed to load archive. Please check library.json and manifest URLs.</div>`;
      }
    });
  }
})();
