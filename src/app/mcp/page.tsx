import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  CalendarRange,
  CheckCircle2,
  Code2,
  Layers3,
  Lock,
  Orbit,
  Radar,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Workflow,
} from 'lucide-react';
import Logo from '@/components/ui/logo';

const coreTools = [
  {
    name: 'get_public_event_type',
    detail: 'Load the public booking page definition for a host and slug.',
  },
  {
    name: 'list_available_dates',
    detail: 'Find dates that still have booking capacity in a target timezone.',
  },
  {
    name: 'list_time_slots',
    detail: 'Return actual bookable slots for a specific date.',
  },
  {
    name: 'create_booking',
    detail: 'Book a meeting once the invitee details are known.',
  },
  {
    name: 'explain_availability',
    detail: 'Tell an agent why a date is or is not workable, and what to do next.',
  },
  {
    name: 'list_bookings',
    detail: 'Give an authenticated host a clean view of upcoming or past bookings.',
  },
];

const useCases = [
  'Sales agents can qualify inbound leads and book the right demo instantly.',
  'Executive assistant agents can reschedule founder calls without UI scraping.',
  'Support agents can inspect bookings and calendar health during troubleshooting.',
  'Ops agents can create event types and orchestrate routing workflows.',
];

const principles = [
  {
    icon: Bot,
    title: 'Agent-native, not API-native',
    text: 'Kalendrio MCP is shaped around tasks like finding slots and booking meetings, not around raw tables or undocumented request bodies.',
  },
  {
    icon: ShieldCheck,
    title: 'Safe by design',
    text: 'Public scheduling tools remain lightweight, while host tools are explicitly authenticated and easy to permission later.',
  },
  {
    icon: Workflow,
    title: 'Built for workflows',
    text: 'A single agent can inspect an event type, find a valid slot, and complete a booking without leaving the MCP surface.',
  },
  {
    icon: Code2,
    title: 'Easy to ship',
    text: 'The server starts with stdio transport and wraps existing Kalendrio routes, which keeps V1 fast to implement and test.',
  },
];

