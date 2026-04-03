#!/usr/bin/env node
// Seed script for KalendR - creates demo data with sales-focused defaults
// Run with: npx tsx scripts/seed.ts

import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

// Setup data directory
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Simple db helpers
function getFilePath(collection: string): string {
  return path.join(DATA_DIR, `${collection}.json`);
}

function readCollection(collection: string): any[] {
  const filePath = getFilePath(collection);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
}

function writeCollection(collection: string, data: any[]): void {
  fs.writeFileSync(getFilePath(collection), JSON.stringify(data, null, 2));
}

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function create(collection: string, data: any): any {
  const items = readCollection(collection);
  const now = new Date().toISOString();
  const item = { id: generateId(), ...data, createdAt: now, updatedAt: now };
  items.push(item);
  writeCollection(collection, items);
  return item;
}

async function seed() {
  console.log('🌱 Seeding KalendR database...\n');

  // Clear all data
  const collections = [
    'users',
    'sessions',
    'agent_tokens',
    'password_resets',
    'organizations',
    'teams',
    'team_members',
    'connected_calendars',
    'event_types',
    'event_type_hosts',
    'availability_schedules',
    'availability_rules',
    'availability_overrides',
    'bookings',
    'booking_notifications',
    'routing_forms',
    'routing_form_responses',
    'workflow_templates',
  ];

  for (const c of collections) {
    writeCollection(c, []);
  }

  const passwordHash = await bcrypt.hash('password123', 12);

  // Create organization
  const org = create('organizations', {
    name: 'Acme Sales Corp',
    slug: 'acme-sales',
    plan: 'teams',
    planSeats: 5,
  });
  console.log('✅ Created organization:', org.name);

  // Create users
  const sarah = create('users', {
    email: 'sarah@acme.com',
    passwordHash,
    name: 'Sarah Chen',
    slug: 'sarah-chen',
    timezone: 'America/New_York',
    locale: 'en',
    bio: 'VP of Sales at Acme. Helping teams close deals faster.',
    welcomeMessage: 'Thanks for your interest! Pick a time that works for you.',
    onboardingComplete: true,
    organizationId: org.id,
    orgRole: 'owner',
  });

  const james = create('users', {
    email: 'james@acme.com',
    passwordHash,
    name: 'James Wilson',
    slug: 'james-wilson',
    timezone: 'America/Chicago',
    locale: 'en',
    bio: 'Senior AE at Acme. I help companies streamline their sales operations.',
    welcomeMessage: 'Looking forward to learning about your needs!',
    onboardingComplete: true,
    organizationId: org.id,
    orgRole: 'admin',
  });

  const maya = create('users', {
    email: 'maya@acme.com',
    passwordHash,
    name: 'Maya Patel',
    slug: 'maya-patel',
    timezone: 'America/Los_Angeles',
    locale: 'en',
    bio: 'SDR at Acme. Happy to help you explore our solutions.',
    welcomeMessage: "Hi there! Let's find a time to chat.",
    onboardingComplete: true,
    organizationId: org.id,
    orgRole: 'member',
  });

  const alex = create('users', {
    email: 'alex@acme.com',
    passwordHash,
    name: 'Alex Rivera',
    slug: 'alex-rivera',
    timezone: 'America/New_York',
    locale: 'en',
    bio: 'Enterprise AE specializing in large accounts.',
    welcomeMessage: "Let's discuss how we can help your organization.",
    onboardingComplete: true,
    organizationId: org.id,
    orgRole: 'member',
  });

  console.log('✅ Created 4 users (password for all: password123)');
  console.log('   - sarah@acme.com (Owner)');
  console.log('   - james@acme.com (Admin)');
  console.log('   - maya@acme.com (Member/SDR)');
  console.log('   - alex@acme.com (Member/AE)');

  // Create teams
  const salesTeam = create('teams', {
    name: 'Sales Team',
    slug: 'sales-team',
    organizationId: org.id,
  });

  const sdrTeam = create('teams', {
    name: 'SDR Team',
    slug: 'sdr-team',
    organizationId: org.id,
  });

  // Team members
  for (const u of [sarah, james, alex]) {
    create('team_members', {
      teamId: salesTeam.id,
      userId: u.id,
      role: u.id === sarah.id ? 'admin' : 'member',
      priority: u.id === sarah.id ? 2 : 1,
      weight: 1.0,
      active: true,
    });
  }
  create('team_members', {
    teamId: sdrTeam.id,
    userId: maya.id,
    role: 'member',
    priority: 1,
    weight: 1.0,
    active: true,
  });
  create('team_members', {
    teamId: sdrTeam.id,
    userId: james.id,
    role: 'admin',
    priority: 2,
    weight: 1.0,
    active: true,
  });

  console.log('✅ Created 2 teams: Sales Team, SDR Team');

  // Create availability schedules for each user
  for (const user of [sarah, james, maya, alex]) {
    const schedule = create('availability_schedules', {
      name: 'Working Hours',
      userId: user.id,
      timezone: user.timezone,
      isDefault: true,
    });

    // Mon-Fri 9-5
    for (let day = 1; day <= 5; day++) {
      create('availability_rules', {
        scheduleId: schedule.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '17:00',
        isEnabled: true,
      });
    }
  }
  console.log('✅ Created availability schedules (Mon-Fri 9am-5pm)');

  // Get Sarah's schedule for event types
  const sarahSchedule = readCollection('availability_schedules').find((s) => s.userId === sarah.id);

  // Create event types for Sarah
  const bookDemo = create('event_types', {
    title: 'Book a Demo',
    slug: 'book-a-demo',
    description:
      "Schedule a personalized 30-minute product demo with our team. We'll walk through key features and answer your questions.",
    color: '#0069ff',
    isActive: true,
    isArchived: false,
    userId: sarah.id,
    organizationId: org.id,
    eventTypeKind: 'one_on_one',
    duration: 30,
    locationType: 'google_meet',
    minNotice: 240,
    maxFutureDays: 60,
    bufferBefore: 0,
    bufferAfter: 10,
    maxInvitees: 1,
    requiresConfirmation: false,
    hideBranding: false,
    availabilityScheduleId: sarahSchedule?.id,
    customQuestions: JSON.stringify([
      { id: 'company', label: 'Company Name', type: 'text', required: true },
      { id: 'role', label: 'Your Role', type: 'text', required: false },
      {
        id: 'size',
        label: 'Company Size',
        type: 'select',
        required: true,
        options: ['1-10', '11-50', '51-200', '201-1000', '1000+'],
      },
    ]),
  });

  const discoveryCall = create('event_types', {
    title: 'Quick Discovery Call',
    slug: 'discovery-call',
    description: "A brief 15-minute call to understand your needs and see if we're a good fit.",
    color: '#10b981',
    isActive: true,
    isArchived: false,
    userId: sarah.id,
    organizationId: org.id,
    eventTypeKind: 'one_on_one',
    duration: 15,
    locationType: 'phone',
    minNotice: 120,
    maxFutureDays: 30,
    bufferBefore: 5,
    bufferAfter: 5,
    maxInvitees: 1,
    requiresConfirmation: false,
    hideBranding: false,
    availabilityScheduleId: sarahSchedule?.id,
  });

  const enterpriseDemo = create('event_types', {
    title: 'Enterprise Demo',
    slug: 'enterprise-demo',
    description:
      'In-depth walkthrough for enterprise-level evaluation. Covers advanced features, security, compliance, and custom deployment options.',
    color: '#8b5cf6',
    isActive: true,
    isArchived: false,
    userId: sarah.id,
    organizationId: org.id,
    eventTypeKind: 'one_on_one',
    duration: 60,
    locationType: 'google_meet',
    minNotice: 480,
    maxFutureDays: 60,
    bufferBefore: 10,
    bufferAfter: 15,
    maxInvitees: 1,
    requiresConfirmation: false,
    hideBranding: false,
    availabilityScheduleId: sarahSchedule?.id,
    customQuestions: JSON.stringify([
      { id: 'company', label: 'Company Name', type: 'text', required: true },
      {
        id: 'employees',
        label: 'Number of Employees',
        type: 'select',
        required: true,
        options: ['201-500', '501-1000', '1001-5000', '5000+'],
      },
      {
        id: 'use_case',
        label: 'Primary Use Case',
        type: 'textarea',
        required: true,
        placeholder: 'Tell us about your scheduling needs...',
      },
      {
        id: 'timeline',
        label: 'Implementation Timeline',
        type: 'select',
        required: false,
        options: ['Immediately', '1-3 months', '3-6 months', '6+ months'],
      },
    ]),
  });

  const talkToSales = create('event_types', {
    title: 'Talk to Sales',
    slug: 'talk-to-sales',
    description: 'Connect with a sales representative to discuss pricing, features, and how we can help your team.',
    color: '#f59e0b',
    isActive: true,
    isArchived: false,
    userId: sarah.id,
    organizationId: org.id,
    eventTypeKind: 'round_robin',
    roundRobinMode: 'equal_distribution',
    duration: 30,
    locationType: 'google_meet',
    minNotice: 240,
    maxFutureDays: 60,
    bufferBefore: 5,
    bufferAfter: 10,
    maxInvitees: 1,
    requiresConfirmation: false,
    hideBranding: false,
    availabilityScheduleId: sarahSchedule?.id,
    teamId: salesTeam.id,
  });

  // Add round-robin hosts
  for (const u of [sarah, james, alex]) {
    create('event_type_hosts', {
      eventTypeId: talkToSales.id,
      userId: u.id,
      isRequired: false,
      priority: u.id === sarah.id ? 2 : 1,
    });
  }

  console.log('✅ Created 4 event types:');
  console.log('   - Book a Demo (30 min, 1:1)');
  console.log('   - Quick Discovery Call (15 min, 1:1)');
  console.log('   - Enterprise Demo (60 min, 1:1)');
  console.log('   - Talk to Sales (30 min, Round Robin)');

  // Create sample bookings
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const dayAfter = new Date(now);
  dayAfter.setDate(dayAfter.getDate() + 2);
  dayAfter.setHours(14, 0, 0, 0);

  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 5);
  nextWeek.setHours(11, 0, 0, 0);

  const bookings = [
    {
      eventTypeId: bookDemo.id,
      hostId: sarah.id,
      startTime: tomorrow.toISOString(),
      endTime: new Date(tomorrow.getTime() + 30 * 60000).toISOString(),
      timezone: 'America/New_York',
      status: 'confirmed',
      inviteeName: 'Michael Torres',
      inviteeEmail: 'michael@startup.io',
      inviteeCompany: 'StartupIO',
      inviteeJobTitle: 'Head of Sales',
      source: 'booking_page',
    },
    {
      eventTypeId: discoveryCall.id,
      hostId: sarah.id,
      startTime: dayAfter.toISOString(),
      endTime: new Date(dayAfter.getTime() + 15 * 60000).toISOString(),
      timezone: 'America/Chicago',
      status: 'confirmed',
      inviteeName: 'Lisa Chang',
      inviteeEmail: 'lisa@growthco.com',
      inviteeCompany: 'GrowthCo',
      inviteeJobTitle: 'VP Operations',
      source: 'routing_form',
    },
    {
      eventTypeId: enterpriseDemo.id,
      hostId: sarah.id,
      startTime: nextWeek.toISOString(),
      endTime: new Date(nextWeek.getTime() + 60 * 60000).toISOString(),
      timezone: 'America/Los_Angeles',
      status: 'confirmed',
      inviteeName: 'David Kim',
      inviteeEmail: 'dkim@megacorp.com',
      inviteeCompany: 'MegaCorp Inc.',
      inviteeJobTitle: 'Director of Engineering',
      inviteeNotes: 'Looking for scheduling solution for 500+ person eng org.',
      source: 'booking_page',
    },
  ];

  for (const b of bookings) {
    create('bookings', {
      uid: generateId(),
      ...b,
      cancelToken: generateId(),
      rescheduleToken: generateId(),
      locationType: 'google_meet',
      meetingUrl: `https://meet.google.com/demo-${generateId().substring(0, 8)}`,
    });
  }
  console.log('✅ Created 3 sample bookings');

  // Create routing form
  const routingForm = create('routing_forms', {
    name: 'Inbound Lead Qualification',
    slug: 'inbound-lead-qualification',
    description: 'Route inbound leads to the right event type based on company size and needs',
    isActive: true,
    organizationId: org.id,
    fields: JSON.stringify([
      { id: 'email', label: 'Work Email', type: 'email', required: true },
      { id: 'name', label: 'Full Name', type: 'text', required: true },
      { id: 'company', label: 'Company Name', type: 'text', required: true },
      {
        id: 'company_size',
        label: 'Company Size',
        type: 'select',
        required: true,
        options: ['1-10', '11-50', '51-200', '201-1000', '1000+'],
      },
      {
        id: 'interest',
        label: 'What are you interested in?',
        type: 'select',
        required: true,
        options: ['Product Demo', 'Pricing', 'Enterprise Evaluation', 'Partnership', 'Other'],
      },
    ]),
    routes: JSON.stringify([
      {
        id: 'enterprise',
        conditions: [{ fieldId: 'company_size', operator: 'equals', value: '1000+' }],
        logic: 'and',
        destination: { type: 'event_type', value: enterpriseDemo.id },
      },
      {
        id: 'mid_market',
        conditions: [{ fieldId: 'company_size', operator: 'equals', value: '201-1000' }],
        logic: 'and',
        destination: { type: 'event_type', value: bookDemo.id },
      },
      {
        id: 'enterprise_eval',
        conditions: [{ fieldId: 'interest', operator: 'equals', value: 'Enterprise Evaluation' }],
        logic: 'and',
        destination: { type: 'event_type', value: enterpriseDemo.id },
      },
    ]),
    fallbackType: 'event_type',
    fallbackValue: discoveryCall.id,
  });
  console.log('✅ Created routing form: Inbound Lead Qualification');

  // Create workflow templates
  const workflows = [
    {
      name: 'Booking Confirmation',
      trigger: 'booking_created',
      channel: 'email',
      subject: 'Confirmed: {{event_title}} with {{host_name}}',
      body: 'Your meeting has been confirmed.',
      isSystem: true,
      isActive: true,
    },
    {
      name: 'Host Notification',
      trigger: 'booking_created',
      channel: 'email',
      subject: 'New booking: {{event_title}} with {{invitee_name}}',
      body: 'A new meeting has been booked.',
      isSystem: true,
      isActive: true,
    },
    {
      name: '24h Reminder',
      trigger: 'reminder',
      offsetMinutes: -1440,
      channel: 'email',
      subject: 'Reminder: {{event_title}} tomorrow',
      body: 'Your meeting is coming up tomorrow.',
      isSystem: false,
      isActive: true,
    },
    {
      name: '1h Reminder',
      trigger: 'reminder',
      offsetMinutes: -60,
      channel: 'email',
      subject: 'Reminder: {{event_title}} in 1 hour',
      body: 'Your meeting is starting soon.',
      isSystem: false,
      isActive: true,
    },
    {
      name: 'Cancellation Notice',
      trigger: 'booking_cancelled',
      channel: 'email',
      subject: 'Cancelled: {{event_title}}',
      body: 'A meeting has been cancelled.',
      isSystem: true,
      isActive: true,
    },
  ];

  for (const w of workflows) {
    create('workflow_templates', w);
  }
  console.log('✅ Created 5 workflow templates');

  console.log('\n🎉 Seeding complete!\n');
  console.log('Login credentials:');
  console.log('  Email: sarah@acme.com');
  console.log('  Password: password123');
  console.log(`\nBooking page: http://localhost:3000/sarah-chen/book-a-demo`);
  console.log(`Routing form: http://localhost:3000/route/inbound-lead-qualification`);
}

seed().catch(console.error);
