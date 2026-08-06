if (!document.getElementById('pants')) {
  const root = document.createElement('div');
  root.id = 'pants';
  root.innerHTML =
    '<div class="pants-paw-bl"></div>' +
    '<div class="pants-paw-fl"></div>' +
    '<div class="pants-body"></div>'   +
    '<div class="pants-paw-br"></div>' +
    '<div class="pants-paw-fr"></div>' +
    '<div class="pants-tail"></div>'   +
    '<div class="pants-head"></div>'   +
    '<div class="pants-eyes"></div>';
  document.documentElement.appendChild(root);

  const link = document.createElement('link');
  link.rel  = 'stylesheet';
  link.href = browser.runtime.getURL('src/pants/pants.css');
  (document.head || document.documentElement).appendChild(link);
}
