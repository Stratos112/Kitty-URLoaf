const COLORS = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink'];
const toggle = document.getElementById("toggle");
const grid = document.getElementById("grid");

function fillGrid() {
  grid.innerHTML = "";
  const cols = Math.floor(264 / 24);
  const rows = 10;
  for (let i = 0; i < cols * rows; i++) {
    const img = document.createElement("img");
    img.src = `../../static/plus-${COLORS[i % COLORS.length]}.svg`;
    grid.appendChild(img);
  }
}

function sync(enabled) {
  toggle.checked = enabled;
  grid.style.display = enabled ? "flex" : "none";
}

chrome.storage.local.get({ enabled: true }, ({ enabled }) => {
  fillGrid();
  sync(enabled);
});

toggle.addEventListener("change", () => {
  const enabled = toggle.checked;
  chrome.storage.local.set({ enabled });
  sync(enabled);
});
