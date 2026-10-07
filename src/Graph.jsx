import React, { useMemo, useEffect, useRef } from 'react';
import { transitionTargets } from './core/automata.js';
import { ReactFlow, Background, Controls, Handle, Position, BaseEdge, EdgeLabelRenderer, MarkerType, useNodesState, useReactFlow, ReactFlowProvider } from '@xyflow/react';
function StateNode({ data }) {
  return <div className={`state-node ${data.accepting ? 'accepting' : ''} ${data.current ? 'current' : ''} ${data.selected ? 'chosen' : ''}`}>
    {data.start && <span className="start-arrow" aria-label="Start state">→</span>}
    <Handle type="target" position={Position.Left}/><span>{data.id}</span><Handle type="source" position={Position.Right}/>
  </div>;
}
function TransitionEdge({ id, sourceX, sourceY, targetX, targetY, source, target, markerEnd, data }) {
  let path, x, y;
  if (source === target) {
    x = sourceX - 39; y = sourceY - 78;
    path = `M ${sourceX-14} ${sourceY-28} C ${sourceX+45} ${sourceY-104}, ${sourceX-122} ${sourceY-104}, ${sourceX-65} ${sourceY-28}`;
  } else if (data.reverse) {
    const depth = 55 + Math.min(95, Math.abs(sourceX - targetX) * .17);
    x = (sourceX+targetX)/2; y = (sourceY+targetY)/2 + depth*.75;
    path = `M ${sourceX-36} ${sourceY+38} C ${sourceX-36} ${sourceY+depth}, ${targetX+36} ${targetY+depth}, ${targetX+36} ${targetY+38}`;
  } else {
    x = (sourceX+targetX)/2; y = (sourceY+targetY)/2;
    path = `M ${sourceX} ${sourceY} C ${sourceX+55} ${sourceY}, ${targetX-55} ${targetY}, ${targetX} ${targetY}`;
  }
  return <><BaseEdge id={id} path={path} markerEnd={markerEnd} style={{stroke: data.active ? 'var(--graph-active)' : 'var(--graph-edge)', strokeWidth: data.active ? 3 : 1.7}}/><EdgeLabelRenderer><div className={`edge-label ${data.active ? 'active' : ''}`} style={{transform:`translate(-50%, -50%) translate(${x}px,${y}px)`}}>{data.label}</div></EdgeLabelRenderer></>;
}
const nodeTypes = { state: StateNode }, edgeTypes = { transition: TransitionEdge };
function Canvas({ dfa, selected, onSelect, current, active, layoutKey }) {
  const flow = useReactFlow();
  const container = useRef(null);
  useEffect(() => {
    let timer;
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => flow.fitView({ padding:.24, maxZoom:1.1 }), 100);
    });
    observer.observe(container.current);
    return () => { observer.disconnect(); clearTimeout(timer); };
  }, [flow]);
  const initial = useMemo(() => dfa.states.map((s,i) => ({id:s.id, type:'state', position:{x:80+(i%5)*190, y:150+Math.floor(i/5)*300}, data:{id:s.id}})), [dfa, layoutKey]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial);
  useEffect(() => { setNodes(initial); const timer = setTimeout(() => flow.fitView({ padding:.24, maxZoom:1.1 }), 80); return () => clearTimeout(timer); }, [initial, setNodes, flow]);
  const displayNodes = nodes.map(n => ({...n, data:{...n.data, start:n.id===dfa.start, accepting:dfa.accepting.includes(n.id), selected:n.id===selected, current:current?.includes(n.id)}}));
  const edges = useMemo(() => {
    const grouped = new Map();
    for (const s of dfa.states) for (const symbol of [...dfa.alphabet, 'ε']) for (const target of transitionTargets(dfa, s.id, symbol)) {
      const key = `${s.id}-${target}`;
      if (!grouped.has(key)) grouped.set(key, {source:s.id, target, symbols:[]});
      grouped.get(key).symbols.push(symbol);
    }
    return [...grouped.entries()].map(([id, e]) => {
      const isActive = active?.moves?.some(m => m.from === e.source && m.to === e.target && e.symbols.includes(m.symbol));
      return { id, source:e.source, target:e.target, type:'transition', markerEnd:{type:MarkerType.ArrowClosed, color: isActive ? 'var(--graph-active)' : 'var(--graph-edge)'}, data:{label:e.symbols.join(', '), reverse:Number(e.source.slice(1))>Number(e.target.slice(1)), active:isActive} };
    });
  }, [dfa, active]);
  return <div ref={container} style={{width:'100%',height:'100%'}}><ReactFlow nodes={displayNodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodesChange={onNodesChange} onNodeClick={(_,n)=>onSelect(n.id)} nodesConnectable={false} fitView minZoom={.2} maxZoom={2}><Background color="var(--graph-grid)" gap={28} size={1}/><Controls showInteractive={false}/></ReactFlow></div>;
}
export default function Graph(props) { return <ReactFlowProvider><Canvas {...props}/></ReactFlowProvider>; }
