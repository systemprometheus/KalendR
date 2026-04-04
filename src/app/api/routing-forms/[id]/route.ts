import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { routingForms } from '@/lib/db';
import { sanitizeOptionalHttpUrl, sanitizeText } from '@/lib/validation';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const form = routingForms().findById(id);
    if (!form || form.organizationId !== user.organizationId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ routingForm: form });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const form = routingForms().findById(id);
    if (!form || form.organizationId !== user.organizationId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json();
    if (body.fields && typeof body.fields !== 'string') body.fields = JSON.stringify(body.fields);
    if (body.routes && typeof body.routes !== 'string') body.routes = JSON.stringify(body.routes);
    if (body.name !== undefined) {
      body.name = sanitizeText(body.name, 120);
      if (!body.name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (body.description !== undefined) body.description = sanitizeText(body.description, 2000);
    if (body.fallbackType === 'external_url') {
      body.fallbackValue = sanitizeOptionalHttpUrl(body.fallbackValue);
      if (!body.fallbackValue) {
        return NextResponse.json({ error: 'Fallback URL must be http or https' }, { status: 400 });
      }
    } else if (body.fallbackValue !== undefined) {
      body.fallbackValue = sanitizeText(body.fallbackValue, 2000);
    }

    const updated = routingForms().update(id, body);
    return NextResponse.json({ routingForm: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const form = routingForms().findById(id);
    if (!form || form.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    routingForms().delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
