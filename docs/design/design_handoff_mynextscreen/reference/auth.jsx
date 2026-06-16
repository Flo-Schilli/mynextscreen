// auth.jsx — login / create-account screen for myNextScreen (redesign)
(function () {
  const { useState } = React;
  const Icon = window.Icon;
  const { Btn, StatusDot } = window;

  function Logo({ size = 38 }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ position: 'relative', width: size, height: size, borderRadius: 11, flexShrink: 0,
          background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', display: 'grid', placeItems: 'center',
          boxShadow: '0 10px 24px -10px var(--accent-ring)' }}>
          <Icon.Layers s={size * 0.55} style={{ color: '#fff' }} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.02em' }}>
          <span style={{ color: 'var(--text)' }}>my</span>
          <span style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>NextScreen</span>
        </div>
      </div>
    );
  }

  function Field({ label, type = 'text', value, onChange, placeholder, icon, right, autoFocus, required, hint, prefix, mono }) {
    const [focus, setFocus] = useState(false);
    return (
      <label style={{ display: 'block' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
          {label}{required && <span style={{ color: 'var(--accent)', marginLeft: 3 }}>*</span>}
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center',
          background: 'var(--surface-2)', borderRadius: 12,
          border: `1px solid ${focus ? 'var(--accent)' : 'var(--border)'}`,
          boxShadow: focus ? '0 0 0 3px var(--accent-soft)' : 'none', transition: 'border-color .15s, box-shadow .15s' }}>
          {icon && <span style={{ display: 'grid', placeItems: 'center', paddingLeft: 14, color: focus ? 'var(--accent)' : 'var(--text-faint)' }}>{icon}</span>}
          {prefix && <span className="mono" style={{ paddingLeft: icon ? 9 : 14, fontSize: 14, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>{prefix}</span>}
          <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} required={required}
            onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
            className={mono ? 'mono' : undefined}
            style={{ flex: 1, minWidth: 0, padding: `13px 14px 13px ${(icon || prefix) ? 9 : 14}px`, fontSize: 14.5,
              background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: mono ? 'var(--font-mono)' : 'inherit' }} />
          {right}
        </div>
        {hint && <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 7 }}>{hint}</div>}
      </label>
    );
  }

  // decorative grid of mini screen tiles for the brand panel
  const TILES = [
    { g: 'linear-gradient(135deg,#6d6cf6,#a855f7)', s: 'online' },
    { g: 'linear-gradient(135deg,#0ea5e9,#22d3ee)', s: 'online' },
    { g: 'linear-gradient(135deg,#f59e0b,#f97316)', s: 'warning' },
    { g: 'linear-gradient(135deg,#10b981,#34d399)', s: 'online' },
    { g: 'linear-gradient(135deg,#ef4757,#f97316)', s: 'offline' },
    { g: 'linear-gradient(135deg,#8b5cf6,#6366f1)', s: 'online' },
  ];

  function BrandPanel() {
    const ticks = ['Pair any screen in seconds', 'Schedule content across locations', 'Monitor every display in real time'];
    return (
      <div style={{ position: 'relative', flex: '1 1 0', minWidth: 0, overflow: 'hidden',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '48px 52px',
        background: 'linear-gradient(155deg, color-mix(in srgb, var(--accent) 22%, var(--rail)), var(--rail) 62%)',
        borderRight: '1px solid var(--border)' }}>
        {/* glow blobs */}
        <div style={{ position: 'absolute', top: -120, right: -80, width: 360, height: 360, borderRadius: '50%',
          background: 'radial-gradient(circle, var(--accent-ring), transparent 65%)', filter: 'blur(10px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -140, left: -60, width: 320, height: 320, borderRadius: '50%',
          background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-2) 30%, transparent), transparent 65%)', filter: 'blur(10px)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative' }}><Logo /></div>

        <div style={{ position: 'relative', maxWidth: 420, marginTop: 'auto', marginBottom: 'auto' }}>
          <h1 style={{ fontSize: 34, lineHeight: 1.12, fontWeight: 800, letterSpacing: '-.025em', margin: '0 0 16px', textWrap: 'balance' }}>
            Every screen,<br />under one roof.
          </h1>
          <p style={{ fontSize: 15.5, lineHeight: 1.6, color: 'var(--text-muted)', margin: '0 0 26px' }}>
            The control room for your digital signage — pair displays, build playlists, and push schedules anywhere.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {ticks.map((t) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 11, fontSize: 14.5, fontWeight: 500 }}>
                <span style={{ display: 'grid', placeItems: 'center', width: 22, height: 22, borderRadius: 99, flexShrink: 0,
                  background: 'var(--accent-soft)', color: 'var(--accent)' }}><Icon.Check s={13} sw={2.4} /></span>
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function LoginScreen({ onAuth }) {
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [pw, setPw] = useState('');
    const [name, setName] = useState('');
    const [org, setOrg] = useState('');
    const [show, setShow] = useState(false);
    const [remember, setRemember] = useState(true);
    const [busy, setBusy] = useState(false);
    const [invited, setInvited] = useState(false);
    const isLogin = mode === 'login';
    const needName = !isLogin && !invited;

    const submit = (e) => {
      e.preventDefault();
      setBusy(true);
      setTimeout(() => { setBusy(false); onAuth(); }, 700);
    };

    const EyeBtn = (
      <button type="button" onClick={() => setShow((s) => !s)} title={show ? 'Hide' : 'Show'}
        style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, marginRight: 4, borderRadius: 9,
          border: 'none', background: 'transparent', color: 'var(--text-faint)' }}>
        <Icon.Eye s={18} />
      </button>
    );

    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-grad)' }}>
        <div className="auth-brand" style={{ display: 'flex', flex: '1 1 0' }}><BrandPanel /></div>

        {/* form column */}
        <div style={{ flex: '0 0 clamp(420px, 42vw, 560px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '40px 28px', overflowY: 'auto', background: 'var(--bg)' }}>
          <div className="fade-up" style={{ width: '100%', maxWidth: 380 }}>
            <div className="auth-mini-logo" style={{ display: 'none', marginBottom: 28, justifyContent: 'center' }}><Logo /></div>

            <div style={{ marginBottom: 26 }}>
              <h2 style={{ fontSize: 25, fontWeight: 800, letterSpacing: '-.02em', margin: '0 0 6px' }}>
                {isLogin ? 'Welcome back' : 'Create your account'}
              </h2>
              <p style={{ fontSize: 14.5, color: 'var(--text-muted)', margin: 0 }}>
                {isLogin ? 'Sign in to your myNextScreen workspace.' : 'Start managing your screens in minutes.'}
              </p>
            </div>

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {!isLogin && (
                <div style={{ display: 'flex', gap: 6, padding: 4, borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  {[['new', 'New organisation', false], ['invite', 'I was invited', true]].map(([k, lbl, inv]) => {
                    const active = invited === inv;
                    return (
                      <button key={k} type="button" onClick={() => setInvited(inv)}
                        style={{ flex: 1, padding: '9px 8px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 600,
                          background: active ? 'var(--accent)' : 'transparent', color: active ? '#fff' : 'var(--text-muted)' }}>
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              )}
              {needName && (
                <Field label="Full name" value={name} onChange={setName} placeholder="Jane Doe"
                  icon={<Icon.User s={18} />} autoFocus required />
              )}
              {!isLogin && (
                invited ? (
                  <Field label="Workspace ID" value={org}
                    onChange={(v) => setOrg(v.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'))}
                    placeholder="acme-hq" prefix="mynextscreen.app/" mono required
                    hint="The unique workspace slug from your invitation email." />
                ) : (
                  <Field label="Organisation" value={org} onChange={setOrg}
                    placeholder="Your company or workspace" icon={<Icon.Building s={18} />} required />
                )
              )}
              <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@company.com"
                icon={<Icon.Mail s={18} />} autoFocus={isLogin} />
              <Field label="Password" type={show ? 'text' : 'password'} value={pw} onChange={setPw}
                placeholder="••••••••" icon={<Icon.Lock s={18} />} right={EyeBtn} />

              {isLogin && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13.5, marginTop: -2 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    <button type="button" onClick={() => setRemember((r) => !r)}
                      style={{ display: 'grid', placeItems: 'center', width: 18, height: 18, borderRadius: 6, flexShrink: 0,
                        border: `1px solid ${remember ? 'var(--accent)' : 'var(--border-strong)'}`,
                        background: remember ? 'var(--accent)' : 'transparent', color: '#fff' }}>
                      {remember && <Icon.Check s={12} sw={3} />}
                    </button>
                    Remember me
                  </label>
                  <a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Forgot password?</a>
                </div>
              )}

              <Btn type="submit" size="lg" full style={{ marginTop: 4, opacity: busy ? 0.85 : 1 }}
                icon={busy ? <span style={{ width: 17, height: 17, borderRadius: 99, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin .7s linear infinite' }} /> : undefined}>
                {busy ? 'Signing in…' : (isLogin ? 'Sign in' : 'Create account')}
              </Btn>
            </form>

            {/* divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '22px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 12.5, color: 'var(--text-faint)', fontWeight: 500 }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <Btn variant="outline" size="lg" full onClick={onAuth} icon={<Icon.Globe s={18} />}>Continue with SSO</Btn>

            <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-muted)', marginTop: 24 }}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <a href="#" onClick={(e) => { e.preventDefault(); setMode(isLogin ? 'signup' : 'login'); }}
                style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 700 }}>
                {isLogin ? 'Create account' : 'Sign in'}
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  Object.assign(window, { LoginScreen });
})();
