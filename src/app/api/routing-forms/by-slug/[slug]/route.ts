import { NextRequest, NextResponse } from 'next/server';
import { routingForms } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const form = routingForms().findFirst({ where: { slug, isActive: true } });
    if (!form) {
      return NextResponse.json({ error: 'Routing form not found' }, { status: 404 });
    }
    return NextResponse.json({ routingForm: form });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
