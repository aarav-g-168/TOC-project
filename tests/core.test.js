import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseConstraint, examples } from '../src/core/parser.js';
import { generateDFA, simulate, minimizeDFA } from '../src/core/automata.js';
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
