const toggle = document.getElementById("toggle");
const plusDisplay = document.getElementById("plus-display");

function sync(enabled) {
  toggle.checked = enabled;
  plusDisplay.style.display = enabled ? "flex" : "none";
}

chrome.storage.local.get({ enabled: true }, ({ enabled }) => sync(enabled));

toggle.addEventListener("change", () => {
  const enabled = toggle.checked;
  chrome.storage.local.set({ enabled });
  sync(enabled);
});
