import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Logo } from '../components/Header';

type Mode = 'login' | 'signup';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2.5 24 .5 14.6.5 6.5 5.9 2.6 13.7l7.8 6c1.9-5.7 7.2-10.2 13.6-10.2Z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.6-.1-2.8-.4-4.1H24v8.2h12.9c-.3 2.2-1.7 5.4-4.9 7.6l7.6 5.9c4.5-4.2 6.9-10.3 6.9-17.6Z"
      />
      <path
        fill="#FBBC05"
        d="M10.4 28.3a14.6 14.6 0 0 1 0-8.6l-7.8-6a24 24 0 0 0 0 20.6l7.8-6Z"
      />
      <path
        fill="#34A853"
        d="M24 47.5c6.2 0 11.4-2 15.2-5.5l-7.6-5.9c-2 1.4-4.7 2.4-7.6 2.4-6.4 0-11.7-4.4-13.6-10.2l-7.8 6C6.5 42.1 14.6 47.5 24 47.5Z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z" />
    </svg>
  );
}

export default function Auth({ mode }: { mode: Mode }) {
  const { login, signup, providers, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(params.get('error') || '');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const isSignup = mode === 'signup';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (isSignup) {
        await signup({ email, name, password });
      } else {
        await login({ email, password });
      }
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setBusy(false);
    }
  }

  function startOAuth(provider: 'google' | 'facebook') {
    setError('');
    if (!providers[provider]) {
      setNotice(
        `ยังไม่ได้ตั้งค่า ${provider === 'google' ? 'Google' : 'Facebook'} OAuth — ` +
          'ต้องเพิ่ม Client ID/Secret ของแอปคุณในหน้า Sites → Secrets ก่อน',
      );
      return;
    }
    window.location.href = `/api/auth/oauth/${provider}?redirect=/`;
  }

  if (user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#08080A] px-4 text-center">
        <Logo />
        <p className="text-zinc-400">คุณเข้าสู่ระบบอยู่แล้วในชื่อ {user.name}</p>
        <Link
          to="/"
          className="rounded-full bg-gradient-to-r from-[#FF8A3D] to-[#F04405] px-6 py-2.5 text-sm font-semibold text-white"
        >
          กลับหน้าหลัก
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-start justify-center overflow-hidden bg-[#08080A] px-4 py-10 text-white sm:items-center">
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, #F04405 0%, transparent 65%)' }}
      />

      <div className="relative w-full max-w-[430px]">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Logo />
          <p className="text-sm text-zinc-500">
            {isSignup ? 'สร้างบัญชีเพื่อเริ่มคุยกับตัวละครที่คุณชอบ' : 'ยินดีต้อนรับกลับมา คิดถึงจังเลย'}
          </p>
        </div>

        <div className="rounded-3xl border border-white/8 bg-[#111113]/95 p-6 shadow-2xl shadow-black/60 sm:p-8">
          <div className="mb-6 flex rounded-full bg-black/40 p-1 text-sm font-semibold">
            <Link
              to="/login"
              className={`flex-1 rounded-full py-2 text-center transition-colors ${
                !isSignup ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              เข้าสู่ระบบ
            </Link>
            <Link
              to="/signup"
              className={`flex-1 rounded-full py-2 text-center transition-colors ${
                isSignup ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              สมัครสมาชิก
            </Link>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => startOAuth('google')}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-white py-3 text-sm font-semibold text-[#1f1f1f] transition-transform hover:scale-[1.01]"
            >
              <GoogleIcon />
              ดำเนินการต่อด้วย Google
            </button>
            <button
              type="button"
              onClick={() => startOAuth('facebook')}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#1877F2] py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.01]"
            >
              <FacebookIcon />
              ดำเนินการต่อด้วย Facebook
            </button>
          </div>

          <div className="my-5 flex items-center gap-3 text-xs text-zinc-600">
            <span className="h-px flex-1 bg-white/8" />
            หรือใช้อีเมล
            <span className="h-px flex-1 bg-white/8" />
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {isSignup && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-zinc-400">ชื่อที่แสดง</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น คุณสมชาย"
                  autoComplete="name"
                  required
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-colors focus:border-[#FF6A2B]"
                />
              </label>
            )}

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">อีเมล</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-colors focus:border-[#FF6A2B]"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">รหัสผ่าน</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignup ? 'อย่างน้อย 8 ตัวอักษร' : 'รหัสผ่านของคุณ'}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                required
                minLength={8}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-colors focus:border-[#FF6A2B]"
              />
            </label>

            {error && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
              </p>
            )}
            {notice && (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                {notice}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-1 w-full rounded-xl bg-gradient-to-r from-[#FF8A3D] to-[#F04405] py-3 text-sm font-bold text-white shadow-lg shadow-orange-900/30 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? 'กำลังดำเนินการ...' : isSignup ? 'สมัครสมาชิกฟรี' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <p className="mt-5 text-center text-[11px] leading-relaxed text-zinc-600">
            การดำเนินการต่อถือว่าคุณยอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัว ·
            สมัครใหม่รับฟรี 170 คอยน์
          </p>
        </div>

        <p className="mt-5 text-center text-xs text-zinc-500">
          {isSignup ? 'มีบัญชีอยู่แล้ว? ' : 'ยังไม่มีบัญชี? '}
          <Link to={isSignup ? '/login' : '/signup'} className="font-semibold text-[#FF8A3D] hover:underline">
            {isSignup ? 'เข้าสู่ระบบ' : 'สมัครสมาชิกฟรี'}
          </Link>
        </p>
      </div>
    </div>
  );
}
