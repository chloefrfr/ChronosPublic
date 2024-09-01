interface RegexMatch {
  id: string;
}

export function matchRegex(input: string): RegexMatch | null {
  const regex = /(?:CID_)(\d+|A_\d+)(?:_.+)/;
  const match = regex.exec(input);
  if (match) {
    return { id: match[1] };
  }
  return null;
}
