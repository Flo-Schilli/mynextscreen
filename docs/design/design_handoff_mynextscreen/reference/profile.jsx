// profile.jsx — account area: Switch Organisation modal + User Settings page
(function () {
  const { useState } = React;
  const Icon = window.Icon;
  const { Card, CardHead, Btn, Badge, UserAvatar, Overlay, SInput, SField, Switch } = window;

  // ============================================================
  //  Switch Organisation modal
  // ============================================================
  function SwitchOrgModal({ orgs, current, onSwitch, onClose }) {
    return (
      <Overlay onClose={onClose}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', maxWidth: 460, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', color: '#fff' }}><Icon.Building s={20} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>Switch organisation</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Choose which workspace to manage</div>
            </div>
            <button onClick={onClose} style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 18 }}>✕</button>
          </div>
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {orgs.map((o) => {
              const sel = o.id === current;
              return (
                <button key={o.id} onClick={() => o.id !== current && onSwitch(o.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'left',
                    padding: '14px 16px', borderRadius: 13, cursor: sel ? 'default' : 'pointer',
                    border: `1px solid ${sel ? 'var(--accent)' : 'var(--border-strong)'}`,
                    background: sel ? 'var(--accent-soft)' : 'var(--surface-2)', transition: 'border-color .15s, background .15s' }}
                  onMouseEnter={(e) => { if (!sel) e.currentTarget.style.borderColor = 'var(--text-faint)'; }}
                  onMouseLeave={(e) => { if (!sel) e.currentTarget.style.borderColor = 'var(--border-strong)'; }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: o.grad, color: '#fff', fontWeight: 700, fontSize: 15 }}>{o.name.slice(0, 1)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700 }}>{o.name}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{o.role}</div>
                  </div>
                  {sel && <span style={{ color: 'var(--accent)' }}><Icon.Check s={20} sw={2.2} /></span>}
                </button>
              );
            })}
          </div>
          <div style={{ padding: '0 18px 18px' }}>
            <Btn variant="outline" full onClick={onClose}>Close</Btn>
          </div>
        </div>
      </Overlay>
    );
  }

  // ============================================================
  //  Delete-account confirmation
  // ============================================================
  function DeleteAccountModal({ email, onConfirm, onClose }) {
    const [text, setText] = useState('');
    const ok = text.trim().toLowerCase() === 'delete';
    return (
      <Overlay onClose={onClose}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--offline)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', maxWidth: 460, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 11, background: 'var(--offline-dim)', color: 'var(--offline)' }}><Icon.Alert s={20} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>Delete your account</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{email}</div>
            </div>
          </div>
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              This permanently removes your account and all organisation memberships. This action <b style={{ color: 'var(--text)' }}>cannot be undone</b>.
            </div>
            <SField label={<span>Type <b style={{ color: 'var(--text)' }}>delete</b> to confirm</span>}>
              <SInput value={text} onChange={setText} placeholder="delete" />
            </SField>
            <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
              <Btn variant="outline" full onClick={onClose}>Cancel</Btn>
              <Btn variant={ok ? 'danger' : 'ghost'} full icon={<Icon.Trash s={15} />}
                onClick={ok ? onConfirm : undefined} style={!ok ? { opacity: .5, cursor: 'not-allowed' } : {}}>Delete account</Btn>
            </div>
          </div>
        </div>
      </Overlay>
    );
  }

  // ============================================================
  //  small primitives for the settings page
  // ============================================================
  function SectionCard({ title, sub, danger, children }) {
    return (
      <Card animate style={danger ? { borderColor: 'var(--offline)', boxShadow: '0 0 0 1px var(--offline-dim)' } : undefined}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.01em', color: danger ? 'var(--offline)' : 'var(--text)' }}>{title}</div>
          {sub && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3, maxWidth: 520 }}>{sub}</div>}
        </div>
        {children}
      </Card>
    );
  }

  function ChannelRow({ icon, label, desc, hint, value, onChange, last }) {
    const IconC = Icon[icon] || Icon.Bell;
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 0', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
        <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: value ? 'var(--accent-soft)' : 'var(--surface-3)', color: value ? 'var(--accent)' : 'var(--text-faint)' }}><IconC s={18} /></span>
        <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 1 }}>{desc}</div>
          {hint && <div style={{ fontSize: 11.5, color: 'var(--text-faint)', fontStyle: 'italic', marginTop: 4 }}>{hint}</div>}
        </div>
        <div style={{ paddingTop: 8 }}><Switch value={value} onChange={onChange} /></div>
      </div>
    );
  }

  // ============================================================
  //  User Settings page
  // ============================================================
  function UserSettingsPage({ user, profile, setProfile, notify, onBack, onLogout }) {
    const [name, setName] = useState(profile.name);
    const [gravatar, setGravatar] = useState(profile.gravatar);
    const [channels, setChannels] = useState(profile.channels);
    const setCh = (k, v) => setChannels((p) => ({ ...p, [k]: v }));

    const [pw, setPw] = useState({ cur: '', next: '', confirm: '' });
    const setP = (k, v) => setPw((p) => ({ ...p, [k]: v }));
    const pwValid = pw.cur && pw.next.length >= 8 && pw.next === pw.confirm;

    const [newEmail, setNewEmail] = useState('');
    const [emailPw, setEmailPw] = useState('');
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim()) && emailPw.length > 0;

    const [showDelete, setShowDelete] = useState(false);

    const saveProfile = () => {
      setProfile((p) => ({ ...p, name: name.trim() || p.name, gravatar, channels }));
      notify && notify({ title: 'Profile saved', desc: 'Your account details were updated', tone: 'online', icon: 'CheckCircle' });
    };
    const updatePw = () => {
      setPw({ cur: '', next: '', confirm: '' });
      notify && notify({ title: 'Password updated', desc: 'Use your new password next time you sign in', tone: 'online', icon: 'Lock' });
    };
    const sendEmail = () => {
      notify && notify({ title: 'Confirmation link sent', desc: newEmail.trim(), tone: 'accent', icon: 'Mail' });
      setNewEmail(''); setEmailPw('');
    };

    const labelStyle = { fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 7 };

    return (
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* header with back */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 26 }}>
          <button onClick={onBack}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 13px', borderRadius: 10, fontSize: 13.5, fontWeight: 600,
              border: '1px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text-muted)' }}>
            <Icon.ChevronLeft s={16} />Back
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-.025em' }}>User Settings</h1>
            <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 3 }}>Manage your personal account across every organisation</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>
          {/* PROFILE */}
          <SectionCard title="Profile" sub="Your account details and display name.">
            <div style={{ display: 'flex', alignItems: 'center', gap: 15, padding: '14px 16px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', marginBottom: 20 }}>
              <UserAvatar gravatar={gravatar} email={user.email} name={name} size={46} radius={12} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Use Gravatar</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 1 }}>Show the avatar linked to your email via Gravatar.</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-faint)', fontStyle: 'italic', marginTop: 4 }}>When off, no email hash is sent to gravatar.com and a placeholder is shown.</div>
              </div>
              <Switch value={gravatar} onChange={setGravatar} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <SField label="Email" hint="Change your email in the Change email section below — we'll send a confirmation link first.">
                <SInput value={user.email} onChange={() => {}} disabled icon={<Icon.Mail s={15} />} />
              </SField>
              <SField label="Display name">
                <SInput value={name} onChange={setName} placeholder="Your name" icon={<Icon.User s={15} />} />
              </SField>
            </div>
            <div style={{ marginTop: 20 }}>
              <Btn variant="primary" icon={<Icon.Check s={16} />} onClick={saveProfile}>Save profile</Btn>
            </div>
          </SectionCard>

          {/* NOTIFICATION CHANNELS */}
          <SectionCard title="Notification Channels" sub="Choose how you receive notifications. These apply across all organisations you belong to.">
            <ChannelRow icon="Dashboard" label="In-app" desc="Receive notifications in the dashboard"
              value={channels.inApp} onChange={(v) => setCh('inApp', v)} />
            <ChannelRow icon="Mail" label="Email" desc="Receive notifications by email" hint="Sent for organisations that have email configured"
              value={channels.email} onChange={(v) => setCh('email', v)} />
            <ChannelRow icon="Bell" label="ntfy" desc="Receive notifications via ntfy" hint="Sent for organisations that have ntfy configured"
              value={channels.ntfy} onChange={(v) => setCh('ntfy', v)} last />
            <div style={{ marginTop: 18 }}>
              <Btn variant="primary" icon={<Icon.Check s={16} />} onClick={saveProfile}>Save channels</Btn>
            </div>
          </SectionCard>

          {/* CHANGE PASSWORD */}
          <SectionCard title="Change password" sub="Update the password you use to sign in.">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <SField label="Current password" full>
                <SInput value={pw.cur} onChange={(v) => setP('cur', v)} placeholder="••••••••" type="password" icon={<Icon.Lock s={15} />} />
              </SField>
              <SField label="New password" hint="At least 8 characters.">
                <SInput value={pw.next} onChange={(v) => setP('next', v)} placeholder="••••••••" type="password" icon={<Icon.Lock s={15} />} />
              </SField>
              <SField label="Confirm new password" hint={pw.confirm && pw.next !== pw.confirm ? '⚠ Passwords don\u2019t match' : undefined}>
                <SInput value={pw.confirm} onChange={(v) => setP('confirm', v)} placeholder="••••••••" type="password" icon={<Icon.Lock s={15} />} />
              </SField>
            </div>
            <div style={{ marginTop: 20 }}>
              <Btn variant={pwValid ? 'primary' : 'ghost'} icon={<Icon.Lock s={16} />}
                onClick={pwValid ? updatePw : undefined} style={!pwValid ? { opacity: .5, cursor: 'not-allowed' } : {}}>Update password</Btn>
            </div>
          </SectionCard>

          {/* CHANGE EMAIL */}
          <SectionCard title="Change email" sub="We'll send a confirmation link to the new address; the change applies once you confirm it.">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <SField label="New email">
                <SInput value={newEmail} onChange={setNewEmail} placeholder="new@company.com" type="email" icon={<Icon.Mail s={15} />} />
              </SField>
              <SField label="Current password">
                <SInput value={emailPw} onChange={setEmailPw} placeholder="••••••••" type="password" icon={<Icon.Lock s={15} />} />
              </SField>
            </div>
            <div style={{ marginTop: 20 }}>
              <Btn variant={emailValid ? 'primary' : 'ghost'} icon={<Icon.Mail s={16} />}
                onClick={emailValid ? sendEmail : undefined} style={!emailValid ? { opacity: .5, cursor: 'not-allowed' } : {}}>Send confirmation link</Btn>
            </div>
          </SectionCard>

          {/* DANGER ZONE */}
          <SectionCard danger title="Danger Zone" sub="Permanently delete your account. This removes your organisation memberships and cannot be undone.">
            <Btn variant="danger" icon={<Icon.Trash s={15} />} onClick={() => setShowDelete(true)}>Delete account</Btn>
          </SectionCard>
        </div>

        {showDelete && <DeleteAccountModal email={user.email}
          onClose={() => setShowDelete(false)}
          onConfirm={() => { setShowDelete(false); onLogout && onLogout(); }} />}
      </div>
    );
  }

  Object.assign(window, { SwitchOrgModal, UserSettingsPage });
})();
