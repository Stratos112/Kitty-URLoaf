chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "urloaf-plus", title: "+", contexts: ["all"] });
  chrome.storage.local.get({ enabled: true }, ({ enabled }) => applyState(enabled, false));
});

function applyState(enabled, notify = true) {
  chrome.action.setBadgeText({ text: enabled ? "+" : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#44cc99" });
  chrome.action.setTitle({ title: enabled ? "Kitty URLoaf  [+]" : "Kitty URLoaf  [off]" });
  chrome.omnibox.setDefaultSuggestion({
    description: enabled ? "Kitty URLoaf: ON +" : "Kitty URLoaf: OFF"
  });
  if (enabled && notify) {
    chrome.notifications.create("urloaf", {
      type: "basic",
      iconUrl: "static/plus.svg",
      title: "+",
      message: "Kitty URLoaf enabled"
    });
  }
}

chrome.storage.onChanged.addListener(({ enabled }) => {
  if (enabled) applyState(enabled.newValue);
});

chrome.omnibox.onInputChanged.addListener((_text, suggest) => {
  suggest([{ content: "+", description: "Kitty URLoaf +" }]);
});

chrome.omnibox.onInputEntered.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("src/newtab/newtab.html") });
});
