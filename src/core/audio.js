// 소리: Web Audio 절차 합성 (애셋이 없어도 소리가 남).
// public/assets/manifest.json 의 audio / music 항목에 파일이 있으면 그 파일을 우선 사용한다.
import { G } from './context.js';
import { rand } from './util.js';

const NOTE = (m) => 440 * Math.pow(2, (m - 69) / 12);

// 음 이름 → MIDI 번호 ("D5" → 74)
function midi(name) {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name);
  if (!m) return null;
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return 12 * (parseInt(m[3], 10) + 1) + base + acc;
}

// 패턴 문자열: 8분음표 단위. '.' 쉼표, '-' 이전 음 늘이기, 'D5' 음, '[D4,F4,A4]' 화음
function parseTrack(str) {
  const tokens = str.replace(/\|/g, ' ').trim().split(/\s+/);
  const out = [];
  tokens.forEach((t, i) => {
    if (t === '.') return;
    if (t === '-') {
      for (let j = out.length - 1; j >= 0; j--) {
        if (out[j].end === i) { out[j].end = i + 1; break; }
      }
      return;
    }
    const notes = t.startsWith('[') ? t.slice(1, -1).split(',').map(midi) : [midi(t)];
    out.push({ step: i, end: i + 1, notes: notes.filter((n) => n !== null) });
  });
  return { events: out, length: tokens.length };
}

