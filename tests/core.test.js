import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseConstraint, examples } from '../src/core/parser.js';
import { generateDFA, generateNFA, determinizeNFA, epsilonClosure, transitionTargets, simulate, minimizeDFA } from '../src/core/automata.js';
const machine = p => generateDFA(parseConstraint(p));
function strings(alphabet,max){let all=[''],row=[''];for(let i=0;i<max;i++){row=row.flatMap(s=>alphabet.map(a=>s+a));all.push(...row);}return all;}
const cases = [
 ['Binary strings containing 101',s=>s.includes('101')],
 ['contains substring 110',s=>s.includes('110')],
 ['Strings starting with 10',s=>s.startsWith('10')],
 ['begins with 1',s=>s.startsWith('1')],
 ['Strings ending with 01',s=>s.endsWith('01')],
 ['ends with 101',s=>s.endsWith('101')],
 ['Strings with an even number of 1s',s=>[...s].filter(a=>a==='1').length%2===0],
 ['odd number of 0s',s=>[...s].filter(a=>a==='0').length%2===1],
 ['Strings containing exactly two 1s',s=>[...s].filter(a=>a==='1').length===2],
 ['exactly three 0s',s=>[...s].filter(a=>a==='0').length===3],
 ['exactly zero 1s',s=>!s.includes('1')],
 ['Binary strings with no consecutive 1s',s=>!s.includes('11')],
 ['does not contain 00',s=>!s.includes('00')],
 ['even length',s=>s.length%2===0],
 ['odd length',s=>s.length%2===1],
 ['Strings over {a,b} containing ab',s=>s.includes('ab')],
 ['Strings over {a,b} ending with aba',s=>s.endsWith('aba')],
 ['exactly two as',s=>[...s].filter(a=>a==='a').length===2],
 ['no consecutive bs',s=>!s.includes('bb')]
];
for(const [prompt,oracle] of cases)test(`recognition and minimization: ${prompt}`,()=>{
 const dfa=machine(prompt), minimized=minimizeDFA(dfa), inputs=strings(dfa.alphabet,8);
 assert.ok(inputs.some(oracle));assert.ok(inputs.some(s=>!oracle(s)));
 for(const s of inputs){assert.equal(simulate(dfa,s).accepted,oracle(s),`original: ${s}`);assert.equal(simulate(minimized,s).accepted,oracle(s),`minimized: ${s}`);}
 for(const q of dfa.states)for(const a of dfa.alphabet)assert.ok(dfa.states.some(s=>s.id===dfa.transitions[q.id][a]));
 assert.ok(minimized.states.length<=dfa.states.length);
});
test('all faculty examples parse',()=>examples.forEach(p=>assert.equal(machine(p).type,'DFA')));
test('all binary patterns up to length four, including overlapping prefixes',()=>{
 for(const pattern of strings(['0','1'],4).filter(Boolean)) for(const kind of ['contains','starts','ends','forbidden']) {
  const dfa=generateDFA({kind,pattern,alphabet:['0','1']});
  for(const s of strings(dfa.alphabet,7)) {
   const expected=kind==='contains'?s.includes(pattern):kind==='starts'?s.startsWith(pattern):kind==='ends'?s.endsWith(pattern):!s.includes(pattern);
   assert.equal(simulate(dfa,s).accepted,expected,`${kind} ${pattern}: ${s}`);
  }
 }
});
test('simulation records actual transitions',()=>{const r=simulate(machine(examples[0]),'110101');assert.equal(r.accepted,true);assert.deepEqual(r.steps.map(s=>s.state),['q0','q1','q1','q2','q3','q3','q3']);assert.equal(simulate(machine(examples[0]),'0000').accepted,false);});
test('empty input and invalid input',()=>{assert.equal(simulate(machine('even length'),'').accepted,true);assert.equal(simulate(machine('odd length'),'').accepted,false);assert.throws(()=>simulate(machine(examples[0]),'102'),/outside alphabet/);assert.throws(()=>simulate(machine(examples[0]),'1'.repeat(201)),/200/);});
test('parser rejects ambiguity, conflicts, unsupported clauses and bounds',()=>{for(const p of ['I like football','Strings with 1','contains 101 and ends with 01','contains 101 or contains 00','Binary strings containing ab','exactly 13 1s','contains '+ '1'.repeat(13)])assert.throws(()=>parseConstraint(p));});
test('minimization really merges equivalent states and removes unreachable states',()=>{
 const d={states:['q0','q1','q2','q3','q4','q5'].map(id=>({id,meaning:id})),alphabet:['0','1'],start:'q0',accepting:['q3','q4','q5'],type:'DFA',transitions:{q0:{0:'q1',1:'q2'},q1:{0:'q3',1:'q4'},q2:{0:'q4',1:'q3'},q3:{0:'q3',1:'q3'},q4:{0:'q4',1:'q4'},q5:{0:'q5',1:'q5'}}};
 const min=minimizeDFA(d);assert.equal(min.states.length,3);assert.ok(!Object.keys(min.mapping).includes('q5'));assert.equal(min.mapping.q1,min.mapping.q2);assert.equal(min.mapping.q3,min.mapping.q4);for(const s of strings(d.alphabet,8))assert.equal(simulate(d,s).accepted,simulate(min,s).accepted);
});
test('partition refinement handles all-accepting and all-rejecting DFAs',()=>{const d=machine('even length');for(const accepting of [[],d.states.map(s=>s.id)])assert.equal(minimizeDFA({...d,accepting}).states.length,1);});

