/** Longest suffix of the processed prefix that is also a target prefix (KMP-style). */
function fallback(pattern, matched, symbol) {
  const suffix = pattern.slice(0, matched) + symbol;
  for (let k = pattern.length; k > 0; k--) if (suffix.endsWith(pattern.slice(0, k))) return k;
  return 0;
}
export function generateDFA(c) {
  const patternBased = ['contains', 'ends', 'starts', 'forbidden'].includes(c.kind);
  const n = patternBased ? c.pattern.length : c.kind === 'exact' ? c.count : 1;
  const size = c.kind === 'starts' || c.kind === 'exact' ? n + 2 : n + 1;
  const states = Array.from({ length: size }, (_, i) => ({ id: `q${i}`, meaning: '' }));
  const transitions = {}, accepting = [];
  states.forEach((state, i) => {
    transitions[state.id] = {};
    let accept;
    if (patternBased) {
      accept = c.kind === 'forbidden' ? i < n : i === n;
      state.meaning = c.kind === 'starts'
        ? i > n ? `The required prefix ${c.pattern} was violated. This is a rejecting sink.` : i === n ? `The input started with ${c.pattern}. Any remaining symbols are allowed.` : `The first ${i} symbols match ${c.pattern.slice(0, i) || 'the empty prefix'} of ${c.pattern}.`
        : i === n && c.kind !== 'ends' ? c.kind === 'forbidden' ? `Forbidden substring ${c.pattern} has occurred. This is a rejecting sink.` : `Substring ${c.pattern} has occurred. Any remaining symbols are allowed.`
        : `The longest suffix matching a prefix of ${c.pattern} is ${i ? `“${c.pattern.slice(0, i)}”` : 'empty'} (${i} symbols).${c.kind === 'forbidden' ? ' The forbidden substring has not occurred.' : ''}`;
    } else if (c.kind === 'exact') {
      accept = i === n;
      state.meaning = i > n ? `More than ${n} occurrences of ${c.symbol} have been read. This is a rejecting sink.` : `Exactly ${i} occurrences of ${c.symbol} have been read so far.`;
    } else {
      accept = i === (c.parity === 'even' ? 0 : 1);
      state.meaning = c.kind === 'length' ? `The number of symbols read is ${i ? 'odd' : 'even'}.` : `The number of ${c.symbol}s read is ${i ? 'odd' : 'even'}.`;
    }
    if (accept) accepting.push(state.id);
    for (const symbol of c.alphabet) {
      let next;
      if (c.kind === 'starts') next = i >= n ? i : symbol === c.pattern[i] ? i + 1 : n + 1;
      else if (patternBased) next = i === n && c.kind !== 'ends' ? n : fallback(c.pattern, i, symbol);
      else if (c.kind === 'exact') next = Math.min(n + 1, i + (symbol === c.symbol ? 1 : 0));
      else next = c.kind === 'length' || symbol === c.symbol ? 1 - i : i;
      transitions[state.id][symbol] = `q${next}`;
    }
  });
  return { states, alphabet: c.alphabet, start: 'q0', accepting, transitions, type: 'DFA', constraint: c };
}
export function simulate(dfa, input) {
  if (input.length > 200) throw new Error('Use at most 200 symbols per simulation.');
  let current = dfa.start;
  const steps = [{ state: current, symbol: null, from: null }];
  for (const symbol of input) {
    if (!dfa.alphabet.includes(symbol)) throw new Error(`Symbol “${symbol}” is outside alphabet {${dfa.alphabet.join(', ')}}.`);
    const from = current;
    current = dfa.transitions[current][symbol];
    steps.push({ state: current, symbol, from });
  }
  return { input, steps, accepted: dfa.accepting.includes(current), final: current };
}
/** Remove unreachable states, then refine acceptance partitions until stable. */
export function minimizeDFA(dfa) {
  const reachable = new Set([dfa.start]), queue = [dfa.start];
  for (let i = 0; i < queue.length; i++) for (const a of dfa.alphabet) {
    const next = dfa.transitions[queue[i]][a];
    if (!reachable.has(next)) { reachable.add(next); queue.push(next); }
  }
  let groups = [queue.filter(s => dfa.accepting.includes(s)), queue.filter(s => !dfa.accepting.includes(s))].filter(g => g.length);
  while (true) {
    const index = Object.fromEntries(groups.flatMap((g, i) => g.map(s => [s, i])));
    const refined = groups.flatMap(group => {
      const buckets = new Map();
      for (const state of group) {
        const key = JSON.stringify(dfa.alphabet.map(a => index[dfa.transitions[state][a]]));
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(state);
      }
      return [...buckets.values()];
    });
    if (refined.length === groups.length) break;
    groups = refined;
  }
  groups.sort((a, b) => a.includes(dfa.start) ? -1 : b.includes(dfa.start) ? 1 : Number(a[0].slice(1)) - Number(b[0].slice(1)));
  const mapping = Object.fromEntries(groups.flatMap((g, i) => g.map(s => [s, `q${i}`])));
  const states = groups.map((g, i) => ({ id: `q${i}`, members: g, meaning: g.length === 1 ? dfa.states.find(s => s.id === g[0]).meaning : `Equivalent original states ${g.join(', ')}. ${g.map(id => dfa.states.find(s => s.id === id).meaning).join(' ')}` }));
  const transitions = Object.fromEntries(groups.map((g, i) => [`q${i}`, Object.fromEntries(dfa.alphabet.map(a => [a, mapping[dfa.transitions[g[0]][a]]]))]));
  return { ...dfa, states, start: mapping[dfa.start], accepting: states.filter((_, i) => dfa.accepting.includes(groups[i][0])).map(s => s.id), transitions, minimized: true, mapping, originalCount: dfa.states.length };
}
