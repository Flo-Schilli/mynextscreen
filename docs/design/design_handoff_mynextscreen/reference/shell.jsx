// shell.jsx — sidebar, topbar, add-screen modal
(function () {
  const { useState, useEffect, useRef } = React;
  const Icon = window.Icon;
  const { Avatar, Btn, StatusDot, Badge, UserAvatar } = window;

  const NAV = [
    { id: 'dashboard', label: 'Dashboard', icon: 'Dashboard' },
    { id: 'screens', label: 'Screens', icon: 'Screens' },
    { id: 'groups', label: 'Screen Groups', icon: 'Groups' },
    { id: 'content', label: 'Content Library', icon: 'Content' },
    { id: 'playlists', label: 'Playlists', icon: 'Playlists' },
    { id: 'schedules', label: 'Schedules', icon: 'Schedules' },
    { id: 'streams', label: 'Live Streams', icon: 'Stream' },
    { id: 'audit', label: 'Audit Log', icon: 'Audit' },
    { id: 'settings', label: 'Settings', icon: 'Settings' },
  ];

  function Logo({ collapsed }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
        <div style={{ position: 'relative', width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', display: 'grid', placeItems: 'center',
          boxShadow: '0 8px 18px -8px var(--accent-ring)' }}>
          <Icon.Layers s={19} style={{ color: '#fff' }} />
        </div>
        {!collapsed && (
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.02em', whiteSpace: 'nowrap' }}>
            <span style={{ color: 'var(--text)' }}>my</span>
            <span style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>NextScreen</span>
          </div>
        )}
      </div>
    );
  }

  function NavItem({ item, active, collapsed, onClick, badge }) {
    const [h, setH] = useState(false);
    const IconC = Icon[item.icon];
    return (
      <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
        title={collapsed ? item.label : undefined}
        className="nav-item"
        style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, width: '100%',
          padding: collapsed ? '11px' : '11px 13px', justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: 11, border: 'none', textAlign: 'left',
          background: active ? 'var(--accent-soft)' : (h ? 'var(--hover)' : 'transparent'),
          color: active ? 'var(--accent)' : (h ? 'var(--text)' : 'var(--text-muted)'),
          fontWeight: active ? 700 : 500, fontSize: 14.5 }}>
        {active && <span style={{ position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)',
          width: 4, height: 22, borderRadius: 99, background: 'linear-gradient(var(--accent), var(--accent-2))' }} />}
        <IconC s={20} sw={active ? 2 : 1.7} />
        {!collapsed && <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{item.label}</span>}
        {!collapsed && badge != null && (
          <span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
            background: active ? 'rgba(255,255,255,.12)' : 'var(--surface-3)', color: active ? 'var(--accent)' : 'var(--text-muted)' }}>{badge}</span>
        )}
      </button>
    );
  }

  function Sidebar({ route, setRoute, collapsed, setCollapsed, counts, onLogout }) {
    return (
      <aside style={{ width: collapsed ? 78 : 252, flexShrink: 0, background: 'var(--rail)',
        borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
        transition: 'width .22s cubic-bezier(.22,.61,.36,1)', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          padding: collapsed ? '20px 0' : '20px 18px', borderBottom: '1px solid var(--border)', minHeight: 73 }}>
          {!collapsed && <Logo collapsed={collapsed} />}
          {collapsed && <div style={{ width: '100%', display: 'grid', placeItems: 'center' }}><Logo collapsed /></div>}
          {!collapsed && (
            <button onClick={() => setCollapsed(true)} title="Collapse"
              style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 8,
                border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)' }}>
              <Icon.ChevronLeft s={17} />
            </button>
          )}
        </div>

        {collapsed && (
          <button onClick={() => setCollapsed(false)} title="Expand"
            style={{ margin: '12px auto 0', display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 8,
              border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)' }}>
            <Icon.Chevron s={17} />
          </button>
        )}

        <nav style={{ flex: 1, overflowY: 'auto', padding: collapsed ? '12px 14px' : '14px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV.map((it) => (
            <NavItem key={it.id} item={it} active={route === it.id} collapsed={collapsed}
              onClick={() => setRoute(it.id)} badge={counts[it.id]} />
          ))}
        </nav>

        <div style={{ padding: collapsed ? '12px 14px' : '14px', borderTop: '1px solid var(--border)' }}>
          <NavItem item={{ id: 'logout', label: 'Logout', icon: 'Logout' }} collapsed={collapsed} onClick={onLogout} />
        </div>
      </aside>
    );
  }

  function UserMenu({ user, org, onProfile, onSwitchOrg, onInstanceAdmin, onLogout }) {
    const [open, setOpen] = useState(false);
    const ref = useRef();
    useEffect(() => {
      const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
      const k = (e) => e.key === 'Escape' && setOpen(false);
      document.addEventListener('mousedown', h);
      document.addEventListener('keydown', k);
      return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); };
    }, []);

    const itemBase = { display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left',
      padding: '10px 12px', borderRadius: 9, border: 'none', background: 'transparent', fontSize: 14, fontWeight: 600,
      color: 'var(--text)', cursor: 'pointer', whiteSpace: 'nowrap' };
    const hov = (e, on) => { e.currentTarget.style.background = on ? 'var(--hover)' : 'transparent'; };

    return (
      <div ref={ref} style={{ position: 'relative' }}>
        <button onClick={() => setOpen((o) => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '5px 7px 5px 11px', borderRadius: 12,
            border: `1px solid ${open ? 'var(--border-strong)' : 'transparent'}`, background: open ? 'var(--surface)' : 'transparent', cursor: 'pointer' }}
          onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = 'var(--hover)'; }}
          onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = 'transparent'; }}>
          <div style={{ textAlign: 'right', lineHeight: 1.25 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{org.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{org.role}</div>
          </div>
          <UserAvatar gravatar={user.gravatar} email={user.email} name={user.name} size={36} />
          <Icon.Chevron s={15} style={{ color: 'var(--text-faint)', transform: open ? 'rotate(90deg)' : 'rotate(90deg) scaleX(-1)', transition: 'transform .18s' }} />
        </button>

        {open && (
          <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 280, zIndex: 60,
            background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 14, boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden', animation: 'fadeUp .14s ease both' }}>
            {/* identity header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px', borderBottom: '1px solid var(--border)' }}>
              <UserAvatar gravatar={user.gravatar} email={user.email} name={user.name} size={42} radius={11} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
              </div>
            </div>
            {/* current org chip */}
            <div style={{ padding: '12px 12px 6px' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--text-faint)', padding: '0 4px 8px' }}>Current organisation</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 10, background: 'var(--accent-soft)' }}>
                <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 8, background: org.grad, color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{org.name.slice(0, 1)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{org.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{org.role}</div>
                </div>
              </div>
            </div>
            {/* actions */}
            <div style={{ padding: '6px 8px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <button style={{ ...itemBase, color: '#f5a623' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(245,166,35,0.14)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                onClick={() => { setOpen(false); onInstanceAdmin && onInstanceAdmin(); }}>
                <Icon.Settings s={18} style={{ color: '#f5a623' }} />Instance Admin
                <span style={{ marginLeft: 'auto', fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'rgba(245,166,35,0.14)', color: '#f5a623' }}>Superuser</span>
              </button>
              <button style={itemBase} onMouseEnter={(e) => hov(e, true)} onMouseLeave={(e) => hov(e, false)}
                onClick={() => { setOpen(false); onSwitchOrg(); }}>
                <Icon.Building s={18} style={{ color: 'var(--text-muted)' }} />Switch organisation
              </button>
              <button style={itemBase} onMouseEnter={(e) => hov(e, true)} onMouseLeave={(e) => hov(e, false)}
                onClick={() => { setOpen(false); onProfile(); }}>
                <Icon.Settings s={18} style={{ color: 'var(--text-muted)' }} />Profile &amp; settings
              </button>
              <div style={{ height: 1, background: 'var(--border)', margin: '5px 4px' }} />
              <button style={{ ...itemBase, color: 'var(--offline)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--offline-dim)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                onClick={() => { setOpen(false); onLogout(); }}>
                <Icon.Logout s={18} />Log out
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function Topbar({ theme, setTheme, alerts, onBell, onSearch, user, org, onProfile, onSwitchOrg, onInstanceAdmin, onLogout }) {
    return (
      <header style={{ height: 73, flexShrink: 0, borderBottom: '1px solid var(--border)',
        background: 'color-mix(in srgb, var(--bg) 72%, transparent)', backdropFilter: 'blur(14px)',
        position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 16, padding: '0 26px' }}>
        <div style={{ flex: 1, maxWidth: 460, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }}><Icon.Search s={18} /></span>
          <input placeholder="Search screens, content, playlists…" onFocus={onSearch}
            style={{ width: '100%', padding: '11px 14px 11px 42px', borderRadius: 11, fontSize: 14,
              background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }} />
          <span className="mono" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            fontSize: 11, color: 'var(--text-faint)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px' }}>⌘K</span>
        </div>

        <div style={{ flex: 1 }} />

        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle theme"
          style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 11,
            border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)' }}>
          {theme === 'dark' ? <Icon.Sun s={19} /> : <Icon.Moon s={19} />}
        </button>

        <button onClick={onBell} title="Notifications" style={{ position: 'relative', display: 'grid', placeItems: 'center',
          width: 40, height: 40, borderRadius: 11, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)' }}>
          <Icon.Bell s={19} />
          {alerts > 0 && <span style={{ position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: 99,
            background: 'var(--offline)', boxShadow: '0 0 0 2px var(--surface)' }} />}
        </button>

        <div style={{ width: 1, height: 30, background: 'var(--border)' }} />

        <UserMenu user={user} org={org} onProfile={onProfile} onSwitchOrg={onSwitchOrg} onInstanceAdmin={onInstanceAdmin} onLogout={onLogout} />
      </header>
    );
  }

  Object.assign(window, { Sidebar, Topbar, NAV });
})();
