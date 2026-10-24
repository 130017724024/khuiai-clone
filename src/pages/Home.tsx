import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import MobileNav from '../components/MobileNav';
import { characters } from '../data/characters';

const filters = ['ทั้งหมด', 'โรแมนติก', 'แฟนตาซี', 'ตลก', 'นักศึกษา', 'ไอดอล', 'ชาย', 'หญิง'];

const promos = [
  {
    title: 'เช็คอินรายวัน',
    subtitle: 'รับคอยน์ฟรีสูงสุด 100 คอยน์ ต่อเนื่อง 7 วัน',
    emoji: '🎁',
    to: '/wallet',
  },
  {
    title: 'กาชาตัวละคร',
    subtitle: 'สุ่มการ์ด N / R / SR / SSR / UR พร้อมการันตี SR+',
    emoji: '🎴',
    to: '/gacha',
  },
  {
    title: 'เข้าร่วมคอมมูนิตี้ บน Facebook',
    subtitle: 'ร่วมสนุกกับเกมส์ การแข่งขัน และกิจกรรมพิเศษ',
    emoji: '📣',
    to: '/signup',
  },
  {
    title: 'เข้าร่วมคอมมูนิตี้ บน Discord',
    subtitle: 'พูดคุยกับครีเอเตอร์และแฟนคลับตัวละคร',
    emoji: '💬',
    to: '/signup',
  },
];

export default function Home() {
  const [filter, setFilter] = useState('ทั้งหมด');
  const [query, setQuery] = useState('');

  const visible = characters.filter((c) => {
    const matchQuery =
      !query.trim() ||
      c.name.toLowerCase().includes(query.trim().toLowerCase()) ||
      c.quote.toLowerCase().includes(query.trim().toLowerCase());
    const matchFilter = filter === 'ทั้งหมด' || c.tags.includes(filter);
    return matchQuery && matchFilter;
  });

  return (
    <div className="min-h-screen bg-[#08080A] pb-24 text-white md:pb-10">
      <Header />

      <main className="mx-auto max-w-6xl px-4">
        {/* promo strip */}
        <section className="mt-4 flex snap-x gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {promos.map((p) => (
            <Link
              key={p.title}
              to={p.to}
              className="relative min-w-[260px] flex-1 snap-start overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br from-[#2A1206] via-[#1A0F09] to-[#111113] p-4 transition-colors hover:border-[#FF6A2B]/40"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#FF6A2B]/15 text-base">
                  {p.emoji}
                </span>
                <p className="text-sm font-bold text-[#F4B208]">{p.title}</p>
              </div>
              <p className="text-xs leading-relaxed text-zinc-400">{p.subtitle}</p>
              <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[#F04405]/20 blur-2xl" />
            </Link>
          ))}
        </section>

        {/* search */}
        <section className="mt-5 flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-full border border-white/8 bg-[#141416] px-4 py-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาตัวละคร"
              className="w-full bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
            />
          </div>
          <button
            type="button"
            aria-label="ตัวกรอง"
            className="grid h-10 w-10 place-items-center rounded-full border border-white/8 bg-[#141416] text-zinc-400"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
          </button>
        </section>

        {/* filters */}
        <section className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-gradient-to-r from-[#FF8A3D] to-[#F04405] text-white'
                  : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </section>

        {/* grid */}
        <section className="mt-7">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <span className="text-[#FF6A2B]">✦</span> สำหรับคุณ
          </h2>

          {visible.length === 0 ? (
            <p className="rounded-2xl border border-white/8 bg-[#111113] p-8 text-center text-sm text-zinc-500">
              ไม่พบตัวละครที่ตรงกับคำค้นของคุณ
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {visible.map((c) => (
                <Link
                  key={c.id}
                  to={`/chat/${c.id}`}
                  className="group relative overflow-hidden rounded-2xl bg-[#141416]"
                >
                  <div className="aspect-[3/4] w-full overflow-hidden">
                    <img
                      src={c.image}
                      alt={c.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />

                  <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                    {c.tags.slice(0, 1).map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-zinc-200 backdrop-blur-sm"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-2.5">
                    <p className="truncate text-[13px] font-semibold leading-tight text-white">{c.name}</p>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-400">{c.quote}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 21l1.9-5a8.4 8.4 0 1 1 16.1-4.5Z" />
                        </svg>
                        {c.chats}
                      </span>
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-[10px] text-white backdrop-blur-sm">
                        ♥
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {!visible.some((c) => c.tags.includes('ไอดอล')) && filter === 'ทั้งหมด' && (
          <p className="mt-6 text-center text-xs text-zinc-600">
            ตัวละครทั้งหมด {characters.length} ตัว · เพิ่มใหม่ทุกวัน
          </p>
        )}
      </main>

      <MobileNav />
    </div>
  );
}
