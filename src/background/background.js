const action = chrome.action ?? chrome.browserAction;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get({ enabled: true }, ({ enabled }) => {
    chrome.storage.local.set({ enabled });
  });
});

chrome.storage.local.get({ enabled: true }, ({ enabled }) => {
  action.setTitle({ title: enabled ? "Kitty URLoaf [on]" : "Kitty URLoaf [off]" });
});

chrome.storage.onChanged.addListener(({ enabled }) => {
  if (enabled) action.setTitle({ title: enabled.newValue ? "Kitty URLoaf [on]" : "Kitty URLoaf [off]" });
});
