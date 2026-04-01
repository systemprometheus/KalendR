'use client';

import Link from 'next/link';
import { startTransition, useDeferredValue, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ChevronRight,
  Command,
  Search,
  Sparkles,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  HELP_ARTICLES,
  HELP_CATEGORIES,
  HELP_POPULAR_SEARCHES,
  HELP_RESOURCES,
  HELP_SHORTCUTS,
  HELP_SUPPORT_CARDS,
} from './help-center-data';

function matchesArticle(article: (typeof HELP_ARTICLES)[number], query: string) {
  if (!query) return true;

  const haystack = [
    article.title,
    article.description,
    article.breadcrumb,
    ...article.quickAnswer,
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

function ActionLink({
  href,
  external,
  className,
  children,
}: {
  href: string;
  external?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  if (external) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function HelpCenter() {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const searchRef = useRef<HTMLInputElement>(null);
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const visibleArticles = HELP_ARTICLES.filter((article) => {
    const matchesCategory = selectedCategory === 'all' || article.categoryId === selectedCategory;
    return matchesCategory && matchesArticle(article, normalizedQuery);
  });

  const activeCategory = HELP_CATEGORIES.find((category) => category.id === selectedCategory) || null;

  return (
    <div className="space-y-10 animate-fade-in">
      <section
        className="relative overflow-hidden rounded-[32px] border border-[#dbe7ff] bg-white p-6 shadow-[0_24px_70px_-38px_rgba(0,105,255,0.45)] sm:p-8 lg:p-10"
        style={{
          backgroundImage:
            'radial-gradient(circle at top left, rgba(0,105,255,0.14), transparent 32%), radial-gradient(circle at 80% 20%, rgba(99,102,241,0.16), transparent 24%), linear-gradient(135deg, #ffffff 0%, #f8fbff 55%, #eef4ff 100%)',
        }}
      >
        <div className="absolute inset-y-0 right-0 hidden w-[36%] opacity-60 lg:block">
          <div className="absolute right-12 top-12 h-36 w-36 rounded-full bg-[#0069ff]/10 blur-3xl" />
          <div className="absolute bottom-8 right-6 h-48 w-48 rounded-full bg-indigo-400/10 blur-3xl" />
        </div>

        <div className="relative max-w-4xl">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#c7d9ff] bg-white/80 px-4 py-2 text-sm font-semibold text-[#0052cc] shadow-sm">
              <Sparkles className="h-4 w-4" />
              Help Center
            </span>
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-white/70 px-4 py-2 text-sm text-gray-600">
              Learning Hub
            </span>
          </div>

          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-gray-950 sm:text-5xl">
            How can we help?
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">
            Find clear answers, solve issues fast, and get back to booking without the back-and-forth.
          </p>

          <div className="mt-8 max-w-3xl">
            <label htmlFor="help-search" className="sr-only">
              Search help articles
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchRef}
                id="help-search"
                type="search"
                value={query}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  startTransition(() => setQuery(nextValue));
                }}
                placeholder="Search help articles, settings, and workflows..."
                className="w-full rounded-[22px] border border-[#cfdcff] bg-white px-14 py-4 text-base text-gray-900 shadow-[0_12px_30px_-24px_rgba(0,105,255,0.6)] outline-none transition focus:border-[#0069ff] focus:ring-4 focus:ring-[#0069ff]/10"
                spellCheck={false}
              />
              <div className="absolute right-4 top-1/2 hidden -translate-y-1/2 items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-500 md:flex">
                <Command className="h-3.5 w-3.5" />
                K
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-500">Popular searches</span>
              {HELP_POPULAR_SEARCHES.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => {
                    startTransition(() => setQuery(term));
                  }}
                  className="rounded-full border border-[#d9e6ff] bg-white px-3 py-1.5 text-sm text-gray-600 transition hover:border-[#0069ff]/40 hover:text-[#0052cc]"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-5 xl:sticky xl:top-8 xl:self-start">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-gray-100 px-5 py-4">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-400">Categories</p>
            </div>
            <div className="p-2">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                  selectedCategory === 'all'
                    ? 'bg-[#eef4ff] text-[#0052cc]'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  selectedCategory === 'all' ? 'bg-white text-[#0069ff]' : 'bg-gray-100 text-gray-500'
                }`}>
                  <Search className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold">All topics</p>
                  <p className="text-xs text-gray-500">{HELP_ARTICLES.length} guides and quick answers</p>
                </div>
              </button>

              {HELP_CATEGORIES.map((category) => {
                const count = HELP_ARTICLES.filter((article) => article.categoryId === category.id).length;
                const active = selectedCategory === category.id;

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategory(category.id)}
                    className={`mt-1 flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${
                      active ? 'bg-[#eef4ff] text-[#0052cc]' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl ${
                      active ? 'bg-white text-[#0069ff]' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <category.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold">{category.name}</p>
                      <p className="mt-1 text-xs leading-5 text-gray-500">{category.description}</p>
                      <p className="mt-1 text-xs font-medium text-gray-400">{count} articles</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)]">
            <p className="text-sm font-semibold text-gray-900">Need a hand?</p>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Reach the KalendR team directly for setup questions, billing help, or rollout planning.
            </p>
            <div className="mt-4 space-y-2">
              {HELP_SUPPORT_CARDS.map((card) => (
                <ActionLink
                  key={card.title}
                  href={card.href}
                  external={card.external}
                  className="group flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:border-[#0069ff]/30 hover:text-[#0052cc]"
                >
                  <span className="flex items-center gap-3">
                    <card.icon className="h-4 w-4 text-[#0069ff]" />
                    {card.title}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-gray-400 transition group-hover:text-[#0069ff]" />
                </ActionLink>
              ))}
            </div>
          </Card>
        </aside>

        <div className="space-y-8">
          <section className="flex flex-col gap-3 rounded-[28px] border border-white/80 bg-white/70 p-5 shadow-[0_18px_60px_-42px_rgba(15,23,42,0.45)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-400">Help Center</p>
              <h2 className="mt-1 text-2xl font-semibold text-gray-950">
                {activeCategory ? activeCategory.name : 'Featured articles'}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {activeCategory
                  ? activeCategory.description
                  : 'Quick answers for the workflows people reach for most often.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#eef4ff] px-3 py-1.5 text-sm font-medium text-[#0052cc]">
                {visibleArticles.length} result{visibleArticles.length === 1 ? '' : 's'}
              </span>
              {(query || selectedCategory !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('all');
                    startTransition(() => setQuery(''));
                  }}
                  className="rounded-full border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900"
                >
                  Clear filters
                </button>
              )}
            </div>
          </section>

          {visibleArticles.length > 0 ? (
            <section className="grid gap-5 lg:grid-cols-2">
              {visibleArticles.map((article) => (
                <Card
                  key={article.id}
                  className="group rounded-[28px] border-[#e6ebf5] p-6 transition duration-200 hover:-translate-y-0.5 hover:border-[#bdd4ff] hover:shadow-[0_26px_60px_-44px_rgba(0,105,255,0.55)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[#0069ff]">
                        {HELP_CATEGORIES.find((category) => category.id === article.categoryId)?.name}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-gray-950">{article.title}</h3>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#0069ff] transition group-hover:bg-[#0069ff] group-hover:text-white">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-gray-600">{article.description}</p>
                  <p className="mt-4 text-xs font-medium uppercase tracking-[0.12em] text-gray-400">
                    {article.breadcrumb}
                  </p>

                  <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Quick answer</p>
                    <ol className="mt-3 space-y-2">
                      {article.quickAnswer.map((step) => (
                        <li key={step} className="flex items-start gap-3 text-sm leading-6 text-gray-700">
                          <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-semibold text-[#0069ff] shadow-sm">
                            •
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <ActionLink
                    href={article.href}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0069ff] transition hover:text-[#0052cc]"
                  >
                    {article.hrefLabel}
                    <ArrowUpRight className="h-4 w-4" />
                  </ActionLink>
                </Card>
              ))}
            </section>
          ) : (
            <Card className="rounded-[28px] py-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#eef4ff] text-[#0069ff]">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-gray-950">No matching articles yet</h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-600">
                Try a different search term, or clear the filters to browse the most common setup and troubleshooting guides.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  startTransition(() => setQuery(''));
                }}
                className="mt-6 inline-flex items-center rounded-full bg-[#0069ff] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052cc]"
              >
                Reset search
              </button>
            </Card>
          )}

          <section>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-400">Using KalendR</p>
                <h2 className="mt-1 text-2xl font-semibold text-gray-950">Start with common tasks</h2>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {HELP_SHORTCUTS.map((shortcut) => (
                <Link
                  key={shortcut.title}
                  href={shortcut.href}
                  className="group rounded-[24px] border border-white bg-white p-5 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5 hover:border-[#bdd4ff]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#0069ff]">
                    <shortcut.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-950">{shortcut.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{shortcut.description}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0069ff]">
                    Open
                    <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            {HELP_RESOURCES.map((resource) => (
              <Link
                key={resource.title}
                href={resource.href}
                className={`group relative overflow-hidden rounded-[30px] border p-7 ${
                  resource.tone === 'dark'
                    ? 'border-[#0f172a] bg-[#0f172a] text-white shadow-[0_24px_60px_-40px_rgba(15,23,42,0.85)]'
                    : 'border-[#dbe7ff] bg-white text-gray-900 shadow-[0_24px_60px_-44px_rgba(0,105,255,0.45)]'
                }`}
                style={
                  resource.tone === 'light'
                    ? {
                        backgroundImage:
                          'radial-gradient(circle at top right, rgba(0,105,255,0.16), transparent 28%), linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)',
                      }
                    : {
                        backgroundImage:
                          'radial-gradient(circle at top right, rgba(56,189,248,0.16), transparent 24%), linear-gradient(135deg, #0f172a 0%, #111827 100%)',
                      }
                }
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                  resource.tone === 'dark' ? 'bg-white/10 text-white' : 'bg-[#eef4ff] text-[#0069ff]'
                }`}>
                  <resource.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-2xl font-semibold">{resource.title}</h3>
                <p className={`mt-3 max-w-xl text-sm leading-6 ${
                  resource.tone === 'dark' ? 'text-slate-300' : 'text-gray-600'
                }`}>
                  {resource.description}
                </p>
                <span className={`mt-6 inline-flex items-center gap-2 text-sm font-semibold ${
                  resource.tone === 'dark' ? 'text-white' : 'text-[#0069ff]'
                }`}>
                  {resource.cta}
                  <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </Link>
            ))}
          </section>

          <section className="rounded-[30px] border border-[#d9e6ff] bg-white p-7 shadow-[0_24px_60px_-44px_rgba(0,105,255,0.4)]">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-400">Still need help?</p>
            <h2 className="mt-2 text-3xl font-semibold text-gray-950">Get human help when you need it</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              Reach out for troubleshooting, billing questions, or rollout planning and we’ll help you get unstuck.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {HELP_SUPPORT_CARDS.map((card) => (
                <ActionLink
                  key={card.title}
                  href={card.href}
                  external={card.external}
                  className="group flex items-start justify-between rounded-[24px] border border-gray-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 transition hover:border-[#bdd4ff]"
                >
                  <div className="flex gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#0069ff]">
                      <card.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-950">{card.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-gray-600">{card.description}</p>
                    </div>
                  </div>
                  <ArrowUpRight className="mt-1 h-5 w-5 text-gray-400 transition group-hover:text-[#0069ff]" />
                </ActionLink>
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {HELP_CATEGORIES.map((category) => (
              <Card key={category.id} className="rounded-[24px] border-[#e6ebf5]">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#0069ff]">
                    <category.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-950">{category.name}</h3>
                    <p className="text-sm text-gray-500">{category.description}</p>
                  </div>
                </div>
                <div className="mt-5 space-y-2">
                  {category.links.map((link) => (
                    <ActionLink
                      key={link.label}
                      href={link.href}
                      external={link.external}
                      className="group flex items-center justify-between rounded-2xl px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 hover:text-gray-950"
                    >
                      <span>{link.label}</span>
                      <ChevronRight className="h-4 w-4 text-gray-400 transition group-hover:text-[#0069ff]" />
                    </ActionLink>
                  ))}
                </div>
              </Card>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
