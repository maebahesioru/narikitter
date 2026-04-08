export interface Message {
  /** リストの React key 用（ストリーミングで同一インデックスが激変すると removeChild 不整合の原因になる） */
  id: string
  role: 'user' | 'assistant'
  content: string
  thinking?: string
  mediaFiles?: { data: string; mimeType: string; preview?: string }[]
  textFiles?: { name: string; content: string }[]
  relatedQuestions?: string[]
}

export interface UserOption {
  userId: string
  userName: string
  profileImageUrl: string
  allProfileImages: string[]
  tweetCount: number
}

export interface UserInfo {
  userName: string
  profileImageUrl: string
  allProfileImages: string[]
  description: string
}
