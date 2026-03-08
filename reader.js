const ZONES = {
  topBanner: 5865232,
  leftRail: 5865238,
  rightRail: 5865240,
  betweenMulti: 5867482
};

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

function getWorkSlug() {
  const url = new URL(window.location.href);
  return url.searchParams.get("work") || "first_book";
}

async function loadManifest(slug) {
  const manifestUrl = `https://pub-cd01009a7c6c464aa0b093e33aa5ae51.r2.dev/works/${slug}/manifest.json`;
  const res = await fetch(manifestUrl, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load manifest for ${slug}`);
  }
  return res.json();
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

function getSubids(manifest) {
  const fallbackWork = Number(manifest.id) || 1;

  return {
    work: manifest.subids?.work ?? fallbackWork,
    top: manifest.subids?.top ?? fallbackWork + 10,
    left: manifest.subids?.left ?? fallbackWork + 20,
    right: manifest.subids?.right ?? fallbackWork + 30,
    between: manifest.subids?.between ?? fallbackWork + 40
  };
}

function betweenAd(manifest, groupNumber) {
  const subids = getSubids(manifest);

  const wrap = document.createElement("div");
  wrap.className = "slot";

  const grid = document.createElement("div");
  grid.className = "between-grid";

  for (let i = 1; i <= 3; i++) {
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

function fillRailStacks(subids) {
  fillSlot(
    document.getElementById("leftRailSlot1"),
    ZONES.leftRail,
    subids.left,
    subids.work,
    1
  );

  fillSlot(
    document.getElementById("leftRailSlot2"),
    ZONES.leftRail,
    subids.left,
    subids.work,
    2
  );

  fillSlot(
    document.getElementById("leftRailSlot3"),
    ZONES.leftRail,
    subids.left,
    subids.work,
    3
  );

  fillSlot(
    document.getElementById("rightRailSlot1"),
    ZONES.rightRail,
    subids.right,
    subids.work,
    1
  );

  fillSlot(
    document.getElementById("rightRailSlot2"),
    ZONES.rightRail,
    subids.right,
    subids.work,
    2
  );

  fillSlot(
    document.getElementById("rightRailSlot3"),
    ZONES.rightRail,
    subids.right,
    subids.work,
    3
  );
}

async function buildReader() {
  const slug = getWorkSlug();
  const manifest = await loadManifest(slug);
  const subids = getSubids(manifest);

  const workTitleEl = document.getElementById("workTitle");
  if (workTitleEl) {
    workTitleEl.textContent = manifest.title || slug;
  }

  fillSlot(
    document.getElementById("topBannerSlot"),
    ZONES.topBanner,
    subids.top,
    subids.work,
    1
  );

  fillRailStacks(subids);

  const reader = document.getElementById("reader");
  if (!reader) return;
  reader.innerHTML = "";

  const note = document.createElement("div");
  note.className = "note";
  note.textContent = "If anything below ever fails in the wider archive, keep scrolling. I planned for that. The working path is always here.";
  reader.appendChild(note);

  const images = buildImageList(manifest);
  const base = normalizeBaseUrl(manifest.base_url);

  if (!base) {
    throw new Error(`Manifest for ${slug} is missing base_url`);
  }

  if (!images.length) {
    throw new Error(`Manifest for ${slug} has no images`);
  }

  for (let i = 0; i < Math.min(2, images.length); i++) {
    reader.appendChild(
      imageBlock(
        `${base}/${images[i]}`,
        `${manifest.title || slug} page ${i + 1}`
      )
    );
  }

  let groupNumber = 0;

  for (let i = 2; i < images.length; i += 2) {
    const slice = images.slice(i, i + 2);

    for (let j = 0; j < slice.length; j++) {
      reader.appendChild(
        imageBlock(
          `${base}/${slice[j]}`,
          `${manifest.title || slug} page ${i + j + 1}`
        )
      );
    }

    groupNumber += 1;
    reader.appendChild(betweenAd(manifest, groupNumber));
  }

  serveAds();
}

document.addEventListener("DOMContentLoaded", () => {
  buildReader().catch(err => {
    console.error(err);

    const workTitleEl = document.getElementById("workTitle");
    if (workTitleEl) {
      workTitleEl.textContent = "Failed to load work";
    }

    const reader = document.getElementById("reader");
    if (reader) {
      reader.innerHTML = `
        <div class="note">
          Failed to load this work. Please check the manifest path, base_url, and image filenames.
        </div>
      `;
    }
  });
});
