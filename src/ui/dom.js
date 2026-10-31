export function el(tag, cls = '', parent = null, html = null) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}

// 저장 데이터처럼 밖에서 들어올 수 있는 글자를 HTML 에 넣을 때
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// 메뉴용 "톡": 손가락을 뗄 때, 거의 움직이지 않았을 때만 실행한다.
// 누르는 순간 실행하면 스크롤하려고 손을 댄 버튼이 눌려 버리고(설정이 바뀌거나 과업이 시작됨),
// 안드로이드에서는 전체 화면·소리 켜기에 필요한 "사용자 동작"으로 인정되지 않는다.
// 게임 조작 버튼(공격·구르기…)은 input.js 에서 누르는 순간 바로 반응한다.
const TAP_SLOP = 12;

export function onTap(e, fn) {
  let start = null;
  e.addEventListener('pointerdown', (ev) => {
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    ev.stopPropagation();
    start = { id: ev.pointerId, x: ev.clientX, y: ev.clientY };
  });
  e.addEventListener('pointermove', (ev) => {
    if (start && ev.pointerId === start.id && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > TAP_SLOP) start = null;
  });
  // 브라우저가 스크롤을 시작하면 pointercancel 이 온다
  e.addEventListener('pointercancel', () => (start = null));
  e.addEventListener('pointerup', (ev) => {
    if (!start || ev.pointerId !== start.id) return;
    start = null;
    ev.stopPropagation();
    fn(ev);
  });
}
