const CATEGORIES = [
  { id: "all", label: "All" },
  {
    id: "home",
    label: "Home",
    children: [
      { id: "stay", label: "Stay" },
      { id: "supermarket", label: "Supermarkets" },
    ],
  },
  { id: "bars", label: "Bars" },
  { id: "wine", label: "Wine" },
  { id: "beer", label: "Beer" },
  { id: "cafes", label: "Cafés" },
  {
    id: "food",
    label: "Food",
    children: [
      { id: "tasca", label: "Tasca" },
      { id: "asian", label: "Asian" },
      { id: "burger", label: "Burgers" },
      { id: "pizza", label: "Pizza" },
      { id: "portuguese", label: "Portuguese" },
      { id: "eats", label: "Eats" },
      { id: "georgian", label: "Georgian" },
      { id: "other", label: "Other" },
    ],
  },
  { id: "views", label: "Places" },
  { id: "beaches", label: "Beach" },
  { id: "clubs", label: "Clubs" },
];

const navEl = document.getElementById("nav");
const subnavEl = document.getElementById("subnav");
const listEl = document.getElementById("list");
const emptyEl = document.getElementById("empty");
const countEl = document.getElementById("count");
const searchEl = document.getElementById("search");
const tpl = document.getElementById("place-tpl");
const themeBtn = document.getElementById("theme");
const THEME_KEY = "lisbon-theme";

function systemDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(theme) {
  const dark = theme === "dark" || (theme !== "light" && systemDark());
  if (theme === "dark" || theme === "light") {
    document.documentElement.dataset.theme = theme;
  } else {
    delete document.documentElement.dataset.theme;
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#111110" : "#f7f6f2");
  if (themeBtn) themeBtn.textContent = dark ? "Light" : "Dark";
}

(function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  applyTheme(saved === "dark" || saved === "light" ? saved : null);
  themeBtn?.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && systemDark())
      ? "light"
      : "dark";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (!localStorage.getItem(THEME_KEY)) applyTheme(null);
  });
})();

let places = [];
let photoIndex = {};
let category = "all";
let kind = null;

function mapsSearch(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function commentsFor(place) {
  if (place.comments?.length) return place.comments;
  return place.note ? [place.note] : [];
}

function kindLabel(id) {
  const parent = CATEGORIES.find((c) => c.id === category);
  return parent?.children?.find((c) => c.id === id)?.label || id;
}

function placeLabel(place) {
  const parent = CATEGORIES.find((c) => c.id === place.category);
  if (place.kind && parent?.children) {
    return parent.children.find((c) => c.id === place.kind)?.label || place.kind;
  }
  return parent?.label || place.category;
}

function renderNav() {
  navEl.innerHTML = "";
  for (const cat of CATEGORIES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = cat.label;
    const on = cat.id === category;
    btn.setAttribute("aria-pressed", String(on));
    btn.addEventListener("click", () => {
      category = cat.id;
      kind = null;
      renderNav();
      render();
    });
    navEl.appendChild(btn);
  }

  const parent = CATEGORIES.find((c) => c.id === category);
  const kids = parent?.children;
  if (!kids?.length) {
    subnavEl.hidden = true;
    subnavEl.innerHTML = "";
    return;
  }
  subnavEl.hidden = false;
  subnavEl.innerHTML = "";
  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.textContent = "All";
  allBtn.setAttribute("aria-pressed", String(kind === null));
  allBtn.addEventListener("click", () => {
    kind = null;
    renderNav();
    render();
  });
  subnavEl.appendChild(allBtn);
  for (const child of kids) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = child.label;
    btn.setAttribute("aria-pressed", String(kind === child.id));
    btn.addEventListener("click", () => {
      kind = child.id;
      renderNav();
      render();
    });
    subnavEl.appendChild(btn);
  }
}

function filtered() {
  const q = searchEl.value.trim().toLowerCase();
  return places.filter((p) => {
    if (category !== "all") {
      if (p.category !== category) return false;
      if (kind && p.kind !== kind) return false;
    }
    if (!q) return true;
    const blob = [
      p.name,
      p.area,
      p.note,
      p.hours,
      p.category,
      p.kind,
      p.recomendedBy,
      ...(p.comments || []),
      ...(p.tags || []),
    ]
      .join(" ")
      .toLowerCase();
    return blob.includes(q);
  });
}

function bindCarousel(shots, track, dots, count) {
  if (count < 2) return;
  dots.hidden = false;
  const marks = [...dots.querySelectorAll("span")];
  const update = () => {
    const i = Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
    marks.forEach((m, n) => m.classList.toggle("on", n === i));
  };
  track.addEventListener("scroll", update, { passive: true });
  update();
}

function render() {
  const list = filtered();
  listEl.innerHTML = "";
  emptyEl.hidden = list.length > 0;
  const parent = CATEGORIES.find((c) => c.id === category);
  const label = kind ? kindLabel(kind) : parent?.label || "All";
  countEl.textContent = `${list.length} · ${label}`;

  for (const place of list) {
    const node = tpl.content.cloneNode(true);
    const shots = node.querySelector(".shots");
    const track = node.querySelector(".track");
    const dots = node.querySelector(".dots");
    const cat = node.querySelector(".cat");
    const area = node.querySelector(".area");
    const name = node.querySelector(".name");
    const hours = node.querySelector(".hours");
    const quotes = node.querySelector(".quotes");
    const extra = node.querySelector(".extra");
    const maps = node.querySelector(".maps");
    const by = node.querySelector(".by");

    cat.textContent = placeLabel(place);
    area.textContent = place.area || "";
    name.textContent = place.name;

    if (place.hours) {
      hours.hidden = false;
      hours.textContent = place.hours;
    }

    const lines = commentsFor(place);
    if (!lines.length) quotes.hidden = true;
    for (const line of lines) {
      const p = document.createElement("p");
      p.textContent = line;
      quotes.appendChild(p);
    }

    const extras = place.mapsLinks || [];
    for (const link of extras) {
      const a = document.createElement("a");
      a.href = link.url || mapsSearch(link.query);
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = link.label;
      extra.appendChild(a);
    }

    maps.href = place.mapsUrl || mapsSearch(place.mapsQuery || `${place.name} Lisbon`);

    if (place.recomendedBy) {
      by.hidden = false;
      by.textContent = place.recomendedBy;
    }

    const listed = place.images?.length
      ? place.images
      : photoIndex[place.id] || null;

    if (listed) {
      shots.hidden = false;
      listed.forEach((src, i) => {
        const img = document.createElement("img");
        img.src = src;
        img.alt = "";
        img.loading = "lazy";
        img.decoding = "async";
        track.appendChild(img);
        if (listed.length > 1) {
          const dot = document.createElement("span");
          if (i === 0) dot.className = "on";
          dots.appendChild(dot);
        }
      });
      bindCarousel(shots, track, dots, listed.length);
    }

    listEl.appendChild(node);
  }
}

searchEl.addEventListener("input", render);

Promise.all([
  fetch("places.json").then((r) => {
    if (!r.ok) throw new Error("Could not load places.json");
    return r.json();
  }),
  fetch("photos.json")
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({})),
])
  .then(([data, photos]) => {
    places = data;
    photoIndex = photos;
    renderNav();
    render();
  })
  .catch((err) => {
    countEl.textContent = "Serve this folder over http (not file://).";
    console.error(err);
  });
