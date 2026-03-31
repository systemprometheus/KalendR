import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { users } from '@/lib/db';

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const allowed = ['name', 'timezone', 'slug', 'bio', 'welcomeMessage', 'locale', 'avatarUrl'];
    const updates: any = {};

    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    if (updates.slug) {
      const existing = users().findFirst({ where: { slug: updates.slug } });
      if (existing && existing.id !== user.id) {
        return NextResponse.json({ error: 'This URL is already taken' }, { status: 409 });
      }
    }

    const updated = users().update(user.id, updates);
    const { passwordHash, ...safeUser } = updated;
    return NextResponse.json({ user: safeUser });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
