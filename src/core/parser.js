export const examples = ['Binary strings containing 101', 'Strings ending with 01', 'Strings starting with 10', 'Strings with an even number of 1s', 'Strings containing exactly two 1s', 'Binary strings with no consecutive 1s'];
const words = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const fail = "I couldn't identify a supported formal-language pattern.";
/** Deliberately bounded grammar: consume the entire condition, never guess at extra clauses. */
export function parseConstraint(input) {
  let text = input.trim().toLowerCase().replace(/["'`]/g, '').replace(/[.!]$/, '').replace(/\s+/g, ' ');
  if (!text) throw new Error(fail);
  let alphabet = null;
  const declaration = text.match(/(?:over\s+|alphabet\s*)?\{\s*([a-z01])\s*,\s*([a-z01])\s*\}/);
  if (declaration) {
    alphabet = [...new Set([declaration[1], declaration[2]])];
    text = text.replace(declaration[0], '').trim();
  }
  if (/\bbinary\b/.test(text)) { if (alphabet && alphabet.join('') !== '01') throw new Error('Binary strings require alphabet {0, 1}.'); alphabet = ['0', '1']; }
  text = text.replace(/^(?:binary\s+)?strings?\s*/, '').replace(/^(?:that\s+)?/, '').replace(/^with\s+/, '').replace(/\s+over\s*$/, '').trim();
  let c, m;
  if ((m = text.match(/^(?:contains?|containing)\s+(?:the\s+)?(?:substring\s+|pattern\s+)?([01ab]+)$/))) c = { kind: 'contains', pattern: m[1] };
  else if ((m = text.match(/^(?:starts?|starting|begins?|beginning)\s+with\s+([01ab]+)$/))) c = { kind: 'starts', pattern: m[1] };
  else if ((m = text.match(/^(?:ends?|ending)\s+with\s+([01ab]+)$/))) c = { kind: 'ends', pattern: m[1] };
  else if ((m = text.match(/^(?:an?\s+)?(even|odd)\s+(?:number|count)\s+of\s+([01ab])s?$/))) c = { kind: 'parity', parity: m[1], symbol: m[2] };
  else if ((m = text.match(/^(?:containing\s+|contains?\s+)?exactly\s+(\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)\s+([01ab])s?$/))) c = { kind: 'exact', count: words[m[1]] ?? Number(m[1]), symbol: m[2] };
  else if ((m = text.match(/^no\s+consecutive\s+([01ab])s?$/))) c = { kind: 'forbidden', pattern: m[1].repeat(2) };
  else if ((m = text.match(/^(?:does?\s+not\s+contain|not\s+containing|without)\s+(?:substring\s+|pattern\s+)?([01ab]+)$/))) c = { kind: 'forbidden', pattern: m[1] };
  else if ((m = text.match(/^(even|odd)\s+length$/))) c = { kind: 'length', parity: m[1] };
  else throw new Error(/^(?:with\s+)?[01ab]$/.test(text) ? 'This description is ambiguous. Specify contains, starts with, ends with, or exactly one.' : fail);
  const symbols = c.pattern || c.symbol || '';
  alphabet ??= /[ab]/.test(symbols) ? ['a', 'b'] : ['0', '1'];
  if ([...symbols].some(s => !alphabet.includes(s))) throw new Error('The condition contains a symbol outside the declared alphabet.');
  if ((c.pattern?.length || 0) > 12 || (c.count ?? 0) > 12) throw new Error('For a readable graph, use patterns and exact counts up to 12.');
  const condition = c.kind === 'contains' ? `Contains substring ${c.pattern}` : c.kind === 'starts' ? `Starts with ${c.pattern}` : c.kind === 'ends' ? `Ends with ${c.pattern}` : c.kind === 'forbidden' ? `Does not contain ${c.pattern}` : c.kind === 'exact' ? `Exactly ${c.count} occurrences of ${c.symbol}` : c.kind === 'length' ? `${c.parity} length` : `${c.parity} number of ${c.symbol}s`;
  return { ...c, alphabet, condition, type: 'DFA', acceptance: condition };
}
