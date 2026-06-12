const UNITS = { d: 86400, h: 3600, m: 60, s: 1 };

export default function parseDuration(input) {
  if (typeof input !== 'string' || input.length === 0) {
    throw new TypeError('Expected a non-empty string');
  }
  const re = /(\d+(?:\.\d+)?)\s*([dhms])/gi;
  let total = 0;
  let matched = 0;
  let match;
  while ((match = re.exec(input)) !== null) {
    total += parseFloat(match[1]) * UNITS[match[2].toLowerCase()];
    matched++;
  }
  if (/-\d/.test(input)) {
    throw new RangeError(`Negative durations are not allowed: "${input}"`);
  }
  if (matched === 0) {
    throw new TypeError(`Cannot parse duration: "${input}"`);
  }
  return total;
}
