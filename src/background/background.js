chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ wizardPage: 0, selectedOS: null, downloaded: false });
});
