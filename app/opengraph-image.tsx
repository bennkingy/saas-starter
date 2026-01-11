import { ImageResponse } from 'next/og';
import { SITE_NAME, SITE_DESCRIPTION } from '@/lib/config/site';

export const size = {
  width: 1200,
  height: 630
};

export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#0b1220',
          color: 'white',
          padding: 72,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: -200,
            background:
              'radial-gradient(circle at 25% 35%, rgba(99,102,241,.45), transparent 60%), radial-gradient(circle at 70% 65%, rgba(34,197,94,.25), transparent 55%)'
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(0,0,0,.0), rgba(0,0,0,.35))'
          }}
        />

        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            maxWidth: 980
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 14,
              padding: '10px 14px',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,.18)',
              background: 'rgba(255,255,255,.06)',
              width: 'fit-content',
              fontSize: 22
            }}
          >
            <span style={{ fontSize: 22, opacity: 0.9 }}>New stock alerts</span>
          </div>

          <div style={{ fontSize: 80, fontWeight: 800, lineHeight: 1.05 }}>
            {SITE_NAME}
          </div>

          <div style={{ fontSize: 30, lineHeight: 1.35, opacity: 0.9 }}>
            {SITE_DESCRIPTION}
          </div>

          <div
            style={{
              marginTop: 18,
              display: 'flex',
              gap: 14
            }}
          >
            <div
              style={{
                padding: '14px 18px',
                borderRadius: 16,
                background: 'rgba(99,102,241,.18)',
                border: '1px solid rgba(99,102,241,.35)',
                fontSize: 24
              }}
            >
              Email alerts
            </div>
            <div
              style={{
                padding: '14px 18px',
                borderRadius: 16,
                background: 'rgba(34,197,94,.14)',
                border: '1px solid rgba(34,197,94,.25)',
                fontSize: 24
              }}
            >
              Optional SMS
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
