import { useMemo, useCallback, useEffect, memo } from 'react'
import {
  ReactFlow, Background, BackgroundVariant,
  Controls, MiniMap,
  useNodesState, useEdgesState,
  Handle, Position,
  MarkerType,
  Panel,
  type Node, type Edge, type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { CheckCircle, XCircle, GitBranch } from 'lucide-react'
import type { FormNode } from './FormBuilder'
import { TYPE_META, SCREEN_TYPES } from './FormBuilder'

// ── Constants ─────────────────────────────────────────────────

const NODE_W   = 240
const NODE_GAP = 210

// ── Auto-layout ───────────────────────────────────────────────

function defaultPos(index: number) {
  return { x: 300, y: 60 + index * NODE_GAP }
}

// ── Build RF nodes ─────────────────────────────────────────────

type FlowNodeData = {
  node:     FormNode
  index:    number
}

function buildRFNodes(
  nodes: FormNode[],
  selectedId: string | null,
  saved: Record<string, { x: number; y: number }>,
): Node[] {
  const rfNodes: Node[] = nodes.map((node, idx) => ({
    id:       node.id,
    type:     'formNode',
    position: saved[node.id] ?? defaultPos(idx),
    data:     { node, index: idx } satisfies FlowNodeData,
    selected: node.id === selectedId,
  }))

  const midY = (nodes.length / 2) * NODE_GAP + 60

  const needsEnd  = nodes.some(n => n.logicJumps.some(j => j.jumpToNodeId === '__end__'))
  const needsDisq = nodes.some(n => n.logicJumps.some(j => j.jumpToNodeId === '__disqualify__'))

  if (needsEnd) {
    rfNodes.push({
      id: '__end__',
      type: 'terminalNode',
      position: saved['__end__'] ?? { x: 650, y: midY },
      data: { type: 'end' },
    })
  }

  if (needsDisq) {
    rfNodes.push({
      id: '__disqualify__',
      type: 'terminalNode',
      position: saved['__disqualify__'] ?? { x: 650, y: midY + 140 },
      data: { type: 'disqualify' },
    })
  }

  return rfNodes
}

// ── Build RF edges ─────────────────────────────────────────────

function buildRFEdges(nodes: FormNode[]): Edge[] {
  const edges: Edge[] = []
  const nodeIds = new Set(nodes.map(n => n.id))

  nodes.forEach((node, idx) => {
    const jumpDests = new Set(
      node.logicJumps.map(j => j.jumpToNodeId).filter(Boolean),
    )

    // Sequential edge (dashed = default flow)
    if (idx < nodes.length - 1) {
      const nextId = nodes[idx + 1].id
      edges.push({
        id:     `seq-${node.id}`,
        source: node.id,
        target: nextId,
        type:   'smoothstep',
        style:  { stroke: 'rgba(255,255,255,0.13)', strokeDasharray: '5 4', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(255,255,255,0.2)', width: 14, height: 14 },
        label:      jumpDests.size > 0 ? 'padrão' : undefined,
        labelStyle: { fill: 'rgba(255,255,255,0.28)', fontSize: 10 },
        labelBgStyle: { fill: '#0D0E12', fillOpacity: 0.9 },
        labelBgPadding: [4, 6] as [number, number],
        labelBgBorderRadius: 4,
      })
    }

    // Logic-jump edges (solid, colored)
    node.logicJumps.forEach(jump => {
      if (!jump.jumpToNodeId) return
      const isEnd  = jump.jumpToNodeId === '__end__'
      const isDisq = jump.jumpToNodeId === '__disqualify__'
      const exists = isEnd || isDisq || nodeIds.has(jump.jumpToNodeId)
      if (!exists) return

      const color = isDisq ? '#EF4444' : '#E8521A'
      edges.push({
        id:     `jump-${node.id}-${jump.id}`,
        source: node.id,
        target: jump.jumpToNodeId,
        type:   'smoothstep',
        style:  { stroke: color, strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color, width: 14, height: 14 },
        label:      jump.ifOption || (isEnd ? 'Encerrar' : isDisq ? 'Desqualificar' : undefined),
        labelStyle: { fill: '#EDEDED', fontSize: 10, fontWeight: 500 },
        labelBgStyle: { fill: '#16181F', fillOpacity: 0.95 },
        labelBgPadding: [4, 8] as [number, number],
        labelBgBorderRadius: 4,
      })
    })
  })

  return edges
}

// ── Custom node: FormFlowNode ─────────────────────────────────

const FormFlowNode = memo(function FormFlowNode({ data, selected }: NodeProps) {
  const { node, index } = data as FlowNodeData
  const meta    = TYPE_META[node.type]
  const Icon    = meta.icon
  const isScreen = SCREEN_TYPES.includes(node.type)
  const hasJumps = node.logicJumps.length > 0

  return (
    <div style={{
      width:         NODE_W,
      background:    '#16181F',
      border:        `1px solid ${selected ? '#E8521A' : 'rgba(255,255,255,0.09)'}`,
      borderRadius:  12,
      boxShadow:     selected
        ? '0 0 0 3px rgba(232,82,26,0.18), 0 8px 24px rgba(0,0,0,0.5)'
        : '0 4px 16px rgba(0,0,0,0.4)',
      overflow:      'hidden',
      transition:    'border-color 0.15s, box-shadow 0.15s',
      cursor:        'pointer',
    }}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: 'rgba(255,255,255,0.2)', border: '2px solid #16181F', width: 10, height: 10 }}
      />

      {/* Header */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        gap:            6,
        padding:        '8px 10px',
        borderBottom:   '1px solid rgba(255,255,255,0.06)',
        background:     `${meta.color}0C`,
      }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontWeight: 700, minWidth: 22 }}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <div style={{
          display:       'flex',
          alignItems:    'center',
          gap:           4,
          padding:       '2px 7px',
          borderRadius:  999,
          background:    `${meta.color}16`,
          border:        `1px solid ${meta.color}30`,
        }}>
          <Icon size={9} style={{ color: meta.color }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: meta.color, letterSpacing: '0.04em' }}>
            {meta.label}
          </span>
        </div>
        {hasJumps && (
          <GitBranch size={10} style={{ color: '#E8521A', marginLeft: 'auto' }} />
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '8px 10px 10px' }}>
        <p style={{
          fontSize:     13,
          color:        node.title ? '#EDEDED' : 'rgba(255,255,255,0.25)',
          fontWeight:   500,
          lineHeight:   1.35,
          display:      '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow:     'hidden',
        }}>
          {node.title || 'Sem título'}
        </p>

        {/* Options preview for radio/select */}
        {(node.type === 'radio' || node.type === 'select') && node.options.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 6 }}>
            {node.options.slice(0, 3).map(opt => (
              <span key={opt} style={{
                fontSize:     9,
                padding:      '2px 6px',
                borderRadius: 4,
                background:   'rgba(255,255,255,0.05)',
                color:        'rgba(255,255,255,0.45)',
                border:       '1px solid rgba(255,255,255,0.07)',
                maxWidth:     80,
                overflow:     'hidden',
                textOverflow: 'ellipsis',
                whiteSpace:   'nowrap',
              }}>{opt}</span>
            ))}
            {node.options.length > 3 && (
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
                +{node.options.length - 3}
              </span>
            )}
          </div>
        )}

        {/* PDF indicator */}
        {node.pdfUrl && (
          <p style={{ fontSize: 9, color: '#E8521A', marginTop: 5 }}>PDF de termos anexado</p>
        )}

        {/* Screen-specific badge */}
        {isScreen && (
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
            Tela de {node.type === 'welcome' ? 'boas-vindas' : 'encerramento / pagamento'}
          </p>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: 'rgba(255,255,255,0.2)', border: '2px solid #16181F', width: 10, height: 10 }}
      />
    </div>
  )
})

