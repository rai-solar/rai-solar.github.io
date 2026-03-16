const SVG_PATH = "./coco_02.svg";
const svgHost = document.getElementById("svgHost");
const logEl = document.getElementById("log");

const points = [];

function renderLog() {
  logEl.textContent = JSON.stringify(points, null, 2);
}

// Convert pointer position (screen) -> SVG coordinates (viewBox space)
function clientToSvgPoint(svgEl, clientX, clientY) {
  const ctm = svgEl.getScreenCTM();
  if (!ctm) return null;
  const pt = new DOMPoint(clientX, clientY);
  return pt.matrixTransform(ctm.inverse());
}

function addDot(svgEl, x, y) {
  const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  dot.setAttribute("cx", x);
  dot.setAttribute("cy", y);
  dot.setAttribute("r", "6");
  dot.setAttribute("fill", "black");
  dot.setAttribute("opacity", "0.55");
  svgEl.appendChild(dot);
}

async function loadInlineSvg() {
  const res = await fetch(SVG_PATH);
  if (!res.ok) throw new Error(`Failed to load ${SVG_PATH}: ${res.status}`);
  const svgText = await res.text();

  // Inject inline SVG into DOM (required for easiest interaction)
  svgHost.innerHTML = svgText;

  const svgEl = svgHost.querySelector("svg");
  if (!svgEl) throw new Error("No <svg> found inside coco_02.svg");

  // Important: ensure there is a viewBox for stable coordinates
  if (!svgEl.getAttribute("viewBox")) {
    console.warn("SVG has no viewBox. Coordinates may not be stable on resize.");
    // You can set a viewBox if you know width/height; see note below.
  }

  svgEl.style.cursor = "crosshair";

  svgEl.addEventListener("pointerdown", (e) => {
    const p = clientToSvgPoint(svgEl, e.clientX, e.clientY);
    if (!p) return;

    const dataPoint = { x: +p.x.toFixed(2), y: +p.y.toFixed(2), t: new Date().toISOString() };
    points.push(dataPoint);

    addDot(svgEl, p.x, p.y);
    renderLog();
    console.log("Saved point:", dataPoint);
  });
}

loadInlineSvg().catch(err => {
  console.error(err);
  svgHost.textContent = "Error loading SVG. Check console and file path.";
});
