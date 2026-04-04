import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getCurrentUser } from '@/lib/auth';
import { routingForms } from '@/lib/db';
import { sanitizeOptionalHttpUrl, sanitizeText } from '@/lib/validation';

export async function GET(_req: Request) {
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

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { name, description, fields, routes, fallbackType, fallbackValue } = body;
    const normalizedName = sanitizeText(name, 120);

    if (!normalizedName) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    if (fallbackType === 'external_url' && !sanitizeOptionalHttpUrl(fallbackValue)) {
      return NextResponse.json({ error: 'Fallback URL must be http or https' }, { status: 400 });
    }

    const slug = `${normalizedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${randomBytes(3).toString('hex')}`;

    const form = routingForms().create({
      name: normalizedName,
      slug,
      description: sanitizeText(description, 2000),
      isActive: true,
      organizationId: user.organizationId,
      fields: JSON.stringify(fields || []),
      routes: JSON.stringify(routes || []),
      fallbackType: fallbackType || 'message',
      fallbackValue: fallbackType === 'external_url'
        ? sanitizeOptionalHttpUrl(fallbackValue)
        : (sanitizeText(fallbackValue, 2000) || 'Thank you for your interest. We\'ll be in touch soon.'),
    });

    return NextResponse.json({ routingForm: form }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
