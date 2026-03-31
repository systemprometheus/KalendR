import { NextRequest, NextResponse } from 'next/server';
import { sessions } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;

    if (token) {
      const session = sessions().findFirst({ where: { token } });
      if (session) {
        sessions().delete(session.id);
      }
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