// ───────── 배경 음악 (간단한 그리스풍 루프) ─────────
const SONGS = {
  hub: {
    bpm: 96,
    lead: { inst: 'flute', vol: 0.16, notes: 'D5 - F5 G5 A5 - G5 F5 | E5 - D5 E5 F5 - . . | G5 - A5 G5 F5 - E5 D5 | E5 - - - . . . . | D5 - F5 G5 A5 - C6 A5 | G5 - F5 G5 A5 - . . | Bb5 - A5 G5 F5 - E5 F5 | D5 - - - . . . .' },
    harp: { inst: 'lyre', vol: 0.12, notes: 'D4 A4 D5 A4 F4 A4 D5 A4 | C4 G4 C5 G4 E4 G4 C5 G4 | Bb3 F4 Bb4 F4 D4 F4 Bb4 F4 | A3 E4 A4 E4 C#4 E4 A4 E4 | D4 A4 D5 A4 F4 A4 D5 A4 | C4 G4 C5 G4 E4 G4 C5 G4 | Bb3 F4 Bb4 F4 G3 D4 G4 D4 | A3 E4 A4 E4 A3 C#4 E4 A4' },
    bass: { inst: 'bass', vol: 0.22, notes: 'D3 - . . D3 - . . | C3 - . . C3 - . . | Bb2 - . . Bb2 - . . | A2 - . . A2 - . . | D3 - . . D3 - . . | C3 - . . C3 - . . | Bb2 - . . G2 - . . | A2 - . . A2 - . .' },
    drums: 'k...h...t...h... ',
  },
  field: {
    bpm: 124,
    lead: { inst: 'flute', vol: 0.15, notes: 'A5 - E5 A5 C6 - B5 A5 | G5 - E5 G5 B5 - A5 G5 | F5 - A5 F5 E5 - D5 E5 | E5 - - - . . . . | A5 - E5 A5 C6 - D6 C6 | B5 - G5 B5 D6 - C6 B5 | A5 - F5 A5 G#5 - E5 G#5 | A5 - - - . . . .' },
    harp: { inst: 'lyre', vol: 0.12, notes: 'A3 E4 A4 E4 A3 E4 A4 E4 | G3 D4 G4 D4 G3 D4 G4 D4 | F3 C4 F4 C4 F3 C4 F4 C4 | E3 B3 E4 B3 E3 G#3 B3 E4 | A3 E4 A4 E4 A3 E4 A4 E4 | G3 D4 G4 D4 G3 D4 G4 D4 | F3 C4 F4 C4 E3 B3 E4 B3 | A3 E4 A4 E4 A3 C4 E4 A4' },
    bass: { inst: 'bass', vol: 0.24, notes: 'A2 . A2 . A2 . E2 . | G2 . G2 . G2 . D2 . | F2 . F2 . F2 . C2 . | E2 . E2 . E2 . E2 . | A2 . A2 . A2 . E2 . | G2 . G2 . G2 . D2 . | F2 . F2 . E2 . E2 . | A2 . A2 . A2 . A2 .' },
    drums: 'k.h.s.h.k.k.s.hh',
  },
  boss: {
    bpm: 144,
    lead: { inst: 'saw', vol: 0.1, notes: 'D5 Eb5 F#5 G5 A5 - G5 F#5 | Eb5 - D5 - . . . . | D5 Eb5 F#5 G5 Bb5 - A5 G5 | A5 - - - . . . . | G5 - F#5 Eb5 D5 - Eb5 F#5 | G5 - A5 - Bb5 - A5 G5 | F#5 - Eb5 - D5 - C5 Eb5 | D5 - - - . . . .' },
    harp: { inst: 'lyre', vol: 0.1, notes: 'D4 D4 A4 D4 D4 Eb4 F#4 D4 | D4 D4 A4 D4 D4 Eb4 F#4 D4 | G3 G3 D4 G3 G3 Bb3 D4 G3 | D4 D4 A4 D4 D4 Eb4 F#4 D4 | G3 G3 D4 G3 G3 Bb3 D4 G3 | Eb4 Eb4 Bb4 Eb4 Eb4 G4 Bb4 Eb4 | D4 D4 A4 D4 C4 C4 G4 C4 | D4 D4 A4 D4 D4 F#4 A4 D5' },
    bass: { inst: 'bass', vol: 0.3, notes: 'D2 D2 . D2 D2 . D2 Eb2 | D2 D2 . D2 D2 . C2 C2 | G1 G1 . G1 G1 . G1 A1 | D2 D2 . D2 D2 . D2 D2 | G1 G1 . G1 G1 . G1 G1 | Eb2 Eb2 . Eb2 Eb2 . Eb2 Eb2 | D2 D2 . D2 C2 . C2 C2 | D2 D2 . D2 D2 . D2 D2' },
    drums: 'k.hsk.hsk.hsk.ss',
  },
  chase: {
    bpm: 136,
    lead: { inst: 'flute', vol: 0.15, notes: 'G5 A5 B5 D6 B5 A5 G5 A5 | B5 - D6 - E6 - D6 B5 | C6 B5 A5 G5 A5 - E5 F#5 | G5 - - - D5 - - - | G5 A5 B5 D6 B5 A5 G5 A5 | B5 - D6 - G6 - F#6 E6 | D6 C6 B5 A5 B5 - A5 F#5 | G5 - - - . . . .' },
    harp: { inst: 'lyre', vol: 0.11, notes: 'G3 D4 G4 B4 G3 D4 G4 B4 | E3 B3 E4 G4 E3 B3 E4 G4 | C4 G4 C5 E5 D4 A4 D5 F#5 | G3 D4 G4 B4 D4 A4 D5 F#5 | G3 D4 G4 B4 G3 D4 G4 B4 | E3 B3 E4 G4 E3 B3 E4 G4 | C4 G4 C5 E5 D4 A4 D5 F#5 | G3 D4 G4 B4 G4 B4 D5 G5' },
    bass: { inst: 'bass', vol: 0.22, notes: 'G2 . G2 . D2 . G2 . | E2 . E2 . B1 . E2 . | C2 . C2 . D2 . D2 . | G2 . G2 . D2 . D2 . | G2 . G2 . D2 . G2 . | E2 . E2 . B1 . E2 . | C2 . C2 . D2 . D2 . | G2 . G2 . G2 . G2 .' },
    drums: 'k.h.s.hhk.h.s.hh',
  },
  sad: {
    bpm: 72,
    lead: { inst: 'flute', vol: 0.15, notes: 'A4 - - C5 B4 - A4 - | G4 - - - E4 - - - | F4 - - A4 G4 - F4 - | E4 - - - - - - - | A4 - - C5 B4 - A4 - | G4 - - B4 C5 - D5 - | E5 - - D5 C5 - B4 - | A4 - - - - - - -' },
    harp: { inst: 'lyre', vol: 0.11, notes: 'A3 E4 A4 E4 A3 E4 A4 E4 | E3 B3 E4 B3 E3 B3 E4 B3 | F3 C4 F4 C4 F3 C4 F4 C4 | E3 B3 E4 G#4 E4 B3 G#3 B3 | A3 E4 A4 E4 A3 E4 A4 E4 | G3 D4 G4 D4 C4 G4 C5 G4 | F3 C4 F4 C4 E3 B3 E4 B3 | A3 E4 A4 C5 A4 E4 C4 E4' },
    bass: { inst: 'bass', vol: 0.18, notes: 'A2 - - - - - - - | E2 - - - - - - - | F2 - - - - - - - | E2 - - - - - - - | A2 - - - - - - - | G2 - - - C3 - - - | F2 - - - E2 - - - | A2 - - - - - - -' },
    drums: '',
  },
  underworld: {
    bpm: 84,
    lead: { inst: 'pad', vol: 0.09, notes: 'D4 - - - F4 - - - | E4 - - - C#4 - - - | D4 - - - A4 - - - | G4 - F4 - E4 - - - | Bb4 - - - A4 - - - | G4 - - - F4 - E4 - | F4 - - - E4 - - - | D4 - - - - - - -' },
    harp: { inst: 'lyre', vol: 0.1, notes: 'D3 A3 D4 F4 A3 D4 F4 A4 | C#3 A3 C#4 E4 A3 C#4 E4 A4 | D3 A3 D4 F4 A3 D4 F4 A4 | G3 Bb3 D4 G4 A3 C#4 E4 A4 | Bb2 F3 Bb3 D4 F3 Bb3 D4 F4 | G2 D3 G3 Bb3 D3 G3 Bb3 D4 | A2 E3 A3 C#4 E3 A3 C#4 E4 | D3 A3 D4 F4 D4 A3 F3 D3' },
    bass: { inst: 'bass', vol: 0.24, notes: 'D2 - - - - - - - | C#2 - - - - - - - | D2 - - - - - - - | G1 - - - A1 - - - | Bb1 - - - - - - - | G1 - - - - - - - | A1 - - - - - - - | D2 - - - - - - -' },
    drums: 'k.......t.......',
  },
  ending: {
    bpm: 88,
    lead: { inst: 'flute', vol: 0.16, notes: 'C5 - E5 G5 C6 - B5 A5 | G5 - - - E5 - - - | F5 - A5 C6 F6 - E6 D6 | C6 - - - G5 - - - | A5 - C6 A5 G5 - E5 G5 | F5 - E5 D5 E5 - G5 - | A5 - B5 - C6 - D6 B5 | C6 - - - - - - -' },
    harp: { inst: 'lyre', vol: 0.12, notes: 'C4 G4 C5 E5 C4 G4 C5 E5 | E3 B3 E4 G4 E3 B3 E4 G4 | F3 C4 F4 A4 F3 C4 F4 A4 | C4 G4 C5 E5 G3 D4 G4 B4 | A3 E4 A4 C5 E3 B3 E4 G4 | F3 C4 F4 A4 C4 G4 C5 E5 | F3 C4 F4 A4 G3 D4 G4 B4 | C4 G4 C5 E5 G5 E5 C5 G4' },
    bass: { inst: 'bass', vol: 0.2, notes: 'C3 - - - C3 - - - | E2 - - - E2 - - - | F2 - - - F2 - - - | C3 - - - G2 - - - | A2 - - - E2 - - - | F2 - - - C3 - - - | F2 - - - G2 - - - | C3 - - - C3 - - -' },
    drums: 'k.......t...k...',
  },
};

