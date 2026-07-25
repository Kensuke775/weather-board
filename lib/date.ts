// weather_logs.logged_date などの「今日」判定は全てここを経由する。
// toISOString()はUTC基準になり、日本時間の深夜〜早朝（UTC換算だと前日）に
// ローカルの日付とズレるため、必ずtoLocaleDateStringのローカル基準で統一する。
export function toDateString(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA');
}

// ホーム画面背景の昼夜切り替えなど、時間帯判定はここに一本化する。
export function isDaytimeNow(date: Date = new Date()): boolean {
  const hour = date.getHours();
  return hour >= 6 && hour < 18;
}
