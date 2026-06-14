// streams.jsx — Live Streams: grid, simulated live monitor, detail console
// (health metrics + live bitrate graph + go-live/stop controls + screen
// assignment) and a create-stream modal.
(function () {
  const { useState, useEffect, useRef } = React;
  const Icon = window.Icon;
  const { Card, CardHead, Badge, Btn, StatusDot, Empty, PageHeader, Overlay } = window;

  const PROTOCOLS = [
    ['RTMP', 'rtmp://ingest.mynextscreen.tv/live/your-key'],
    ['HLS', 'https://cdn.example.com/live/index.m3u8'],
    ['SRT', 'srt://203.0.113.5:9000?streamid=feed'],
    ['WebRTC', 'whip://edge.example.com/whip/your-key'],
  ];
  const SRC_HINT = Object.fromEntries(PROTOCOLS);
  const QUALITIES = [
    ['source', 'Source', 'Pass-through'], ['1080p', 'High', '1920×1080'], ['720p', 'Medium', '1280×720'], ['480p', 'Low', '854×480'],
  ];
  const QLABEL = { source: 'Source', '1080p': '1080p', '720p': '720p', '480p': '480p' };
  const QFPS = { source: 30, '1080p': 30, '720p': 30, '480p': 25 };
  const QBITRATE = { source: 8.5, '1080p': 6.0, '720p': 3.0, '480p': 1.4 };

  const SS = {
    live:       { label: 'Live',       c: 'var(--offline)',    dim: 'var(--offline-dim)' },
    connecting: { label: 'Connecting', c: 'var(--warn)',       dim: 'var(--warn-dim)' },
    offline:    { label: 'Offline',    c: 'var(--text-faint)', dim: 'var(--surface-3)' },
  };
  const THUMBS = ['linear-gradient(150deg, #1d4e6b, #0a1c2e)', 'linear-gradient(150deg, #43215f, #160a26)',
    'linear-gradient(150deg, #14463d, #06201c)', 'linear-gradient(150deg, #5a3015, #25130a)', 'linear-gradient(150deg, #2a2356, #110e26)'];

  const uid = () => Math.random().toString(36).slice(2, 8);
  const fmtUptime = (sec) => {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // ---- broadcast-target helpers (all screens / groups / specific screens) ----
  const groupsList = () => window.__GROUPS || window.MOCK.GROUPS || [];
  function resolveScreenIds(stream, allScreens, groups) {
    if (stream.targetMode === 'all') return allScreens.map((s) => s.id);
    if (stream.targetMode === 'groups') {
      const set = new Set();
      (stream.groupIds || []).forEach((gid) => { const g = groups.find((x) => x.id === gid); if (g) g.screenIds.forEach((id) => set.add(id)); });
      return [...set];
    }
    return stream.screenIds || [];
  }
  function targetSummary(stream, allScreens, groups) {
    const ids = new Set(allScreens.map((s) => s.id));
    const count = resolveScreenIds(stream, allScreens, groups).filter((id) => ids.has(id)).length;
    if (stream.targetMode === 'all') return { label: 'All screens', count, icon: 'Globe' };
    if (stream.targetMode === 'groups') { const g = (stream.groupIds || []).length; return { label: g ? `${g} group${g !== 1 ? 's' : ''}` : 'No groups', count, icon: 'Groups' }; }
    return { label: count ? `${count} screen${count !== 1 ? 's' : ''}` : 'No screens', count, icon: 'Screens' };
  }
  const TARGET_MODES = [['all', 'All screens', 'Globe'], ['groups', 'Groups', 'Groups'], ['screens', 'Specific', 'Screens']];

  // module cache so edits survive page remounts in a session
  let ST_CACHE = null;

  // ============================================================
  //  status pill (live has a pulsing dot)
  // ============================================================
  function StreamStatus({ status, size = 'md' }) {
    const s = SS[status] || SS.offline;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: size === 'sm' ? '3px 9px' : '4px 11px',
        borderRadius: 99, fontSize: size === 'sm' ? 11 : 12, fontWeight: 700, letterSpacing: '.03em', textTransform: 'uppercase',
        color: s.c, background: s.dim, whiteSpace: 'nowrap' }}>
        <span style={{ width: 7, height: 7, borderRadius: 99, background: s.c,
          animation: status === 'live' ? 'pulseDot 1.4s ease-in-out infinite' : 'none' }} />
        {s.label}
      </span>
    );
  }

  // signal-strength bars
  function SignalBars({ status }) {
    const lvl = status === 'live' ? 4 : status === 'connecting' ? 2 : 0;
    const c = SS[status].c;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 13 }}>
        {[5, 8, 11, 13].map((h, i) => (
          <span key={i} style={{ width: 3, height: h, borderRadius: 1.5, background: i < lvl ? c : 'var(--border-strong)' }} />
        ))}
      </span>
    );
  }

  // ============================================================
  //  simulated live monitor feed
  // ============================================================
  function LiveMonitor({ stream, big, uptimeSec }) {
    const live = stream.status === 'live';
    const connecting = stream.status === 'connecting';
    const offline = stream.status === 'offline';
    const VU = big ? 16 : 11;
    return (
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: big ? 14 : 10, overflow: 'hidden',
        background: stream.thumb || '#05070c', border: '1px solid rgba(255,255,255,.12)',
        boxShadow: 'inset 0 0 0 2px rgba(0,0,0,.4), 0 18px 40px -26px rgba(0,0,0,.9)' }}>

        {!offline && (
          <React.Fragment>
            <div style={{ position: 'absolute', width: '55%', aspectRatio: '1', left: '8%', top: '12%', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,.32), transparent 70%)', filter: 'blur(22px)',
              animation: 'streamBlobA 9s ease-in-out infinite', opacity: connecting ? .25 : .6 }} />
            <div style={{ position: 'absolute', width: '48%', aspectRatio: '1', right: '6%', bottom: '6%', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0,0,0,.45), transparent 70%)', filter: 'blur(20px)',
              animation: 'streamBlobB 11s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: connecting ? .15 : .35 }}>
              <div style={{ position: 'absolute', top: 0, bottom: 0, width: '38%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.5), transparent)',
                animation: 'streamSweep 6.5s linear infinite' }} />
            </div>
          </React.Fragment>
        )}

        {/* scanlines */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: live ? .5 : .25,
          background: 'repeating-linear-gradient(180deg, rgba(0,0,0,.16) 0 1px, transparent 1px 3px)' }} />
        {live && <div style={{ position: 'absolute', left: 0, right: 0, height: '32%', pointerEvents: 'none',
          background: 'linear-gradient(180deg, transparent, rgba(255,255,255,.07), transparent)', animation: 'streamScan 5s linear infinite' }} />}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(120% 120% at 50% 40%, transparent 55%, rgba(0,0,0,.5)), linear-gradient(180deg, rgba(255,255,255,.12), transparent 30%)' }} />

        {offline && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', gap: 8, color: 'rgba(255,255,255,.5)', background: 'rgba(6,9,15,.5)' }}>
            <Icon.WifiOff s={big ? 34 : 24} />
            <span style={{ fontSize: big ? 14 : 12, fontWeight: 700, letterSpacing: '.04em' }}>NO SIGNAL</span>
          </div>
        )}
        {connecting && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', gap: 10, color: '#fff' }}>
            <span style={{ width: big ? 34 : 24, height: big ? 34 : 24, borderRadius: 99, border: '2.5px solid rgba(255,255,255,.25)',
              borderTopColor: '#fff', animation: 'connSpin .8s linear infinite' }} />
            <span style={{ fontSize: big ? 13.5 : 11.5, fontWeight: 700, letterSpacing: '.04em' }}>CONNECTING…</span>
          </div>
        )}

        {live && (
          <div style={{ position: 'absolute', top: big ? 12 : 8, left: big ? 12 : 8, display: 'flex', alignItems: 'center', gap: 6,
            padding: big ? '4px 11px' : '3px 8px', borderRadius: 99, background: 'rgba(239,71,87,.92)', color: '#fff',
            fontSize: big ? 12 : 10.5, fontWeight: 800, letterSpacing: '.08em' }}>
            <span style={{ width: big ? 7 : 6, height: big ? 7 : 6, borderRadius: 99, background: '#fff', animation: 'pulseDot 1.4s ease-in-out infinite' }} />LIVE
          </div>
        )}
        {live && (
          <div className="mono" style={{ position: 'absolute', top: big ? 12 : 8, right: big ? 12 : 8, padding: big ? '4px 9px' : '2px 7px',
            borderRadius: 7, background: 'rgba(4,6,11,.6)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: big ? 12 : 10, fontWeight: 600, letterSpacing: '.04em' }}>
            {fmtUptime(uptimeSec)}
          </div>
        )}
        {!connecting && !offline && (
          <div style={{ position: 'absolute', bottom: big ? 12 : 8, right: big ? 12 : 8, padding: big ? '3px 9px' : '2px 7px',
            borderRadius: 7, background: 'rgba(4,6,11,.55)', backdropFilter: 'blur(4px)', color: 'rgba(255,255,255,.92)', fontSize: big ? 11 : 9.5, fontWeight: 700, letterSpacing: '.03em' }}>
            {QLABEL[stream.quality]} · {stream.fps}fps
          </div>
        )}
        {live && stream.audio && (
          <div style={{ position: 'absolute', bottom: big ? 12 : 8, left: big ? 12 : 8, display: 'flex', alignItems: 'flex-end', gap: 2, height: big ? 22 : 15 }}>
            {Array.from({ length: VU }).map((_, i) => (
              <span key={i} style={{ width: big ? 3 : 2, height: '100%', borderRadius: 2, transformOrigin: 'bottom',
                background: 'linear-gradient(180deg, #fff, rgba(255,255,255,.5))',
                animation: `vuBar ${0.5 + (i % 5) * 0.13}s ease-in-out ${(i * 0.07).toFixed(2)}s infinite` }} />
            ))}
          </div>
        )}
        {live && !stream.audio && (
          <div style={{ position: 'absolute', bottom: big ? 12 : 8, left: big ? 12 : 8, display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: big ? '3px 9px' : '2px 7px', borderRadius: 7, background: 'rgba(4,6,11,.55)', backdropFilter: 'blur(4px)', color: 'rgba(255,255,255,.7)', fontSize: big ? 10.5 : 9, fontWeight: 700, letterSpacing: '.03em' }}>
            <Icon.WifiOff s={big ? 12 : 10} /> MUTED
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  //  hooks: uptime ticker + live bitrate series
  // ============================================================
  function useUptime(active, initial) {
    const [sec, setSec] = useState(initial || 0);
    useEffect(() => { setSec(initial || 0); }, [initial]);
    useEffect(() => {
      if (!active) return;
      const id = setInterval(() => setSec((s) => s + 1), 1000);
      return () => clearInterval(id);
    }, [active]);
    return sec;
  }

  function useBitrateSeries(target, active, n = 48) {
    const [series, setSeries] = useState(() => Array.from({ length: n }, () => (active ? target : 0)));
    const targetRef = useRef(target); targetRef.current = target;
    useEffect(() => {
      if (!active) { setSeries(Array.from({ length: n }, () => 0)); return; }
      setSeries(Array.from({ length: n }, () => target * (0.85 + Math.random() * 0.3)));
      const id = setInterval(() => {
        setSeries((prev) => {
          const t = targetRef.current;
          const last = prev[prev.length - 1] || t;
          let next = last + (Math.random() - 0.5) * t * 0.22;
          next = Math.max(t * 0.55, Math.min(t * 1.18, next));
          return [...prev.slice(1), next];
        });
      }, 700);
      return () => clearInterval(id);
    }, [active, n]);
    return series;
  }

  function BitrateGraph({ series, target, color = 'var(--accent)', h = 92 }) {
    const max = Math.max(target * 1.25, ...series, 0.1);
    const n = series.length;
    const pts = series.map((v, i) => [(i / (n - 1)) * 100, 100 - (v / max) * 100]);
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');
    const cur = series[series.length - 1] || 0;
    const gid = useRef('br' + uid()).current;
    return (
      <div style={{ position: 'relative', width: '100%', height: h }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" style={{ display: 'block' }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[25, 50, 75].map((y) => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="var(--border)" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />)}
          <path d={`${line} L100,100 L0,100 Z`} fill={`url(#${gid})`} />
          <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="mono" style={{ position: 'absolute', top: 2, right: 4, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{cur.toFixed(1)} Mbps</div>
      </div>
    );
  }

  // small health metric tile
  function Metric({ icon, label, value, unit, tone }) {
    const IconC = Icon[icon] || Icon.Clock;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
        <span style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 9, flexShrink: 0,
          background: tone === 'live' ? 'var(--offline-dim)' : 'var(--accent-soft)', color: tone === 'live' ? 'var(--offline)' : 'var(--accent)' }}><IconC s={17} /></span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.01em' }} className="mono">{value}<span style={{ fontSize: 11.5, color: 'var(--text-faint)', fontWeight: 600, marginLeft: 3 }}>{unit}</span></div>
        </div>
      </div>
    );
  }

  // ---- live-stream → schedule override exposure (read by schedules.jsx) ----
  function computeOverrides(allScreens) {
    const groups = groupsList();
    const ids = new Set(allScreens.map((s) => s.id));
    const list = window.__STREAMS || window.MOCK.STREAMS || [];
    const map = new Map(); // screenId -> stream name
    list.filter((s) => s.status === 'live').forEach((s) => {
      resolveScreenIds(s, allScreens, groups).forEach((id) => { if (ids.has(id) && !map.has(id)) map.set(id, s.name); });
    });
    return map;
  }
  window.streamOverrides = computeOverrides;

  // ============================================================
  //  nicely-styled screen picker (popover dropdown)
  // ============================================================
  function ScreenPicker({ available, onAdd }) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    const searchRef = useRef(null);
    useEffect(() => { if (open) { setQ(''); setTimeout(() => searchRef.current && searchRef.current.focus(), 30); } }, [open]);
    const filtered = available.filter((s) => (s.name + ' ' + s.loc).toLowerCase().includes(q.trim().toLowerCase()));
    return (
      <div style={{ position: 'relative' }}>
        <button type="button" onClick={() => setOpen((o) => !o)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%', padding: '11px 13px', borderRadius: 10, cursor: 'pointer',
            fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', background: 'var(--surface-2)', border: `1px ${open ? 'solid var(--accent)' : 'dashed var(--border-strong)'}`, color: open ? 'var(--accent)' : 'var(--text-muted)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icon.Plus s={16} /> Assign a screen…</span>
          <Icon.Chevron s={15} style={{ transform: open ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform .15s' }} />
        </button>
        {open && (
          <React.Fragment>
            <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
            <div style={{ position: 'absolute', zIndex: 50, top: 'calc(100% + 8px)', left: 0, right: 0,
              background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 14, boxShadow: 'var(--shadow-lg)', overflow: 'hidden', animation: 'fadeUp .15s ease both' }}>
              <div style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }}><Icon.Search s={15} /></span>
                  <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search screens…"
                    style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 9, fontSize: 13, fontFamily: 'inherit', background: 'var(--surface-2)', border: '1px solid var(--border-strong)', color: 'var(--text)', outline: 'none' }} />
                </div>
              </div>
              <div style={{ maxHeight: 264, overflowY: 'auto', padding: 6 }}>
                {filtered.map((s) => (
                  <button key={s.id} className="wall-menu-item" onClick={() => { onAdd(s.id); setOpen(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '8px 10px', borderRadius: 10, border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}>
                    <span style={{ position: 'relative', width: 42, height: 26, borderRadius: 5, background: s.thumb, flexShrink: 0, overflow: 'hidden' }}>
                      <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,.12), transparent 55%, rgba(0,0,0,.2))' }} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                      <span className="mono" style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)' }}>{s.res2} · {s.loc}</span>
                    </span>
                    <StatusDot status={s.status} size={7} />
                    <Icon.Plus s={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  </button>
                ))}
                {available.length === 0 && <div style={{ padding: '14px 10px', fontSize: 13, color: 'var(--text-muted)' }}>All screens are already assigned.</div>}
                {available.length > 0 && filtered.length === 0 && <div style={{ padding: '14px 10px', fontSize: 13, color: 'var(--text-muted)' }}>No screens match “{q}”.</div>}
              </div>
            </div>
          </React.Fragment>
        )}
      </div>
    );
  }

  // ============================================================
  //  grid card
  // ============================================================
  function StreamCard({ stream, screenById, onOpen, onToggle, onDuplicate, onDelete }) {
    const [menu, setMenu] = useState(false);
    const live = stream.status === 'live';
    const uptimeSec = useUptime(live, stream.uptimeSec);
    const allScreens = [...screenById.values()];
    const summary = targetSummary(stream, allScreens, groupsList());
    const SumIcon = Icon[summary.icon] || Icon.Screens;
    const MI = { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 11px', borderRadius: 9, border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', fontSize: 13.5, fontWeight: 600 };
    return (
      <Card hover style={{ overflow: 'visible', display: 'flex', flexDirection: 'column', padding: 0 }}>
        <div style={{ position: 'relative', padding: 14, paddingBottom: 0, cursor: 'pointer' }} onClick={onOpen}>
          <LiveMonitor stream={stream} uptimeSec={uptimeSec} />
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onOpen}>
              <div style={{ fontWeight: 700, fontSize: 15.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stream.name}</div>
              <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stream.source}</div>
            </div>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button onClick={() => setMenu((m) => !m)} title="Actions" style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 8,
                border: '1px solid var(--border)', background: menu ? 'var(--surface-3)' : 'transparent', color: 'var(--text-muted)' }}><Icon.Dots s={18} /></button>
              {menu && (
                <React.Fragment>
                  <div onClick={() => setMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                  <div style={{ position: 'absolute', zIndex: 50, top: 'calc(100% + 6px)', right: 0, minWidth: 192,
                    background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 13, boxShadow: 'var(--shadow-lg)', overflow: 'hidden', padding: 6, animation: 'fadeUp .15s ease both' }}>
                    <button className="wall-menu-item" style={{ ...MI, color: 'var(--text)' }} onClick={() => { onOpen(); setMenu(false); }}><Icon.Eye s={16} style={{ color: 'var(--text-muted)' }} /> Open console</button>
                    <button className="wall-menu-item" style={{ ...MI, color: 'var(--text)' }} onClick={() => { onToggle(); setMenu(false); }}>
                      {live ? <React.Fragment><Icon.Power s={16} style={{ color: 'var(--text-muted)' }} /> Stop stream</React.Fragment> : <React.Fragment><Icon.Play s={15} style={{ color: 'var(--online)' }} /> Go live</React.Fragment>}
                    </button>
                    <button className="wall-menu-item" style={{ ...MI, color: 'var(--text)' }} onClick={() => { onDuplicate(); setMenu(false); }}><Icon.Copy s={16} style={{ color: 'var(--text-muted)' }} /> Duplicate</button>
                    <div style={{ height: 1, background: 'var(--border)', margin: '6px 4px' }} />
                    <button className="wall-menu-item" style={{ ...MI, color: 'var(--offline)' }} onClick={() => { onDelete(); setMenu(false); }}><Icon.Trash s={15} /> Delete</button>
                  </div>
                </React.Fragment>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <StreamStatus status={stream.status} size="sm" />
            <Badge tone="neutral" icon={<Icon.Cast s={12} />}>{stream.protocol}</Badge>
            <Badge tone={summary.count ? 'accent' : 'neutral'} icon={<SumIcon s={12} />}>{summary.label}{stream.targetMode !== 'screens' && summary.count ? ` · ${summary.count}` : ''}</Badge>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {live ? `${stream.bitrate.toFixed(1)} Mbps · ${fmtUptime(uptimeSec)}` : SS[stream.status].label}
            </span>
            <Btn variant={live ? 'danger' : 'soft'} size="sm" icon={live ? <Icon.Power s={14} /> : <Icon.Play s={14} />} onClick={onToggle}>{live ? 'Stop' : 'Go live'}</Btn>
          </div>
        </div>
      </Card>
    );
  }

  // ============================================================
  //  detail console
  // ============================================================
  function StreamDetail({ stream, screens, screenById, onBack, patch, onDelete, notify }) {
    const [name, setName] = useState(stream.name);
    const [copied, setCopied] = useState(false);
    useEffect(() => setName(stream.name), [stream.id]);
    const live = stream.status === 'live';
    const connecting = stream.status === 'connecting';
    const uptimeSec = useUptime(live, stream.uptimeSec);
    const series = useBitrateSeries(stream.bitrate || QBITRATE[stream.quality], live);
    const curBitrate = series[series.length - 1] || 0;
    const assigned = stream.screenIds.map((id) => screenById.get(id)).filter(Boolean);
    const available = screens.filter((s) => !stream.screenIds.includes(s.id));
    const dropped = live ? (Math.round((1 - 0.998) * uptimeSec * stream.fps) || 0) : 0;
    const groups = groupsList();
    const summary = targetSummary(stream, screens, groups);
    const SumIcon = Icon[summary.icon] || Icon.Screens;
    const toggleGroup = (id, on) => patch({ groupIds: on ? [...(stream.groupIds || []), id] : (stream.groupIds || []).filter((x) => x !== id) });

    const toggleScreen = (id, on) => patch({ screenIds: on ? [...stream.screenIds, id] : stream.screenIds.filter((x) => x !== id) });
    const commitName = () => {
      const n = name.trim();
      if (n && n !== stream.name) { patch({ name: n }); notify && notify({ title: 'Stream renamed', desc: `Now “${n}”`, tone: 'accent', icon: 'Pencil' }); }
      else setName(stream.name);
    };
    const goLive = () => { patch({ status: 'live', uptimeSec: 0, bitrate: QBITRATE[stream.quality] }); notify && notify({ title: 'Stream is live', desc: `“${stream.name}” is now broadcasting`, tone: 'online', icon: 'CheckCircle' }); };
    const stop = () => { patch({ status: 'offline', uptimeSec: 0, bitrate: 0 }); notify && notify({ title: 'Stream stopped', desc: `“${stream.name}” is offline`, tone: 'offline', icon: 'Power' }); };
    const copyUrl = () => { setCopied(true); setTimeout(() => setCopied(false), 1600); notify && notify({ title: 'Source URL copied', desc: stream.source, tone: 'accent', icon: 'Copy' }); };

    return (
      <div>
        <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 16,
          padding: '7px 13px 7px 9px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontSize: 13.5, fontWeight: 600 }}>
          <Icon.ChevronLeft s={17} /> All streams
        </button>

        {/* header */}
        <Card style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 'var(--gap)' }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 52, height: 52, borderRadius: 14, color: '#fff', flexShrink: 0,
            background: live ? 'linear-gradient(135deg, #ef4757, #b3243a)' : 'linear-gradient(135deg, var(--surface-3), var(--surface-2))', boxShadow: live ? '0 8px 22px -10px rgba(239,71,87,.7)' : 'none' }}><Icon.Stream s={25} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input value={name} onChange={(e) => setName(e.target.value)} onBlur={commitName}
              onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { setName(stream.name); e.target.blur(); } }}
              style={{ width: '100%', fontSize: 20, fontWeight: 800, letterSpacing: '-.01em', color: 'var(--text)', background: 'transparent',
                border: '1px solid transparent', borderRadius: 8, padding: '2px 6px', margin: '-2px -6px', fontFamily: 'inherit', outline: 'none' }}
              onFocus={(e) => { e.target.style.background = 'var(--surface-2)'; e.target.style.borderColor = 'var(--border-strong)'; }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 8, flexWrap: 'wrap' }}>
              <StreamStatus status={stream.status} />
              <Badge tone="neutral" icon={<Icon.Cast s={12} />}>{stream.protocol}</Badge>
              <Badge tone={summary.count ? 'accent' : 'neutral'} icon={<SumIcon s={12} />}>{summary.label}{stream.targetMode !== 'screens' && summary.count ? ` · ${summary.count} screen${summary.count !== 1 ? 's' : ''}` : ''}</Badge>
            </div>
          </div>
          <Btn variant="danger" size="sm" icon={<Icon.Trash s={15} />} onClick={onDelete}>Delete</Btn>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 'var(--gap)', alignItems: 'start' }} className="main-grid">
          {/* left: monitor + health */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>
            <Card>
              <div style={{ padding: 14, borderRadius: 18, border: '1px solid var(--border)', background: 'radial-gradient(130% 130% at 50% -10%, #0d1320, #06080d)' }}>
                <LiveMonitor stream={stream} big uptimeSec={uptimeSec} />
              </div>
              {/* transport controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                {live ? (
                  <Btn variant="danger" icon={<Icon.Power s={17} />} onClick={stop}>Stop stream</Btn>
                ) : (
                  <Btn variant="primary" icon={<Icon.Play s={17} />} onClick={goLive} style={connecting ? {} : {}}>{connecting ? 'Force live now' : 'Go live'}</Btn>
                )}
                <Btn variant="outline" size="md" icon={<Icon.Refresh s={16} />} onClick={() => { patch({ status: 'connecting', uptimeSec: 0 }); notify && notify({ title: 'Reconnecting…', desc: `Restarting “${stream.name}”`, tone: 'info', icon: 'Refresh' }); }}>Restart</Btn>
                <button onClick={() => patch({ audio: !stream.audio })} title={stream.audio ? 'Mute' : 'Unmute'}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                    border: '1px solid var(--border-strong)', background: 'transparent', color: stream.audio ? 'var(--text)' : 'var(--text-faint)' }}>
                  {stream.audio ? <Icon.Wifi s={16} /> : <Icon.WifiOff s={16} />}{stream.audio ? 'Audio on' : 'Muted'}
                </button>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 600 }}>
                  <SignalBars status={stream.status} /> {stream.status === 'live' ? 'Healthy' : stream.status === 'connecting' ? 'Negotiating' : 'No feed'}
                </div>
              </div>
            </Card>

            {/* health metrics */}
            <Card>
              <CardHead title="Stream health" sub={live ? 'Live telemetry · updates every second' : 'No active feed'} icon={<Icon.Stream s={18} />}
                right={<StreamStatus status={stream.status} size="sm" />} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }} className="metric-row">
                <Metric icon="Cast" label="Bitrate" value={live ? curBitrate.toFixed(1) : '0.0'} unit="Mbps" tone="live" />
                <Metric icon="Video" label="Frame rate" value={live ? stream.fps : '0'} unit="fps" />
                <Metric icon="Clock" label="Latency" value={live ? stream.latency.toFixed(1) : '—'} unit={live ? 's' : ''} />
                <Metric icon="Alert" label="Dropped" value={dropped} unit="frames" />
              </div>
              <div style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-2)', padding: '14px 14px 6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Bitrate · last {Math.round(series.length * 0.7)}s</span>
                  <span style={{ fontSize: 11.5, color: 'var(--text-faint)', fontWeight: 600 }}>target {(stream.bitrate || QBITRATE[stream.quality]).toFixed(1)} Mbps</span>
                </div>
                <BitrateGraph series={series} target={stream.bitrate || QBITRATE[stream.quality]} color={live ? 'var(--offline)' : 'var(--text-faint)'} />
              </div>
            </Card>
          </div>

          {/* right: source + screens */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>
            <Card>
              <CardHead title="Source" sub="Ingest endpoint & encoding" icon={<Icon.Cast s={18} />} />
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 7 }}>Source URL</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <div className="mono" style={{ flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)',
                  fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stream.source}</div>
                <button onClick={copyUrl} title="Copy URL" style={{ display: 'grid', placeItems: 'center', width: 40, flexShrink: 0, borderRadius: 10,
                  border: '1px solid var(--border-strong)', background: copied ? 'var(--accent-soft)' : 'var(--surface)', color: copied ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {copied ? <Icon.Check s={16} /> : <Icon.Copy s={16} />}
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['Protocol', stream.protocol], ['Quality', QLABEL[stream.quality]], ['Frame rate', `${stream.fps} fps`], ['Audio', stream.audio ? 'Enabled' : 'Muted']].map(([k, v]) => (
                  <div key={k} style={{ padding: '11px 13px', borderRadius: 11, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>{k}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHead title="Broadcast to" sub={summary.count ? `Reaching ${summary.count} screen${summary.count !== 1 ? 's' : ''}` : 'No screens targeted'} icon={<Icon.Screens s={18} />} />

              {/* target-mode segmented control */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {TARGET_MODES.map(([m, label, ic]) => {
                  const IC = Icon[ic] || Icon.Screens; const on = stream.targetMode === m;
                  return (
                    <button key={m} type="button" onClick={() => patch({ targetMode: m })}
                      style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 6px', borderRadius: 10, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                        border: `1px solid ${on ? 'var(--accent)' : 'var(--border-strong)'}`, background: on ? 'var(--accent-soft)' : 'var(--surface-2)', color: on ? 'var(--accent)' : 'var(--text-muted)' }}>
                      <IC s={14} />{label}
                    </button>
                  );
                })}
              </div>

              {/* ALL SCREENS */}
              {stream.targetMode === 'all' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '15px 16px', borderRadius: 12, border: '1px solid var(--accent)', background: 'var(--accent-soft)' }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 11, flexShrink: 0, background: 'var(--accent)', color: '#fff' }}><Icon.Globe s={20} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>Entire organisation</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 1 }}>Plays on all {screens.length} screen{screens.length !== 1 ? 's' : ''} — including any added later</div>
                  </div>
                  <Badge tone="accent" icon={<Icon.Screens s={12} />}>{screens.length}</Badge>
                </div>
              )}

              {/* SCREEN GROUPS */}
              {stream.targetMode === 'groups' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {groups.map((g) => {
                    const GI = Icon[g.icon] || Icon.Groups; const on = (stream.groupIds || []).includes(g.id);
                    const n = g.screenIds.filter((id) => screenById.has(id)).length;
                    return (
                      <button key={g.id} type="button" onClick={() => toggleGroup(g.id, !on)}
                        style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', borderRadius: 11, textAlign: 'left', cursor: 'pointer',
                          border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'var(--accent-soft)' : 'var(--surface-2)' }}>
                        <span style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 9, flexShrink: 0, color: '#fff',
                          background: `linear-gradient(135deg, ${g.color}, color-mix(in srgb, ${g.color} 55%, #fff))` }}><GI s={16} /></span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{n} screen{n !== 1 ? 's' : ''}</div>
                        </div>
                        <span style={{ display: 'grid', placeItems: 'center', width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                          border: `1px solid ${on ? 'var(--accent)' : 'var(--border-strong)'}`, background: on ? 'var(--accent)' : 'transparent', color: '#fff' }}>
                          {on && <Icon.Check s={13} sw={3} />}
                        </span>
                      </button>
                    );
                  })}
                  {groups.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '4px 0' }}>No screen groups yet — create one on the Screen Groups page.</div>}
                </div>
              )}

              {/* SPECIFIC SCREENS */}
              {stream.targetMode === 'screens' && (
                <React.Fragment>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {assigned.map((s) => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', borderRadius: 11, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        <div style={{ width: 30, height: 19, borderRadius: 4, flexShrink: 0, background: s.thumb }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                          <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.res2} · {s.loc}</div>
                        </div>
                        {live && <Badge tone="offline" icon={<span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--offline)', animation: 'pulseDot 1.4s ease-in-out infinite' }} />}>Live</Badge>}
                        <button onClick={() => toggleScreen(s.id, false)} title="Remove" style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: 8,
                          border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-faint)' }}><Icon.Trash s={14} /></button>
                      </div>
                    ))}
                    {assigned.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '4px 0' }}>No screens assigned.</div>}
                  </div>
                  {available.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <ScreenPicker available={available} onAdd={(id) => toggleScreen(id, true)} />
                    </div>
                  )}
                </React.Fragment>
              )}

              {/* override notice */}
              {live && summary.count > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 14, padding: '11px 13px', borderRadius: 11,
                  border: '1px solid color-mix(in srgb, var(--warn) 40%, var(--border))', background: 'var(--warn-dim)' }}>
                  <Icon.Alert s={16} style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.45 }}>
                    <span style={{ fontWeight: 700, color: 'var(--text)' }}>Live takes priority.</span> While this stream is live it overrides any scheduled playlist on {summary.count === 1 ? 'this screen' : `these ${summary.count} screens`}.
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  //  create-stream modal
  // ============================================================
  function NewStreamModal({ onClose, onCreate }) {
    const [name, setName] = useState('');
    const [source, setSource] = useState('');
    const [protocol, setProtocol] = useState('RTMP');
    const [quality, setQuality] = useState('1080p');
    const [audio, setAudio] = useState(true);
    const valid = name.trim().length > 1 && source.trim().length > 4;

    const create = () => {
      if (!valid) return;
      onCreate({
        id: 'ls' + Date.now(), name: name.trim(), source: source.trim(), protocol, quality,
        fps: QFPS[quality], bitrate: QBITRATE[quality], latency: protocol === 'SRT' ? 0.8 : protocol === 'WebRTC' ? 0.4 : 2.2,
        audio, status: 'connecting', targetMode: 'screens', screenIds: [], groupIds: [], uptimeSec: 0, thumb: THUMBS[Math.floor(Math.random() * THUMBS.length)],
      });
    };
    const inp = { width: '100%', padding: '11px 13px', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', background: 'var(--surface-2)', border: '1px solid var(--border-strong)', color: 'var(--text)', outline: 'none' };
    const lbl = { display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 };
    const seg = (active) => ({ flex: 1, padding: '9px 6px', borderRadius: 9, fontSize: 13, fontWeight: 600, textAlign: 'center', cursor: 'pointer',
      border: `1px solid ${active ? 'var(--accent)' : 'var(--border-strong)'}`, background: active ? 'var(--accent-soft)' : 'var(--surface-2)', color: active ? 'var(--accent)' : 'var(--text-muted)' });

    return (
      <Overlay onClose={onClose}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '20px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(135deg, #ef4757, #b3243a)', color: '#fff' }}><Icon.Stream s={21} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>New live stream</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Connect an RTMP, HLS, SRT or WebRTC source</div>
            </div>
            <button onClick={onClose} style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 18 }}>✕</button>
          </div>

          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>
            <label style={{ display: 'block' }}>
              <span style={lbl}>Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lobby Camera" autoFocus style={inp} />
            </label>
            <div>
              <span style={lbl}>Protocol</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {PROTOCOLS.map(([p]) => <button key={p} type="button" onClick={() => setProtocol(p)} style={seg(protocol === p)}>{p}</button>)}
              </div>
            </div>
            <label style={{ display: 'block' }}>
              <span style={lbl}>Source URL</span>
              <input value={source} onChange={(e) => setSource(e.target.value)} placeholder={SRC_HINT[protocol]} className="mono" style={{ ...inp, fontSize: 12.5 }} />
            </label>
            <div>
              <span style={lbl}>Quality preset</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {QUALITIES.map(([v, label, res]) => (
                  <button key={v} type="button" onClick={() => setQuality(v)} style={{ ...seg(quality === v), display: 'flex', flexDirection: 'column', gap: 2, padding: '9px 4px' }}>
                    <span>{label}</span><span style={{ fontSize: 10.5, fontWeight: 500, opacity: .8 }}>{v === 'source' ? 'Pass-thru' : v}</span>
                  </button>
                ))}
              </div>
            </div>
            <button type="button" onClick={() => setAudio((a) => !a)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: 'transparent', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: audio ? 'var(--accent-soft)' : 'var(--surface-3)', color: audio ? 'var(--accent)' : 'var(--text-faint)' }}>{audio ? <Icon.Wifi s={18} /> : <Icon.WifiOff s={18} />}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>Enable audio</span>
                <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-muted)', marginTop: 1 }}>Pass the source audio track through to screens</span>
              </span>
              <span style={{ position: 'relative', width: 42, height: 24, borderRadius: 99, flexShrink: 0, transition: 'background .18s', background: audio ? 'var(--accent)' : 'var(--surface-3)', border: '1px solid var(--border-strong)' }}>
                <span style={{ position: 'absolute', top: 2, left: audio ? 20 : 2, width: 18, height: 18, borderRadius: 99, background: '#fff', transition: 'left .18s', boxShadow: '0 2px 5px rgba(0,0,0,.3)' }} />
              </span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10, padding: 24, borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <Btn variant="outline" onClick={onClose} full>Cancel</Btn>
            <Btn variant={valid ? 'primary' : 'ghost'} onClick={valid ? create : undefined} full icon={<Icon.Stream s={17} />} style={!valid ? { opacity: .5, cursor: 'not-allowed' } : {}}>Create stream</Btn>
          </div>
        </div>
      </Overlay>
    );
  }

  // ============================================================
  //  page
  // ============================================================
  function StreamsPage({ screens, seeded, onLoadSample, notify }) {
    const screenById = new Map(screens.map((s) => [s.id, s]));
    const [list, setList] = useState(() => {
      if (ST_CACHE && ST_CACHE.length) return ST_CACHE;
      ST_CACHE = seeded ? (window.MOCK.STREAMS || []).map((s) => ({ ...s })) : (ST_CACHE || []);
      return ST_CACHE;
    });
    const [selId, setSelId] = useState(null);
    const [modal, setModal] = useState(false);
    useEffect(() => { ST_CACHE = list; window.__STREAMS = list; }, [list]);

    // auto-promote connecting streams to live (feels alive)
    useEffect(() => {
      const pending = list.filter((s) => s.status === 'connecting');
      if (!pending.length) return;
      const timers = pending.map((s) => setTimeout(() => {
        setList((ls) => ls.map((x) => x.id === s.id && x.status === 'connecting' ? { ...x, status: 'live', uptimeSec: 0, bitrate: x.bitrate || QBITRATE[x.quality] } : x));
      }, 2600 + Math.random() * 1500));
      return () => timers.forEach(clearTimeout);
    }, [list.map((s) => s.id + s.status).join(',')]);

    const patch = (id, p) => setList((ls) => ls.map((s) => s.id === id ? { ...s, ...p } : s));
    const toggle = (s) => {
      if (s.status === 'live') { patch(s.id, { status: 'offline', uptimeSec: 0, bitrate: 0 }); notify && notify({ title: 'Stream stopped', desc: `“${s.name}” is offline`, tone: 'offline', icon: 'Power' }); }
      else { patch(s.id, { status: 'connecting', uptimeSec: 0 }); notify && notify({ title: 'Connecting…', desc: `Starting “${s.name}”`, tone: 'info', icon: 'Refresh' }); }
    };
    const duplicate = (s) => { const copy = { ...s, id: 'ls' + Date.now(), name: s.name + ' (copy)', status: 'offline', screenIds: [], uptimeSec: 0, bitrate: 0 }; setList((ls) => [...ls, copy]); notify && notify({ title: 'Stream duplicated', desc: `“${copy.name}” created`, tone: 'accent', icon: 'Copy' }); };
    const remove = (s) => { setList((ls) => ls.filter((x) => x.id !== s.id)); notify && notify({ title: 'Stream deleted', desc: `“${s.name}” removed`, tone: 'offline', icon: 'Trash' }); };

    const selected = list.find((s) => s.id === selId);

    if (!seeded && !list.length) return (
      <div>
        <PageHeader title="Live Streams" sub="Broadcast live feeds to any screen" actions={<Btn variant="primary" size="md" icon={<Icon.Plus s={17} />} onClick={() => setModal(true)}>New stream</Btn>} />
        <Card animate style={{ padding: '64px 24px' }}>
          <Empty icon={<Icon.Stream s={26} />} title="No live streams" desc="Connect an RTMP, HLS, SRT or WebRTC source to broadcast live to your network in real time."
            action={<div style={{ display: 'flex', gap: 10 }}>
              <Btn variant="primary" icon={<Icon.Plus s={17} />} onClick={() => setModal(true)}>Add a stream source</Btn>
              <Btn variant="outline" icon={<Icon.Sparkle s={16} />} onClick={onLoadSample}>Load sample data</Btn>
            </div>} />
        </Card>
        {modal && <NewStreamModal onClose={() => setModal(false)} onCreate={(s) => { setList((ls) => [s, ...ls]); setModal(false); setSelId(s.id); notify && notify({ title: 'Stream created', desc: `“${s.name}” is connecting`, tone: 'accent', icon: 'Stream' }); }} />}
      </div>
    );

    if (selected) return (
      <React.Fragment>
        <StreamDetail stream={selected} screens={screens} screenById={screenById} onBack={() => setSelId(null)} patch={(p) => patch(selected.id, p)} notify={notify} onDelete={() => { remove(selected); setSelId(null); }} />
      </React.Fragment>
    );

    const liveCount = list.filter((s) => s.status === 'live').length;
    return (
      <div>
        <PageHeader title="Live Streams"
          sub={list.length ? `${liveCount} live · ${list.length} stream${list.length !== 1 ? 's' : ''}` : 'Broadcast live feeds to any screen'}
          actions={<Btn variant="primary" size="md" icon={<Icon.Plus s={17} />} onClick={() => setModal(true)}>New stream</Btn>} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--gap)' }}>
          {list.map((s) => (
            <StreamCard key={s.id} stream={s} screenById={screenById}
              onOpen={() => setSelId(s.id)} onToggle={() => toggle(s)} onDuplicate={() => duplicate(s)} onDelete={() => remove(s)} />
          ))}
        </div>
        {modal && <NewStreamModal onClose={() => setModal(false)} onCreate={(s) => { setList((ls) => [s, ...ls]); setModal(false); setSelId(s.id); notify && notify({ title: 'Stream created', desc: `“${s.name}” is connecting`, tone: 'accent', icon: 'Stream' }); }} />}
      </div>
    );
  }

  Object.assign(window, { StreamsPage });
})();
