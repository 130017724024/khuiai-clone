import { Link, useLocation } from 'react-router-dom';
import { useNotifications } from '../lib/notifications';

const items = [
  { icon: '⌂', label: 'หน้าหลัก', to: '/' },
  { icon: '▦', label: 'ตัวละคร', to: '/characters' },
  { icon: '🎴', label: 'กาชา', to: '/gacha' },
  { icon: '🪙', label: 'คอยน์', to: '/wallet' },
];

export default function MobileNav() {
  const { pathname } = useLocation();
  const { count } = useNotifications();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-white/8 bg-[#0A0A0B]/95 px-2 py-2 backdrop-blur-md md:hidden">
      {items.map((item) => {
        const active = pathname === item.to;
        return (
          <Link
            key={item.label}
            to={item.to}
            className={`flex flex-col items-center gap-0.5 px-3 transition-colors ${
              active ? 'text-[#FF8A3D]' : 'text-zinc-500'
            }`}
          >
            <span className="relative text-base leading-none">
              {item.icon}
              {item.to === '/wallet' && count > 0 && (
                <span className="absolute -right-2 -top-1 h-2 w-2 rounded-full bg-[#FF4D0F]" />
              )}
            </span>
            <span className="text-[10px]">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