export default function KalendrioMcpPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(10,170,211,0.22),_transparent_38%),linear-gradient(180deg,#081019_0%,#0d1724_40%,#101b2b_100%)] text-white">
      <section className="border-b border-white/10 bg-black/15 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <Logo size="md" variant="light" />
          <div className="flex items-center gap-3">
            <Link
              href="/landing"
              className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:border-white/30 hover:text-white"
            >
              Main Site
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-[#08c7d8] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-[#42dae6]"
            >
              Start Free
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 pb-14 pt-16 sm:px-6 lg:px-8 lg:pb-20 lg:pt-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-medium text-cyan-100">
              <Sparkles className="h-4 w-4" />
              Kalendrio MCP Server
            </div>
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.04em] text-white md:text-7xl">
              The agent-native scheduling layer for <span className="text-[#6ef2ff]">Kalendrio</span>.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
              Give agents a clean way to access availability, book meetings, inspect connected calendars, and manage scheduling workflows without scraping the UI or guessing how your API works.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="#tooling"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#6ef2ff] px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white"
              >
                Explore The Tool Surface <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="https://modelcontextprotocol.io"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white/90 transition hover:border-white/30 hover:text-white"
              >
                MCP Compatible
              </Link>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                ['Public booking', 'Inspect event types, dates, and slots'],
                ['Bearer auth', 'Use agent tokens instead of browser cookies'],
                ['Remote ready', 'Run over stdio or hosted Streamable HTTP'],
              ].map(([title, text]) => (
                <div key={title} className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[2rem] bg-cyan-400/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/75 p-6 shadow-[0_30px_120px_rgba(2,8,23,0.85)]">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/70">Agent Flow</p>
                  <h2 className="mt-2 text-2xl font-semibold">From intent to booked meeting</h2>
                </div>
                <TerminalSquare className="h-10 w-10 text-cyan-200" />
              </div>
              <div className="mt-6 space-y-4">
                {[
                  ['1', 'Inspect event type', 'Load booking rules, host info, duration, and custom questions.'],
                  ['2', 'Find availability', 'List viable dates, then fetch exact bookable time slots.'],
                  ['3', 'Create booking', 'Book the selected slot with invitee details and source metadata.'],
                  ['4', 'Manage follow-through', 'Inspect, cancel, or reschedule bookings using authenticated tools.'],
                ].map(([step, title, text]) => (
                  <div key={step} className="flex gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-300/15 text-sm font-semibold text-cyan-100">
                      {step}
                    </div>
                    <div>
                      <p className="text-base font-semibold text-white">{title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-300">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2 xl:grid-cols-4">
          {principles.map((item) => (
            <div key={item.title} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <item.icon className="h-8 w-8 text-[#6ef2ff]" />
              <h3 className="mt-5 text-xl font-semibold text-white">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="tooling" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-[2rem] border border-cyan-200/10 bg-cyan-300/10 p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-100/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-cyan-100">
              <Layers3 className="h-4 w-4" />
              Tooling
            </div>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-white">A task API for agents</h2>
            <p className="mt-4 text-base leading-8 text-slate-200">
              Kalendrio MCP should feel like a scheduling teammate. That means verbs, outcomes, and safe schemas instead of raw infrastructure. Agents should call tools that match their job to be done.
            </p>
            <div className="mt-8 space-y-4 text-sm leading-7 text-slate-200">
              <div className="flex gap-3">
                <Lock className="mt-1 h-5 w-5 shrink-0 text-cyan-100" />
                Public tools support lead booking flows without a host login.
              </div>
              <div className="flex gap-3">
                <Radar className="mt-1 h-5 w-5 shrink-0 text-cyan-100" />
                Host tools let agents inspect calendars, bookings, and event types with explicit authentication.
              </div>
              <div className="flex gap-3">
                <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-cyan-100" />
                Agent tokens let MCP clients authenticate with `Authorization: Bearer ...` instead of UI cookies.
              </div>
              <div className="flex gap-3">
                <Orbit className="mt-1 h-5 w-5 shrink-0 text-cyan-100" />
                The same tool surface now runs over stdio and hosted Streamable HTTP without changing the mental model.
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {coreTools.map((tool) => (
              <div key={tool.name} className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-5">
                <div className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 font-mono text-xs text-cyan-100">
                  {tool.name}
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-300">{tool.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-white">What agents unlock</h2>
            <div className="mt-8 space-y-4">
              {useCases.map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-white/8 bg-black/10 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#6ef2ff]" />
                  <p className="text-sm leading-7 text-slate-200">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[#07131f] p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-slate-300">
              <CalendarRange className="h-4 w-4 text-cyan-100" />
              V1 Shape
            </div>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-white">Initial MCP package</h2>
            <div className="mt-6 rounded-[1.5rem] border border-white/8 bg-black/20 p-5 font-mono text-sm leading-7 text-cyan-50">
              <p>mcp/kalendrio-mcp/</p>
              <p className="text-slate-300">src/server.ts</p>
              <p className="text-slate-300">src/tools/public-tools.ts</p>
              <p className="text-slate-300">src/tools/host-tools.ts</p>
              <p className="text-slate-300">src/lib/kalendrio-client.ts</p>
              <p className="text-slate-300">README.md</p>
            </div>
            <p className="mt-6 text-sm leading-7 text-slate-300">
              Start with stdio for local agent runtimes or run the same server over hosted Streamable HTTP for remote clients and automation platforms.
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-cyan-200/10 bg-[linear-gradient(135deg,rgba(110,242,255,0.18),rgba(8,16,25,0.1))] p-8 md:p-10">
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-100/80">Pitch Summary</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-white">
            Kalendrio MCP is the scheduling control plane that makes calendars and booking flows usable by agents.
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-200">
            It turns Kalendrio from a web product with routes into a tool surface agents can safely understand: availability lookup, booking creation, booking management, calendar visibility, and workflow-ready scheduling automation.
          </p>
        </div>
      </section>
    </main>
  );
}
