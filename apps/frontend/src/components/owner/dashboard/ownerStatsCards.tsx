'use client';

import Link from 'next/link';
import {
  ArrowUpRight,
  Calendar,
  Users,
  UserPlus,
  Dumbbell,
} from 'lucide-react';

type StatCard = {
  label: string;
  value: number;
  sub: string;
  href: string;
  bg: string;
  iconBg: string;
  icon: React.ComponentType<{ className?: string }>;
};

type Props = {
  classesToday: number;
  bookingsToday: number;
  walkInsToday: number;
  clientsTotal: number;
  locale: string;
};

export function OwnerStatsCards({
  classesToday,
  bookingsToday,
  walkInsToday,
  clientsTotal,
  locale,
}: Props) {
  const base = `/${locale}/owner`;
  const cards: StatCard[] = [
    {
      label: 'Classes today',
      value: classesToday,
      sub: 'View schedule',
      href: `${base}/calendar`,
      bg: 'bg-[#E8F5D0]',
      iconBg: 'bg-[#C2F600]/30 text-[#5a7a00]',
      icon: Dumbbell,
    },
    {
      label: 'Bookings',
      value: bookingsToday,
      sub: 'View all',
      href: `${base}/calendar`,
      bg: 'bg-[#FAD0C5]',
      iconBg: 'bg-[#FF5B5B]/20 text-[#F15942]',
      icon: Calendar,
    },
    {
      label: 'Walk-ins',
      value: walkInsToday,
      sub: 'View clients',
      href: `${base}/clients`,
      bg: 'bg-[#FFF0E0]',
      iconBg: 'bg-[#FF6B4A]/20 text-[#E86D4F]',
      icon: UserPlus,
    },
    {
      label: 'Clients',
      value: clientsTotal,
      sub: 'View all',
      href: `${base}/clients`,
      bg: 'bg-[#EDE9F6]',
      iconBg: 'bg-[#3F3287]/15 text-[#3F3287]',
      icon: Users,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.label}
            href={card.href}
            className={`group rounded-2xl p-5 transition hover:shadow-md ${card.bg}`}
          >
            <div className="flex items-start justify-between">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBg}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-zinc-400 opacity-0 transition group-hover:opacity-100" />
            </div>
            <p className="mt-4 text-sm font-medium text-zinc-600">
              {card.label}
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-[#3F3F3F]">
              {card.value}
            </p>
            <p className="mt-2 text-xs font-medium text-zinc-500">
              {card.sub} →
            </p>
          </Link>
        );
      })}
    </div>
  );
}