// ── Custom node: terminal (end / disqualify) ──────────────────

const TerminalNode = memo(function TerminalNode({ data }: NodeProps) {
  const isEnd  = (data as { type: string }).type === 'end'
  const color  = isEnd ? '#34D399' : '#EF4444'
  const Icon   = isEnd ? CheckCircle : XCircle
  const label  = isEnd ? 'Encerrar' : 'Desqualificar'

  return (
    <div style={{
      display:       'flex',
      alignItems:    'center',
      gap:           8,
      padding:       '8px 14px',
      background:    `${color}0E`,
      border:        `1px solid ${color}30`,
      borderRadius:  999,
      boxShadow:     '0 4px 16px rgba(0,0,0,0.4)',
      cursor:        'default',
    }}>
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: color, border: '2px solid #16181F', width: 10, height: 10 }}
      />
      <Icon size={13} style={{ color }} />
      <span style={{ fontSize: 12, fontWeight: 600, color }}>{label}</span>
    </div>
  )
})

const NODE_TYPES = { formNode: FormFlowNode, terminalNode: TerminalNode }

// ── FormCanvas ────────────────────────────────────────────────

export type CanvasPositions = Record<string, { x: number; y: number }>

interface FormCanvasProps {
  nodes:              FormNode[]
  selectedId:         string | null
  onSelect:           (id: string | null) => void
  positions:          CanvasPositions
  onPositionsChange:  (p: CanvasPositions) => void
  // Toolbar callbacks (mirrored from FormBuilder)
  onAddNode:          () => void
  onAddWelcome:       () => void
  onAddThankyou:      () => void
  onAddBankDeposit:   () => void
  onAddReceiptUpload: () => void
  onAddPaymentDone:   () => void
  onAddStripeCheckout:() => void
  hasWelcome:         boolean
  hasThankyou:        boolean
}