const JINGLES = {
  victory: { bpm: 150, notes: 'C5 E5 G5 C6 - G5 C6 - [C5,E5,G5,C6] - - -', inst: 'lyre', vol: 0.25 },
  levelup: { bpm: 220, notes: 'G5 C6 E6 G6 - [C6,E6,G6] - -', inst: 'lyre', vol: 0.22 },
  star: { bpm: 180, notes: 'E6 G6 B6 E7 - -', inst: 'bell', vol: 0.18 },
  fail: { bpm: 120, notes: 'G4 F4 E4 D4 - - C4 - -', inst: 'lyre', vol: 0.2 },
  reward: { bpm: 170, notes: 'D5 F#5 A5 D6 - A5 D6 F#6 - -', inst: 'lyre', vol: 0.22 },
};

export class AudioSys {
  constructor() {
    this.ctx = null;
    this.buffers = {};
    this.musicFiles = {};
    this.currentSong = null;
    this.songName = null;
    this.voices = [];
    this.koVoice = null;
    this.lastPlay = {};
    if ('speechSynthesis' in window) {
      const pickVoice = () => {
        this.voices = speechSynthesis.getVoices();
        this.koVoice = this.voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('ko')) || null;
      };
      pickVoice();
      speechSynthesis.onvoiceschanged = pickVoice;
    }
  }

  get settings() {
    return G.save.data.settings;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const c = this.ctx;
      this.master = c.createDynamicsCompressor();
      this.master.threshold.value = -10;
      this.master.ratio.value = 4;
      this.master.connect(c.destination);
      this.sfxBus = c.createGain();
      this.musicBus = c.createGain();
      this.sfxBus.connect(this.master);
      this.musicBus.connect(this.master);
      this.applyVolumes();
      // 노이즈 버퍼
      const len = c.sampleRate * 1.5;
      this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.loadFiles();
      if (this.pendingSong) {
        const s = this.pendingSong;
        this.pendingSong = null;
        this.music(s);
      }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  applyVolumes() {
    if (!this.ctx) return;
    this.sfxBus.gain.value = this.settings.sfx;
    this.musicBus.gain.value = this.settings.music * 0.8;
  }

  async loadFiles() {
    const m = G.sprites?.manifest || {};
    const load = async (url) => {
      const res = await fetch('assets/' + url);
      if (!res.ok) throw new Error(url);
      return await this.ctx.decodeAudioData(await res.arrayBuffer());
    };
    for (const [k, url] of Object.entries(m.audio || {})) {
      load(url).then((b) => (this.buffers[k] = b)).catch(() => {});
    }
    for (const [k, url] of Object.entries(m.music || {})) {
      load(url).then((b) => {
        this.musicFiles[k] = b;
        if (this.songName === k) this.music(k, true);
      }).catch(() => {});
    }
  }

  suspend() {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
  }

  // ───────── 합성 기본 도구 ─────────
  tone({ type = 'sine', freq = 440, freqEnd = null, dur = 0.2, vol = 0.3, attack = 0.005, when = 0, bus = null, vibrato = 0, filter = null }) {
    const c = this.ctx;
    const t = c.currentTime + when;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (vibrato) {
      const lfo = c.createOscillator();
      const lg = c.createGain();
      lfo.frequency.value = 6;
      lg.gain.value = vibrato;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    }
    if (filter) {
      const f = c.createBiquadFilter();
      f.type = filter.type || 'lowpass';
      f.frequency.value = filter.freq || 1000;
      f.Q.value = filter.q || 1;
      node.connect(f);
      node = f;
    }
    node.connect(g).connect(bus || this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  noise({ dur = 0.2, vol = 0.3, type = 'lowpass', freq = 1000, freqEnd = null, q = 1, when = 0, attack = 0.003, bus = null }) {
    const c = this.ctx;
    const t = c.currentTime + when;
    const s = c.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + dur);
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(bus || this.sfxBus);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.05);
  }

  // ───────── 효과음 ─────────
  play(name, opts = {}) {
    if (!this.ctx || this.settings.sfx <= 0) return;
    // 같은 소리가 한 프레임에 겹쳐 너무 커지지 않게
    const now = this.ctx.currentTime;
    if (this.lastPlay[name] && now - this.lastPlay[name] < 0.025) return;
    this.lastPlay[name] = now;
    if (this.buffers[name]) {
      const s = this.ctx.createBufferSource();
      s.buffer = this.buffers[name];
      s.playbackRate.value = opts.pitch || 1;
      const g = this.ctx.createGain();
      g.gain.value = opts.vol ?? 1;
      s.connect(g).connect(this.sfxBus);
      s.start();
      return;
    }
    const fn = SFX[name];
    if (fn) fn(this, opts);
  }

  // ───────── 배경 음악 ─────────
  music(name, force = false) {
    if (!this.ctx) {
      this.pendingSong = name;
      return;
    }
    if (this.songName === name && !force) return;
    this.stopMusic();
    this.songName = name;
    if (!name) return;
    if (this.musicFiles[name]) {
      const s = this.ctx.createBufferSource();
      s.buffer = this.musicFiles[name];
      s.loop = true;
      const g = this.ctx.createGain();
      g.gain.value = 0.9;
      s.connect(g).connect(this.musicBus);
      s.start();
      this.fileSource = s;
      return;
    }
    const song = SONGS[name];
    if (!song) return;
    const tracks = ['lead', 'harp', 'bass'].filter((k) => song[k]).map((k) => ({ ...song[k], parsed: parseTrack(song[k].notes) }));
    const length = Math.max(...tracks.map((t) => t.parsed.length));
    const stepDur = 60 / song.bpm / 2;
    const drums = (song.drums || '').trim();
    const st = { step: 0, next: this.ctx.currentTime + 0.1 };
    const timer = setInterval(() => {
      if (!this.ctx) return;
      while (st.next < this.ctx.currentTime + 0.15) {
        const step = st.step % length;
        for (const tr of tracks) {
          for (const ev of tr.parsed.events) {
            if (ev.step === step) {
              for (const n of ev.notes) this.inst(tr.inst, n, (ev.end - ev.step) * stepDur, tr.vol, st.next - this.ctx.currentTime, this.musicBus);
            }
          }
        }
        if (drums) {
          // 드럼 패턴은 16분음표 단위 → 8분 한 칸에 2개
          for (let h = 0; h < 2; h++) {
            const ch = drums[(step * 2 + h) % drums.length];
            const when = st.next - this.ctx.currentTime + h * stepDur * 0.5;
            if (ch !== '.') this.drum(ch, when);
          }
        }
        st.step++;
        st.next += stepDur;
      }
    }, 25);
    this.currentSong = { timer };
  }

  stopMusic() {
    if (this.currentSong) {
      clearInterval(this.currentSong.timer);
      this.currentSong = null;
    }
    if (this.fileSource) {
      try { this.fileSource.stop(); } catch (e) { /* noop */ }
      this.fileSource = null;
    }
    this.songName = null;
  }

  jingle(name) {
    if (!this.ctx) return;
    if (this.buffers['jingle_' + name]) return this.play('jingle_' + name);
    const j = JINGLES[name];
    if (!j) return;
    const p = parseTrack(j.notes);
    const stepDur = 60 / j.bpm / 2;
    for (const ev of p.events) {
      for (const n of ev.notes) this.inst(j.inst, n, (ev.end - ev.step) * stepDur + 0.1, j.vol, ev.step * stepDur, this.sfxBus);
    }
  }

  inst(kind, m, dur, vol, when, bus) {
    const f = NOTE(m);
    if (when < 0) when = 0;
    switch (kind) {
      case 'lyre':
        this.tone({ type: 'triangle', freq: f, dur: Math.max(0.25, dur * 1.4), vol, when, bus });
        this.tone({ type: 'sine', freq: f * 2, dur: 0.18, vol: vol * 0.3, when, bus });
        break;
      case 'bell':
        this.tone({ type: 'sine', freq: f, dur: 0.6, vol, when, bus });
        this.tone({ type: 'sine', freq: f * 2.76, dur: 0.3, vol: vol * 0.3, when, bus });
        break;
      case 'flute':
        this.tone({ type: 'sine', freq: f, dur: dur * 0.95, vol, when, attack: 0.04, bus, vibrato: f * 0.006 });
        this.tone({ type: 'triangle', freq: f, dur: dur * 0.9, vol: vol * 0.25, when, attack: 0.05, bus });
        break;
      case 'bass':
        this.tone({ type: 'triangle', freq: f, dur: Math.min(dur, 0.5) + 0.05, vol, when, bus });
        break;
      case 'saw':
        this.tone({ type: 'sawtooth', freq: f, dur: dur * 0.95, vol, when, attack: 0.01, bus, filter: { freq: 2200 } });
        break;
      case 'pad':
        this.tone({ type: 'sawtooth', freq: f, dur: dur, vol, when, attack: 0.25, bus, filter: { freq: 900 } });
        this.tone({ type: 'sawtooth', freq: f * 1.005, dur: dur, vol: vol * 0.7, when, attack: 0.3, bus, filter: { freq: 700 } });
        break;
    }
  }

  drum(ch, when) {
    const bus = this.musicBus;
    switch (ch) {
      case 'k':
        this.tone({ type: 'sine', freq: 140, freqEnd: 45, dur: 0.18, vol: 0.5, when, bus });
        break;
      case 's':
        this.noise({ dur: 0.12, vol: 0.18, type: 'bandpass', freq: 1800, q: 0.8, when, bus });
        this.tone({ type: 'triangle', freq: 200, freqEnd: 120, dur: 0.08, vol: 0.12, when, bus });
        break;
      case 't': // 프레임 드럼
        this.tone({ type: 'sine', freq: 220, freqEnd: 140, dur: 0.15, vol: 0.2, when, bus });
        this.noise({ dur: 0.06, vol: 0.06, type: 'bandpass', freq: 900, when, bus });
        break;
      case 'h':
        this.noise({ dur: 0.035, vol: 0.06, type: 'highpass', freq: 7000, when, bus });
        break;
    }
  }

  // ───────── 읽어주기 (TTS) ─────────
  speak(text, { pitch = 1, rate = 1 } = {}) {
    if (!this.settings.voice || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const clean = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').replace(/[~*]/g, '');
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = 'ko-KR';
      if (this.koVoice) u.voice = this.koVoice;
      u.pitch = pitch;
      u.rate = rate;
      u.volume = 1;
      speechSynthesis.speak(u);
    } catch (e) {
      /* 지원 안 함 */
    }
  }

  stopSpeak() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }
}

