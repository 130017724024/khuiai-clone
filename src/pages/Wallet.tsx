import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import MobileNav from '../components/MobileNav';
import { useAuth } from '../lib/auth';
import { useNotifications } from '../lib/notifications';
import { api, formatCoins, formatDateTime, formatDuration } from '../lib/api';

type Checkin = {
  checkedInToday: boolean;
  streak: number;
  nextCycleDay: number;
  nextReward: number;
  rewards: number[];
};

type Pack = {
  id: string;
  coins: number;
  label: string;
  cooldownHours: number;
  availableIn: number;
};

type Level = {
  level: number;
  xp: number;
  into: number;
  need: number;
  nextAt: number;
  nextBonus: number;
  maxLevel: number;
};

type Quest = {
  id: string;
  title: string;
  desc: string;
  to: string;
  goal: number;
  progress: number;
  reward: number;
  xp: number;
  claimed: boolean;
  canClaim: boolean;
};

type GameEvent = {
  id: string;
  title: string;
  desc: string;
  goal: number;
  progress: number;
  reward: number;
  xp: number;
  start: string;
  end: string;
  active: boolean;
  claimed: boolean;
  canClaim: boolean;
  daysLeft: number;
};

type WalletData = {
  coins: number;
  checkin: Checkin;
  level: Level;
  quests: Quest[];
  events: GameEvent[];
  questsResetAt: number;
  packs: Pack[];
  messageCost: number;
  stats: { earned: number; spent: number };
  demo: boolean;
};

type Tx = {
  id: number;
  delta: number;
  kind: string;
  note: string | null;
  balance_after: number;
  created_at: number;
};

const TX_META: Record<string, { label: string; icon: string }> = {
  signup_bonus: { label: 'โบนัสสมัครสมาชิก', icon: '🎁' },
  checkin: { label: 'เช็คอินรายวัน', icon: '📅' },
  topup: { label: 'เติมคอยน์', icon: '＋' },
  gacha: { label: 'สุ่มกาชา', icon: '🎴' },
  chat: { label: 'แชทกับตัวละคร', icon: '💬' },
  quest: { label: 'รางวัลภารกิจรายวัน', icon: '🎯' },
  event: { label: 'รางวัลกิจกรรม', icon: '🎉' },
  levelup: { label: 'เลเวลอัป', icon: '⭐' },
};

