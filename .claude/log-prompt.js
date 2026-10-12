// UserPromptSubmit hook: 사용자가 입력한 명령을 docs/prompt-history.md 에 누적 저장
const fs = require('fs');
const path = require('path');
let input = '';
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const dir = path.join(data.cwd || process.cwd(), 'docs');
    fs.mkdirSync(dir, { recursive: true });
    const ts = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    const entry = `\n## ${ts} (session ${String(data.session_id || '').slice(0, 8)})\n\n${data.prompt}\n`;
    fs.appendFileSync(path.join(dir, 'prompt-history.md'), entry, 'utf8');
  } catch (e) {
    // 로깅 실패는 작업을 막지 않음
  }
});
