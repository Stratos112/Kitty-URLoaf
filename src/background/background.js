const action = chrome.action ?? chrome.browserAction;
const COLORS = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink'];

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "urloaf", title: "+", contexts: ["all"] });
  COLORS.forEach(c => {
    chrome.contextMenus.create({
      id: `urloaf-${c}`,
      parentId: "urloaf",
      title: "+",
      icons: { "16": `static/plus-${c}.svg` },
      contexts: ["all"]
    });
  });
  chrome.storage.local.get({ enabled: true }, ({ enabled }) => applyState(enabled, false));
});

function applyState(enabled, notify = true) {
  action.setBadgeText({ text: enabled ? "+" : "" });
  action.setBadgeBackgroundColor({ color: "#44cc99" });
  action.setTitle({ title: enabled ? "Kitty URLoaf  [+]" : "Kitty URLoaf  [off]" });
  chrome.omnibox.setDefaultSuggestion({
    description: enabled ? "+ + + Kitty URLoaf ON + + +" : "Kitty URLoaf OFF"
  });
  if (enabled && notify) {
    chrome.notifications.create("urloaf", {
      type: "basic",
      iconUrl: "static/plus-green.svg",
      title: "+ + + + +",
      message: "Kitty URLoaf enabled"
    });
  }
}

chrome.storage.onChanged.addListener(({ enabled }) => {
  if (enabled) applyState(enabled.newValue);
});

chrome.omnibox.onInputChanged.addListener((_text, suggest) => {
  suggest(COLORS.map((c, i) => ({
    content: c,
    description: `<dim>${'+'.repeat(i + 1)}</dim> <match>${c}</match> <dim>${'+'.repeat(8 - i)}</dim>`
  })));
});

chrome.omnibox.onInputEntered.addListener(() => {});
