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
  if (dfa.type === 'NFA') return simulateNFA(dfa, input);
  if (input.length > 200) throw new Error('Use at most 200 symbols per simulation.');
  let current = dfa.start;
  const steps = [{ state: current, states: [current], symbol: null, from: null, moves: [] }];
  for (const symbol of input) {
    if (!dfa.alphabet.includes(symbol)) throw new Error(`Symbol “${symbol}” is outside alphabet {${dfa.alphabet.join(', ')}}.`);
    const from = current;
    current = dfa.transitions[current][symbol];
    steps.push({ state: current, states: [current], symbol, from, moves: [{ from, to: current, symbol }] });
  }
  return { input, steps, accepted: dfa.accepting.includes(current), final: current };
}
/** Remove unreachable states, then refine acceptance partitions until stable. */
export function minimizeDFA(dfa) {
  if (dfa.type !== 'DFA') throw new Error('Convert the NFA to a DFA before minimization.');
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

/** Normalize the DFA single destination and NFA set-valued transition models. */
export function transitionTargets(automaton, state, symbol) {
  const value = automaton.transitions[state]?.[symbol];
  return value == null ? [] : Array.isArray(value) ? value : [value];
}

/** Direct NFA construction: substring search guesses where a match begins. */
export function generateNFA(constraint) {
  const c = { ...constraint, type: 'NFA' };
  if (['contains', 'ends', 'starts'].includes(c.kind)) {
    const n = c.pattern.length;
    const states = Array.from({ length: n + 1 }, (_, i) => ({
      id: `q${i}`,
      meaning: i === 0
        ? c.kind === 'starts' ? `No input has been read. The first symbol must begin ${c.pattern}.` : `This branch keeps scanning for a new occurrence of ${c.pattern}. On ${c.pattern[0]}, it can also begin a matching branch.`
        : i === n
          ? c.kind === 'ends' ? `This branch has matched ${c.pattern}. It accepts only if the input ends here; any further symbol ends this branch.` : `This branch has matched ${c.pattern}${c.kind === 'starts' ? ' at the start of the input' : ''}. All remaining symbols are allowed.`
          : `This branch has matched the prefix “${c.pattern.slice(0, i)}” of ${c.pattern}. It must read ${c.pattern[i]} next; a different symbol ends this branch.`,
    }));
    const transitions = Object.fromEntries(states.map(s => [s.id, Object.fromEntries(c.alphabet.map(a => [a, []]))]));
    if (c.kind !== 'starts') for (const a of c.alphabet) transitions.q0[a].push('q0');
    for (let i = 0; i < n; i++) transitions[`q${i}`][c.pattern[i]].push(`q${i + 1}`);
    if (c.kind !== 'ends') for (const a of c.alphabet) transitions[`q${n}`][a].push(`q${n}`);
    return { states, alphabet: c.alphabet, start: 'q0', accepting: [`q${n}`], transitions, type: 'NFA', constraint: c,
      construction: c.kind === 'starts' ? 'A matching chain; a mismatch ends the branch instead of entering a sink.' : 'On the first pattern symbol, the scanning state follows both transitions: keep scanning and begin a match. All branches are tracked together.' };
  }
  const dfa = generateDFA(c);
  // Exact counts need no overflow sink in an NFA: excess occurrences end a branch.
  const states = c.kind === 'exact' ? dfa.states.slice(0, -1) : dfa.states;
  const ids = new Set(states.map(s => s.id));
  const transitions = Object.fromEntries(states.map(s => [s.id, Object.fromEntries(c.alphabet.map(a => [a, ids.has(dfa.transitions[s.id][a]) ? [dfa.transitions[s.id][a]] : []]))]));
  return { ...dfa, states, transitions, type: 'NFA', constraint: c,
    construction: c.kind === 'exact' ? 'States count occurrences. An excess target symbol has no outgoing transition, so that branch ends.' : 'This constraint needs no branching. Every DFA is also a valid NFA; the transition table still uses destination sets.' };
}

/** Reach all states through zero or more epsilon transitions; cycles terminate. */
export function epsilonClosure(nfa, initial) {
  const seen = new Set(initial), queue = [...seen], moves = [];
  for (let i = 0; i < queue.length; i++) for (const next of transitionTargets(nfa, queue[i], 'ε')) {
    moves.push({ from: queue[i], to: next, symbol: 'ε' });
    if (!seen.has(next)) { seen.add(next); queue.push(next); }
  }
  return { states: nfa.states.map(s => s.id).filter(id => seen.has(id)), moves };
}

export function simulateNFA(nfa, input) {
  if (input.length > 200) throw new Error('Use at most 200 symbols per simulation.');
  let closure = epsilonClosure(nfa, [nfa.start]);
  const steps = [{ states: closure.states, symbol: null, moves: closure.moves }];
  for (const symbol of input) {
    if (!nfa.alphabet.includes(symbol)) throw new Error(`Symbol “${symbol}” is outside alphabet {${nfa.alphabet.join(', ')}}.`);
    const moves = closure.states.flatMap(from => transitionTargets(nfa, from, symbol).map(to => ({ from, to, symbol })));
    closure = epsilonClosure(nfa, moves.map(m => m.to));
    steps.push({ states: closure.states, symbol, moves: [...moves, ...closure.moves] });
  }
  return { input, steps, accepted: closure.states.some(s => nfa.accepting.includes(s)), finalStates: closure.states };
}

/** Reachable powerset construction. The empty subset is the DFA rejecting sink. */
export function determinizeNFA(nfa) {
  if (nfa.type !== 'NFA') throw new Error('Choose an NFA to convert.');
  const start = epsilonClosure(nfa, [nfa.start]).states;
  const subsets = [start], index = new Map([[JSON.stringify(start), 'q0']]), transitions = {};
  for (let i = 0; i < subsets.length; i++) {
    transitions[`q${i}`] = {};
    for (const a of nfa.alphabet) {
      const next = epsilonClosure(nfa, subsets[i].flatMap(s => transitionTargets(nfa, s, a))).states;
      const key = JSON.stringify(next);
      if (!index.has(key)) {
        if (subsets.length >= 256) throw new Error('Conversion would exceed 256 DFA states. Use a shorter pattern for a readable graph.');
        index.set(key, `q${subsets.length}`); subsets.push(next);
      }
      transitions[`q${i}`][a] = index.get(key);
    }
  }
  const states = subsets.map((subset, i) => ({ id: `q${i}`, subset,
    meaning: subset.length ? `This DFA state represents the active NFA state set {${subset.join(', ')}}. ${subset.some(s => nfa.accepting.includes(s)) ? 'At least one member accepts.' : 'No member accepts yet.'}` : 'The NFA has no surviving branch. This empty subset is a rejecting sink.' }));
  return { states, alphabet: nfa.alphabet, start: 'q0', accepting: states.filter((_, i) => subsets[i].some(s => nfa.accepting.includes(s))).map(s => s.id), transitions, type: 'DFA', constraint: { ...nfa.constraint, type: 'DFA' }, converted: true, sourceCount: nfa.states.length };
}
