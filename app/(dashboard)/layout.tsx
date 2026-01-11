'use client';

import Link from 'next/link';
import { useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { BellRing, Cat, LogOut, Mail } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut } from '@/app/(login)/actions';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/db/schema';
import useSWR, { mutate } from 'swr';
import { SiteFooter } from '@/components/site/footer';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function UserMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    mutate('/api/user');
    router.push('/');
  }

  if (!user) {
    return (
      <>
        <Link
          href="/"
          className="text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Home
        </Link>
        <Link
          href="/pricing"
          className="text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Pricing
        </Link>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/sign-in">Sign in</Link>
        </Button>
        <Button asChild className="rounded-full">
          <Link href="/sign-up">Get alerts</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <Link
        href="/dashboard/alerts"
        className="text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        Alerts
      </Link>
      <Link
        href="/dashboard/preferences"
        className="text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        Notifications
      </Link>

      <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DropdownMenuTrigger>
          <Avatar className="cursor-pointer size-9">
            <AvatarImage alt={user.name || ''} />
            <AvatarFallback>
              {user.email
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="flex flex-col gap-1">
          <DropdownMenuItem className="cursor-pointer">
            <Link href="/dashboard/alerts" className="flex w-full items-center">
              <BellRing className="mr-2 h-4 w-4" />
              <span>Alerts</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <Link
              href="/dashboard/preferences"
              className="flex w-full items-center"
            >
              <Mail className="mr-2 h-4 w-4" />
              <span>Notifications</span>
            </Link>
          </DropdownMenuItem>
          <form action={handleSignOut} className="w-full">
            <button type="submit" className="flex w-full">
              <DropdownMenuItem className="w-full flex-1 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </button>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/70 bg-white/70 backdrop-blur-md backdrop-saturate-150">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center">
          <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Cat className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white text-primary ring-1 ring-gray-200">
              <BellRing className="h-2.5 w-2.5" />
            </span>
          </span>
          <span className="ml-2 text-xl font-semibold text-gray-900">
            Jellycat Alerts
          </span>
        </Link>
        <div className="flex items-center space-x-4">
          <Suspense fallback={<div className="h-9" />}>
            <UserMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex flex-col min-h-screen">
      <Header />
      {children}
      <SiteFooter />
    </section>
  );
}
