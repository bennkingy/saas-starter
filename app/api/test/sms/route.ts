import { NextResponse } from 'next/server';
import { createSmsProviderFromEnv } from '@/lib/notifications/sms';

export const runtime = 'nodejs';

async function sendTestSms(phoneNumber: string) {
  const smsProvider = createSmsProviderFromEnv();
  
  await smsProvider.send({
    to: phoneNumber,
    body: '🎉 Test SMS from Jellycat Stock Alerts! This is a test message to verify your SMS notifications are working correctly.',
  });

  return NextResponse.json({
    success: true,
    message: `Test SMS sent to ${phoneNumber}`,
  });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const phoneNumber = url.searchParams.get('phone');

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return NextResponse.json(
        { error: 'Phone number is required. Use ?phone=+447911123456 (E.164 format)' },
        { status: 400 }
      );
    }

    return await sendTestSms(phoneNumber);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: `Failed to send test SMS: ${errorMessage}`,
        hint: errorMessage.includes('SMS provider is not configured') 
          ? 'Make sure CLICK_SEND_API_KEY is set in your .env file'
          : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone } = body;

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        { error: 'Phone number is required (E.164 format, e.g., +447911123456)' },
        { status: 400 }
      );
    }

    return await sendTestSms(phone);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: `Failed to send test SMS: ${errorMessage}`,
        hint: errorMessage.includes('SMS provider is not configured') 
          ? 'Make sure CLICK_SEND_API_KEY is set in your .env file'
          : undefined
      },
      { status: 500 }
    );
  }
}
