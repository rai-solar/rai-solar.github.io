/* Saved suns: the built-in ones plus whatever you save in this browser. */
(function (Sun) {
  "use strict";

  const $ = Sun.$;
  const KEY = "inti.saved.v1";
  const OLD_KEY = "sun-generator.saved.v1";   // saves from before the rename

  // Built in, always listed, cannot be deleted or overwritten.
  // `created` is the day the sun was made, kept apart from its name.
  const BUILT_IN = [
    {
      name: "sun_v00",
      created: "2026-10-05",
      builtIn: true,
      settings: {
        ray: "#E83700", rayName: "Scarlet Fire",
        disc: "#FF4500", discSize: 88, ring: "solid",
        tipColour: null, outline: 0, outlineColour: "#1F0A03",
        seed: 2062020389, rot: 200, size: 100,
        count: 24, len: 185, width: 84, tip: 0, gap: 0, short: 62, curve: -12,
        round: true, wave: 30, freq: 1.1, bend: 6, irr: 30, mirror: true,
        clip: true, tintOn: false, tint: "#FFFFFF",
        bgOn: true, bg: "#140C1D"
      }
    }
  ];

  /* ---------- storage ---------- */

  let memory = [];       // used when the browser refuses localStorage

  const valid = (e) => e && typeof e.name === "string" && e.settings && typeof e.settings === "object";

  function readSaved() {
    try {
      const list = JSON.parse(localStorage.getItem(KEY) || localStorage.getItem(OLD_KEY) || "[]");
      memory = Array.isArray(list) ? list.filter(valid) : [];
    } catch (err) { /* keep what is in memory */ }
    return memory;
  }

  function writeSaved(list) {
    memory = list;
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (err) { return false; }
  }

  /* ---------- helpers ---------- */

  const today = () => {
    const d = new Date();
    const p = (v) => String(v).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  };

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function prettyDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    return m ? +m[3] + " " + MONTHS[+m[2] - 1] + " " + m[1] : "";
  }

  // sun_v00 is taken, so the next suggestion is sun_v01, and so on.
  function nextName() {
    let top = -1;
    BUILT_IN.concat(readSaved()).forEach((e) => {
      const m = /^sun_v(\d+)$/.exec(e.name);
      if (m) top = Math.max(top, +m[1]);
    });
    return "sun_v" + String(top + 1).padStart(2, "0");
  }

  const note = (text) => { $("libraryNote").textContent = text; };

  /* ---------- list ---------- */

  function thumb(entry) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 112;
    Sun.paint(canvas, Sun.fromSaved(entry.settings));
    return canvas;
  }

  function load(entry) {
    Sun.apply(entry.settings);
    Sun.syncControls();
    note("Loaded " + entry.name);
  }

  function remove(entry) {
    if (!window.confirm("Delete " + entry.name + "?")) return;
    writeSaved(readSaved().filter((e) => e.name !== entry.name));
    note("Deleted " + entry.name);
    list();
  }

  function item(entry) {
    const li = document.createElement("li");
    li.className = "tile";

    const pick = document.createElement("button");
    pick.type = "button";
    pick.className = "thumb";
    pick.title = "Load " + entry.name;
    pick.setAttribute("aria-label", "Load " + entry.name);
    pick.append(thumb(entry));
    pick.addEventListener("click", () => load(entry));

    const text = document.createElement("div");
    text.className = "tile-text";
    const name = document.createElement("p");
    name.className = "tile-name";
    name.textContent = entry.name;
    const date = document.createElement("p");
    date.className = "tile-date";
    date.textContent = entry.created ? prettyDate(entry.created) : "";
    text.append(name, date);
    if (entry.builtIn) {
      const tag = document.createElement("p");
      tag.className = "tile-tag";
      tag.textContent = "built in";
      text.append(tag);
    }

    li.append(pick, text);
    if (!entry.builtIn) {
      const del = document.createElement("button");
      del.type = "button";
      del.className = "tile-del";
      del.textContent = "×";
      del.title = "Delete " + entry.name;
      del.setAttribute("aria-label", "Delete " + entry.name);
      del.addEventListener("click", () => remove(entry));
      li.append(del);
    }
    return li;
  }

  function list() {
    const host = $("savedList");
    host.textContent = "";
    BUILT_IN.concat(readSaved()).forEach((entry) => host.append(item(entry)));
    $("saveName").value = nextName();
  }

  /* ---------- saving ---------- */

  function save() {
    const name = $("saveName").value.trim();
    if (!name) { note("Give this sun a name first."); return; }
    if (BUILT_IN.some((e) => e.name === name)) {
      note(name + " is built in. Pick another name.");
      return;
    }

    const saved = readSaved().slice();
    const at = saved.findIndex((e) => e.name === name);
    const entry = { name: name, created: at >= 0 ? saved[at].created : today(), settings: Sun.snapshot() };
    if (at >= 0) saved[at] = entry; else saved.push(entry);

    const ok = writeSaved(saved);
    note(ok
      ? (at >= 0 ? "Updated " : "Saved ") + name
      : "Saved " + name + " for this visit only. The browser would not keep it.");
    list();
  }

  $("saveSun").addEventListener("click", save);
  $("saveName").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); save(); }
  });

  Sun.library = { list: list };
})(window.Sun);
