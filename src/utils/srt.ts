export interface SrtCue {
  index: number;
  start: number; // seconds
  end: number; // seconds
  text: string;
}

function timeToSeconds(time: string): number {
  // "00:01:23,456" -> seconds
  const match = time.trim().match(/(\d+):(\d+):(\d+)[,.](\d+)/);
  if (!match) return 0;
  const [, h, m, s, ms] = match;
  return Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms) / 1000;
}

// Minimal, tolerant .srt parser — enough to drive an on-screen caption
// timeline from a real downloaded track. Not a full spec implementation
// (no styling tags, no nested cue numbering edge cases).
export function parseSrt(content: string): SrtCue[] {
  const blocks = content.replace(/\r\n/g, '\n').split(/\n\n+/);
  const cues: SrtCue[] = [];

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    let lineIdx = 0;
    const index = Number(lines[lineIdx].trim());
    if (!Number.isNaN(index)) lineIdx += 1;

    const timeLine = lines[lineIdx];
    const timeMatch = timeLine && timeLine.match(/(.+?)\s*-->\s*(.+)/);
    if (!timeMatch) continue;
    lineIdx += 1;

    const text = lines.slice(lineIdx).join('\n').trim();
    if (!text) continue;

    cues.push({
      index: Number.isNaN(index) ? cues.length + 1 : index,
      start: timeToSeconds(timeMatch[1]),
      end: timeToSeconds(timeMatch[2]),
      text,
    });
  }

  return cues;
}
