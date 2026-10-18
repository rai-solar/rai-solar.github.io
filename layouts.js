// CABeZa · layout trials for the index pages (home, pp). Pick one with the switch at the
// bottom left; the choice is remembered. Once one is chosen this file and the switch go.
//   A index      a Swiss table: number, name, title, versions on hairlines
//   B —HEAD      tracked serif capitals behind a long dash; hover melts into the title
//   C sheet      a contact sheet: one card per two columns, all tops aligned
//   D sentence   one running sentence, the names typed into their titles on hover
//   E giant      one huge word per row on hairlines; hover melts into the title
//   now          what it was: letters on the grid, scrambled on hover
(() => {
  "use strict";
  const LAYOUTS = [
    ["index", "A · index", "none"],
    ["head", "B · —HEAD", "melt"],
    ["sheet", "C · sheet", "none"],
    ["sentence", "D · sentence", "type"],
    ["giant", "E · giant", "melt"],
    ["now", "now", "scramble"]
  ];
  const html = document.documentElement;
  let cur = "index";
  try { const v = localStorage.getItem("cabz-layout"); if (LAYOUTS.some((l) => l[0] === v)) cur = v; } catch (e) {}
  const apply = (id) => {
    const l = LAYOUTS.find((x) => x[0] === id);
    html.dataset.layout = l[0];
    html.dataset.transition = l[2];
    bar.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === id)));
    try { localStorage.setItem("cabz-layout", id); } catch (e) {}
  };

  // every row gets a number and its title, so each layout can use what it needs
  document.querySelectorAll(".list").forEach((list) => {
    [...list.children].forEach((li, i) => {
      const a = li.querySelector("a");
      if (!a) return;
      const num = document.createElement("span");
      num.className = "num";
      num.textContent = String(i + 1).padStart(2, "0");
      li.prepend(num);
      const stages = (a.dataset.morph || "").split("|").filter(Boolean);
      const ttl = document.createElement("span");
      ttl.className = "ttl";
      ttl.textContent = stages.length ? stages[stages.length - 1] : "";
      a.after(ttl);
      if (!li.querySelector(".meta")) { const m = document.createElement("small"); m.className = "meta"; li.append(m); }
    });
  });

  const bar = document.createElement("div");
  bar.className = "layout-switch";
  bar.setAttribute("role", "group");
  bar.setAttribute("aria-label", "layout trials");
  bar.innerHTML = "<span>layout</span>" + LAYOUTS.map((l) => `<button type="button" data-id="${l[0]}">${l[1]}</button>`).join("");
  bar.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) apply(b.dataset.id); });
  document.body.appendChild(bar);
  apply(cur);
})();
