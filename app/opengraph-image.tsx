import { ImageResponse } from 'next/og';

export const alt = 'なりきったー';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #4c1d95 0%, #a78bfa 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 80, fontWeight: 'bold', color: 'white', marginBottom: 20 }}>
          なりきったー
        </div>
        <div style={{ fontSize: 36, color: '#ddd6fe', textAlign: 'center' }}>
          X（Twitter）ユーザーの公開ツイートを参考に、そのアカウントになりきって会話できるサービス
        </div>
      </div>
    ),
    { ...size }
  );
}
