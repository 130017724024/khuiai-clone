import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from '../components/Header';
import { getCharacter } from '../data/characters';
import { useAuth } from '../lib/auth';
import { useNotifications } from '../lib/notifications';

type Message = { role: 'user' | 'assistant'; content: string };

const COST = 2;

export default function Chat() {
  const { id } = useParams<{ id: string }>();
  const character = getCharacter(id);
  const { user, loading, updateCoins, updateUser } = useAuth();
  const { refresh: refreshNotifications } = useNotifications();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([]);
    if (!user) return;
    fetch(`/api/chat/${character.id}`, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { messages: [] }))
      .then((data: { messages?: Message[] }) => {
        setMessages(data.messages?.length ? data.messages : [{ role: 'assistant', content: character.greeting }]);
      })
      .catch(() => setMessages([{ role: 'assistant', content: character.greeting }]));
  }, [character.id, character.greeting, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  async function send() {
    const content = input.trim();
    if (!content || sending || !user) return;
    setError('');
    setSending(true);
    setInput('');
    setMessages((m) => [...m, { role: 'user', content }]);

    try {
      const res = await fetch(`/api/chat/${character.id}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'ส่งข้อความไม่สำเร็จ');
        if (typeof data.coins === 'number') updateCoins(data.coins);
        return;
      }
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
      void refreshNotifications();
      if (typeof data.coins === 'number') {
        updateUser({
          coins: data.coins,
          ...(typeof data.level === 'number' ? { level: data.level } : {}),
          ...(typeof data.xp === 'number' ? { xp: data.xp } : {}),
        });
      }
    } catch {
      setError('เชื่อมต่อไม่ได้ กรุณาลองใหม่');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#08080A] text-white">
      <Header />

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-0 sm:px-4">
        {/* character bar */}
        <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
          <Link to="/" className="text-zinc-500 transition-colors hover:text-white" aria-label="กลับ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <img src={character.image} alt="" className="h-10 w-10 rounded-full object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{character.name}</p>
            <p className="flex items-center gap-1.5 text-[11px] text-zinc-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> ออนไลน์ · ตอบกลับทันที
            </p>
          </div>
          <span className="rounded-full border border-[#F4B208]/30 bg-[#F4B208]/10 px-2.5 py-1 text-[11px] font-semibold text-[#F4B208]">
            {COST} คอยน์/ข้อความ
          </span>
        </div>

        {/* messages */}
        <div className="relative flex-1 overflow-y-auto">
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.05]"
            style={{ backgroundImage: `url(${character.image})` }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[#08080A]/70" />
          <div className="relative space-y-3 p-4">
            {loading && <p className="text-center text-xs text-zinc-600">กำลังโหลด...</p>}

            {!loading && !user && (
              <div className="mx-auto max-w-sm rounded-2xl border border-white/8 bg-[#111113] p-6 text-center">
                <p className="mb-1 text-sm font-semibold">เข้าสู่ระบบเพื่อเริ่มแชท</p>
                <p className="mb-4 text-xs text-zinc-500">
                  สมัครฟรีรับ 170 คอยน์ ใช้คุยกับ {character.name} ได้เลย
                </p>
                <div className="flex gap-2">
                  <Link
                    to="/login"
                    className="flex-1 rounded-full border border-white/12 py-2 text-xs font-semibold text-white"
                  >
                    เข้าสู่ระบบ
                  </Link>
                  <Link
                    to="/signup"
                    className="flex-1 rounded-full bg-gradient-to-r from-[#FF8A3D] to-[#F04405] py-2 text-xs font-semibold text-white"
                  >
                    สมัครสมาชิก
                  </Link>
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <img src={character.image} alt="" className="mt-auto h-7 w-7 shrink-0 rounded-full object-cover" />
                )}
                <div
                  className={`max-w-[78%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'rounded-br-md bg-gradient-to-br from-[#FF8A3D] to-[#F04405] text-white'
                      : 'rounded-bl-md bg-[#1A1A1D] text-zinc-100'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex gap-2">
                <img src={character.image} alt="" className="h-7 w-7 rounded-full object-cover" />
                <div className="rounded-2xl rounded-bl-md bg-[#1A1A1D] px-4 py-3 text-sm text-zinc-400">
                  กำลังพิมพ์...
                </div>
              </div>
            )}

            {error && (
              <p className="mx-auto max-w-sm rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-xs text-red-300">
                {error}{' '}
                {error.includes('คอยน์') && (
                  <Link to="/wallet" className="underline">
                    เติมคอยน์
                  </Link>
                )}
              </p>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* composer */}
        <div className="sticky bottom-0 border-t border-white/8 bg-[#0A0A0B] p-3">
          <div className="flex items-end gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              disabled={!user || sending}
              placeholder={user ? 'พิมพ์ข้อความ...' : 'เข้าสู่ระบบเพื่อพิมพ์ข้อความ'}
              className="flex-1 rounded-full border border-white/10 bg-[#141416] px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-colors focus:border-[#FF6A2B] disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={!user || sending || !input.trim()}
              className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#FF8A3D] to-[#F04405] text-white transition-transform enabled:hover:scale-105 disabled:opacity-40"
              aria-label="ส่ง"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m22 2-7 20-4-9-9-4Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
