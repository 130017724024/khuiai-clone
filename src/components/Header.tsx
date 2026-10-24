import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useNotifications } from '../lib/notifications';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`}>
      <svg width="26" height="30" viewBox="0 0 26 30" fill="none" aria-hidden="true">
        <path
          d="M13.4 0c1.6 5.2-1.2 7.6-3.4 10.3C7.6 13.5 6 16 6 19.2 6 24.6 9.9 29 14.9 29c4.8 0 8.6-3.7 8.6-8.6 0-4.6-2.4-7.2-3.6-10.6-1.1-3.2-.7-6.2-.7-6.2-2.4 1.4-3.6 4.4-3.6 4.4S15.8 2.6 13.4 0Z"
          fill="url(#khui-flame)"
        />
        <path d="M3 6.5 8.6 12 3 17.5" stroke="#FF6A2B" strokeWidth="2.4" strokeLinecap="round" />
        <defs>
          <linearGradient id="khui-flame" x1="14" y1="0" x2="14" y2="29" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF8A3D" />
            <stop offset="1" stopColor="#F04405" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-[19px] font-extrabold tracking-[0.14em] text-white">KHUI AI</span>
    </Link>
  );
}

function CoinIcon() {
  return (
    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-b from-amber-300 to-amber-600 text-[9px] font-black text-amber-900">
      ₵
    </span>
  );
}

export default function Header() {
  const { user, logout } = useAuth();
  const { items, count } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0A0A0B]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />

        <nav className="hidden items-center gap-7 text-sm font-medium text-zinc-400 md:flex">
          <Link to="/" className="transition-colors hover:text-white">
            สำรวจ
          </Link>
          <Link to="/characters" className="transition-colors hover:text-white">
            ตัวละคร
          </Link>
          <Link to="/gacha" className="transition-colors hover:text-white">
            กาชา
          </Link>
          <Link to="/wallet" className="transition-colors hover:text-white">
            คอยน์
          </Link>
        </nav>

        <div className="flex items-center gap-2.5">
          {user ? (
            <>
              <span
                aria-label={`เลเวล ${user.level}`}
                className="hidden items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-zinc-300 sm:flex"
              >
                Lv.{user.level}
              </span>
              <Link
                to="/wallet"
                aria-label={count > 0 ? `กระเป๋าคอยน์ · มี ${count} รางวัลรอรับ` : 'กระเป๋าคอยน์'}
                className="relative flex items-center gap-1.5 rounded-full border border-[#F4B208]/30 bg-[#F4B208]/10 px-3 py-1.5 transition-colors hover:border-[#F4B208]/60 hover:bg-[#F4B208]/20"
              >
                <CoinIcon />
                <span className="text-sm font-semibold text-[#F4B208]">{user.coins.toLocaleString()}</span>
                {count > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#FF4D0F] px-1 text-[9px] font-bold leading-none text-white ring-2 ring-[#0A0A0B]">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </Link>
              <div className="relative hidden sm:block" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => setNotifOpen((v) => !v)}
                  aria-label={count > 0 ? `การแจ้งเตือน · ${count} รายการ` : 'การแจ้งเตือน'}
                  className="relative flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
                    <path d="M13.7 20a2 2 0 0 1-3.4 0" />
                  </svg>
                  {count > 0 && (
                    <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#FF4D0F] px-1 text-[9px] font-bold leading-none text-white ring-2 ring-[#0A0A0B]">
                      {count > 9 ? '9+' : count}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
                    <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2.5">
                      <p className="text-xs font-semibold text-zinc-300">รางวัลที่รับได้</p>
                      <span className="text-[10px] text-zinc-500">{count} รายการ</span>
                    </div>

                    {items.length === 0 ? (
                      <p className="px-4 py-6 text-center text-xs text-zinc-500">
                        ไม่มีรางวัลค้างอยู่ 🎉
                      </p>
                    ) : (
                      <ul className="max-h-72 overflow-y-auto">
                        {items.map((n) => (
                          <li key={`${n.type}-${n.id}`}>
                            <Link
                              to={n.href}
                              onClick={() => setNotifOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-white/5"
                            >
                              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/5 text-xs">
                                {n.type === 'checkin' ? '📅' : n.type === 'quest' ? '🎯' : '🎉'}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-[12px] text-zinc-200">{n.title}</span>
                              <span className="text-[10px] font-bold text-[#F4B208]">+{n.reward}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}

                    <Link
                      to="/wallet"
                      onClick={() => setNotifOpen(false)}
                      className="block border-t border-zinc-800 px-4 py-2.5 text-center text-[11px] font-semibold text-[#FF8A3D] transition-colors hover:bg-white/5"
                    >
                      ไปที่กระเป๋าคอยน์
                    </Link>
                  </div>
                )}
              </div>
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="บัญชีของฉัน"
                  className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-800 text-sm font-bold text-white"
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    user.name.trim().charAt(0).toUpperCase()
                  )}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
                    <div className="border-b border-zinc-800 px-4 py-3">
                      <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                      <p className="truncate text-xs text-zinc-500">{user.email}</p>
                      <p className="mt-1 text-[11px] font-semibold text-[#F4B208]">
                        เลเวล {user.level} · {user.xp.toLocaleString()} XP
                      </p>
                    </div>
                    <Link
                      to="/wallet"
                      onClick={() => setMenuOpen(false)}
                      className="block w-full px-4 py-2.5 text-left text-sm text-zinc-300 transition-colors hover:bg-white/5"
                    >
                      กระเป๋าคอยน์
                    </Link>
                    <Link
                      to="/gacha"
                      onClick={() => setMenuOpen(false)}
                      className="block w-full px-4 py-2.5 text-left text-sm text-zinc-300 transition-colors hover:bg-white/5"
                    >
                      กาชาตัวละคร
                    </Link>
                    <button
                      type="button"
                      onClick={async () => {
                        setMenuOpen(false);
                        await logout();
                        navigate('/');
                      }}
                      className="w-full border-t border-zinc-800 px-4 py-3 text-left text-sm text-zinc-300 transition-colors hover:bg-white/5"
                    >
                      ออกจากระบบ
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-200 transition-colors hover:bg-white/5 hover:text-white"
              >
                เข้าสู่ระบบ
              </Link>
              <Link
                to="/signup"
                className="rounded-full bg-gradient-to-r from-[#FF8A3D] to-[#F04405] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-900/30 transition-transform hover:scale-[1.03]"
              >
                สมัครสมาชิก
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
