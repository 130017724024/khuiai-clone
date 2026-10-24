import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import MobileNav from '../components/MobileNav';
import { useAuth } from '../lib/auth';
import { useNotifications } from '../lib/notifications';
import { api, formatCoins } from '../lib/api';
import { characters } from '../data/characters';

type Draw = { cardId: string; characterId: string; rarity: string; rank: number; isNew: boolean };

type GachaInfo = {
  coins: number;
  costSingle: number;
  costTen: number;
  pity: { sr: number; ssr: number };
  pityLimits: { sr: number; ssr: number };
  totalPulls: number;
  owned: number;
  total: number;
  rates: { id: string; rate: number }[];
  cards: { card_id: string; character_id: string; rarity: string; count: number }[];
};

const RARITY: Record<string, { label: string; name: string; ring: string; badge: string; glow: string }> = {
  N: {
    label: 'N',
    name: 'ปกติ',
    ring: 'border-zinc-600/70',
    badge: 'bg-zinc-700 text-zinc-200',
    glow: 'shadow-none',
  },
  R: {
    label: 'R',
    name: 'พิเศษ',
    ring: 'border-sky-500/70',
    badge: 'bg-sky-600 text-white',
    glow: 'shadow-[0_0_24px_-6px_rgba(14,165,233,0.85)]',
  },
  SR: {
    label: 'SR',
    name: 'หายากมาก',
    ring: 'border-violet-500/70',
    badge: 'bg-violet-600 text-white',
    glow: 'shadow-[0_0_28px_-6px_rgba(139,92,246,0.9)]',
  },
  SSR: {
    label: 'SSR',
    name: 'ตำนาน',
    ring: 'border-amber-400/80',
    badge: 'bg-gradient-to-r from-amber-400 to-orange-500 text-amber-950',
    glow: 'shadow-[0_0_32px_-6px_rgba(251,191,36,0.95)]',
  },
  UR: {
    label: 'UR',
    name: 'สุดยอด',
    ring: 'border-rose-400/80',
    badge: 'bg-gradient-to-r from-rose-500 via-fuchsia-500 to-amber-400 text-white',
    glow: 'shadow-[0_0_38px_-4px_rgba(244,63,94,1)]',
  },
};

const byId = new Map(characters.map((c) => [c.id, c]));

