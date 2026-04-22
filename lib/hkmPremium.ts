/**
 * HKM (ヒカマニコイン) によるプレミアムチェック
 * ヒカマニコインのAPIを叩いて、なりきったーProプランの購入を確認する
 */

const HKM_API = process.env.HKM_API_URL || "https://hikakinmaniacoin.hikamer.f5.si";
const HKM_API_KEY = process.env.HKM_API_KEY || "";

export async function isHkmPremium(discordId: string | null | undefined): Promise<boolean> {
  if (!discordId || !HKM_API_KEY) return false;
  try {
    const res = await fetch(`${HKM_API}/api/external/check-purchase?discordId=${discordId}&slug=narikitter-pro`, {
      headers: { "x-api-key": HKM_API_KEY },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.active === true;
  } catch {
    return false;
  }
}
