import {
  BookOpen,
  CalendarDays,
  Clock,
  Code,
  CreditCard,
  GitBranch,
  LayoutGrid,
  LifeBuoy,
  type LucideIcon,
  Settings,
  Shield,
  Users,
  Zap,
} from 'lucide-react';

export interface HelpCategoryLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface HelpCategory {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  links: HelpCategoryLink[];
}

export interface HelpArticle {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  breadcrumb: string;
  quickAnswer: string[];
  href: string;
  hrefLabel: string;
}

export interface HelpShortcut {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

export interface HelpResource {
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: LucideIcon;
  tone: 'light' | 'dark';
}

export interface HelpSupportCard {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  external?: boolean;
}

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: 'account',
    name: 'Account',
    description: 'Profile settings, booking URLs, billing, and workspace basics.',
    icon: Settings,
    links: [
      { label: 'Profile settings', href: '/dashboard/settings' },
      { label: 'Booking URL', href: '/dashboard/settings' },
      { label: 'Timezone & preferences', href: '/dashboard/settings' },
      { label: 'Plans & billing', href: '/dashboard/billing' },
    ],
  },
  {
    id: 'integrations',
    name: 'Integrations',
    description: 'Calendars, video conferencing, payments, and app connections.',
    icon: LayoutGrid,
    links: [
      { label: 'Calendar connections', href: '/dashboard/integrations' },
      { label: 'Video conferencing', href: '/dashboard/integrations' },
      { label: 'Stripe payments', href: '/dashboard/integrations' },
      { label: 'Embed options', href: '/dashboard/embed' },
    ],
  },
  {
    id: 'scheduling',
    name: 'Scheduling',
    description: 'Event types, availability, booking rules, and troubleshooting.',
    icon: CalendarDays,
    links: [
      { label: 'Availability', href: '/dashboard/availability' },
      { label: 'Event types', href: '/dashboard/event-types' },
      { label: 'Sharing & booking', href: '/dashboard/event-types' },
      { label: 'Buffers & limits', href: '/dashboard/event-types' },
    ],
  },
  {
    id: 'routing',
    name: 'Routing',
    description: 'Lead qualification, routing forms, and round-robin ownership.',
    icon: GitBranch,
    links: [
      { label: 'Routing forms', href: '/dashboard/routing' },
      { label: 'Round-robin setup', href: '/dashboard/routing' },
      { label: 'Qualification questions', href: '/dashboard/routing' },
      { label: 'Routing logic', href: '/dashboard/routing' },
    ],
  },
  {
    id: 'workflows',
    name: 'Workflows',
    description: 'Reminders, confirmation emails, and follow-up automation.',
    icon: Zap,
    links: [
      { label: 'Workflow overview', href: '/dashboard/workflows' },
      { label: 'Booking reminders', href: '/dashboard/workflows' },
      { label: 'Follow-up emails', href: '/dashboard/workflows' },
      { label: 'Notification timing', href: '/dashboard/workflows' },
    ],
  },
  {
    id: 'admins',
    name: 'Admins',
    description: 'Team setup, permissions, access control, and admin handoff.',
    icon: Shield,
    links: [
      { label: 'Invite teammates', href: '/dashboard/team' },
      { label: 'Admin settings', href: '/dashboard/settings' },
      { label: 'Workspace billing', href: '/dashboard/billing' },
      { label: 'Seat planning', href: '/dashboard/team' },
    ],
  },
  {
    id: 'embed-api',
    name: 'Embed & API',
    description: 'Website embeds, booking links, and implementation guidance.',
    icon: Code,
    links: [
      { label: 'Embed on your website', href: '/dashboard/embed' },
      { label: 'Share booking links', href: '/dashboard/event-types' },
      { label: 'Developer help', href: 'mailto:support@kalendr.io?subject=Developer%20Help', external: true },
      { label: 'Enterprise support', href: 'mailto:sales@kalendr.io?subject=Enterprise%20Help', external: true },
    ],
  },
];

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: 'connect-calendar',
    title: 'Connect your calendar to KalendR',
    description: 'Sync your personal or team calendar so availability stays accurate and double-bookings are blocked automatically.',
    categoryId: 'integrations',
    breadcrumb: 'Help Center / Integrations / Calendar connections',
    quickAnswer: [
      'Open Integrations & apps from the dashboard and choose Google Calendar or Microsoft Outlook.',
      'Complete sign-in and approve calendar access for the account you want KalendR to read.',
      'Confirm the connected calendar appears in the integration list before sharing your booking link.',
    ],
    href: '/dashboard/integrations',
    hrefLabel: 'Open integrations',
  },
  {
    id: 'add-video',
    title: 'Add Zoom or Google Meet to your bookings',
    description: 'Automatically generate meeting links for virtual events so invitees receive a join URL as soon as they book.',
    categoryId: 'integrations',
    breadcrumb: 'Help Center / Integrations / Video conferencing',
    quickAnswer: [
      'Go to Integrations & apps and connect Zoom or Google Meet.',
      'Edit the event type you want to use and choose a virtual meeting location.',
      'Save your changes and preview the event to confirm the meeting link is created for new bookings.',
    ],
    href: '/dashboard/integrations',
    hrefLabel: 'Set up conferencing',
  },
  {
    id: 'create-event-type',
    title: 'Create your first event type',
    description: 'Build a booking page for demos, discovery calls, handoffs, or team meetings with custom durations and questions.',
    categoryId: 'scheduling',
    breadcrumb: 'Help Center / Scheduling / Event types',
    quickAnswer: [
      'Select + Create from the sidebar to start a new event type.',
      'Add the event name, duration, location, and booking questions you need.',
      'Save the event and copy its booking link to start sharing it with invitees.',
    ],
    href: '/dashboard/event-types?create=true',
    hrefLabel: 'Create an event type',
  },
  {
    id: 'fine-tune-availability',
    title: 'Fine-tune your availability settings',
    description: 'Adjust working hours, minimum notice, slot intervals, and meeting limits so your page reflects how you actually want to schedule.',
    categoryId: 'scheduling',
    breadcrumb: 'Help Center / Scheduling / Availability',
    quickAnswer: [
      'Open Availability from the sidebar to review your current working hours.',
      'Update the schedule blocks or event-specific rules that need to change.',
      'Preview your booking page afterward to confirm those time windows are showing up as expected.',
    ],
    href: '/dashboard/availability',
    hrefLabel: 'Edit availability',
  },
  {
    id: 'buffers-limits',
    title: 'Use buffers and meeting limits',
    description: 'Protect focus time by adding prep buffers, limiting daily meetings, and controlling how closely events can be booked.',
    categoryId: 'scheduling',
    breadcrumb: 'Help Center / Scheduling / Limits and buffers',
    quickAnswer: [
      'Open the event type you want to adjust from Scheduling.',
      'Set buffer time before or after meetings plus any daily, weekly, or monthly limits.',
      'Save changes so the new rules apply to future bookings.',
    ],
    href: '/dashboard/event-types',
    hrefLabel: 'Manage event rules',
  },
  {
    id: 'troubleshoot-availability',
    title: 'Troubleshoot times that should be available',
    description: 'Resolve missing time slots by checking calendar conflicts, event rules, working hours, and connected-account settings.',
    categoryId: 'scheduling',
    breadcrumb: 'Help Center / Scheduling / Availability troubleshooting',
    quickAnswer: [
      'Verify the right calendar account is connected and syncing busy times.',
      'Review the event type for notice, buffer, and availability-window rules that may be hiding slots.',
      'Test the booking page in preview mode after each change so you can see which update fixed the problem.',
    ],
    href: '/dashboard/availability',
    hrefLabel: 'Review availability',
  },
  {
    id: 'routing-form',
    title: 'Create a routing form that qualifies leads',
    description: 'Use custom questions to capture firmographic details and automatically direct qualified leads to the right rep or team.',
    categoryId: 'routing',
    breadcrumb: 'Help Center / Routing / Qualification forms',
    quickAnswer: [
      'Open Routing and create a form tied to the handoff or demo flow you want to automate.',
      'Add qualification fields like team size, territory, or deal value.',
      'Map the answers to routing logic so qualified leads land with the correct owner.',
    ],
    href: '/dashboard/routing',
    hrefLabel: 'Build a routing form',
  },
  {
    id: 'round-robin',
    title: 'Set up round-robin scheduling for your team',
    description: 'Distribute meetings fairly across teammates while still respecting availability, team ownership, and territory rules.',
    categoryId: 'admins',
    breadcrumb: 'Help Center / Admins / Team scheduling',
    quickAnswer: [
      'Invite the teammates who should receive bookings and confirm each person has connected availability.',
      'Create or update a routing flow that sends meetings to a round-robin pool.',
      'Run a test submission to make sure the handoff lands with the expected teammate.',
    ],
    href: '/dashboard/team',
    hrefLabel: 'Manage teammates',
  },
  {
    id: 'embed-kalendr',
    title: 'Embed KalendR on your website',
    description: 'Place booking pages on landing pages, product pages, or support surfaces with minimal setup.',
    categoryId: 'embed-api',
    breadcrumb: 'Help Center / Embed & API / Website embeds',
    quickAnswer: [
      'Go to Embed to choose the booking page or event you want to publish.',
      'Copy the embed code or sharing link that fits your website layout.',
      'Paste it into your site builder or app and preview the page before publishing.',
    ],
    href: '/dashboard/embed',
    hrefLabel: 'Open embed settings',
  },
  {
    id: 'payments',
    title: 'Collect payments for bookings with Stripe',
    description: 'Connect Stripe to charge for paid sessions, consultations, or packaged booking flows before the meeting is confirmed.',
    categoryId: 'integrations',
    breadcrumb: 'Help Center / Integrations / Payments',
    quickAnswer: [
      'Connect Stripe from Integrations & apps using the Stripe card.',
      'Open the event type or flow that should require payment and enable your preferred payment behavior.',
      'Book a test meeting so you can verify the checkout step and confirmation workflow.',
    ],
    href: '/dashboard/integrations',
    hrefLabel: 'Connect Stripe',
  },
  {
    id: 'profile-booking-url',
    title: 'Update your profile, booking URL, and timezone',
    description: 'Keep your public profile polished by editing your name, slug, bio, welcome message, and default timezone in one place.',
    categoryId: 'account',
    breadcrumb: 'Help Center / Account / Profile settings',
    quickAnswer: [
      'Open Account Settings from the admin section of the dashboard.',
      'Update your profile details, booking URL slug, or timezone fields.',
      'Select Save Settings and re-open your booking page to confirm the changes are live.',
    ],
    href: '/dashboard/settings',
    hrefLabel: 'Edit account settings',
  },
  {
    id: 'invite-teammates',
    title: 'Invite teammates and manage admin access',
    description: 'Add users, assign seats, and keep ownership clear as your scheduling operation grows beyond a single rep.',
    categoryId: 'admins',
    breadcrumb: 'Help Center / Admins / Managing users',
    quickAnswer: [
      'Open Team to invite new reps or coordinators into the workspace.',
      'Decide who needs admin access versus standard scheduling access.',
      'Review seat usage and billing before sending a large batch of invites.',
    ],
    href: '/dashboard/team',
    hrefLabel: 'Open team settings',
  },
];

