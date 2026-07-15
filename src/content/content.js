let active = false;

function enable() {
  active = true;
  // main logic goes here
}

function disable() {
  active = false;
  // teardown goes here
}

chrome.storage.local.get({ enabled: true }, ({ enabled }) => {
  if (enabled) enable();
});

chrome.storage.onChanged.addListener(({ enabled }) => {
  if (!enabled) return;
  enabled.newValue ? enable() : disable();
});