export function FormCanvas({
  nodes, selectedId, onSelect, positions, onPositionsChange,
  onAddNode, onAddWelcome, onAddThankyou,
  onAddBankDeposit, onAddReceiptUpload, onAddPaymentDone, onAddStripeCheckout,
  hasWelcome, hasThankyou,
}: FormCanvasProps) {

  const initNodes = useMemo(() => buildRFNodes(nodes, selectedId, positions), [])
  const initEdges = useMemo(() => buildRFEdges(nodes), [])

  const [rfNodes, setRfNodes, onRFNodesChange] = useNodesState(initNodes)
  const [rfEdges, setRfEdges, onRFEdgesChange] = useEdgesState(initEdges)

  // Sync when form nodes or selection change
  useEffect(() => {
    const currentPositions: CanvasPositions = {}
    setRfNodes(prev => {
      prev.forEach(n => { currentPositions[n.id] = n.position })
      const merged = { ...positions, ...currentPositions }
      return buildRFNodes(nodes, selectedId, merged)
    })
    setRfEdges(buildRFEdges(nodes))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, selectedId])

  const handleNodeDragStop = useCallback((_: React.MouseEvent, node: Node) => {
    onPositionsChange({ ...positions, [node.id]: node.position })
  }, [positions, onPositionsChange])

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === 'terminalNode') return
    onSelect(node.id)
  }, [onSelect])

  const handlePaneClick = useCallback(() => {
    onSelect(null)
  }, [onSelect])

  const toolBtn = (
    onClick: () => void,
    label: string,
    color: string,
    disabled = false,
  ) => (
    <button
      key={label}
      onClick={onClick}
      disabled={disabled}
      title={label}
      style={{
        padding:       '5px 10px',
        borderRadius:  6,
        fontSize:      11,
        fontWeight:    600,
        color:         disabled ? 'rgba(255,255,255,0.2)' : color,
        background:    disabled ? 'rgba(255,255,255,0.03)' : `${color}12`,
        border:        `1px solid ${disabled ? 'rgba(255,255,255,0.06)' : `${color}28`}`,
        cursor:        disabled ? 'not-allowed' : 'pointer',
        whiteSpace:    'nowrap',
        transition:    'all 0.15s',
      }}>
      {label}
    </button>
  )

  return (
    <div style={{ width: '100%', height: '100%', background: '#0D0E12' }}>
      <style>{`
        .react-flow__attribution { display: none; }
        .react-flow__handle { opacity: 0; transition: opacity 0.15s; }
        .react-flow__node:hover .react-flow__handle,
        .react-flow__node.selected .react-flow__handle { opacity: 1; }
        .react-flow__controls button {
          background: #16181F;
          border-color: rgba(255,255,255,0.09);
          color: rgba(255,255,255,0.5);
        }
        .react-flow__controls button:hover { background: #1E2028; }
        .react-flow__controls button svg { fill: rgba(255,255,255,0.6); }
        .react-flow__minimap { background: #16181F; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; }
        .react-flow__minimap-mask { fill: rgba(0,0,0,0.4); }
        .react-flow__edge-label { pointer-events: none; }
      `}</style>

      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onRFNodesChange}
        onEdgesChange={onRFEdgesChange}
        onNodeDragStop={handleNodeDragStop}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        deleteKeyCode={null}
        minZoom={0.25}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        style={{ background: '#0D0E12' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(255,255,255,0.06)" />
        <Controls style={{ bottom: 16, left: 16 }} showInteractive={false} />
        <MiniMap
          style={{ bottom: 16, right: 16 }}
          nodeColor={n => {
            if (n.type === 'terminalNode') return (n.data as { type: string }).type === 'end' ? '#34D399' : '#EF4444'
            const nodeData = n.data as FlowNodeData
            return TYPE_META[nodeData.node?.type]?.color ?? '#E8521A'
          }}
          maskColor="rgba(0,0,0,0.55)"
        />

        {/* Floating toolbar at top */}
        <Panel position="top-center">
          <div style={{
            display:      'flex',
            alignItems:   'center',
            gap:          6,
            padding:      '6px 10px',
            background:   'rgba(22,24,31,0.96)',
            border:       '1px solid rgba(255,255,255,0.09)',
            borderRadius: 10,
            boxShadow:    '0 4px 20px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            flexWrap:     'wrap',
          }}>
            {toolBtn(onAddNode,          '+ Pergunta',    '#E8521A')}
            {toolBtn(onAddWelcome,       '+ Intro',       '#E8521A', hasWelcome)}
            {toolBtn(onAddThankyou,      '+ Final',       '#34D399', hasThankyou)}
            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)', margin: '0 2px' }} />
            {toolBtn(onAddBankDeposit,   '+ Depósito',    '#3B82F6')}
            {toolBtn(onAddReceiptUpload, '+ Comprovante', '#8B5CF6')}
            {toolBtn(onAddPaymentDone,   '+ Dinheiro',    '#10B981')}
            {toolBtn(onAddStripeCheckout,'+ Cartão',      '#A855F7')}
          </div>
        </Panel>

        {/* Legend */}
        <Panel position="top-left">
          <div style={{
            padding:      '6px 10px',
            background:   'rgba(22,24,31,0.92)',
            border:       '1px solid rgba(255,255,255,0.07)',
            borderRadius: 8,
            fontSize:     10,
            color:        'rgba(255,255,255,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
              <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeDasharray="5 4"/></svg>
              Fluxo padrão
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="#E8521A" strokeWidth="1.5"/></svg>
              Lógica condicional
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}