for(const [prompt,oracle] of cases)test(`NFA, converted DFA and minimized equivalence: ${prompt}`,()=>{
 const nfa=generateNFA(parseConstraint(prompt)), dfa=determinizeNFA(nfa), min=minimizeDFA(dfa);
 assert.equal(nfa.type,'NFA'); assert.equal(dfa.type,'DFA');
 for(const s of strings(nfa.alphabet,8)) for(const a of [nfa,dfa,min]) assert.equal(simulate(a,s).accepted,oracle(s),`${a.type} ${prompt}: ${s}`);
 for(const state of nfa.states) for(const a of nfa.alphabet) for(const target of transitionTargets(nfa,state.id,a)) assert.ok(nfa.states.some(s=>s.id===target));
});
test('NFA branches and tracks every active state and traversed edge',()=>{
 const n=generateNFA(parseConstraint('contains 101'));
 assert.deepEqual(n.transitions.q0['1'],['q0','q1']);
 const run=simulate(n,'101');
 assert.deepEqual(run.steps.map(s=>s.states),[['q0'],['q0','q1'],['q0','q2'],['q0','q1','q3']]);
 assert.deepEqual(run.steps[1].moves,[{from:'q0',to:'q0',symbol:'1'},{from:'q0',to:'q1',symbol:'1'}]);
 assert.ok(run.accepted);assert.ok(!simulate(n,'0000').accepted);
});
test('NFA exact count and prefix drop failing branches; conversion creates an empty-set sink',()=>{
 for(const prompt of ['exactly two 1s','starts with 10']) {
  const n=generateNFA(parseConstraint(prompt)), d=determinizeNFA(n), bad=prompt.startsWith('exactly')?'111':'00';
  const r=simulate(n,bad); assert.deepEqual(r.finalStates,[]);assert.ok(!r.accepted);
  assert.ok(d.states.some(s=>s.subset.length===0));assert.ok(!simulate(d,bad).accepted);
 }
});
test('NFA end-of-input acceptance, overlapping matches, and one-symbol patterns',()=>{
 for(const kind of ['contains','ends','starts','forbidden']) for(const pattern of strings(['0','1'],4).filter(Boolean)) {
  const n=generateNFA({kind,pattern,alphabet:['0','1']}), d=determinizeNFA(n);
  for(const s of strings(n.alphabet,7)) {
   const expected=kind==='contains'?s.includes(pattern):kind==='starts'?s.startsWith(pattern):kind==='ends'?s.endsWith(pattern):!s.includes(pattern);
   assert.equal(simulate(n,s).accepted,expected,`${kind} ${pattern}: ${s}`);
   assert.equal(simulate(d,s).accepted,expected,`converted ${kind} ${pattern}: ${s}`);
  }
 }
});
test('epsilon closure handles cycles, acceptance before input and closure after transitions',()=>{
 const n={type:'NFA',states:['q0','q1','q2'].map(id=>({id,meaning:id})),alphabet:['a','b'],start:'q0',accepting:['q2'],transitions:{q0:{'ε':['q1']},q1:{'ε':['q0'],a:['q2']},q2:{b:['q2']}}};
 assert.deepEqual(epsilonClosure(n,['q0']).states,['q0','q1']);
 const d=determinizeNFA(n);
 for(const s of strings(n.alphabet,6)) assert.equal(simulate(n,s).accepted,/^ab*$/.test(s));
 for(const s of strings(n.alphabet,6)) assert.equal(simulate(d,s).accepted,/^ab*$/.test(s));
 assert.ok(simulate({...n,accepting:['q1']},'').accepted);
 const after={...n,transitions:{q0:{a:['q1']},q1:{'ε':['q2']},q2:{}}};
 assert.deepEqual(simulate(after,'a').finalStates,['q1','q2']);
 assert.ok(simulate(after,'a').accepted);assert.ok(simulate(determinizeNFA(after),'a').accepted);
});
test('NFA input validation and type guards',()=>{
 const n=generateNFA(parseConstraint('even length'));
 assert.ok(simulate(n,'').accepted);
 assert.throws(()=>simulate(n,'2'),/outside alphabet/);
 assert.throws(()=>simulate(n,'1'.repeat(201)),/200/);
 assert.throws(()=>minimizeDFA(n),/Convert/);
 assert.throws(()=>determinizeNFA(machine('even length')),/Choose an NFA/);
});
test('subset conversion bounds exponential graphs without modifying the NFA',()=>{
 const states=Array.from({length:10},(_,i)=>({id:`q${i}`,meaning:'Nth symbol from the end'}));
 const transitions={q0:{0:['q0'],1:['q0','q1']}};
 for(let i=1;i<9;i++)transitions[`q${i}`]={0:[`q${i+1}`],1:[`q${i+1}`]};
 transitions.q9={};
 const n={type:'NFA',states,alphabet:['0','1'],start:'q0',accepting:['q9'],transitions};
 const before=JSON.stringify(n);assert.throws(()=>determinizeNFA(n),/256/);assert.equal(JSON.stringify(n),before);
});
