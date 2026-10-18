// CABeZa · index rows: hovering a short name reveals the real one, with the descending shear.
//   <a class="name" data-full="perros salvajes"><span class="big"></span><span class="shear"><span class="t">perros</span></span></a>
(() => {
  "use strict";
  if (!window.Shear) return;
  document.querySelectorAll(".list a.name[data-full]").forEach((a) => {
    const box = a.querySelector(".shear");
    if (!box) return;
    const short = box.textContent.trim(), full = a.dataset.full;
    const s = Shear(box);
    a.setAttribute("aria-label", full);
    const on = () => s.to(full), off = () => s.to(short);
    a.addEventListener("pointerenter", on);
    a.addEventListener("pointerleave", off);
    a.addEventListener("focus", on);
    a.addEventListener("blur", off);
  });
})();
