// components.jsx — shared UI primitives for myNextScreen
(function () {
  const { useState, useRef, useEffect } = React;
  const Icon = window.Icon;

  const STATUS = {
    online:  { c: 'var(--online)',  dim: 'var(--online-dim)',  label: 'Online' },
    warning: { c: 'var(--warn)',    dim: 'var(--warn-dim)',    label: 'Warning' },
    offline: { c: 'var(--offline)', dim: 'var(--offline-dim)', label: 'Offline' },
    info:    { c: 'var(--info)',    dim: 'var(--info-dim)',    label: 'Info' },
  };

  function StatusDot({ status = 'online', pulse, size = 8 }) {
    const s = STATUS[status] || STATUS.online;
    return (
      <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size }}>
        <span style={{ width: size, height: size, borderRadius: 99, background: s.c,
          boxShadow: `0 0 0 3px ${s.dim}`, animation: pulse && status !== 'offline' ? 'pulseDot 1.8s ease-in-out infinite' : 'none' }} />
      </span>
    );
  }

  function Badge({ children, tone = 'neutral', soft = true, icon }) {
    const map = {
      neutral: { c: 'var(--text-muted)', bg: 'var(--surface-3)' },
      accent:  { c: 'var(--accent)', bg: 'var(--accent-soft)' },
      online:  { c: 'var(--online)', bg: 'var(--online-dim)' },
      warning: { c: 'var(--warn)', bg: 'var(--warn-dim)' },
      offline: { c: 'var(--offline)', bg: 'var(--offline-dim)' },
      info:    { c: 'var(--info)', bg: 'var(--info-dim)' },
    };
    const m = map[tone] || map.neutral;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
        borderRadius: 99, fontSize: 12, fontWeight: 600, letterSpacing: '.01em',
        color: m.c, background: soft ? m.bg : 'transparent', whiteSpace: 'nowrap' }}>
        {icon}{children}
      </span>
    );
  }

  function Btn({ children, variant = 'primary', size = 'md', icon, iconRight, onClick, style, full, title }) {
    const sizes = {
      sm: { pad: '7px 12px', fs: 13, gap: 7 },
      md: { pad: '10px 16px', fs: 14, gap: 8 },
      lg: { pad: '13px 22px', fs: 15, gap: 9 },
    }[size];
    const variants = {
      primary: { background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', color: '#fff', border: '1px solid transparent', boxShadow: '0 8px 20px -10px var(--accent-ring)' },
      soft:    { background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid transparent' },
      outline: { background: 'transparent', color: 'var(--text)', border: '1px solid var(--border-strong)' },
      ghost:   { background: 'transparent', color: 'var(--text-muted)', border: '1px solid transparent' },
      danger:  { background: 'var(--offline-dim)', color: 'var(--offline)', border: '1px solid transparent' },
    }[variant];
    const [hover, setHover] = useState(false);
    return (
      <button onClick={onClick} title={title} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: sizes.gap,
          padding: sizes.pad, fontSize: sizes.fs, fontWeight: 600, borderRadius: 10, lineHeight: 1,
          width: full ? '100%' : 'auto', whiteSpace: 'nowrap', transform: hover ? 'translateY(-1px)' : 'none',
          filter: hover ? 'brightness(1.06)' : 'none', ...variants, ...style }}>
        {icon}{children}{iconRight}
      </button>
    );
  }

  function Card({ children, style, pad = true, hover, onClick, className = '', animate, delay = 0 }) {
    const [h, setH] = useState(false);
    return (
      <div onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
        className={`card ${className}`}
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)',
          padding: pad ? 'var(--card-pad)' : 0, boxShadow: hover && h ? 'var(--shadow-lg)' : 'var(--shadow)',
          borderColor: hover && h ? 'var(--border-strong)' : 'var(--border)',
          transform: hover && h ? 'translateY(-2px)' : 'none', cursor: onClick ? 'pointer' : 'default',
          animation: animate ? `fadeUp .5s cubic-bezier(.22,.61,.36,1) ${delay}s both` : 'none',
          ...style }}>
        {children}
      </div>
    );
  }

  function CardHead({ title, sub, right, icon }) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
          {icon && <span style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 9,
            background: 'var(--accent-soft)', color: 'var(--accent)', flexShrink: 0 }}>{icon}</span>}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.01em' }}>{title}</div>
            {sub && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
          </div>
        </div>
        {right}
      </div>
    );
  }

  function Bar({ value = 0, color = 'var(--accent)', track = 'var(--track)', h = 8, glow }) {
    return (
      <div style={{ background: track, borderRadius: 99, height: h, overflow: 'hidden', width: '100%' }}>
        <div style={{ width: `${Math.min(100, value)}%`, height: '100%', borderRadius: 99,
          background: color, boxShadow: glow ? `0 0 12px -2px ${color}` : 'none', transition: 'width .8s cubic-bezier(.22,.61,.36,1)' }} />
      </div>
    );
  }

  function Ring({ value = 0, size = 64, sw = 7, color = 'var(--accent)', track = 'var(--track)', children }) {
    const r = (size - sw) / 2;
    const c = 2 * Math.PI * r;
    return (
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={sw} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c - (c * Math.min(100, value)) / 100}
            style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.22,.61,.36,1)' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>{children}</div>
      </div>
    );
  }

  // gradient content thumbnail
  function Thumb({ bg, orient = 'landscape', type, h = 'auto', radius = 10, badge, dim }) {
    const ar = orient === 'portrait' ? '9 / 16' : '16 / 9';
    return (
      <div style={{ position: 'relative', width: '100%', aspectRatio: h === 'auto' ? ar : undefined, height: h === 'auto' ? undefined : h,
        background: bg, borderRadius: radius, overflow: 'hidden', display: 'grid', placeItems: 'center',
        filter: dim ? 'grayscale(.7) brightness(.5)' : 'none' }}>
        {/* subtle screen sheen */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,.14), transparent 40%, rgba(0,0,0,.18))' }} />
        {type === 'video' && <span style={{ position: 'relative', display: 'grid', placeItems: 'center', width: 38, height: 38,
          borderRadius: 99, background: 'rgba(0,0,0,.32)', backdropFilter: 'blur(4px)', color: '#fff', paddingLeft: 3 }}><Icon.Play s={16} /></span>}
        {badge && <div style={{ position: 'absolute', top: 8, left: 8 }}>{badge}</div>}
      </div>
    );
  }

  function Avatar({ name = 'EO', grad, size = 34 }) {
    return (
      <div style={{ width: size, height: size, borderRadius: 10, display: 'grid', placeItems: 'center',
        background: grad || 'linear-gradient(135deg, var(--accent), var(--accent-2))', color: '#fff',
        fontWeight: 700, fontSize: size * 0.36, letterSpacing: '.02em', flexShrink: 0 }}>{name}</div>
    );
  }

  // deterministic hash → stable identicon (Gravatar-style placeholder)
  function hashStr(str = '') {
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
    return Math.abs(h);
  }

  function Identicon({ seed = '', size = 38, radius = 10 }) {
    const h = hashStr(seed || 'anon');
    const hue = h % 360;
    const fg = `hsl(${hue} 64% 60%)`;
    const bg = `hsl(${hue} 32% 15%)`;
    const cells = 5;
    const cs = size / cells;
    const rects = [];
    for (let col = 0; col < 3; col++) {
      for (let row = 0; row < cells; row++) {
        const on = ((h >> (col * cells + row)) & 1) === 1;
        if (!on) continue;
        const targets = col === 2 ? [2] : [col, cells - 1 - col];
        targets.forEach((c) => rects.push(
          <rect key={`${c}-${row}`} x={c * cs} y={row * cs} width={cs + 0.5} height={cs + 0.5} fill={fg} />
        ));
      }
    }
    return (
      <div style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', flexShrink: 0, background: bg }}>
        <svg width={size} height={size} style={{ display: 'block' }}>{rects}</svg>
      </div>
    );
  }

  // user avatar: Gravatar identicon when enabled, initials placeholder when off
  function UserAvatar({ gravatar = true, email = '', name = 'U', size = 38, radius = 10 }) {
    if (gravatar) return <Identicon seed={(email || name).toLowerCase().trim()} size={size} radius={radius} />;
    const initials = (name || '').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'U';
    return <Avatar name={initials} size={size} />;
  }

  function Empty({ icon, title, desc, action }) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', textAlign: 'center', padding: '46px 20px', gap: 6 }}>
        <div style={{ display: 'grid', placeItems: 'center', width: 56, height: 56, borderRadius: 16,
          background: 'var(--surface-3)', color: 'var(--text-faint)', marginBottom: 6 }}>{icon}</div>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
        {desc && <div style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 320 }}>{desc}</div>}
        {action && <div style={{ marginTop: 10 }}>{action}</div>}
      </div>
    );
  }

  // animated count-up number
  function Count({ to = 0, dur = 900, suffix = '' }) {
    const [n, setN] = useState(0);
    const ref = useRef();
    useEffect(() => {
      let raf; const start = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - start) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        setN(Math.round(to * e));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, [to]);
    return <span ref={ref}>{n}{suffix}</span>;
  }

  Object.assign(window, { StatusDot, Badge, Btn, Card, CardHead, Bar, Ring, Thumb, Avatar, Identicon, UserAvatar, Empty, Count, STATUS });
})();
