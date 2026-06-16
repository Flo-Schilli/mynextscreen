// modals.jsx — Add Screen pairing modal + toast host
(function () {
  const { useState, useEffect } = React;
  const Icon = window.Icon;
  const { Btn, Thumb } = window;
  const grad = window.MOCK.grad;

  function Overlay({ children, onClose }) {
    useEffect(() => {
      const k = (e) => e.key === 'Escape' && onClose();
      window.addEventListener('keydown', k);
      return () => window.removeEventListener('keydown', k);
    }, []);
    return (
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center',
        padding: 24, background: 'rgba(4,6,11,.55)', backdropFilter: 'blur(6px)', animation: 'fadeIn .2s ease both' }}>
        <div onClick={(e) => e.stopPropagation()} style={{ animation: 'fadeUp .3s cubic-bezier(.22,.61,.36,1) both', width: '100%', maxWidth: 520 }}>
          {children}
        </div>
      </div>
    );
  }

  const COLORS = ['#6d6cf6','#0ea5e9','#f59e0b','#ec4899','#14b8a6','#10b981','#8b5cf6'];

  const RES_PRESETS = {
    landscape: [
      { v: '1280×720', label: '1280 × 720 · HD', tag: 'HD' },
      { v: '1920×1080', label: '1920 × 1080 · Full HD', tag: 'FHD' },
      { v: '2560×1440', label: '2560 × 1440 · QHD', tag: 'QHD' },
      { v: '3840×2160', label: '3840 × 2160 · 4K UHD', tag: '4K' },
    ],
    portrait: [
      { v: '720×1280', label: '720 × 1280 · HD', tag: 'HD' },
      { v: '1080×1920', label: '1080 × 1920 · Full HD', tag: 'FHD' },
      { v: '1440×2560', label: '1440 × 2560 · QHD', tag: 'QHD' },
      { v: '2160×3840', label: '2160 × 3840 · 4K UHD', tag: '4K' },
    ],
  };

  function AddScreenModal({ onClose, onAdd }) {
    const [phase, setPhase] = useState('form'); // form | pairing | done
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [loc, setLoc] = useState('');
    const [orient, setOrient] = useState('landscape');
    const [resPreset, setResPreset] = useState('1920×1080');
    const [resCustom, setResCustom] = useState('');
    const resolution = resPreset === 'custom' ? resCustom.trim() : resPreset;
    const resTag = (RES_PRESETS[orient].find((p) => p.v === resPreset) || {}).tag || 'Custom';

    // suggested pairing code shown to user
    const [shown] = useState(() => String(Math.floor(100000 + Math.random() * 899999)));

    const valid = code.replace(/\s/g, '').length === 6 && name.trim().length > 1
      && (resPreset !== 'custom' || /\d+\s*[×x]\s*\d+/.test(resCustom));

    const pair = () => {
      setPhase('pairing');
      setTimeout(() => setPhase('done'), 1500);
      setTimeout(() => {
        onAdd({
          id: 's' + Date.now(), name: name.trim(), loc: (loc.trim() || 'Unassigned') + ' · New',
          status: 'online', orient, res: resolution.replace(/\s*x\s*/i, '×'),
          res2: resTag, uptime: '0d', playing: 'Default Loop', lastSeen: 'now',
          thumb: grad(COLORS[Math.floor(Math.random()*COLORS.length)], COLORS[Math.floor(Math.random()*COLORS.length)]),
        });
        onClose();
      }, 2400);
    };

    return (
      <Overlay onClose={onClose}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-xl)',
          boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
          {/* header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 11,
              background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', color: '#fff' }}><Icon.Screens s={21} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>Add a screen</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Pair a display with a one-time code</div>
            </div>
            <button onClick={onClose} style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 8,
              border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 18 }}>✕</button>
          </div>

          {phase === 'form' && (
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 14, borderRadius: 14,
                background: 'var(--accent-soft)', border: '1px solid var(--border)' }}>
                <Icon.Cast s={22} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.45 }}>
                  Open <b style={{ color: 'var(--text)' }}>screen.mynextscreen.app</b> on your display. It shows a 6-digit code like
                  <span className="mono" style={{ color: 'var(--accent)', fontWeight: 700 }}> {shown}</span>.
                </div>
              </div>

              <Field label="Pairing code">
                <input value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="000000" className="mono"
                  style={{ ...inp, letterSpacing: '.4em', fontSize: 20, fontWeight: 700, textAlign: 'center' }} />
              </Field>

              <Field label="Screen name">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lobby — Main Wall" style={inp} />
              </Field>

              <Field label="Location">
                <input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="HQ · Ground Floor" style={inp} />
              </Field>

              <Field label="Orientation">
                <div style={{ display: 'flex', gap: 10 }}>
                  {[['landscape','Landscape','1920×1080'],['portrait','Portrait','1080×1920']].map(([v, l, defRes]) => (
                    <button key={v} onClick={() => { setOrient(v); setResPreset(defRes); }} style={{ flex: 1, padding: '10px', borderRadius: 10, fontWeight: 600, fontSize: 13.5,
                      border: `1px solid ${orient===v?'var(--accent)':'var(--border-strong)'}`, background: orient===v?'var(--accent-soft)':'transparent',
                      color: orient===v?'var(--accent)':'var(--text-muted)' }}>{l}</button>
                  ))}
                </div>
              </Field>

              <Field label="Display resolution">
                <select value={resPreset} onChange={(e) => setResPreset(e.target.value)} style={inp}>
                  {RES_PRESETS[orient].map((p) => <option key={p.v} value={p.v}>{p.label}</option>)}
                  <option value="custom">Custom resolution…</option>
                </select>
                {resPreset === 'custom' && (
                  <input value={resCustom} onChange={(e) => setResCustom(e.target.value)} placeholder="e.g. 2560 × 1440"
                    className="mono" autoFocus style={{ ...inp, marginTop: 10 }} />
                )}
              </Field>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <Btn variant="outline" onClick={onClose} full>Cancel</Btn>
                <Btn variant={valid ? 'primary' : 'ghost'} onClick={valid ? pair : undefined} full
                  icon={<Icon.Cast s={17} />} style={!valid ? { opacity: .5, cursor: 'not-allowed' } : {}}>Pair screen</Btn>
              </div>
            </div>
          )}

          {phase === 'pairing' && (
            <div style={{ padding: '52px 24px', display: 'grid', placeItems: 'center', gap: 18, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 99, border: '4px solid var(--track)', borderTopColor: 'var(--accent)', animation: 'spin .8s linear infinite' }} />
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Pairing “{name}”…</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Handshaking with the display</div>
              </div>
            </div>
          )}

          {phase === 'done' && (
            <div style={{ padding: '52px 24px', display: 'grid', placeItems: 'center', gap: 16, textAlign: 'center' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 60, height: 60, borderRadius: 99,
                background: 'var(--online-dim)', color: 'var(--online)', animation: 'ringPulse 1.2s ease' }}><Icon.Check s={30} sw={2.4} /></span>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700 }}>Screen paired!</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>“{name}” is now online</div>
              </div>
            </div>
          )}
        </div>
      </Overlay>
    );
  }

  const inp = { width: '100%', padding: '11px 13px', borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
    background: 'var(--surface-2)', border: '1px solid var(--border-strong)', color: 'var(--text)', outline: 'none' };

  function Field({ label, children }) {
    return (
      <label style={{ display: 'block' }}>
        <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 7 }}>{label}</span>
        {children}
      </label>
    );
  }

  // ---- Toast host ----
  function ToastHost({ toasts }) {
    return (
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 200, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {toasts.map((t) => {
          const c = t.tone === 'online' ? 'var(--online)' : t.tone === 'warn' ? 'var(--warn)' : 'var(--accent)';
          const IconC = Icon[t.icon] || Icon.CheckCircle;
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', minWidth: 280, maxWidth: 360,
              background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 13, boxShadow: 'var(--shadow-lg)',
              animation: 'fadeUp .3s cubic-bezier(.22,.61,.36,1) both' }}>
              <span style={{ color: c, flexShrink: 0 }}><IconC s={20} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t.title}</div>
                {t.desc && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{t.desc}</div>}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  Object.assign(window, { AddScreenModal, ToastHost, Overlay, GroupField: Field, groupInp: inp });
})();
