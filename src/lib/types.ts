export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  timezone: string;
  slug: string;
  bio?: string;
  welcomeMessage?: string;
  locale: string;
  onboardingComplete: boolean;
  organizationId?: string;
  orgRole: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventType {
  id: string;
  title: string;
  slug: string;
  description?: string;
  color: string;
  isActive: boolean;
  isArchived: boolean;
  userId?: string;
  organizationId?: string;
  teamId?: string;
  eventTypeKind: 'one_on_one' | 'group' | 'round_robin' | 'collective';
  duration: number;
  durationOptions?: string;
  locationType: string;
  locationValue?: string;
  locationOptions?: string;
  minNotice: number;
  maxFutureDays: number;
  slotInterval?: number;
  bufferBefore: number;
  bufferAfter: number;
  dailyLimit?: number;
  weeklyLimit?: number;
  availabilityScheduleId?: string;
  maxInvitees: number;
  roundRobinMode?: string;
  confirmationMessage?: string;
  redirectUrl?: string;
  requiresConfirmation: boolean;
  customQuestions?: string;
  brandingColor?: string;
  hideBranding: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  uid: string;
  eventTypeId: string;
  hostId: string;
  startTime: string;
  endTime: string;
  timezone: string;
  status: 'confirmed' | 'cancelled' | 'rescheduled' | 'pending' | 'no_show';
  inviteeName: string;
  inviteeEmail: string;
  inviteePhone?: string;
  inviteeCompany?: string;
  inviteeJobTitle?: string;
  inviteeNotes?: string;
  customResponses?: string;
  locationType?: string;
  locationValue?: string;
  meetingUrl?: string;
  cancelReason?: string;
  cancelledAt?: string;
  rescheduledTo?: string;
  rescheduledFrom?: string;
  cancelToken: string;
  rescheduleToken: string;
  calendarEventId?: string;
  source: string;
  metadata?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilitySchedule {
  id: string;
  name: string;
  userId: string;
  timezone: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityRule {
  id: string;
  scheduleId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isEnabled: boolean;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  plan: 'free' | 'standard' | 'teams' | 'enterprise';
  planSeats: number;
  planExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoutingForm {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  organizationId?: string;
  fields: string;
  routes: string;
  fallbackType: string;
  fallbackValue: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomQuestion {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'phone' | 'company' | 'job_title';
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface RoutingFormField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'select' | 'radio' | 'phone' | 'number' | 'textarea';
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface RoutingRule {
  id: string;
  conditions: RoutingCondition[];
  logic: 'and' | 'or';
  destination: {
    type: 'event_type' | 'external_url' | 'message';
    value: string; // event type ID, URL, or message
  };
}

export interface RoutingCondition {
  fieldId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'in';
  value: string | string[];
}

export interface ConnectedCalendar {
  id: string;
  userId: string;
  provider: string;
  providerAccountId: string;
  email: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: string;
  checkForConflicts: boolean;
  addEventsTo: boolean;
  isPrimary: boolean;
  watchChannelId?: string;
  watchResourceId?: string;
  watchResourceUri?: string;
  watchExpiration?: string;
  watchToken?: string;
  watchCursorUpdatedAt?: string;
  watchLastWebhookAt?: string;
  watchLastMessageNumber?: number;
  createdAt: string;
  updatedAt: string;
}
