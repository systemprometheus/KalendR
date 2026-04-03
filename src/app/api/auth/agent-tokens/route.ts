import { NextRequest, NextResponse } from 'next/server';
import {
  createAgentAccessToken,
  requireAuthWithScopes,
  validateAgentTokenScopes,
} from '@/lib/auth';
import { agentTokens } from '@/lib/db';

function toSafeToken(token: any) {
  return {
    id: token.id,
    name: token.name,
    tokenPreview: token.tokenPreview,
    scopes: token.scopes || [],
    lastUsedAt: token.lastUsedAt || null,
    expiresAt: token.expiresAt || null,
    revokedAt: token.revokedAt || null,
    createdAt: token.createdAt,
    updatedAt: token.updatedAt,
  };
}

export async function GET() {
  try {
    const { user } = await requireAuthWithScopes(['tokens:read']);

    const tokens = agentTokens()
      .findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })
      .map(toSafeToken);

    return NextResponse.json({ tokens });
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

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthWithScopes(['tokens:write']);
    const { user } = auth;

    const body = await req.json().catch(() => ({}));
    const expiresInDays = Number(body.expiresInDays ?? 90);

    if (!Number.isFinite(expiresInDays) || expiresInDays < 1 || expiresInDays > 365) {
      return NextResponse.json({ error: 'expiresInDays must be between 1 and 365' }, { status: 400 });
    }

    const { scopes, invalidScopes, escalatedScopes } = validateAgentTokenScopes(body.scopes, auth);

    if (invalidScopes.length > 0) {
      return NextResponse.json({
        error: `Unknown scopes requested: ${invalidScopes.join(', ')}`,
      }, { status: 400 });
    }

    if (escalatedScopes.length > 0) {
      return NextResponse.json({
        error: `Agent tokens cannot grant scopes they do not already have: ${escalatedScopes.join(', ')}`,
      }, { status: 403 });
    }

    const { token, agentToken } = await createAgentAccessToken(user.id, {
      name: typeof body.name === 'string' ? body.name : 'Kalendrio MCP',
      expiresInDays,
      scopes,
    });

    return NextResponse.json({
      token,
      agentToken: toSafeToken(agentToken),
      authScheme: 'Bearer',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Forbidden:')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Create agent token error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
