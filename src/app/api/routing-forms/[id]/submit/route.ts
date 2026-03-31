import { NextRequest, NextResponse } from 'next/server';
import { routingForms, routingFormResponses, eventTypes, users } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const form = routingForms().findById(id);
    if (!form || !form.isActive) {
      return NextResponse.json({ error: 'Routing form not found' }, { status: 404 });
    }

    const { responses } = await req.json();

    // Evaluate routing rules
    let routes: any[] = [];
    try { routes = JSON.parse(form.routes); } catch {}

    let destination = null;

    for (const route of routes) {
      const matches = evaluateConditions(route.conditions, route.logic || 'and', responses);
      if (matches) {
        destination = route.destination;
        break;
      }
    }

    // Fallback
    if (!destination) {
      destination = { type: form.fallbackType, value: form.fallbackValue };
    }

    // Save response
    let routedTo = null;
    if (destination.type === 'event_type') {
      const et = eventTypes().findById(destination.value);
      if (et) {
        const host = users().findById(et.userId);
        routedTo = {
          type: 'event_type',
          eventTypeId: et.id,
          username: host?.slug,
          eventSlug: et.slug,
        };
      }
    } else if (destination.type === 'external_url') {
      routedTo = { type: 'external_url', url: destination.value };
    } else {
      routedTo = { type: 'message', message: destination.value };
    }

    routingFormResponses().create({
      routingFormId: id,
      responses: JSON.stringify(responses),
      routedTo: JSON.stringify(routedTo),
    });

    return NextResponse.json({ destination: routedTo });
  } catch (error) {
    console.error('Routing form error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function evaluateConditions(conditions: any[], logic: 'and' | 'or', responses: Record<string, any>): boolean {
  if (!conditions || conditions.length === 0) return false;

  const results = conditions.map(cond => {
    const value = responses[cond.fieldId];
    switch (cond.operator) {
      case 'equals': return value === cond.value;
      case 'not_equals': return value !== cond.value;
      case 'contains': return String(value).toLowerCase().includes(String(cond.value).toLowerCase());
      case 'in': return Array.isArray(cond.value) ? cond.value.includes(value) : false;
      default: return false;
    }
  });

  return logic === 'and' ? results.every(Boolean) : results.some(Boolean);
}
