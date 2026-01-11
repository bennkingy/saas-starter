import { ImageResponse } from 'next/og';
import { SITE_NAME, SITE_DESCRIPTION } from '@/lib/config/site';

export const size = {
  width: 1200,
  height: 600
};

export const contentType = 'image/png';

export default function TwitterImage() {
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
              'radial-gradient(circle at 20% 35%, rgba(99,102,241,.45), transparent 60%), radial-gradient(circle at 75% 60%, rgba(236,72,153,.22), transparent 55%)'
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
            gap: 18,
            maxWidth: 980
          }}
        >
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05 }}>
            {SITE_NAME}
          </div>
          <div style={{ fontSize: 28, lineHeight: 1.35, opacity: 0.9 }}>
            {SITE_DESCRIPTION}
          </div>
        </div>
      </div>
    ),
    size
  );
}