export const HELP_POPULAR_SEARCHES = [
  'Calendar not connecting',
  'Edit availability settings',
  'Embed KalendR on your website',
  'Set meeting limits',
  'Using round-robin scheduling',
];

export const HELP_SHORTCUTS: HelpShortcut[] = [
  {
    title: 'Sync my calendar',
    description: 'Connect Google Calendar or Outlook so KalendR can block conflicts automatically.',
    href: '/dashboard/integrations',
    icon: CalendarDays,
  },
  {
    title: 'Add video conferencing',
    description: 'Connect Zoom or Google Meet and attach it to your booking workflows.',
    href: '/dashboard/integrations',
    icon: LayoutGrid,
  },
  {
    title: 'Get paid for bookings',
    description: 'Use Stripe for paid consultations, sessions, or meeting packages.',
    href: '/dashboard/integrations',
    icon: CreditCard,
  },
  {
    title: 'Manage my team',
    description: 'Invite reps, assign access, and prepare your workspace for round robin.',
    href: '/dashboard/team',
    icon: Users,
  },
  {
    title: 'Set up workflows',
    description: 'Configure confirmations, reminders, and follow-up touchpoints.',
    href: '/dashboard/workflows',
    icon: Zap,
  },
  {
    title: 'Build a routing form',
    description: 'Qualify leads and direct them to the right owner or pool.',
    href: '/dashboard/routing',
    icon: GitBranch,
  },
];

export const HELP_RESOURCES: HelpResource[] = [
  {
    title: 'Learning hub',
    description: 'Follow guided setup paths for account setup, routing, embeds, and booking optimization at your own pace.',
    href: '/dashboard',
    cta: 'Start learning',
    icon: BookOpen,
    tone: 'light',
  },
  {
    title: 'Embed & developer setup',
    description: 'Ship KalendR into your website, outbound flows, and internal tools with implementation guidance built around the product you already have.',
    href: '/dashboard/embed',
    cta: 'Explore embed settings',
    icon: Code,
    tone: 'dark',
  },
];

export const HELP_SUPPORT_CARDS: HelpSupportCard[] = [
  {
    title: 'Contact support',
    description: 'Send setup, troubleshooting, or workspace questions directly to the KalendR team.',
    href: 'mailto:support@kalendr.io?subject=KalendR%20Support',
    icon: LifeBuoy,
    external: true,
  },
  {
    title: 'Talk to sales',
    description: 'Reach out about team rollouts, plan upgrades, or enterprise support needs.',
    href: 'mailto:sales@kalendr.io?subject=KalendR%20Sales',
    icon: CreditCard,
    external: true,
  },
];
