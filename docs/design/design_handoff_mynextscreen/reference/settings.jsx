// settings.jsx — full Settings area: User Management, Notification Config, Storage
(function () {
  const { useState, useRef, useEffect } = React;
  const Icon = window.Icon;
  const { Card, CardHead, Badge, Btn, Bar, Avatar, PageHeader, Overlay } = window;

  // ============================================================
  //  shared form primitives (settings-scoped)
  // ============================================================
  function SInput({ value, onChange, placeholder, type = 'text', mono, icon, suffix, disabled }) {
    const [focus, setFocus] = useState(false);
    return (
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center',
        background: disabled ? 'var(--surface-3)' : 'var(--surface-2)', borderRadius: 10,
        border: `1px solid ${focus ? 'var(--accent)' : 'var(--border-strong)'}`,
        boxShadow: focus ? '0 0 0 3px var(--accent-soft)' : 'none', transition: 'border-color .15s, box-shadow .15s', opacity: disabled ? .65 : 1 }}>
        {icon && <span style={{ display: 'grid', placeItems: 'center', paddingLeft: 12, color: focus ? 'var(--accent)' : 'var(--text-faint)' }}>{icon}</span>}
        <input type={type} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} className={mono ? 'mono' : undefined}
          style={{ flex: 1, minWidth: 0, padding: `11px 13px 11px ${icon ? 9 : 13}px`, fontSize: 14,
            background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: mono ? 'var(--font-mono)' : 'inherit' }} />
        {suffix && <span style={{ paddingRight: 13, fontSize: 13, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>{suffix}</span>}
      </div>
    );
  }

  function SField({ label, hint, children, full }) {
    return (
      <label style={{ display: 'block', minWidth: 0, gridColumn: full ? '1 / -1' : undefined }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 7 }}>{label}</div>
        {children}
        {hint && <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 7 }}>{hint}</div>}
      </label>
    );
  }

  function Switch({ value, onChange }) {
    return (
      <button type="button" onClick={() => onChange(!value)} style={{ position: 'relative', width: 42, height: 24, borderRadius: 99, flexShrink: 0,
        transition: 'background .18s', background: value ? 'var(--accent)' : 'var(--surface-3)', border: '1px solid var(--border-strong)', padding: 0 }}>
        <span style={{ position: 'absolute', top: 2, left: value ? 20 : 2, width: 18, height: 18, borderRadius: 99, background: '#fff', transition: 'left .18s', boxShadow: '0 2px 5px rgba(0,0,0,.3)' }} />
      </button>
    );
  }

  function ToggleRow({ label, desc, value, onChange, icon }) {
    const IconC = Icon[icon] || Icon.Bell;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <span style={{ display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: value ? 'var(--accent-soft)' : 'var(--surface-3)', color: value ? 'var(--accent)' : 'var(--text-faint)' }}><IconC s={18} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 1 }}>{desc}</div>
        </div>
        <Switch value={value} onChange={onChange} />
      </div>
    );
  }

  // compact custom select (role picker)
  function RoleSelect({ value, onChange, options, width = 148 }) {
    const [open, setOpen] = useState(false);
    const ref = useRef();
    useEffect(() => {
      const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
      document.addEventListener('mousedown', h);
      return () => document.removeEventListener('mousedown', h);
    }, []);
    const cur = options.find((o) => o.value === value) || options[0];
    return (
      <div ref={ref} style={{ position: 'relative', width }}>
        <button type="button" onClick={() => setOpen((o) => !o)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 11px',
            borderRadius: 9, fontSize: 13.5, fontWeight: 600, textAlign: 'left', color: 'var(--text)',
            border: `1px solid ${open ? 'var(--accent)' : 'var(--border-strong)'}`, background: 'var(--surface-2)',
            boxShadow: open ? '0 0 0 3px var(--accent-soft)' : 'none' }}>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cur.label}</span>
          <Icon.Chevron s={14} style={{ color: 'var(--text-faint)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .18s' }} />
        </button>
        {open && (
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 50,
            background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 10,
            boxShadow: 'var(--shadow-lg)', padding: 6, animation: 'fadeUp .14s ease both' }}>
            {options.map((o) => {
              const sel = o.value === value;
              return (
                <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
                    borderRadius: 8, fontSize: 13.5, fontWeight: sel ? 700 : 500, textAlign: 'left', border: 'none',
                    background: sel ? 'var(--accent-soft)' : 'transparent', color: sel ? 'var(--accent)' : 'var(--text)' }}
                  onMouseEnter={(e) => { if (!sel) e.currentTarget.style.background = 'var(--hover)'; }}
                  onMouseLeave={(e) => { if (!sel) e.currentTarget.style.background = 'transparent'; }}>
                  <span style={{ flex: 1 }}>{o.label}</span>
                  {sel && <Icon.Check s={15} />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const ROLES = [
    { value: 'owner',  label: 'Owner' },
    { value: 'admin',  label: 'Org Admin' },
    { value: 'editor', label: 'Editor' },
    { value: 'viewer', label: 'Viewer' },
  ];
  const ROLE_DESC = {
    owner:  'Full control · billing · cannot be removed',
    admin:  'Manage screens, content, users & settings',
    editor: 'Create and publish content & schedules',
    viewer: 'Read-only access to dashboards',
  };
  const GRADS = [
    'linear-gradient(135deg,#6d6cf6,#a855f7)',
    'linear-gradient(135deg,#0ea5e9,#22d3ee)',
    'linear-gradient(135deg,#f59e0b,#f97316)',
    'linear-gradient(135deg,#10b981,#34d399)',
    'linear-gradient(135deg,#ec4899,#f43f5e)',
  ];

  // ============================================================
  //  Invite user modal
  // ============================================================
  function InviteUserModal({ onClose, onInvite }) {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('editor');
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    return (
      <Overlay onClose={onClose}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', color: '#fff' }}><Icon.Mail s={20} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>Invite a user</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>They'll get an email to join ExampleOrg</div>
            </div>
            <button onClick={onClose} style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 18 }}>✕</button>
          </div>
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <SField label="Email address">
              <SInput value={email} onChange={setEmail} placeholder="name@company.com" icon={<Icon.Mail s={16} />} type="email" />
            </SField>
            <SField label="Role" hint={ROLE_DESC[role]}>
              <RoleSelect value={role} onChange={setRole} options={ROLES.filter((r) => r.value !== 'owner')} width="100%" />
            </SField>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <Btn variant="outline" onClick={onClose} full>Cancel</Btn>
              <Btn variant={valid ? 'primary' : 'ghost'} full icon={<Icon.Mail s={16} />}
                onClick={valid ? () => onInvite(email.trim(), role) : undefined}
                style={!valid ? { opacity: .5, cursor: 'not-allowed' } : {}}>Send invite</Btn>
            </div>
          </div>
        </div>
      </Overlay>
    );
  }

  // ============================================================
  //  Tab 1 — User Management
  // ============================================================
  const SEED_USERS = [
    { id: 'u1', name: 'Alex Reyes',   email: 'alex@exampleorg.com',  role: 'owner',  status: 'active',  joined: 'Jan 8, 2026',  grad: GRADS[0] },
    { id: 'u2', name: 'Mara Okafor',  email: 'mara@exampleorg.com',  role: 'admin',  status: 'active',  joined: 'Feb 2, 2026',  grad: GRADS[1] },
    { id: 'u3', name: 'Jon Vesely',   email: 'jon@exampleorg.com',   role: 'editor', status: 'active',  joined: 'Mar 19, 2026', grad: GRADS[3] },
    { id: 'u4', name: null,           email: 'priya@exampleorg.com', role: 'editor', status: 'pending', joined: 'Jun 11, 2026', grad: GRADS[2] },
    { id: 'u5', name: 'Sam Lindqvist',email: 'sam@exampleorg.com',   role: 'viewer', status: 'active',  joined: 'May 4, 2026',  grad: GRADS[4] },
  ];

  const STATUS_BADGE = {
    active:  { tone: 'online',  label: 'Active' },
    pending: { tone: 'warning', label: 'Pending Invite' },
  };

  const COLS = '2fr 1.7fr 160px 140px 116px 96px';

  function UserManagement({ notify }) {
    const [users, setUsers] = useState(SEED_USERS);
    const [showInvite, setShowInvite] = useState(false);

    const seats = 8;
    const members = users.filter((u) => u.status === 'active').length;
    const pending = users.filter((u) => u.status === 'pending').length;

    const setRole = (id, role) => {
      setUsers((p) => p.map((u) => u.id === id ? { ...u, role } : u));
      const u = users.find((x) => x.id === id);
      notify && notify({ title: 'Role updated', desc: `${u.name || u.email} is now ${ROLES.find((r) => r.value === role).label}`, tone: 'accent', icon: 'CheckCircle' });
    };
    const remove = (id) => {
      const u = users.find((x) => x.id === id);
      setUsers((p) => p.filter((x) => x.id !== id));
      notify && notify({ title: u.status === 'pending' ? 'Invite revoked' : 'User removed', desc: u.name || u.email, tone: 'warn', icon: 'Trash' });
    };
    const invite = (email, role) => {
      setShowInvite(false);
      setUsers((p) => [...p, { id: 'u' + Date.now(), name: null, email, role, status: 'pending', joined: 'Jun 14, 2026', grad: GRADS[p.length % GRADS.length] }]);
      notify && notify({ title: 'Invite sent', desc: email, tone: 'accent', icon: 'Mail' });
    };

    return (
      <div>
        {/* seat summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 'var(--gap)' }}>
          {[['Members', members, 'User'], ['Pending', pending, 'Mail'], ['Seats used', `${members + pending} / ${seats}`, 'Building']].map(([l, v, ic]) => {
            const IconC = Icon[ic];
            return (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 11, background: 'var(--accent-soft)', color: 'var(--accent)' }}><IconC s={18} /></span>
                <div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}>{v}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l}</div>
                </div>
              </div>
            );
          })}
        </div>

        <Card pad={false} animate style={{ overflow: 'hidden' }}>
          {/* header row */}
          <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 12, padding: '13px 22px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
            {['Name', 'Email', 'Role', 'Status', 'Joined', ''].map((h, i) => (
              <div key={i} style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--text-faint)', textAlign: i === 5 ? 'right' : 'left' }}>{h || 'Actions'}</div>
            ))}
          </div>
          {users.map((u, i) => (
            <div key={u.id} style={{ display: 'grid', gridTemplateColumns: COLS, gap: 12, alignItems: 'center', padding: '14px 22px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
              {/* name + avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                <Avatar name={u.name ? u.name.split(' ').map((w) => w[0]).slice(0, 2).join('') : '··'} grad={u.grad} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: u.name ? 'var(--text)' : 'var(--text-faint)', fontStyle: u.name ? 'normal' : 'italic' }}>{u.name || 'Invite pending'}</div>
                  {u.role === 'owner' && <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>You</div>}
                </div>
              </div>
              {/* email */}
              <div style={{ fontSize: 13.5, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
              {/* role */}
              <div>
                {u.role === 'owner'
                  ? <Badge tone="accent" icon={<Icon.Lock s={12} />}>Owner</Badge>
                  : <RoleSelect value={u.role} onChange={(r) => setRole(u.id, r)} options={ROLES.filter((r) => r.value !== 'owner')} />}
              </div>
              {/* status */}
              <div>
                {(() => { const s = STATUS_BADGE[u.status]; return <Badge tone={s.tone}>{s.label}</Badge>; })()}
              </div>
              {/* joined */}
              <div className="mono" style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{u.joined}</div>
              {/* actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                {u.role === 'owner'
                  ? <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>—</span>
                  : <Btn variant="danger" size="sm" icon={<Icon.Trash s={14} />} onClick={() => remove(u.id)}>{u.status === 'pending' ? 'Revoke' : 'Remove'}</Btn>}
              </div>
            </div>
          ))}
        </Card>

        {showInvite && <InviteUserModal onClose={() => setShowInvite(false)} onInvite={invite} />}
        {/* the header "+ Invite user" button opens the modal via this opener */}
        <InviteButtonPortal onOpen={() => setShowInvite(true)} />
      </div>
    );
  }

  // hidden helper so the header "+ Invite User" button can open the modal
  let _openInvite = null;
  function InviteButtonPortal({ onOpen }) { useEffect(() => { _openInvite = onOpen; return () => { _openInvite = null; }; }, [onOpen]); return null; }

  // ============================================================
  //  Tab 2 — Notification Config
  // ============================================================
  function ConfigCard({ icon, title, sub, children, footer }) {
    return (
      <Card animate>
        <CardHead icon={icon} title={title} sub={sub} />
        {children}
        {footer && <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>{footer}</div>}
      </Card>
    );
  }

  function NotificationConfig({ notify }) {
    const [smtp, setSmtp] = useState({ host: '', port: '587', user: '', pass: '', from: '', tls: true });
    const [ntfy, setNtfy] = useState({ url: 'https://ntfy.sh', topic: '', token: '' });
    const [rules, setRules] = useState({ offline: true, recovered: true, transcodeFail: true, storage: false, weekly: false });
    const setS = (k, v) => setSmtp((p) => ({ ...p, [k]: v }));
    const setN = (k, v) => setNtfy((p) => ({ ...p, [k]: v }));
    const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 };

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 'var(--gap)', alignItems: 'start' }}>
        {/* SMTP */}
        <ConfigCard icon={<Icon.Mail s={18} />} title="SMTP Email Settings" sub="Configure SMTP to enable email notifications for your organisation."
          footer={<>
            <Btn variant="primary" onClick={() => notify && notify({ title: 'SMTP settings saved', tone: 'online', icon: 'CheckCircle' })}>Save SMTP settings</Btn>
            <Btn variant="outline" icon={<Icon.Mail s={15} />} onClick={() => notify && notify({ title: 'Test email sent', desc: smtp.from || 'noreply@example.com', tone: 'accent', icon: 'Mail' })}>Send test email</Btn>
          </>}>
          <div style={{ ...grid2, marginBottom: 16 }}>
            <SField label="Host"><SInput value={smtp.host} onChange={(v) => setS('host', v)} placeholder="smtp.example.com" mono /></SField>
            <SField label="Port"><SInput value={smtp.port} onChange={(v) => setS('port', v)} placeholder="587" mono /></SField>
          </div>
          <div style={{ ...grid2, marginBottom: 16 }}>
            <SField label="Username"><SInput value={smtp.user} onChange={(v) => setS('user', v)} placeholder="user@example.com" /></SField>
            <SField label="Password"><SInput value={smtp.pass} onChange={(v) => setS('pass', v)} placeholder="Enter password" type="password" icon={<Icon.Lock s={15} />} /></SField>
          </div>
          <SField label="From address"><SInput value={smtp.from} onChange={(v) => setS('from', v)} placeholder="noreply@example.com" /></SField>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginTop: 16, padding: '12px 14px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <Switch value={smtp.tls} onChange={(v) => setS('tls', v)} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>Secure (TLS)</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Turn off to use STARTTLS instead</div>
            </div>
          </div>
        </ConfigCard>

        {/* ntfy */}
        <ConfigCard icon={<Icon.Bell s={18} />} title="ntfy Push Notifications" sub="Configure ntfy to enable push notifications for your organisation."
          footer={<>
            <Btn variant="primary" onClick={() => notify && notify({ title: 'Push settings saved', tone: 'online', icon: 'CheckCircle' })}>Save push settings</Btn>
            <Btn variant="outline" icon={<Icon.Bell s={15} />} onClick={() => notify && notify({ title: 'Test push sent', desc: ntfy.topic || 'my-org-notifications', tone: 'accent', icon: 'Bell' })}>Send test push</Btn>
          </>}>
          <div style={{ ...grid2, marginBottom: 16 }}>
            <SField label="ntfy URL"><SInput value={ntfy.url} onChange={(v) => setN('url', v)} placeholder="https://ntfy.sh" mono icon={<Icon.Globe s={15} />} /></SField>
            <SField label="Topic"><SInput value={ntfy.topic} onChange={(v) => setN('topic', v)} placeholder="my-org-notifications" mono /></SField>
          </div>
          <SField label="Auth token" hint="Optional — only required for protected topics.">
            <SInput value={ntfy.token} onChange={(v) => setN('token', v)} placeholder="tk_…" type="password" mono icon={<Icon.Lock s={15} />} />
          </SField>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginTop: 16, padding: '12px 14px', borderRadius: 12, background: 'var(--accent-soft)', border: '1px solid var(--border)' }}>
            <Icon.Cast s={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.45 }}>Install the <b style={{ color: 'var(--text)' }}>ntfy</b> app and subscribe to your topic to receive alerts on mobile.</div>
          </div>
        </ConfigCard>

        {/* alert rules — spans full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <Card animate>
            <CardHead icon={<Icon.Alert s={18} />} title="Alert rules" sub="Choose which events trigger a notification across email and push." />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px 32px' }}>
              <ToggleRow label="Screen goes offline" desc="Alert after a display is unreachable for 5 minutes" icon="WifiOff" value={rules.offline} onChange={(v) => setRules((p) => ({ ...p, offline: v }))} />
              <ToggleRow label="Screen recovers" desc="Notify when an offline display comes back online" icon="Wifi" value={rules.recovered} onChange={(v) => setRules((p) => ({ ...p, recovered: v }))} />
              <ToggleRow label="Transcode failure" desc="Alert when uploaded media fails to process" icon="Video" value={rules.transcodeFail} onChange={(v) => setRules((p) => ({ ...p, transcodeFail: v }))} />
              <ToggleRow label="Storage near limit" desc="Warn when usage passes 90% of the allocation" icon="Storage" value={rules.storage} onChange={(v) => setRules((p) => ({ ...p, storage: v }))} />
              <ToggleRow label="Weekly summary" desc="A digest of uptime and activity every Monday" icon="Calendar" value={rules.weekly} onChange={(v) => setRules((p) => ({ ...p, weekly: v }))} />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ============================================================
  //  Tab 3 — Storage
  // ============================================================
  function StorageRow({ label, icon, usedLabel, pct, color }) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 9 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 9, background: 'var(--surface-3)', color }}><Icon.Storage s={15} /></span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{label}</span>
          </div>
          <span className="mono" style={{ fontSize: 13, color: 'var(--text-muted)' }}>{usedLabel}</span>
        </div>
        <Bar value={pct} color={color} glow h={9} />
        <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 6 }}>{pct.toFixed(1)}% used</div>
      </div>
    );
  }

  function StoragePanel() {
    return (
      <Card animate style={{ maxWidth: 720 }}>
        <CardHead icon={<Icon.Storage s={18} />} title="Storage usage" sub="Your organisation's usage against its allocated limits. Contact an instance administrator to change these limits." />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <StorageRow label="Originals" usedLabel="183.9 MB / 5.0 GB" pct={3.6} color="var(--info)" />
          <StorageRow label="Transcoded" usedLabel="75.1 MB / 5.0 GB" pct={1.5} color="var(--accent)" />
        </div>
        <div style={{ display: 'flex', gap: 24, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
          {[['Total stored', '259.0 MB'], ['Allocation', '10.0 GB'], ['Files', '142'], ['Largest', 'Promo_Reel_May.mp4 · 120 MB']].map(([l, v]) => (
            <div key={l}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 3 }}>{l}</div>
              <div className="mono" style={{ fontSize: 14, fontWeight: 700 }}>{v}</div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // ============================================================
  //  Settings shell — tab bar + routing
  // ============================================================
  const TABS = [
    { id: 'users',  label: 'User Management',    icon: 'User' },
    { id: 'notify', label: 'Notification Config', icon: 'Bell' },
    { id: 'store',  label: 'Storage',             icon: 'Storage' },
  ];
  const TITLES = {
    users:  ['User Management', 'Manage who has access to ExampleOrg and what they can do'],
    notify: ['Notification Config', 'Email & push delivery settings for your organisation'],
    store:  ['Storage', 'Track media usage against your allocated limits'],
  };

  function SettingsPage(props) {
    const [tab, setTab] = useState('users');
    const [title, sub] = TITLES[tab];
    return (
      <div>
        <PageHeader title={title} sub={sub}
          actions={tab === 'users' ? <Btn variant="primary" size="md" icon={<Icon.Plus s={17} />} onClick={() => _openInvite && _openInvite()}>Invite user</Btn> : null} />

        {/* tab bar */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 'var(--gap)' }}>
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

        <div key={tab} style={{ animation: 'fadeIn .25s ease both' }}>
          {tab === 'users'  && <UserManagement {...props} />}
          {tab === 'notify' && <NotificationConfig {...props} />}
          {tab === 'store'  && <StoragePanel />}
        </div>
      </div>
    );
  }

  Object.assign(window, { SettingsPage, SInput, SField, Switch, ToggleRow });
})();
