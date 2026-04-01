import { NextRequest, NextResponse } from 'next/server';
import { users, passwordResets } from '@/lib/db';
import { generateToken, hashPassword, verifyToken } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

// Request password reset
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = users().findFirst({ where: { email: email.toLowerCase() } });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ message: 'If an account exists, a reset link has been sent.' });
    }

    const token = generateToken({ userId: user.id, type: 'password_reset' }, '1h');

    passwordResets().create({
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      used: false,
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: 'Reset your kalendr.io password',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #03b2d1; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 20px;">Password Reset</h1>
          </div>
          <div style="padding: 32px; background: #fff; border: 1px solid #e5e7eb;">
            <p>Hi ${user.name},</p>
            <p>Click the button below to reset your password. This link expires in 1 hour.</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}" style="background: #03b2d1; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        </div>
      `,
      text: `Reset your password: ${resetUrl}`,
    });

    return NextResponse.json({ message: 'If an account exists, a reset link has been sent.' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Complete password reset
export async function PUT(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.type !== 'password_reset') {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }

    const reset = passwordResets().findFirst({ where: { token, used: false } });
    if (!reset || new Date(reset.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    users().update(payload.userId, { passwordHash });
    passwordResets().update(reset.id, { used: true });

    return NextResponse.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