// ───────── 효과음 레시피 ─────────
const SFX = {
  swing: (a, o) => a.noise({ dur: 0.13, vol: 0.22, type: 'bandpass', freq: 700 * (o.pitch || 1), freqEnd: 2600 * (o.pitch || 1), q: 1.2 }),
  hit: (a, o) => {
    const p = o.pitch || 1;
    a.tone({ type: 'sine', freq: 190 * p, freqEnd: 55, dur: 0.14, vol: 0.7 });
    a.noise({ dur: 0.09, vol: 0.45, type: 'lowpass', freq: 2600 * p, freqEnd: 400 });
    a.tone({ type: 'square', freq: 95 * p, freqEnd: 60, dur: 0.05, vol: 0.12 });
  },
  hit_big: (a, o) => {
    const p = o.pitch || 1;
    a.tone({ type: 'sine', freq: 150 * p, freqEnd: 38, dur: 0.3, vol: 0.9 });
    a.noise({ dur: 0.22, vol: 0.55, type: 'lowpass', freq: 1600, freqEnd: 200 });
    a.noise({ dur: 0.06, vol: 0.3, type: 'highpass', freq: 3000 });
  },
  crit: (a) => {
    SFX.hit_big(a, {});
    a.tone({ type: 'triangle', freq: 1400, freqEnd: 2100, dur: 0.16, vol: 0.18, when: 0.01 });
  },
  thud: (a) => {
    a.tone({ type: 'sine', freq: 110, freqEnd: 45, dur: 0.22, vol: 0.8 });
    a.noise({ dur: 0.12, vol: 0.3, type: 'lowpass', freq: 600 });
  },
  ting: (a) => {
    a.tone({ type: 'triangle', freq: 2600, dur: 0.35, vol: 0.22 });
    a.tone({ type: 'sine', freq: 3900, dur: 0.25, vol: 0.12 });
  },
  enemy_die: (a) => {
    a.noise({ dur: 0.18, vol: 0.25, type: 'bandpass', freq: 1500, freqEnd: 400 });
    [660, 880, 1320].forEach((f, i) => a.tone({ type: 'triangle', freq: f, dur: 0.12, vol: 0.12, when: 0.04 + i * 0.045 }));
  },
  boss_die: (a) => {
    a.tone({ type: 'sine', freq: 120, freqEnd: 30, dur: 1.0, vol: 0.9 });
    a.noise({ dur: 0.9, vol: 0.5, type: 'lowpass', freq: 1800, freqEnd: 120 });
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => a.tone({ type: 'triangle', freq: f, dur: 0.3, vol: 0.12, when: 0.3 + i * 0.07 }));
  },
  hurt: (a) => {
    a.tone({ type: 'square', freq: 320, freqEnd: 110, dur: 0.22, vol: 0.18 });
    a.noise({ dur: 0.12, vol: 0.3, type: 'lowpass', freq: 1500 });
  },
  dash: (a) => a.noise({ dur: 0.2, vol: 0.22, type: 'highpass', freq: 1800, freqEnd: 500 }),
  arrow: (a) => {
    a.noise({ dur: 0.12, vol: 0.2, type: 'bandpass', freq: 3200, freqEnd: 1400, q: 2 });
    a.tone({ type: 'triangle', freq: 900, freqEnd: 500, dur: 0.08, vol: 0.12 });
  },
  coin: (a, o) => {
    const p = o.pitch || 1;
    a.tone({ type: 'square', freq: 1320 * p, dur: 0.06, vol: 0.07 });
    a.tone({ type: 'square', freq: 1760 * p, dur: 0.12, vol: 0.07, when: 0.05 });
  },
  exp: (a, o) => a.tone({ type: 'sine', freq: 880 * (o.pitch || 1), dur: 0.09, vol: 0.12 }),
  heart: (a) => {
    a.tone({ type: 'triangle', freq: 660, freqEnd: 990, dur: 0.18, vol: 0.18 });
    a.tone({ type: 'sine', freq: 1320, dur: 0.15, vol: 0.08, when: 0.08 });
  },
  talk: (a, o) => a.tone({ type: 'square', freq: 520 * (o.pitch || 1) * (0.95 + Math.random() * 0.1), dur: 0.035, vol: 0.035 }),
  select: (a) => a.tone({ type: 'triangle', freq: 880, dur: 0.06, vol: 0.12 }),
  confirm: (a) => {
    a.tone({ type: 'triangle', freq: 660, dur: 0.07, vol: 0.14 });
    a.tone({ type: 'triangle', freq: 990, dur: 0.12, vol: 0.14, when: 0.06 });
  },
  pot: (a) => {
    a.noise({ dur: 0.16, vol: 0.35, type: 'bandpass', freq: 2400, q: 0.7 });
    a.tone({ type: 'triangle', freq: 1700, dur: 0.06, vol: 0.12 });
    a.tone({ type: 'triangle', freq: 2300, dur: 0.05, vol: 0.08, when: 0.04 });
  },
  rock: (a) => {
    a.noise({ dur: 0.35, vol: 0.5, type: 'lowpass', freq: 900, freqEnd: 150 });
    a.tone({ type: 'sine', freq: 90, freqEnd: 40, dur: 0.3, vol: 0.6 });
  },
  roar: (a) => {
    a.tone({ type: 'sawtooth', freq: 130, freqEnd: 70, dur: 0.9, vol: 0.28, attack: 0.08, vibrato: 12, filter: { freq: 700 } });
    a.noise({ dur: 0.9, vol: 0.3, type: 'lowpass', freq: 600, freqEnd: 200, attack: 0.08 });
  },
  hiss: (a) => a.noise({ dur: 0.6, vol: 0.2, type: 'highpass', freq: 4000, attack: 0.05 }),
  splash: (a) => a.noise({ dur: 0.5, vol: 0.35, type: 'lowpass', freq: 1400, freqEnd: 250 }),
  rush: (a) => {
    a.noise({ dur: 2.6, vol: 0.45, type: 'lowpass', freq: 400, freqEnd: 1600, attack: 0.4 });
    a.noise({ dur: 2.2, vol: 0.2, type: 'bandpass', freq: 2500, attack: 0.5 });
  },
  rattle: (a) => {
    for (let i = 0; i < 10; i++) a.tone({ type: 'square', freq: rand(1400, 2200), dur: 0.04, vol: 0.09, when: i * 0.035 });
    a.noise({ dur: 0.35, vol: 0.15, type: 'highpass', freq: 4000 });
  },
  stomp: (a) => {
    a.tone({ type: 'sine', freq: 75, freqEnd: 28, dur: 0.4, vol: 0.95 });
    a.noise({ dur: 0.3, vol: 0.4, type: 'lowpass', freq: 350 });
  },
  whoosh: (a) => a.noise({ dur: 0.45, vol: 0.25, type: 'bandpass', freq: 400, freqEnd: 1800, q: 1.5 }),
  star: (a) => {
    [1568, 2093, 2637].forEach((f, i) => a.tone({ type: 'sine', freq: f, dur: 0.25, vol: 0.1, when: i * 0.05 }));
  },
  grab: (a) => {
    a.tone({ type: 'sawtooth', freq: 220, freqEnd: 140, dur: 0.12, vol: 0.12, filter: { freq: 1200 } });
    a.noise({ dur: 0.1, vol: 0.25, type: 'lowpass', freq: 900 });
  },
  mash: (a, o) => a.tone({ type: 'square', freq: 300 + (o.p || 0) * 600, dur: 0.045, vol: 0.06 }),
  charge: (a) => a.tone({ type: 'sawtooth', freq: 90, freqEnd: 200, dur: 0.6, vol: 0.12, filter: { freq: 900 } }),
  warn: (a) => a.tone({ type: 'triangle', freq: 1100, dur: 0.08, vol: 0.09 }),
  bird: (a) => {
    a.tone({ type: 'triangle', freq: 2100, freqEnd: 3000, dur: 0.07, vol: 0.08 });
    a.tone({ type: 'triangle', freq: 2900, freqEnd: 2200, dur: 0.08, vol: 0.08, when: 0.08 });
  },
  fire: (a) => {
    a.noise({ dur: 0.5, vol: 0.3, type: 'bandpass', freq: 700, freqEnd: 300, attack: 0.03 });
    a.noise({ dur: 0.3, vol: 0.15, type: 'highpass', freq: 3000 });
  },
  sizzle: (a) => {
    a.noise({ dur: 0.7, vol: 0.3, type: 'highpass', freq: 3500, freqEnd: 6000 });
    a.tone({ type: 'sine', freq: 300, freqEnd: 150, dur: 0.2, vol: 0.15 });
  },
  magic: (a) => {
    a.tone({ type: 'sine', freq: 600, freqEnd: 1800, dur: 0.5, vol: 0.14 });
    [1760, 2217, 2637, 3520].forEach((f, i) => a.tone({ type: 'sine', freq: f, dur: 0.2, vol: 0.05, when: 0.1 + i * 0.06 }));
  },
  bark: (a) => {
    a.tone({ type: 'square', freq: 420, freqEnd: 220, dur: 0.11, vol: 0.12, filter: { freq: 1800 } });
    a.noise({ dur: 0.08, vol: 0.2, type: 'bandpass', freq: 900 });
  },
  moo: (a) => a.tone({ type: 'sawtooth', freq: 150, freqEnd: 115, dur: 0.7, vol: 0.12, attack: 0.08, vibrato: 3, filter: { freq: 800 } }),
  neigh: (a) => a.tone({ type: 'sawtooth', freq: 700, freqEnd: 450, dur: 0.6, vol: 0.08, vibrato: 40, filter: { freq: 2400 } }),
  squeal: (a) => a.tone({ type: 'sawtooth', freq: 900, freqEnd: 500, dur: 0.4, vol: 0.1, vibrato: 30, filter: { freq: 2500 } }),
  poison: (a) => {
    [300, 420, 560].forEach((f, i) => a.tone({ type: 'sine', freq: f, freqEnd: f * 1.6, dur: 0.07, vol: 0.08, when: i * 0.06 }));
  },
  ice: (a) => {
    a.noise({ dur: 0.4, vol: 0.2, type: 'highpass', freq: 5000 });
    a.tone({ type: 'sine', freq: 2400, freqEnd: 1800, dur: 0.3, vol: 0.06 });
  },
  thunder: (a) => {
    a.noise({ dur: 1.6, vol: 0.6, type: 'lowpass', freq: 900, freqEnd: 80, attack: 0.01 });
    a.tone({ type: 'sine', freq: 60, freqEnd: 30, dur: 1.2, vol: 0.5 });
  },
  door: (a) => {
    a.tone({ type: 'sine', freq: 220, freqEnd: 440, dur: 0.4, vol: 0.12 });
    a.tone({ type: 'sine', freq: 330, freqEnd: 660, dur: 0.4, vol: 0.08, when: 0.1 });
  },
  pop: (a) => a.tone({ type: 'sine', freq: 500, freqEnd: 1100, dur: 0.08, vol: 0.14 }),
  laugh: (a) => {
    [0, 0.14, 0.28].forEach((w) => a.tone({ type: 'triangle', freq: 900, freqEnd: 700, dur: 0.1, vol: 0.06, when: w }));
  },
  jar: (a) => {
    for (let i = 0; i < 8; i++) a.tone({ type: 'triangle', freq: 300 + (i % 2) * 80, dur: 0.05, vol: 0.12, when: i * 0.06 });
  },
};