export default function Wallet() {
  const { user, loading, updateCoins, updateUser } = useAuth();
  const { refresh: refreshNotifications } = useNotifications();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [w, t] = await Promise.all([
        api<WalletData>('/api/wallet'),
        api<{ transactions: Tx[] }>('/api/wallet/transactions?limit=40'),
      ]);
      setWallet(w);
      setTransactions(t.transactions);
      updateCoins(w.coins);
    } catch {
      setWallet(null);
    }
  }, [updateCoins]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(id);
  }, [toast]);

  async function claimCheckin() {
    setBusy('checkin');
    try {
      const res = await api<{
        coins: number;
        reward: number;
        streak: number;
        level: number;
        xp: number;
        levelBonus: number;
      }>('/api/wallet/checkin', { method: 'POST' });
      updateUser({ coins: res.coins, level: res.level, xp: res.xp });
      setToast({
        tone: 'ok',
        text:
          res.levelBonus > 0
            ? `เช็คอินสำเร็จ · เลเวลอัป Lv.${res.level}! รับ ${formatCoins(res.reward + res.levelBonus)} คอยน์`
            : `เช็คอินสำเร็จ! รับ ${formatCoins(res.reward)} คอยน์ (สตรีค ${res.streak} วัน)`,
      });
      await load();
      void refreshNotifications();
    } catch (err) {
      setToast({ tone: 'error', text: err instanceof Error ? err.message : 'เช็คอินไม่สำเร็จ' });
    } finally {
      setBusy(null);
    }
  }

  async function claimQuest(quest: Quest) {
    setBusy(quest.id);
    try {
      const res = await api<{
        coins: number;
        reward: number;
        level: number;
        xp: number;
        levelBonus: number;
      }>('/api/wallet/quests/claim', { method: 'POST', body: JSON.stringify({ id: quest.id }) });
      updateUser({ coins: res.coins, level: res.level, xp: res.xp });
      setToast({
        tone: 'ok',
        text:
          res.levelBonus > 0
            ? `เลเวลอัป Lv.${res.level}! รับรวม ${formatCoins(res.reward + res.levelBonus)} คอยน์`
            : `รับรางวัลภารกิจ ${formatCoins(res.reward)} คอยน์แล้ว`,
      });
      await load();
      void refreshNotifications();
    } catch (err) {
      setToast({ tone: 'error', text: err instanceof Error ? err.message : 'รับรางวัลไม่สำเร็จ' });
    } finally {
      setBusy(null);
    }
  }

  async function claimEvent(ev: GameEvent) {
    setBusy(ev.id);
    try {
      const res = await api<{
        coins: number;
        reward: number;
        level: number;
        xp: number;
        levelBonus: number;
      }>('/api/wallet/events/claim', { method: 'POST', body: JSON.stringify({ id: ev.id }) });
      updateUser({ coins: res.coins, level: res.level, xp: res.xp });
      setToast({
        tone: 'ok',
        text:
          res.levelBonus > 0
            ? `เลเวลอัป Lv.${res.level}! รับรวม ${formatCoins(res.reward + res.levelBonus)} คอยน์`
            : `รับรางวัลกิจกรรม ${formatCoins(res.reward)} คอยน์แล้ว`,
      });
      await load();
      void refreshNotifications();
    } catch (err) {
      setToast({ tone: 'error', text: err instanceof Error ? err.message : 'รับรางวัลกิจกรรมไม่สำเร็จ' });
    } finally {
      setBusy(null);
    }
  }

  async function topup(pack: Pack) {
    setBusy(pack.id);
    try {
      const res = await api<{ coins: number; added: number }>('/api/wallet/topup', {
        method: 'POST',
        body: JSON.stringify({ pack: pack.id }),
      });
      updateCoins(res.coins);
      setToast({ tone: 'ok', text: `รับ ${formatCoins(res.added)} คอยน์แล้ว` });
      await load();
      void refreshNotifications();
    } catch (err) {
      setToast({ tone: 'error', text: err instanceof Error ? err.message : 'เติมคอยน์ไม่สำเร็จ' });
    } finally {
      setBusy(null);
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
          <p className="text-4xl">🪙</p>
          <p className="mt-3 text-lg font-bold">กระเป๋าคอยน์</p>
          <p className="mt-1 text-sm text-zinc-500">
            เข้าสู่ระบบเพื่อดูยอดคอยน์ เช็คอินรายวัน และประวัติการใช้งาน
          </p>
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

  const checkin = wallet?.checkin;
  const doneCount = checkin ? (checkin.checkedInToday ? ((checkin.streak - 1) % 7) + 1 : checkin.nextCycleDay - 1) : 0;

  return (
    <div className="min-h-screen bg-[#08080A] pb-24 text-white md:pb-12">
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl font-bold">กระเป๋าคอยน์</h1>
          <Link to="/gacha" className="text-xs font-semibold text-[#FF8A3D] hover:underline">
            ไปที่กาชา →
          </Link>
        </div>

        {/* balance */}
        <section className="relative mt-4 overflow-hidden rounded-3xl border border-[#F4B208]/20 bg-gradient-to-br from-[#2A1B06] via-[#171009] to-[#0E0E10] p-5">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#F4B208]/15 blur-3xl" />
          <p className="text-xs font-medium text-[#F4B208]/80">ยอดคอยน์คงเหลือ</p>
          <div className="mt-1 flex items-end gap-2">
            <span className="text-4xl font-extrabold tracking-tight text-[#F4B208]">
              {formatCoins(wallet?.coins ?? user.coins)}
            </span>
            <span className="mb-1.5 text-sm text-zinc-500">คอยน์</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-zinc-400">
            <span>
              ได้รับทั้งหมด{' '}
              <span className="font-semibold text-emerald-400">
                {wallet && wallet.stats.earned > 0 ? `+${formatCoins(wallet.stats.earned)}` : '—'}
              </span>
            </span>
            <span>
              ใช้ไปทั้งหมด <span className="font-semibold text-rose-400">-{formatCoins(wallet?.stats.spent ?? 0)}</span>
            </span>
            <span>แชท {wallet?.messageCost ?? 2} คอยน์/ข้อความ</span>
          </div>
        </section>

        {/* level */}
        {wallet && (
          <section className="mt-4 overflow-hidden rounded-3xl border border-[#FF6A2B]/25 bg-gradient-to-br from-[#1E1209] via-[#121013] to-[#0E0E10] p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#FF8A3D] to-[#F04405] text-base font-black text-white shadow-lg shadow-orange-900/40">
                Lv.{wallet.level.level}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">เลเวลของคุณ</p>
                <p className="text-[11px] text-zinc-500">ได้ XP จากแชท สุ่มกาชา เช็คอิน และภารกิจ</p>
              </div>
              <p className="text-right text-[11px] font-semibold text-zinc-400">
                {formatCoins(wallet.level.xp)} XP
              </p>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#FF8A3D] to-[#F4B208] transition-all"
                style={{
                  width: `${Math.min(100, (wallet.level.into / Math.max(1, wallet.level.need)) * 100)}%`,
                }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
              <span>
                {wallet.level.nextBonus > 0
                  ? `อีก ${formatCoins(wallet.level.need - wallet.level.into)} XP ถึง Lv.${wallet.level.level + 1}`
                  : 'ถึงเลเวลสูงสุดแล้ว'}
              </span>
              <span className="text-[#F4B208]">
                {wallet.level.nextBonus > 0
                  ? `เลเวลอัปได้ +${formatCoins(wallet.level.nextBonus)} คอยน์`
                  : '—'}
              </span>
            </div>
          </section>
        )}

        {/* check-in */}
        <section className="mt-4 rounded-3xl border border-white/8 bg-[#111113] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">เช็คอินรายวัน</h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                สตรีค {checkin?.streak ?? 0} วัน · รีเซ็ตเที่ยงคืนเวลาไทย
              </p>
            </div>
            <button
              type="button"
              onClick={() => void claimCheckin()}
              disabled={busy !== null || !checkin || checkin.checkedInToday}
              className="shrink-0 rounded-full bg-gradient-to-r from-[#FF8A3D] to-[#F04405] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-orange-900/30 transition-transform enabled:hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {busy === 'checkin'
                ? 'กำลังรับ...'
                : checkin?.checkedInToday
                  ? 'วันนี้เช็คอินแล้ว'
                  : `รับ ${checkin?.nextReward ?? 0} คอยน์`}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1.5">
            {(checkin?.rewards ?? [20, 25, 30, 35, 40, 50, 100]).map((reward, i) => {
              const day = i + 1;
              const done = day <= doneCount;
              const isNext = !done && day === checkin?.nextCycleDay;
              return (
                <div
                  key={day}
                  className={`rounded-xl border px-1 py-2 text-center transition-colors ${
                    done
                      ? 'border-[#F4B208]/30 bg-[#F4B208]/10'
                      : isNext
                        ? 'border-[#FF6A2B] bg-[#FF6A2B]/10'
                        : 'border-white/8 bg-black/30'
                  }`}
                >
                  <p className="text-[10px] text-zinc-500">วันที่ {day}</p>
                  <p
                    className={`text-[13px] font-bold ${
                      done ? 'text-[#F4B208]' : isNext ? 'text-[#FF8A3D]' : 'text-zinc-400'
                    }`}
                  >
                    {done ? '✓' : `+${reward}`}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* daily quests */}
        {wallet && (
          <section className="mt-4 rounded-3xl border border-white/8 bg-[#111113] p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold">ภารกิจรายวัน</h2>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                รับแล้ว {wallet.quests.filter((q) => q.claimed).length}/{wallet.quests.length}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">
              ความคืบหน้านับจากกิจกรรมจริงวันนี้ · รีเซ็ตพร้อมเช็คอินเที่ยงคืนเวลาไทย
            </p>

            <ul className="mt-3 space-y-2">
              {wallet.quests.map((q) => {
                const pct = Math.min(100, (q.progress / q.goal) * 100);
                return (
                  <li
                    key={q.id}
                    className={`rounded-2xl border p-3 transition-colors ${
                      q.claimed
                        ? 'border-white/5 bg-black/20 opacity-70'
                        : q.canClaim
                          ? 'border-[#F4B208]/35 bg-[#1A1209]'
                          : 'border-white/8 bg-black/25'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-zinc-100">{q.title}</p>
                        <p className="text-[11px] text-zinc-500">{q.desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void claimQuest(q)}
                        disabled={!q.canClaim || busy !== null}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
                          q.canClaim
                            ? 'bg-gradient-to-r from-[#FF8A3D] to-[#F04405] text-white hover:brightness-110'
                            : 'cursor-not-allowed bg-white/5 text-zinc-500'
                        }`}
                      >
                        {busy === q.id
                          ? 'กำลังรับ...'
                          : q.claimed
                            ? '✓ รับแล้ว'
                            : q.canClaim
                              ? `รับ +${formatCoins(q.reward)}`
                              : `${q.progress}/${q.goal}`}
                      </button>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/8">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#FF8A3D] to-[#F4B208] transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-zinc-500">+{q.xp} XP</span>
                      {!q.claimed && !q.canClaim && (
                        <Link to={q.to} className="text-[10px] font-semibold text-[#FF8A3D] hover:underline">
                          ไปทำ →
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* events */}
        {wallet && wallet.events.some((e) => e.active) && (
          <section className="mt-4 rounded-3xl border border-[#FF6A2B]/25 bg-gradient-to-br from-[#1A0F08] via-[#111014] to-[#0E0E10] p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold">กิจกรรมพิเศษ</h2>
              <span className="rounded-full border border-[#FF6A2B]/40 bg-[#FF6A2B]/10 px-2 py-0.5 text-[10px] font-bold text-[#FF8A3D]">
                Event
              </span>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">
              ทำภารกิจในอีเวนต์ให้ครบเพื่อรับรางวัลใหญ่ · แจ้งเตือนบน header เมื่อรับได้
            </p>

            <ul className="mt-3 space-y-2">
              {wallet.events
                .filter((ev) => ev.active)
                .map((ev) => {
                  const pct = Math.min(100, (ev.progress / ev.goal) * 100);
                  return (
                    <li
                      key={ev.id}
                      className={`rounded-2xl border p-3 transition-colors ${
                        ev.claimed
                          ? 'border-white/5 bg-black/20 opacity-70'
                          : ev.canClaim
                            ? 'border-[#FF6A2B]/40 bg-[#1C1109]'
                            : 'border-white/8 bg-black/25'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-zinc-100">{ev.title}</p>
                          <p className="text-[11px] text-zinc-500">{ev.desc}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void claimEvent(ev)}
                          disabled={!ev.canClaim || busy !== null}
                          className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
                            ev.canClaim
                              ? 'bg-gradient-to-r from-[#FF8A3D] to-[#F04405] text-white hover:brightness-110'
                              : 'cursor-not-allowed bg-white/5 text-zinc-500'
                          }`}
                        >
                          {busy === ev.id
                            ? 'กำลังรับ...'
                            : ev.claimed
                              ? '✓ รับแล้ว'
                              : ev.canClaim
                                ? `รับ +${formatCoins(ev.reward)}`
                                : `${ev.progress}/${ev.goal}`}
                        </button>
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/8">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#FF6A2B] to-[#F4B208] transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-zinc-500">+{ev.xp} XP</span>
                        <span className="text-[10px] text-zinc-600">เหลือ {ev.daysLeft} วัน</span>
                      </div>
                    </li>
                  );
                })}
            </ul>
          </section>
        )}

        {/* top-up */}
        <section className="mt-4 rounded-3xl border border-white/8 bg-[#111113] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">เติมคอยน์</h2>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
              โหมดทดลอง
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            ยังไม่ต่อระบบจ่ายเงินจริง — แพ็กจะพร้อมใช้ใหม่ตามรอบเวลา ถ้าต่อ Stripe/Omise ทีหลังระบบคอยน์เดิมใช้ได้ต่อทันที
          </p>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
            {(wallet?.packs ?? []).map((pack) => {
              const ready = pack.availableIn <= 0;
              return (
                <div
                  key={pack.id}
                  className={`rounded-2xl border p-3.5 transition-colors ${
                    ready ? 'border-[#FF6A2B]/35 bg-[#1A1209]' : 'border-white/8 bg-black/25 opacity-70'
                  }`}
                >
                  <p className="text-[11px] text-zinc-500">{pack.label}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-lg font-extrabold text-[#F4B208]">
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-gradient-to-b from-amber-300 to-amber-600 text-[9px] font-black text-amber-900">
                      ₵
                    </span>
                    {formatCoins(pack.coins)}
                  </p>
                  <button
                    type="button"
                    onClick={() => void topup(pack)}
                    disabled={!ready || busy !== null}
                    className={`mt-3 w-full rounded-full py-1.5 text-[11px] font-bold transition-all ${
                      ready
                        ? 'bg-gradient-to-r from-[#FF8A3D] to-[#F04405] text-white shadow-md shadow-orange-900/30 hover:brightness-110'
                        : 'cursor-not-allowed bg-white/5 text-zinc-500'
                    } disabled:cursor-not-allowed`}
                  >
                    {busy === pack.id
                      ? 'กำลังเติม...'
                      : ready
                        ? 'รับเลย (ฟรี)'
                        : `พร้อมใน ${formatDuration(pack.availableIn)}`}
                  </button>
                </div>
              );
            })}
            {!wallet && <p className="text-xs text-zinc-600">กำลังโหลดแพ็ก...</p>}
          </div>
        </section>

        {/* transactions */}
        <section className="mt-4 rounded-3xl border border-white/8 bg-[#111113] p-5">
          <h2 className="text-base font-bold">ประวัติธุรกรรม</h2>
          <p className="mt-0.5 text-xs text-zinc-500">บันทึกทุกครั้งที่คอยน์เพิ่มหรือลด เก็บใน D1</p>

          {transactions.length === 0 ? (
            <p className="mt-6 text-center text-xs text-zinc-600">ยังไม่มีรายการ</p>
          ) : (
            <ul className="mt-3 divide-y divide-white/5">
              {transactions.map((tx) => {
                const meta = TX_META[tx.kind] ?? { label: tx.kind, icon: '•' };
                return (
                  <li key={tx.id} className="flex items-center gap-3 py-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5 text-sm">
                      {meta.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-zinc-200">{meta.label}</p>
                      <p className="text-[11px] text-zinc-500">{formatDateTime(tx.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-[13px] font-bold ${
                          tx.delta > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {tx.delta > 0 ? '+' : ''}
                        {formatCoins(tx.delta)}
                      </p>
                      <p className="text-[10px] text-zinc-600">คงเหลือ {formatCoins(tx.balance_after)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      <MobileNav />

      {toast && (
        <div
          className={`fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border px-4 py-2 text-xs font-semibold shadow-2xl md:bottom-8 ${
            toast.tone === 'ok'
              ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200'
              : 'border-red-500/30 bg-red-500/15 text-red-200'
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
