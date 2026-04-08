import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const user = req.nextUrl.searchParams.get('user') || ''
  const name = req.nextUrl.searchParams.get('name') || user
  const img = req.nextUrl.searchParams.get('img') || ''

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f0f0f',
          fontFamily: 'sans-serif',
        }}
      >
        {/* purple gradient bar top */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: 'linear-gradient(90deg,#7c3aed,#a78bfa)' }} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} width={96} height={96} style={{ borderRadius: 48, border: '3px solid #a78bfa' }} alt="" />
          ) : (
            <div style={{ width: 96, height: 96, borderRadius: 48, background: '#1a1a1a', border: '3px solid #a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🎭</div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: '#ffffff' }}>{name}</div>
            <div style={{ fontSize: 20, color: '#a78bfa' }}>@{user}</div>
          </div>

          <div style={{ fontSize: 18, color: '#666', marginTop: 8 }}>公開ツイートを参考に、なりきりで会話</div>
        </div>

        <div style={{ position: 'absolute', bottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 16, color: '#444' }}>🎭 なりきったー · Narikitter</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