function CardTile({
  characterId,
  rarity,
  count,
  isNew,
  delay = 0,
  compact = false,
}: {
  characterId: string;
  rarity: string;
  count?: number;
  isNew?: boolean;
  delay?: number;
  compact?: boolean;
}) {
  const character = byId.get(characterId) ?? characters[0];
  const meta = RARITY[rarity] ?? RARITY.N;

  return (
    <div
      className={`gacha-card-in relative overflow-hidden rounded-2xl border-2 bg-[#141416] ${meta.ring} ${meta.glow}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`w-full overflow-hidden ${compact ? 'aspect-[3/4]' : 'aspect-[3/4]'}`}>
        <img
          src={character.image}
          alt={character.name}
          loading="lazy"
          className={`h-full w-full object-cover ${rarity === 'N' ? 'grayscale-[0.35]' : ''}`}
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

      <span
        className={`absolute left-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-black tracking-wide ${meta.badge}`}
      >
        {meta.label}
      </span>
      {isNew && (
        <span className="absolute right-1.5 top-1.5 rounded-md bg-emerald-500 px-1.5 py-0.5 text-[9px] font-black text-emerald-950">
          NEW
        </span>
      )}
      {typeof count === 'number' && count > 1 && (
        <span className="absolute right-1.5 top-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white">
          ×{count}
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 p-2">
        <p className="truncate text-[11px] font-semibold leading-tight text-white">{character.name}</p>
        <p className="text-[9px] text-zinc-400">{meta.name}</p>
      </div>
    </div>
  );
}

export default function Gacha() {
  const { user, loading, updateCoins, updateUser } = useAuth();
  const { refresh: refreshNotifications } = useNotifications();
  const [info, setInfo] = useState<GachaInfo | null>(null);
  const [draws, setDraws] = useState<Draw[] | null>(null);
  const [levelUp, setLevelUp] = useState<{ level: number; bonus: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api<GachaInfo>('/api/gacha');
      setInfo(data);
      updateCoins(data.coins);
    } catch {
      setInfo(null);
    }
  }, [updateCoins]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  const rates = useMemo(() => {
    const list = info?.rates ?? [
      { id: 'N', rate: 45 },
      { id: 'R', rate: 30 },
      { id: 'SR', rate: 15 },
      { id: 'SSR', rate: 8 },
      { id: 'UR', rate: 2 },
    ];
    const total = list.reduce((sum, r) => sum + r.rate, 0) || 1;
    return list.map((r) => ({ ...r, pct: (r.rate / total) * 100 }));
  }, [info]);

  async function pull(count: 1 | 10) {
    setBusy(true);
    setError('');
    try {
      const res = await api<{
        draws: Draw[];
        coins: number;
        pity: { sr: number; ssr: number };
        level: number;
        xp: number;
        levelBonus: number;
      }>('/api/gacha/pull', { method: 'POST', body: JSON.stringify({ count }) });
      updateUser({ coins: res.coins, level: res.level, xp: res.xp });
      setLevelUp(res.levelBonus > 0 ? { level: res.level, bonus: res.levelBonus } : null);
      setDraws(res.draws);
      await load();
      void refreshNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'สุ่มไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08080A] text-white">
        <Header />
        <p className="py-20 text-center text-sm text-zinc-500">กำลังโหลด...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#08080A] text-white">
        <Header />
        <div className="mx-auto max-w-sm px-4 py-20 text-center">
          <p className="text-4xl">🎴</p>
          <p className="mt-3 text-lg font-bold">กาชาตัวละคร</p>
          <p className="mt-1 text-sm text-zinc-500">เข้าสู่ระบบเพื่อสะสมการ์ดตัวละครของคุณ</p>
          <div className="mt-6 flex gap-2">
            <Link
              to="/login"
              className="flex-1 rounded-full border border-white/12 py-2.5 text-sm font-semibold text-white"
            >
              เข้าสู่ระบบ
            </Link>
            <Link
              to="/signup"
              className="flex-1 rounded-full bg-gradient-to-r from-[#FF8A3D] to-[#F04405] py-2.5 text-sm font-semibold text-white"
            >
              สมัครฟรี 170 คอยน์
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const coins = info?.coins ?? user.coins;

  return (
    <div className="min-h-screen bg-[#08080A] pb-24 text-white md:pb-12">
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl font-bold">กาชาตัวละคร</h1>
          <Link to="/wallet" className="text-xs font-semibold text-[#FF8A3D] hover:underline">
            กระเป๋าคอยน์ →
          </Link>
        </div>

        {/* banner */}
        <section className="relative mt-4 overflow-hidden rounded-3xl border border-[#FF6A2B]/25 bg-gradient-to-br from-[#2C1105] via-[#16100C] to-[#0D0D10] p-5">
          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[#F04405]/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-[#F4B208]/15 blur-3xl" />

          <div className="relative">
            <span className="rounded-full border border-[#F4B208]/40 bg-[#F4B208]/10 px-2 py-0.5 text-[10px] font-bold text-[#F4B208]">
              คอลเลกชันตัวละคร · {characters.length} ตัว × 5 ระดับ = {info?.total ?? 60} การ์ด
            </span>
            <h2 className="mt-3 text-lg font-extrabold leading-snug">
              สุ่มการ์ดตัวละคร <span className="text-[#F4B208]">N / R / SR / SSR / UR</span>
            </h2>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-zinc-400">
              การ์ดที่ได้จะถูกเก็บเข้าคอลเลกชันของคุณถาวร (บันทึกใน D1) การ์ดซ้ำจะนับเป็นจำนวนครั้ง
              และตัวนับ pity จะรับประกันการ์ดระดับ SR ขึ้นไป
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void pull(1)}
                disabled={busy}
                className="rounded-full bg-gradient-to-r from-[#FF8A3D] to-[#F04405] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-900/40 transition-transform enabled:hover:scale-[1.03] disabled:opacity-50"
              >
                {busy ? 'กำลังสุ่ม...' : `สุ่ม 1 ครั้ง · ${info?.costSingle ?? 50}`}
              </button>
              <button
                type="button"
                onClick={() => void pull(10)}
                disabled={busy}
                className="rounded-full border border-[#F4B208]/50 bg-[#F4B208]/10 px-5 py-2.5 text-sm font-bold text-[#F4B208] transition-transform enabled:hover:scale-[1.03] disabled:opacity-50"
              >
                สุ่ม 10 ครั้ง · {info?.costTen ?? 450}
                <span className="ml-1 text-[10px] font-semibold text-[#F4B208]/70">การันตี SR+</span>
              </button>
              <span className="ml-auto rounded-full border border-[#F4B208]/30 bg-[#F4B208]/10 px-3 py-1.5 text-sm font-bold text-[#F4B208]">
                ₵ {formatCoins(coins)}
              </span>
            </div>

            {error && (
              <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}{' '}
                {error.includes('คอยน์') && (
                  <Link to="/wallet" className="underline">
                    ไปเติมคอยน์
                  </Link>
                )}
              </p>
            )}
          </div>
        </section>

        {/* pity + stats */}
        <section className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border border-white/8 bg-[#111113] p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300">การันตี SR+ ในอีก</span>
              <span className="text-violet-300">
                {(info?.pityLimits.sr ?? 10) - (info?.pity.sr ?? 0)} สุ่ม
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
                style={{
                  width: `${Math.min(100, ((info?.pity.sr ?? 0) / (info?.pityLimits.sr ?? 10)) * 100)}%`,
                }}
              />
            </div>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300">การันตี SSR+ ในอีก</span>
              <span className="text-amber-300">
                {(info?.pityLimits.ssr ?? 80) - (info?.pity.ssr ?? 0)} สุ่ม
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
                style={{
                  width: `${Math.min(100, ((info?.pity.ssr ?? 0) / (info?.pityLimits.ssr ?? 80)) * 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-white/8 bg-[#111113] p-4">
            <p className="text-xs font-semibold text-zinc-300">
              สะสมแล้ว {info?.owned ?? 0}/{info?.total ?? 60} การ์ด
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#FF8A3D] to-[#F4B208] transition-all"
                style={{ width: `${Math.min(100, ((info?.owned ?? 0) / (info?.total ?? 60)) * 100)}%` }}
              />
            </div>
            <p className="mt-3 text-[11px] text-zinc-500">สุ่มทั้งหมด {info?.totalPulls ?? 0} ครั้ง</p>
            <ul className="mt-2 space-y-1">
              {rates.map((r) => (
                <li key={r.id} className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span className={`font-bold ${RARITY[r.id]?.badge.includes('zinc') ? 'text-zinc-300' : ''}`}>
                    {RARITY[r.id]?.label ?? r.id} · {RARITY[r.id]?.name ?? ''}
                  </span>
                  <span>{r.pct.toFixed(0)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* collection */}
        <section className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
            <span className="text-[#FF6A2B]">✦</span> คอลเลกชันของฉัน
          </h2>

          {!info || info.cards.length === 0 ? (
            <p className="rounded-2xl border border-white/8 bg-[#111113] p-10 text-center text-sm text-zinc-500">
              ยังไม่มีการ์ด — กดสุ่มด้านบนเพื่อเริ่มสะสม
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
              {info.cards.map((card) => (
                <CardTile
                  key={card.card_id}
                  characterId={card.character_id}
                  rarity={card.rarity}
                  count={card.count}
                  compact
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <MobileNav />

      {/* reveal overlay */}
      {draws && (
        <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-black/85 px-4 py-8 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-3xl">
            <p className="text-center text-sm font-bold text-zinc-300">
              ผลการสุ่ม {draws.length} ครั้ง
            </p>
            <p className="mt-1 text-center text-xs text-zinc-500">
              ได้การ์ดใหม่ {draws.filter((d) => d.isNew).length} ใบ · ซ้ำ {draws.filter((d) => !d.isNew).length} ใบ
            </p>
            {levelUp && (
              <p className="mx-auto mt-2 w-fit rounded-full border border-[#F4B208]/40 bg-[#F4B208]/10 px-3 py-1 text-center text-xs font-bold text-[#F4B208]">
                ⭐ เลเวลอัป Lv.{levelUp.level}! +{levelUp.bonus} คอยน์
              </p>
            )}

            <div
              className={`mt-6 grid gap-2.5 ${
                draws.length > 1 ? 'grid-cols-3 sm:grid-cols-5' : 'mx-auto max-w-[190px] grid-cols-1'
              }`}
            >
              {draws.map((d, i) => (
                <CardTile
                  key={`${d.cardId}-${i}`}
                  characterId={d.characterId}
                  rarity={d.rarity}
                  isNew={d.isNew}
                  delay={i * 110}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setDraws(null);
                setLevelUp(null);
              }}
              className="mx-auto mt-7 block rounded-full bg-gradient-to-r from-[#FF8A3D] to-[#F04405] px-8 py-3 text-sm font-bold text-white shadow-lg shadow-orange-900/40"
            >
              เก็บเข้าคอลเลกชัน
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
