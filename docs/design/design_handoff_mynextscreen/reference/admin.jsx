// admin.jsx — Instance Admin area (instance-wide super-admin view).
// A distinct "elevated" mode: amber chrome signals instance-level scope,
// while cards/charts reuse the normal design tokens.
(function () {
  const { useState, useEffect, useRef, useMemo } = React;
  const Icon = window.Icon;
  const { Card, CardHead, Badge, Btn, Bar, Ring, Count, UserAvatar, Avatar, Empty } = window;
  const A = window.ADMIN_MOCK;

  // elevated / instance accent (amber) — used only for mode chrome
  const AMB = '#f5a623';
  const AMB_GRAD = 'linear-gradient(135deg,#f5a623,#f97316)';
  const AMB_SOFT = 'rgba(245,166,35,0.16)';

  // ---------- formatting ----------
  const GB = A.GB;
  const fmtMB = (mb) => mb >= GB ? `${(mb / GB).toFixed(mb % GB === 0 ? 1 : 2)} GB` : `${mb.toFixed(1)} MB`;
  const pct = (u, m) => (u / m) * 100;

  function rel(ts) {
    const s = Math.round((A.NOW - ts) / 1000);
    if (s < 60) return 'just now';
    const m = Math.round(s / 60); if (m < 60) return m + ' min ago';
    const h = Math.floor(m / 60); if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
    const d = Math.round(h / 24); return d + (d === 1 ? ' day ago' : ' days ago');
  }
  const timeStr = (ts) => ts.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const toneVar = (t) => t === 'accent' ? 'var(--accent)' : t === 'neutral' ? 'var(--text-muted)' : `var(--${t === 'warning' ? 'warn' : t})`;
  const toneDim = (t) => t === 'accent' ? 'var(--accent-soft)' : t === 'neutral' ? 'var(--surface-3)' : `var(--${t === 'warning' ? 'warn' : t}-dim)`;

  const ROLE_LABEL = { owner: 'Owner', admin: 'Org Admin', editor: 'Editor', viewer: 'Viewer' };

  // instance totals derived from orgs
  const totals = (() => {
    const o = A.ORGS;
    return {
      orgs: o.length,
      users: A.USERS.length,
      verified: A.USERS.filter((u) => u.verified).length,
      pending: A.USERS.filter((u) => !u.verified).length,
      screens: o.reduce((s, x) => s + x.screens, 0),
      screensOnline: o.reduce((s, x) => s + x.screensOnline, 0),
      origUsed: o.reduce((s, x) => s + x.origUsed, 0),
      origMax: o.reduce((s, x) => s + x.origMax, 0),
      transUsed: o.reduce((s, x) => s + x.transUsed, 0),
      transMax: o.reduce((s, x) => s + x.transMax, 0),
    };
  })();

  // ============================================================
  //  Sidebar (single elevated nav item, matches the live view)
  // ============================================================
  function AdminSidebar({ collapsed, setCollapsed, onExit, onLogout }) {
    return (
      <aside style={{ width: collapsed ? 78 : 252, flexShrink: 0, background: 'var(--rail)',
        borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
        transition: 'width .22s cubic-bezier(.22,.61,.36,1)', height: '100%' }}>
        {/* logo + collapse */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          padding: collapsed ? '20px 0' : '20px 18px', borderBottom: '1px solid var(--border)', minHeight: 73 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0, width: collapsed ? '100%' : 'auto', justifyContent: collapsed ? 'center' : 'flex-start' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
              display: 'grid', placeItems: 'center', boxShadow: '0 8px 18px -8px var(--accent-ring)' }}>
              <Icon.Layers s={19} style={{ color: '#fff' }} />
            </div>
            {!collapsed && (
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.02em', whiteSpace: 'nowrap' }}>
                <span style={{ color: 'var(--text)' }}>my</span>
                <span style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>NextScreen</span>
              </div>
            )}
          </div>
          {!collapsed && (
            <button onClick={() => setCollapsed(true)} title="Collapse"
              style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)' }}>
              <Icon.ChevronLeft s={17} />
            </button>
          )}
        </div>

        {collapsed && (
          <button onClick={() => setCollapsed(false)} title="Expand"
            style={{ margin: '12px auto 0', display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)' }}>
            <Icon.Chevron s={17} />
          </button>
        )}

        <nav style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!collapsed && <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-faint)', padding: '4px 6px 2px' }}>System</div>}
          {/* elevated active item */}
          <div className="nav-item" title={collapsed ? 'Instance Admin' : undefined}
            style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, width: '100%',
              padding: collapsed ? '11px' : '11px 13px', justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: 11, background: AMB_SOFT, color: AMB, fontWeight: 700, fontSize: 14.5,
              border: `1px solid ${AMB}33` }}>
            <span style={{ position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)', width: 4, height: 22, borderRadius: 99, background: AMB_GRAD }} />
            <Icon.Settings s={20} sw={2} />
            {!collapsed && <span style={{ flex: 1, whiteSpace: 'nowrap' }}>Instance Admin</span>}
          </div>
          {/* back to workspace */}
          <BackNav collapsed={collapsed} onExit={onExit} />
        </nav>

        {/* footer: version + logout */}
        <div style={{ padding: '14px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px 4px', fontSize: 11.5, color: 'var(--text-faint)' }}>
              <span className="mono">{A.META.version}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--online)' }} />{A.META.channel}
              </span>
            </div>
          )}
          <BackNav.LogoutItem collapsed={collapsed} onLogout={onLogout} />
        </div>
      </aside>
    );
  }

  function BackNav({ collapsed, onExit }) {
    const [h, setH] = useState(false);
    return (
      <button onClick={onExit} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
        title={collapsed ? 'Back to workspace' : undefined} className="nav-item"
        style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: collapsed ? '11px' : '11px 13px',
          justifyContent: collapsed ? 'center' : 'flex-start', borderRadius: 11, border: 'none', textAlign: 'left',
          background: h ? 'var(--hover)' : 'transparent', color: h ? 'var(--text)' : 'var(--text-muted)', fontWeight: 500, fontSize: 14.5 }}>
        <Icon.ChevronLeft s={20} sw={1.7} />
        {!collapsed && <span style={{ flex: 1, whiteSpace: 'nowrap' }}>Back to workspace</span>}
      </button>
    );
  }
  BackNav.LogoutItem = function ({ collapsed, onLogout }) {
    const [h, setH] = useState(false);
    return (
      <button onClick={onLogout} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
        title={collapsed ? 'Logout' : undefined} className="nav-item"
        style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: collapsed ? '11px' : '11px 13px',
          justifyContent: collapsed ? 'center' : 'flex-start', borderRadius: 11, border: 'none', textAlign: 'left',
          background: h ? 'var(--hover)' : 'transparent', color: h ? 'var(--text)' : 'var(--text-muted)', fontWeight: 500, fontSize: 14.5 }}>
        <Icon.Logout s={20} sw={1.7} />
        {!collapsed && <span style={{ flex: 1, whiteSpace: 'nowrap' }}>Logout</span>}
      </button>
    );
  };

  // ============================================================
  //  Topbar (elevated identity chip)
  // ============================================================
  function AdminTopbar({ theme, setTheme, user }) {
    return (
      <header style={{ height: 73, flexShrink: 0, borderBottom: '1px solid var(--border)',
        background: 'color-mix(in srgb, var(--bg) 72%, transparent)', backdropFilter: 'blur(14px)',
        position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 16, padding: '0 26px' }}>
        <div style={{ flex: 1, maxWidth: 460, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }}><Icon.Search s={18} /></span>
          <input placeholder="Search organisations, users…"
            style={{ width: '100%', padding: '11px 14px 11px 42px', borderRadius: 11, fontSize: 14,
              background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }} />
          <span className="mono" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            fontSize: 11, color: 'var(--text-faint)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px' }}>⌘K</span>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle theme"
          style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 11, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)' }}>
          {theme === 'dark' ? <Icon.Sun s={19} /> : <Icon.Moon s={19} />}
        </button>
        <button title="Notifications" style={{ position: 'relative', display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 11, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)' }}>
          <Icon.Bell s={19} />
        </button>
        <div style={{ width: 1, height: 30, background: 'var(--border)' }} />
        {/* elevated identity chip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '5px 7px 5px 13px', borderRadius: 12, border: `1px solid ${AMB}33`, background: AMB_SOFT }}>
          <div style={{ textAlign: 'right', lineHeight: 1.25 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{user.name}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: AMB }}>Superuser</div>
          </div>
          <UserAvatar gravatar={user.gravatar} email={user.email} name={user.name} size={36} />
        </div>
      </header>
    );
  }

  // ============================================================
  //  Small shared pieces
  // ============================================================
  function StatTile({ label, value, sub, icon, tone = 'accent', delay = 0, children }) {
    const IconC = Icon[icon];
    return (
      <Card hover style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>{label}</span>
          <span style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 9, background: toneDim(tone), color: toneVar(tone) }}><IconC s={18} /></span>
        </div>
        {children || (
          <div className="mono" style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1 }}>
            {typeof value === 'number' ? <Count to={value} /> : value}
          </div>
        )}
        {sub && <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{sub}</div>}
      </Card>
    );
  }

  function OrgChip({ org }) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 10px 4px 5px', borderRadius: 99, background: 'var(--surface-3)' }}>
        <span style={{ width: 20, height: 20, borderRadius: 6, background: org.grad, display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700, fontSize: 10.5 }}>{org.name.slice(0, 1)}</span>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>{org.name}</span>
      </span>
    );
  }

  // ============================================================
  //  Tab: Dashboard
  // ============================================================
  function StorageLine({ label, used, max, color }) {
    const p = pct(used, max);
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{label}</span>
          <span className="mono" style={{ fontSize: 13, color: 'var(--text-muted)' }}>{fmtMB(used)} / {fmtMB(max)}</span>
        </div>
        <Bar value={p} color={color} glow h={9} />
        <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 6 }}>{p.toFixed(1)}%</div>
      </div>
    );
  }

  // ---------- System load chart (uniformly-scaled SVG, 24h hourly) ----------
  function LoadGraph({ load }) {
    const W = 1000, H = 240, L = 46, R = 14, T = 16, B = 30;
    const n = load.cpu.length;
    const x = (i) => L + (i / (n - 1)) * (W - L - R);
    const y = (v) => T + (1 - v / 100) * (H - T - B);
    const line = (arr) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
    const area = (arr) => `${line(arr)} L${x(n - 1).toFixed(1)} ${y(0).toFixed(1)} L${x(0).toFixed(1)} ${y(0).toFixed(1)} Z`;
    const grid = [0, 25, 50, 75, 100];
    const ticks = [[0, '24h ago'], [Math.round((n - 1) / 4), '18h'], [Math.round((n - 1) / 2), '12h'], [Math.round((n - 1) * 3 / 4), '6h'], [n - 1, 'now']];
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', height: 'auto' }} role="img" aria-label="CPU and memory usage over the last 24 hours">
        <defs>
          <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.34" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* gridlines + y labels */}
        {grid.map((g) => (
          <g key={g}>
            <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="var(--border)" strokeWidth="1" strokeDasharray={g === 0 ? '0' : '4 5'} />
            {(g === 0 || g === 50 || g === 100) && (
              <text x={L - 9} y={y(g)} fill="var(--text-faint)" fontSize="15" textAnchor="end" dominantBaseline="middle" fontFamily="var(--font-mono)">{g}%</text>
            )}
          </g>
        ))}
        {/* transcode windows */}
        {load.transcodeWindows.map(([s, e], i) => (
          <g key={i}>
            <rect x={x(s)} y={T} width={x(e) - x(s)} height={H - T - B} fill="var(--accent-soft)" />
            <line x1={x(s)} x2={x(s)} y1={T} y2={H - B} stroke="var(--accent)" strokeWidth="1" strokeOpacity="0.4" />
          </g>
        ))}
        {/* CPU area + RAM line + CPU line (RAM on top so it stays visible) */}
        <path d={area(load.cpu)} fill="url(#cpuGrad)" />
        <path d={line(load.cpu)} fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        <path d={line(load.ram)} fill="none" stroke="var(--info)" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="6 4" />
        {/* end dots */}
        <circle cx={x(n - 1)} cy={y(load.ramNow)} r="4.5" fill="var(--info)" stroke="var(--surface)" strokeWidth="2.5" />
        <circle cx={x(n - 1)} cy={y(load.cpuNow)} r="4.5" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2.5" />
        {/* x labels */}
        {ticks.map(([i, lbl]) => (
          <text key={lbl} x={Math.min(Math.max(x(i), L + 16), W - R - 12)} y={H - 9} fill="var(--text-faint)" fontSize="15" textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} fontFamily="var(--font-mono)">{lbl}</text>
        ))}
      </svg>
    );
  }

  function LoadReadout({ label, value, sub, color, dash }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 16, height: 4, borderRadius: 99, flexShrink: 0,
          backgroundImage: dash ? `repeating-linear-gradient(90deg, ${color} 0 5px, transparent 5px 8px)` : 'none', backgroundColor: dash ? 'transparent' : color }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', marginBottom: 2 }}>{label}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, whiteSpace: 'nowrap' }}>
            <span className="mono" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, color }}>{value}</span>
            <span className="mono" style={{ fontSize: 12, color: 'var(--text-faint)' }}>{sub}</span>
          </div>
        </div>
      </div>
    );
  }

  function SystemLoadCard() {
    const ld = A.LOAD;
    const ramGB = (ld.ramNow / 100 * ld.ramTotalGB).toFixed(1);
    const ramPeakGB = (ld.ramPeak / 100 * ld.ramTotalGB).toFixed(1);
    return (
      <Card>
        <CardHead icon={<Icon.Power s={18} />} title="System load" sub="CPU & memory · last 24 hours"
          right={<Badge tone="accent" icon={<Icon.Refresh s={12} />}>Transcode peaks shaded</Badge>} />
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 38, flexWrap: 'wrap', marginBottom: 16 }}>
          <LoadReadout label={`CPU · ${ld.cores} cores`} value={`${ld.cpuNow}%`} sub={`peak ${ld.cpuPeak}%`} color="var(--accent)" />
          <LoadReadout label={`Memory · ${ld.ramTotalGB} GB`} value={`${ld.ramNow}%`} sub={`${ramGB} GB · peak ${ramPeakGB} GB`} color="var(--info)" dash />
        </div>
        <LoadGraph load={ld} />
      </Card>
    );
  }

  function DashboardTab() {
    const t = totals;
    const hostPct = pct(A.HOST.usedGB, A.HOST.totalGB);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>
        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--gap)' }} className="adm-kpi">
          <StatTile label="Organisations" icon="Building" tone="accent" value={t.orgs} sub="1 Business · 1 Trial" delay={0} />
          <StatTile label="Users" icon="User" tone="info" sub={null} delay={0.05}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22 }}>
              <div>
                <div className="mono" style={{ fontSize: 34, fontWeight: 700, lineHeight: 1, color: 'var(--online)' }}><Count to={t.verified} /></div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>Verified</div>
              </div>
              <div>
                <div className="mono" style={{ fontSize: 34, fontWeight: 700, lineHeight: 1, color: 'var(--warn)' }}><Count to={t.pending} /></div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>Pending</div>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: 'var(--surface-3)', color: 'var(--text-muted)' }}>{t.users} total</span>
            </div>
          </StatTile>
          <StatTile label="Screens" icon="Screens" tone="online" value={t.screens} sub={`${t.screensOnline} online across instance`} delay={0.1} />
          <StatTile label="Host disk free" icon="Storage" tone="warning" value={`${A.HOST.freeGB} GB`} sub={`of ${A.HOST.totalGB} GB · ${hostPct.toFixed(1)}% used`} delay={0.15} />
        </div>

        {/* storage + host disk */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.55fr) minmax(0,1fr)', gap: 'var(--gap)', alignItems: 'start' }} className="adm-two">
          {/* Storage — allocated vs used */}
          <Card>
            <CardHead icon={<Icon.Storage s={18} />} title="Storage — Allocated vs Used"
              right={<Badge tone="neutral" icon={<Icon.Building s={12} />}>All organisations</Badge>} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              <StorageLine label="Originals" used={t.origUsed} max={t.origMax} color="var(--info)" />
              <StorageLine label="Transcoded" used={t.transUsed} max={t.transMax} color="var(--accent-2)" />
            </div>
            {/* per-org legend */}
            <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {A.ORGS.map((o) => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 7, background: o.grad, display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{o.name.slice(0, 1)}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</div>
                    <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{fmtMB(o.origUsed + o.transUsed)} used · {(o.origMax + o.transMax) / GB} GB</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Host disk */}
          <Card>
            <CardHead icon={<Icon.Storage s={18} />} title="Host Disk"
              right={<Badge tone="neutral" icon={<Icon.Hash s={12} />}>{A.HOST.mount}</Badge>} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
              <Ring value={hostPct} size={104} sw={11} color="var(--online)">
                <div style={{ textAlign: 'center' }}>
                  <div className="mono" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{hostPct.toFixed(0)}<span style={{ fontSize: 13 }}>%</span></div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>used</div>
                </div>
              </Ring>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Used</span>
                  <span className="mono">{A.HOST.usedGB} GB</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Free</span>
                  <span className="mono" style={{ color: 'var(--online)' }}>{A.HOST.freeGB} GB</span>
                </div>
                <Bar value={hostPct} color="var(--online)" glow h={9} />
                <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 8 }}>{A.HOST.freeGB} GB free of {A.HOST.totalGB} GB</div>
              </div>
            </div>
          </Card>
        </div>

        {/* system load — CPU & RAM over last 24h */}
        <SystemLoadCard />

        {/* organisations snapshot + system info */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.55fr) minmax(0,1fr)', gap: 'var(--gap)', alignItems: 'start' }} className="adm-two">
          <Card pad={false}>
            <div style={{ padding: '18px 22px 4px' }}>
              <CardHead icon={<Icon.Building s={18} />} title="Organisations" sub="Usage at a glance" />
            </div>
            {A.ORGS.map((o, i) => {
              const used = o.origUsed + o.transUsed, max = o.origMax + o.transMax;
              return (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 22px', borderTop: '1px solid var(--border)' }}>
                  <span style={{ width: 36, height: 36, borderRadius: 10, background: o.grad, display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700, flexShrink: 0 }}>{o.name.slice(0, 1)}</span>
                  <div style={{ width: 150, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{o.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{o.users} users · {o.screens} screens</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Bar value={pct(used, max)} color="var(--accent)" h={7} />
                    <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 5 }}>{fmtMB(used)} / {max / GB} GB</div>
                  </div>
                </div>
              );
            })}
          </Card>

          <Card>
            <CardHead icon={<Icon.Power s={18} />} title="Instance" sub="Runtime & health" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                ['Health', <Badge tone="online" icon={<span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--online)' }} />}>Healthy</Badge>],
                ['Version', <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{A.META.version} · {A.META.channel}</span>],
                ['Uptime', <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{A.META.uptime}</span>],
                ['Region', <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{A.META.region}</span>],
                ['Last backup', <span style={{ fontSize: 13, fontWeight: 600 }}>{A.META.lastBackup}</span>],
              ].map(([k, v], i) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{k}</span>
                  {v}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ============================================================
  //  Tab: Organisations
  // ============================================================
  const ORG_COLS = '2.1fr 96px 150px minmax(200px,1.4fr) 132px 100px';
  function OrganisationsTab({ notify }) {
    return (
      <Card pad={false} style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 920 }}>
            <div style={{ display: 'grid', gridTemplateColumns: ORG_COLS, gap: 16, padding: '13px 22px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
              {['Organisation', 'Users', 'Screens', 'Storage', 'Created', ''].map((h, i) => (
                <div key={i} style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--text-faint)', textAlign: i === 5 ? 'right' : 'left' }}>{h || 'Actions'}</div>
              ))}
            </div>
            {A.ORGS.map((o, i) => {
              const used = o.origUsed + o.transUsed, max = o.origMax + o.transMax;
              return (
                <div key={o.id} style={{ display: 'grid', gridTemplateColumns: ORG_COLS, gap: 16, alignItems: 'center', padding: '15px 22px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                  {/* org */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <span style={{ width: 38, height: 38, borderRadius: 10, background: o.grad, display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700, flexShrink: 0 }}>{o.name.slice(0, 1)}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {o.name}
                        <Badge tone={o.plan === 'Business' ? 'accent' : 'neutral'}>{o.plan}</Badge>
                      </div>
                      <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 2 }}>{o.owner}</div>
                    </div>
                  </div>
                  {/* users */}
                  <div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{o.users}</div>
                  {/* screens */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--online)', boxShadow: '0 0 0 3px var(--online-dim)' }} />
                    <span className="mono" style={{ fontSize: 13.5 }}>{o.screensOnline}<span style={{ color: 'var(--text-faint)' }}> / {o.screens}</span></span>
                  </div>
                  {/* storage */}
                  <div style={{ minWidth: 0 }}>
                    <Bar value={pct(used, max)} color="var(--accent)" h={7} />
                    <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 5 }}>{fmtMB(used)} / {max / GB} GB · {pct(used, max).toFixed(1)}%</div>
                  </div>
                  {/* created */}
                  <div className="mono" style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{o.created}</div>
                  {/* actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Btn variant="outline" size="sm" icon={<Icon.Eye s={14} />}
                      onClick={() => notify && notify({ title: `Opening ${o.name}`, desc: 'Switching to organisation view', tone: 'accent', icon: 'Building' })}>Manage</Btn>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    );
  }

  // ============================================================
  //  Tab: Users
  // ============================================================
  const USER_COLS = '2.4fr 1.3fr 132px 138px 118px 92px';
  function UsersTab({ notify }) {
    const orgById = useMemo(() => Object.fromEntries(A.ORGS.map((o) => [o.id, o])), []);
    return (
      <div>
        {/* summary strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 26, flexWrap: 'wrap', marginBottom: 'var(--gap)' }}>
          {[['Total users', totals.users, 'User', 'accent'], ['Verified', totals.verified, 'CheckCircle', 'online'], ['Pending', totals.pending, 'Mail', 'warning'], ['Instance admins', A.USERS.filter((u) => u.instanceAdmin).length, 'Settings', 'info']].map(([l, v, ic, tone]) => {
            const IconC = Icon[ic];
            return (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 11, background: toneDim(tone), color: toneVar(tone) }}><IconC s={18} /></span>
                <div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}>{v}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l}</div>
                </div>
              </div>
            );
          })}
        </div>

        <Card pad={false} style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 900 }}>
              <div style={{ display: 'grid', gridTemplateColumns: USER_COLS, gap: 16, padding: '13px 22px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                {['User', 'Organisation', 'Role', 'Status', 'Last active', ''].map((h, i) => (
                  <div key={i} style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--text-faint)', textAlign: i === 5 ? 'right' : 'left' }}>{h || 'Actions'}</div>
                ))}
              </div>
              {A.USERS.map((u, i) => {
                const org = orgById[u.orgId];
                return (
                  <div key={u.id} style={{ display: 'grid', gridTemplateColumns: USER_COLS, gap: 16, alignItems: 'center', padding: '14px 22px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                    {/* user */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <Avatar name={u.name ? u.name.split(' ').map((w) => w[0]).slice(0, 2).join('') : '··'} grad={u.grad} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                          <span style={{ whiteSpace: 'nowrap', flexShrink: 0, color: u.name ? 'var(--text)' : 'var(--text-faint)', fontStyle: u.name ? 'normal' : 'italic' }}>{u.name || 'Invite pending'}</span>
                          {u.instanceAdmin && <span title="Instance admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0, fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: AMB_SOFT, color: AMB }}><Icon.Settings s={11} sw={2.2} />Superuser</span>}
                        </div>
                        <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                      </div>
                    </div>
                    {/* org */}
                    <div><OrgChip org={org} /></div>
                    {/* role */}
                    <div><Badge tone={u.role === 'admin' ? 'accent' : 'neutral'} icon={u.role === 'admin' ? <Icon.Lock s={12} /> : null}>{ROLE_LABEL[u.role]}</Badge></div>
                    {/* status */}
                    <div>{u.verified
                      ? <Badge tone="online" icon={<Icon.Check s={12} />}>Verified</Badge>
                      : <Badge tone="warning" icon={<Icon.Mail s={12} />}>Pending</Badge>}</div>
                    {/* last active */}
                    <div style={{ fontSize: 13, color: u.lastActive === '—' ? 'var(--text-faint)' : 'var(--text-muted)' }}>{u.lastActive}</div>
                    {/* actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      {u.verified
                        ? <Btn variant="ghost" size="sm" icon={<Icon.Dots s={16} />} title="Manage user"
                            onClick={() => notify && notify({ title: 'User actions', desc: u.name || u.email, tone: 'accent', icon: 'User' })} />
                        : <Btn variant="soft" size="sm" icon={<Icon.Mail s={14} />}
                            onClick={() => notify && notify({ title: 'Invite resent', desc: u.email, tone: 'accent', icon: 'Mail' })}>Resend</Btn>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // ============================================================
  //  Tab: Audit Log (instance-scoped)
  // ============================================================
  const AUD_COLS = '150px 190px 220px 150px minmax(220px,1.4fr)';
  function AuditTab() {
    return (
      <Card pad={false} style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 960 }}>
            <div style={{ display: 'grid', gridTemplateColumns: AUD_COLS, gap: 16, padding: '13px 22px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
              {['Timestamp', 'Actor', 'Action', 'Organisation', 'Detail'].map((h, i) => (
                <div key={i} style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>{h}</div>
              ))}
            </div>
            {A.AUDIT.map((e, i) => {
              const IconC = Icon[e.icon] || Icon.Dots;
              const isSys = e.actor === 'System';
              return (
                <div key={e.id} style={{ display: 'grid', gridTemplateColumns: AUD_COLS, gap: 16, alignItems: 'center', padding: '13px 22px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                  {/* time */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{timeStr(e.t)}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{rel(e.t)}</span>
                  </div>
                  {/* actor */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    {isSys
                      ? <span style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: 8, background: 'var(--surface-3)', color: 'var(--text-muted)', flexShrink: 0 }}><Icon.Settings s={15} /></span>
                      : <Avatar name={e.actor.split(' ').map((w) => w[0]).slice(0, 2).join('')} grad={AMB_GRAD} size={28} />}
                    <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.actor}</span>
                  </div>
                  {/* action */}
                  <div><Badge tone={e.tone} icon={<IconC s={12} />}>{e.action}</Badge></div>
                  {/* org */}
                  <div>{e.org === '—'
                    ? <span style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Instance</span>
                    : <span style={{ fontSize: 13, fontWeight: 600 }}>{e.org}</span>}</div>
                  {/* detail */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.resource}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    );
  }

  // ============================================================
  //  Shell
  // ============================================================
  const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: 'Dashboard' },
    { id: 'orgs', label: 'Organisations', icon: 'Building' },
    { id: 'users', label: 'Users', icon: 'User' },
    { id: 'audit', label: 'Audit Log', icon: 'Audit' },
  ];

  function InstanceAdmin({ user, theme, setTheme, onExit, onLogout, notify }) {
    const [tab, setTab] = useState('dashboard');
    const [collapsed, setCollapsed] = useState(false);

    const ACTIONS = {
      orgs: <Btn variant="primary" size="md" icon={<Icon.Plus s={17} />} onClick={() => notify && notify({ title: 'New organisation', desc: 'Provision a fresh tenant', tone: 'accent', icon: 'Building' })}>New organisation</Btn>,
      users: <Btn variant="primary" size="md" icon={<Icon.Mail s={16} />} onClick={() => notify && notify({ title: 'Invite user', desc: 'Add a user to any organisation', tone: 'accent', icon: 'Mail' })}>Invite user</Btn>,
      audit: <Btn variant="outline" size="md" icon={<Icon.Download s={16} />} onClick={() => notify && notify({ title: 'Export started', desc: `${A.AUDIT.length} events queued as CSV`, tone: 'accent', icon: 'Download' })}>Export CSV</Btn>,
    };

    return (
      <div className="app-shell" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <AdminSidebar collapsed={collapsed} setCollapsed={setCollapsed} onExit={onExit} onLogout={onLogout} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <AdminTopbar theme={theme} setTheme={setTheme} user={user} />
          <main style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 48px' }}>
            <div style={{ maxWidth: 1320, margin: '0 auto' }}>
              {/* header */}
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
                  <button onClick={onExit} title="Back to workspace"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 13px', borderRadius: 10, fontSize: 13.5, fontWeight: 600,
                      border: '1px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text-muted)' }}>
                    <Icon.ChevronLeft s={16} /> Back
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13, minWidth: 0 }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 12, background: AMB_GRAD, color: '#fff', flexShrink: 0, boxShadow: `0 8px 20px -10px ${AMB}` }}><Icon.Settings s={23} sw={2} /></span>
                    <div style={{ minWidth: 0 }}>
                      <h1 style={{ margin: 0, fontSize: 27, fontWeight: 800, letterSpacing: '-.025em' }}>Instance Admin</h1>
                      <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 3 }}>Manage every organisation, user and resource on this instance</div>
                    </div>
                  </div>
                </div>
                {ACTIONS[tab]}
              </div>

              {/* tab bar */}
              <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 'var(--gap)', overflowX: 'auto' }}>
                {TABS.map((tb) => {
                  const active = tab === tb.id;
                  const IconC = Icon[tb.icon];
                  return (
                    <button key={tb.id} onClick={() => setTab(tb.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', marginBottom: -1, fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap',
                        background: 'transparent', border: 'none', borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                        color: active ? 'var(--text)' : 'var(--text-muted)', cursor: 'pointer', transition: 'color .15s' }}
                      onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = 'var(--text)'; }}
                      onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = 'var(--text-muted)'; }}>
                      <IconC s={16} />{tb.label}
                    </button>
                  );
                })}
              </div>

              {/* tab content */}
              <div key={tab}>
                {tab === 'dashboard' && <DashboardTab />}
                {tab === 'orgs' && <OrganisationsTab notify={notify} />}
                {tab === 'users' && <UsersTab notify={notify} />}
                {tab === 'audit' && <AuditTab />}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  Object.assign(window, { InstanceAdmin });
})();
