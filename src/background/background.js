browser.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'gaze' && sender.tab) {
    browser.runtime.sendMessage(msg).catch(() => {});
  }
});
