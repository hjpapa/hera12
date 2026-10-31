// 시작점: 시스템을 만들고 타이틀 → 프롤로그/마을로.
import '@fontsource/jua/index.css';
import './style.css';
import { G } from './core/context.js';
import { Save } from './core/save.js';
import { AudioSys } from './core/audio.js';
import { Input } from './core/input.js';
import { Game } from './core/game.js';
import { SpriteBank } from './render/sprites.js';
import { UI } from './ui/ui.js';
import { LABORS } from './data/labors.js';

// 과업 도중에 앱이 꺼졌으면: 보스 앞에서부터 이어서 할지 물어봄
async function askResume(game) {
  const n = +G.save.data.resume?.n;
  const L = LABORS[n - 1];
  if (!L) return false;
  const yes = await G.ui.screens.confirm(`과업 ${L.n} · ${L.title}<br><small>하던 과업이 있어요. 보스 앞에서부터 이어서 할까요?</small>`, '이어하기', '마을로');
  if (!yes) return false;
  await game.goLabor(n, { resume: true });
  return true;
}

async function boot() {
  const ui = document.getElementById('ui');
  G.save = new Save();
  G.sprites = new SpriteBank();
  await G.sprites.init();
  G.audio = new AudioSys();
  G.input = new Input(ui);
  G.ui = new UI(ui);
  const game = new Game();
  game.init();
  G.ui.init();
  document.getElementById('boot')?.remove();
  G.input.setVisible(false);
  G.ui.hud.show(false);

  // 개발용: ?gallery (스프라이트 확인), ?stage=labor03 (바로 가기), ?god (무적)
  if (G.params.has('gallery')) {
    await G.sprites.ready;
    const { showGallery } = await import('./dev/gallery.js');
    showGallery();
    return;
  }
  if (G.params.has('bot')) import('./dev/bot.js').then((m) => m.startBot());
  if (G.params.has('stage')) {
    const id = G.params.get('stage');
    const L = LABORS.find((l) => l.stage === id);
    G.audio.unlock();
    await game.loadStage(id, L ? { n: L.n, resume: G.params.has('resume') } : {});
    return;
  }

  const mode = await G.ui.screens.title();
  if (mode === 'new') {
    G.save.reset();
  }
  if (!G.save.data.prologueDone) await game.loadStage('prologue');
  else if (!(mode === 'continue' && (await askResume(game)))) await game.goHub();
  game.requestWakeLock();
}

// 홈 화면에 추가했을 때 오프라인에서도 열리게 (배포 빌드에서만)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// 확대 제스처 막기 (iOS)
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
document.addEventListener('contextmenu', (e) => e.preventDefault());

boot().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML('beforeend', `<pre style="position:fixed;inset:0;color:#fff;background:#300;padding:20px;white-space:pre-wrap">${e.stack || e}</pre>`);
});

window.G = G;
// 개발·부모용 디버그 도구 (콘솔에서 G.debug.win() 등)
G.debug.win = () => G.stage?.n && G.game.completeLabor(G.stage.n, { treasure: true });
G.debug.killAll = () => G.world?.enemies().forEach((e) => e.die());
G.debug.tp = (x, z) => G.player?.pos.set(x, 0, z);
G.debug.unlockAll = () => { G.save.data.settings.unlockAll = true; G.save.data.tutorialDone = true; G.save.data.prologueDone = true; G.save.write(); };
