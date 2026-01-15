import { NextResponse } from 'next/server';
import { sendNewArrivalEmail } from '@/lib/notifications/email';

export const runtime = 'nodejs';

async function sendTestEmail(email: string) {
  await sendNewArrivalEmail({
    to: email,
    products: [
      {
        name: 'Test Jellycat Product',
        url: 'https://www.jellycat.com/us/test-product',
        imageUrl: 'https://www.jellycat.com/images/test.jpg',
      },
    ],
  });

  return NextResponse.json({
    success: true,
    message: `Test email sent to ${email}`,
  });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get('email');

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email address is required. Use ?email=your-email@example.com' },
        { status: 400 }
      );
    }

    return await sendTestEmail(email);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: `Failed to send test email: ${errorMessage}`,
        hint: errorMessage.includes('Missing RESEND') 
          ? 'Make sure RESEND_API_KEY and RESEND_FROM_EMAIL are set in your .env file'
          : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    return await sendTestEmail(email);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: `Failed to send test email: ${errorMessage}`,
        hint: errorMessage.includes('Missing RESEND') 
          ? 'Make sure RESEND_API_KEY and RESEND_FROM_EMAIL are set in your .env file'
          : undefined
      },
      { status: 500 }
    );
  }
}
