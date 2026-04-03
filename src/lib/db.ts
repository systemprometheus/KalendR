import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

function resolveWritableDataDir(): string {
  const preferred = process.env.DATA_DIR?.trim()
    ? path.resolve(process.env.DATA_DIR)
    : null;
  const isProductionRuntime = process.env.NODE_ENV === 'production'
    && process.env.NEXT_PHASE !== 'phase-production-build';

  if (isProductionRuntime && !preferred) {
    throw new Error(
      'DATA_DIR must be configured in production. Refusing to fall back to ephemeral local storage.'
    );
  }

  if (isProductionRuntime && preferred) {
    fs.mkdirSync(preferred, { recursive: true });
    fs.accessSync(preferred, fs.constants.R_OK | fs.constants.W_OK);
    return preferred;
  }

  const candidates = [
    preferred,
    path.join(process.cwd(), 'data'),
    path.join('/tmp', 'kalendr-data'),
  ].filter((value): value is string => Boolean(value));

  for (const dir of candidates) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
      return dir;
    } catch {
      // Try next candidate.
    }
  }

  throw new Error(
    `No writable data directory found. Tried: ${candidates.join(', ')}`
  );
}
const DATA_DIR = resolveWritableDataDir();

type WhereClause<T> = Partial<T> & { [key: string]: any };

function getFilePath(collection: string): string {
  return path.join(DATA_DIR, `${collection}.json`);
}

function readCollection<T>(collection: string): T[] {
  const filePath = getFilePath(collection);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]');
    return [];
  }
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeCollection<T>(collection: string, data: T[]): void {
  const filePath = getFilePath(collection);
  // Atomic write to reduce risk of partial/corrupt files on crash/restart.
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
  fs.renameSync(tmpPath, filePath);
}

function matchesWhere<T extends Record<string, any>>(item: T, where: WhereClause<T>): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (value === undefined) return true;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Support nested operators like { contains: 'x' }, { in: [...] }, { not: 'x' }
      if ('contains' in value) return String(item[key]).toLowerCase().includes(String(value.contains).toLowerCase());
      if ('in' in value) return (value.in as any[]).includes(item[key]);
      if ('not' in value) return item[key] !== value.not;
      if ('gte' in value) return item[key] >= value.gte;
      if ('lte' in value) return item[key] <= value.lte;
      if ('gt' in value) return item[key] > value.gt;
      if ('lt' in value) return item[key] < value.lt;
    }
    return item[key] === value;
  });
}

function generateId(): string {
  return randomUUID();
}

export const db = {
  collection<T extends Record<string, any>>(name: string) {
    return {
      findMany(options?: { where?: WhereClause<T>; orderBy?: { [key: string]: 'asc' | 'desc' }; take?: number; skip?: number }): T[] {
        let items = readCollection<T>(name);
        if (options?.where) {
          items = items.filter(item => matchesWhere(item, options.where!));
        }
        if (options?.orderBy) {
          const [field, direction] = Object.entries(options.orderBy)[0];
          items.sort((a, b) => {
            if (a[field] < b[field]) return direction === 'asc' ? -1 : 1;
            if (a[field] > b[field]) return direction === 'asc' ? 1 : -1;
            return 0;
          });
        }
        if (options?.skip) items = items.slice(options.skip);
        if (options?.take) items = items.slice(0, options.take);
        return items;
      },

      findFirst(options?: { where?: WhereClause<T> }): T | null {
        const items = readCollection<T>(name);
        if (!options?.where) return items[0] || null;
        return items.find(item => matchesWhere(item, options.where!)) || null;
      },

      findById(id: string): T | null {
        const items = readCollection<T>(name);
        return items.find((item: any) => item.id === id) || null;
      },

      create(data: Partial<T> & { id?: string }): T {
        const items = readCollection<T>(name);
        const now = new Date().toISOString();
        const newItem = {
          id: generateId(),
          ...data,
          createdAt: now,
          updatedAt: now,
        } as unknown as T;
        items.push(newItem);
        writeCollection(name, items);
        return newItem;
      },

      update(id: string, data: Partial<T>): T | null {
        const items = readCollection<T>(name);
        const index = items.findIndex((item: any) => item.id === id);
        if (index === -1) return null;
        items[index] = {
          ...items[index],
          ...data,
          updatedAt: new Date().toISOString(),
        };
        writeCollection(name, items);
        return items[index];
      },

      updateMany(where: WhereClause<T>, data: Partial<T>): number {
        const items = readCollection<T>(name);
        let count = 0;
        items.forEach((item, index) => {
          if (matchesWhere(item, where)) {
            items[index] = { ...item, ...data, updatedAt: new Date().toISOString() };
            count++;
          }
        });
        if (count > 0) writeCollection(name, items);
        return count;
      },

      delete(id: string): boolean {
        const items = readCollection<T>(name);
        const filtered = items.filter((item: any) => item.id !== id);
        if (filtered.length === items.length) return false;
        writeCollection(name, filtered);
        return true;
      },

      deleteMany(where: WhereClause<T>): number {
        const items = readCollection<T>(name);
        const remaining = items.filter(item => !matchesWhere(item, where));
        const count = items.length - remaining.length;
        if (count > 0) writeCollection(name, remaining);
        return count;
      },

      count(where?: WhereClause<T>): number {
        const items = readCollection<T>(name);
        if (!where) return items.length;
        return items.filter(item => matchesWhere(item, where)).length;
      },
    };
  },
};

// Type-safe collection accessors
export const users = () => db.collection<any>('users');
export const sessions = () => db.collection<any>('sessions');
export const passwordResets = () => db.collection<any>('password_resets');
export const organizations = () => db.collection<any>('organizations');
export const teams = () => db.collection<any>('teams');
export const teamMembers = () => db.collection<any>('team_members');
export const connectedCalendars = () => db.collection<any>('connected_calendars');
export const eventTypes = () => db.collection<any>('event_types');
export const eventTypeHosts = () => db.collection<any>('event_type_hosts');
export const availabilitySchedules = () => db.collection<any>('availability_schedules');
export const availabilityRules = () => db.collection<any>('availability_rules');
export const availabilityOverrides = () => db.collection<any>('availability_overrides');
export const bookings = () => db.collection<any>('bookings');
export const bookingNotifications = () => db.collection<any>('booking_notifications');
export const routingForms = () => db.collection<any>('routing_forms');
export const routingFormResponses = () => db.collection<any>('routing_form_responses');
export const workflowTemplates = () => db.collection<any>('workflow_templates');
export const integrations = () => db.collection<any>('integrations');
