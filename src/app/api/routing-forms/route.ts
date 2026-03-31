import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { routingForms } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const forms = routingForms().findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ routingForms: forms });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { name, description, fields, routes, fallbackType, fallbackValue } = body;

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Math.random().toString(36).substring(2, 6);

    const form = routingForms().create({
      name,
      slug,
      description: description || null,
      isActive: true,
      organizationId: user.organizationId,
      fields: JSON.stringify(fields || []),
      routes: JSON.stringify(routes || []),
      fallbackType: fallbackType || 'message',
      fallbackValue: fallbackValue || 'Thank you for your interest. We\'ll be in touch soon.',
    });

    return NextResponse.json({ routingForm: form }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
