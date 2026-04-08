import { NextRequest } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'
import { fetchUserTweets, type YahooEntry } from '@/lib/yahooRealtime'
import { callOpenAIStream } from '@/lib/openaiStream'

interface UserData {
  userId: string
  userName: string
  profileImageUrl: string
  description: string
  tweets: string[]
}

function yahooToUserData(own: YahooEntry[]): UserData | null {
  if (!own.length) return null
  const first = own[0]
  return {
    userId: first.screenName,
    userName: first.name,
    profileImageUrl: first.profileImage,
    description: '',
    tweets: own.slice(0, 120).map(t => (t.displayText || '').replace(/\n/g, ' ')),
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  if (!rateLimit(ip, 8, 60_000)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 })
  }

  try {
    const body = await request.json()
    const { teamA, teamB, note, mode, customBrief } = body
    if (!Array.isArray(teamA) || !Array.isArray(teamB) || !teamA.length || !teamB.length) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 })
    }
    const modeStr = typeof mode === 'string' ? mode : 'battle'
    if (
      modeStr === 'custom' &&
      (!customBrief || typeof customBrief !== 'string' || !customBrief.trim())
    ) {
      return new Response(JSON.stringify({ error: 'カスタムモードでは「創作の内容」を入力してください' }), {
        status: 400,
      })
    }

    const rawIds = [...new Set([...teamA, ...teamB].map((id: string) => String(id).trim()))]
    const userDataList: UserData[] = []

    for (const rawId of rawIds) {
      const { own } = await fetchUserTweets(rawId)
      const u = yahooToUserData(own)
      if (u) userDataList.push(u)
    }

    const byLower = new Map(userDataList.map(u => [u.userId.toLowerCase(), u]))
    const resolve = (id: string) => byLower.get(String(id).trim().toLowerCase())
    const teamAUsers = teamA.map((id: string) => resolve(id)).filter((x): x is UserData => !!x)
    const teamBUsers = teamB.map((id: string) => resolve(id)).filter((x): x is UserData => !!x)

    if (teamAUsers.length !== teamA.length || teamBUsers.length !== teamB.length) {
      return new Response(JSON.stringify({ error: 'ユーザーのツイートを取得できませんでした' }), { status: 400 })
    }

    const prompt = buildBattlePrompt(
      teamAUsers,
      teamBUsers,
      typeof note === 'string' ? note : '',
      modeStr,
      typeof customBrief === 'string' ? customBrief : '',
    )
    const stream = await callOpenAIStream(prompt)
    if ('error' in stream) {
      return new Response(JSON.stringify({ error: stream.error }), { status: 503 })
    }

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (e: unknown) {
    console.error('[Battle]', e)
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 })
  }
}

function buildBattlePrompt(
  teamA: UserData[],
  teamB: UserData[],
  note: string,
  mode: string,
  customBrief: string,
): string {
  const teamAInfo = teamA
    .map(u => {
      const sampleTweets = u.tweets.slice(0, 100).join(' | ')
      return `${u.userName}(@${u.userId}): ${u.description || '(なし)'}\nツイート: ${sampleTweets}`
    })
    .join('\n')

  const teamBInfo = teamB
    .map(u => {
      const sampleTweets = u.tweets.slice(0, 100).join(' | ')
      return `${u.userName}(@${u.userId}): ${u.description || '(なし)'}\nツイート: ${sampleTweets}`
    })
    .join('\n')

  const teamANames = teamA.map(u => u.userName).join('、')
  const teamBNames = teamB.map(u => u.userName).join('、')

  if (mode === 'custom') {
    const main = customBrief.trim()
    const extra = note.trim()
    return `あなたはなりきり創作の作家です。以下のユーザーをキャラクターとして、ユーザーが指定した形式・内容で創作してください。

【ユーザーからの指定（必ず反映）】
${main}
${extra ? `\n【追加の指示】\n${extra}` : ''}

【チームA】
${teamAInfo}
【チームB】
${teamBInfo}

【ルール】各キャラの口調・言葉遣いをツイートの雰囲気に沿って再現すること。指定に文字数がなければ2000〜3000字程度。セリフや段落は読みやすく改行すること。
【${teamANames}】×【${teamBNames}】の創作を開始！`
  }

  if (mode === 'manzai') {
    return `漫才作家として以下のユーザーで漫才を書いて。
【出演者】
${teamAInfo}
${teamBInfo}
${note ? `【指示】${note}` : ''}
【ルール】コンビ名決定/ボケツッコミ決定/口調再現/「どうも〜」開始「もうええわ」終了/2000-3000字/セリフごと改行
【${teamANames}】×【${teamBNames}】漫才スタート！`
  }
  if (mode === 'conte') {
    return `コント作家として以下のユーザーでコントを書いて。
【出演者】
${teamAInfo}
${teamBInfo}
${note ? `【指示】${note}` : ''}
【ルール】口調再現/設定明示/予想外の展開/2000-3000字/セリフごと改行
【${teamANames}】×【${teamBNames}】コントスタート！`
  }
  if (mode === 'rap') {
    return `ラップバトル司会者として以下のユーザーでラップバトルを書いて。
【チームA】
${teamAInfo}
【チームB】
${teamBInfo}
${note ? `【指示】${note}` : ''}
【ルール】口調再現/韻を踏む/パンチライン/勝者決定/2000-3000字/バースごと改行/Yo!Check it!使用
【${teamANames}】VS【${teamBNames}】ラップバトル開幕！`
  }
  if (mode === 'debate') {
    return `ディベート司会者として以下のユーザーでディベートを書いて。
【肯定側】
${teamAInfo}
【否定側】
${teamBInfo}
${note ? `【指示】${note}` : ''}
【ルール】口調再現/立論→反駁→最終弁論/データ・例え話/勝者決定/2000-3000字
【${teamANames}】VS【${teamBNames}】ディベート開始！`
  }
  if (mode === 'drama') {
    return `ドラマ脚本家として以下のユーザーでドラマを書いて。
【主要キャスト】
${teamAInfo}
【対立キャスト】
${teamBInfo}
${note ? `【指示】${note}` : ''}
【ルール】口調再現/対立→葛藤→和解or決着/感情の起伏/印象的セリフ/2000-3000字
【${teamANames}】×【${teamBNames}】ドラマ開幕！`
  }

  return `創作バトル小説作家として以下のユーザーで物理バトルを書いて。
【チームA】
${teamAInfo}
【チームB】
${teamBInfo}
${note ? `【指示】${note}` : ''}
【ルール】口調再現/物理戦闘(殴る蹴る必殺技)/固有能力設定/予測不能展開(乱入裏切り覚醒)/勝敗決定(引分禁止)/2000-3000字
【${teamANames}】VS【${teamBNames}】バトル開始！`
}
