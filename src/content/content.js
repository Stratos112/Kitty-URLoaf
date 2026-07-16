const ID = '__urloaf__';
const NAMES = ['red','orange','yellow','green','cyan','blue','purple','pink'];
const OFFSETS = ['0px 0px','20px 0px','10px 20px','30px 20px','5px 10px','25px 10px','15px 30px','35px 30px'];

function enable() {
  if (document.getElementById(ID)) return;
  const el = document.createElement('div');
  el.id = ID;
  const imgs  = NAMES.map(n => `url("${chrome.runtime.getURL(`static/plus-${n}.svg`)}")`).join(',');
  const sizes = NAMES.map(() => '20px 20px').join(',');
  el.style.cssText =
    'position:fixed;inset:0;z-index:2147483647;pointer-events:none;opacity:0.15;' +
    `background-image:${imgs};background-size:${sizes};` +
    `background-repeat:repeat;background-position:${OFFSETS.join(',')};`;
  document.documentElement.appendChild(el);
}

function disable() {
  document.getElementById(ID)?.remove();
}

chrome.storage.local.get({ enabled: true }, ({ enabled }) => {
  if (enabled) enable();
});

chrome.storage.onChanged.addListener(({ enabled }) => {
  if (enabled) enabled.newValue ? enable() : disable();
});
