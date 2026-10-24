import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { characters } from '../data/characters';

export default function Characters() {
  return (
    <div className="min-h-screen bg-[#08080A] pb-16 text-white">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-xl font-bold">ตัวละครทั้งหมด</h1>
        <p className="mt-1 text-sm text-zinc-500">เลือกตัวละครที่คุณชอบเพื่อเริ่มบทสนทนา</p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {characters.map((c) => (
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
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-2.5">
                <p className="truncate text-[13px] font-semibold leading-tight">{c.name}</p>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-400">{c.quote}</p>
                <p className="mt-1 text-[10px] text-zinc-500">💬 {c.chats}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
