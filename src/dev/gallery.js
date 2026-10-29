// ?gallery : 모든 스프라이트·아이콘·그림책 그림을 한눈에 (Codex 애셋 확인용)
import { G } from '../core/context.js';
import { SPRITES, ICONS } from '../data/sprites.js';
import { storyCanvas } from '../ui/storyart.js';

export function showGallery() {
  document.body.style.overflow = 'auto';
  document.body.style.touchAction = 'auto';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;inset:0;overflow:auto;background:#2a2a40;color:#fff;padding:16px;z-index:50;font-family:Jua,sans-serif;touch-action:pan-y';
  wrap.innerHTML = '<h2>스프라이트 갤러리 <small style="font-size:14px;color:#aab">(초록 테두리 = Codex 애셋, 회색 = 코드 임시 그림)</small></h2>';
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px';
  wrap.appendChild(grid);
  const card = (id, src, info) => {
    const d = document.createElement('div');
    const asset = G.sprites.hasAsset(id);
    d.style.cssText = `background:repeating-conic-gradient(#555 0 25%,#444 0 50%) 0/16px 16px;border:3px solid ${asset ? '#6f6' : '#888'};border-radius:10px;padding:6px;text-align:center`;
    const c = document.createElement('img');
    c.src = src.toDataURL ? src.toDataURL() : src.src;
    c.style.cssText = 'width:100%;height:120px;object-fit:contain';
    d.appendChild(c);
    const t = document.createElement('div');
    t.style.cssText = 'font-size:13px;background:#000a;border-radius:6px;margin-top:4px';
    t.textContent = info;
    d.appendChild(t);
    grid.appendChild(d);
  };
  for (const [id, def] of Object.entries(SPRITES)) card(id, G.sprites.source(id), `${id} · ${def.w || 256}:${def.h || 256} · ${def.worldH}m`);
  for (const ic of ICONS) card('icon_' + ic, G.sprites.source('icon_' + ic), 'icon_' + ic);
  for (const s of ['p_birth', 'p_hera', 'p_grow', 'p_curse', 'p_delphi', 'p_journey', 'e_adventure', 'e_olympus', 'e_hera', 'e_hebe', 'e_stars']) card(s, storyCanvas(s), s + ' · 16:9');
  document.body.appendChild(wrap);
}
