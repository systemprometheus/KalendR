import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { routingForms } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const form = routingForms().findById(id);
    if (!form) return NextResponse.json({ error: 'Not found' }, { status: 404 });
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
    if (!form) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json();
    if (body.fields && typeof body.fields !== 'string') body.fields = JSON.stringify(body.fields);
    if (body.routes && typeof body.routes !== 'string') body.routes = JSON.stringify(body.routes);

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

    routingForms().delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
