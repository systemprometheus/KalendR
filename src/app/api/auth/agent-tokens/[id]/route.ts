import { NextResponse } from 'next/server';
import { requireAuthWithScopes } from '@/lib/auth';
import { agentTokens } from '@/lib/db';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireAuthWithScopes(['tokens:write']);

    const { id } = await params;
    const token = agentTokens().findById(id);

    if (!token || token.userId !== user.id) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    agentTokens().update(id, {
      revokedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, revoked: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Forbidden:')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
