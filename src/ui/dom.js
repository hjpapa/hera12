export function el(tag, cls = '', parent = null, html = null) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}

export function onTap(e, fn) {
  e.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    fn(ev);
  });
}
