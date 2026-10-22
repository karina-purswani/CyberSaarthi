import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  ExternalLink, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Filter, 
  Layers, 
  RefreshCw, 
  AlertCircle,
  ShieldAlert
} from 'lucide-react';
import { fetchGraph } from '../services/api';
import type { GraphData, GraphNode, GraphEdge } from '../types';
import { DisclaimerNotice } from '../components/DisclaimerNotice';

// Category color mappings (Restrained civic-tech palette)
const CATEGORY_COLORS: Record<string, { fill: string; stroke: string; label: string; text: string }> = {
  COMPLAINT: { fill: '#0F766E', stroke: '#134E4A', label: 'Complaint Case', text: '#FFFFFF' },
  EVIDENCE: { fill: '#7C3AED', stroke: '#5B21B6', label: 'Evidence Item', text: '#FFFFFF' },
  PERSON: { fill: '#2563EB', stroke: '#1E40AF', label: 'Person Entity', text: '#FFFFFF' },
  UPI_ID: { fill: '#D97706', stroke: '#B45309', label: 'UPI Handle (VPA)', text: '#FFFFFF' },
  PHONE_NUMBER: { fill: '#059669', stroke: '#047857', label: 'Phone Number', text: '#FFFFFF' },
  TRANSACTION_ID: { fill: '#4F46E5', stroke: '#3730A3', label: 'Txn / UTR Reference', text: '#FFFFFF' },
  BANK_ACCOUNT: { fill: '#E11D48', stroke: '#9F1239', label: 'Bank Account', text: '#FFFFFF' },
  IP_ADDRESS: { fill: '#0891B2', stroke: '#155E75', label: 'IP Address', text: '#FFFFFF' },
  INDICATOR: { fill: '#D97706', stroke: '#B45309', label: 'Shared Indicator', text: '#FFFFFF' },
  DEFAULT: { fill: '#4B5563', stroke: '#1F2937', label: 'Entity', text: '#FFFFFF' }
};

export const GraphPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const focusComplaintId = searchParams.get('focus_complaint_id') || '';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedRelationship, setSelectedRelationship] = useState<string>('ALL');

  // Selected elements
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);

  // Zoom, Pan & Drag state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  
  // Custom node positions from dragging: Map<nodeId, {x, y}>
  const [customPositions, setCustomPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement>(null);

  const loadGraph = () => {
    setLoading(true);
    setError(null);
    fetchGraph({
      focus_complaint_id: focusComplaintId || undefined
    })
      .then(res => {
        setGraphData(res);
        if (res.nodes.length > 0 && !selectedNode) {
          setSelectedNode(res.nodes[0]);
        }
      })
      .catch(err => setError(err.message || 'Failed to load intelligence graph'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadGraph();
  }, [focusComplaintId]);

  // Available categories in actual data
  const availableCategories = useMemo(() => {
    if (!graphData) return [];
    const set = new Set<string>();
    graphData.nodes.forEach(n => {
      const cat = n.category || n.indicator_type || n.type;
      if (cat) set.add(cat);
    });
    return Array.from(set);
  }, [graphData]);

  // Compute 2D coordinates for SVG visualization using circular concentric layout
  const baseLayout = useMemo(() => {
    if (!graphData || graphData.nodes.length === 0) return { nodes: [], edges: [] };

    const width = 840;
    const height = 540;
    const centerX = width / 2;
    const centerY = height / 2;

    const complaints = graphData.nodes.filter(n => n.type === 'COMPLAINT');
    const nonComplaints = graphData.nodes.filter(n => n.type !== 'COMPLAINT');

    const defaultPositions: Record<string, { x: number; y: number }> = {};

    // Place complaints on outer radius
    complaints.forEach((c, i) => {
      const angle = (2 * Math.PI * i) / Math.max(complaints.length, 1);
      const rx = width * 0.40;
      const ry = height * 0.40;
      defaultPositions[c.id] = {
        x: centerX + rx * Math.cos(angle),
        y: centerY + ry * Math.sin(angle)
      };
    });

    // Place non-complaints (indicators, people, evidence) on inner radius
    nonComplaints.forEach((ind, i) => {
      const angle = (2 * Math.PI * i) / Math.max(nonComplaints.length, 1) + Math.PI / 4;
      const rx = width * 0.22;
      const ry = height * 0.22;
      defaultPositions[ind.id] = {
        x: centerX + rx * Math.cos(angle),
        y: centerY + ry * Math.sin(angle)
      };
    });

    return { defaultPositions, width, height };
  }, [graphData]);

  // Merge default positions with user-dragged custom positions
  const nodePositions = useMemo(() => {
    const pos: Record<string, { x: number; y: number }> = { ...baseLayout.defaultPositions };
    Object.keys(customPositions).forEach(id => {
      pos[id] = customPositions[id];
    });
    return pos;
  }, [baseLayout, customPositions]);

  // Filtered nodes and edges based on search, category, and relationship filters
  const { filteredNodes, filteredEdges, connectedNodeIds, connectedEdgeIds } = useMemo(() => {
    if (!graphData) {
      return { filteredNodes: [], filteredEdges: [], connectedNodeIds: new Set<string>(), connectedEdgeIds: new Set<string>() };
    }

    const query = searchQuery.trim().toLowerCase();

    // Node filter
    let nodes = graphData.nodes.filter(node => {
      const cat = (node.category || node.indicator_type || node.type || '').toUpperCase();
      if (selectedCategory !== 'ALL' && cat !== selectedCategory.toUpperCase()) {
        return false;
      }
      if (query) {
        const matchLabel = node.label.toLowerCase().includes(query);
        const matchRef = node.reference_id?.toLowerCase().includes(query);
        const matchNorm = node.normalized_value?.toLowerCase().includes(query);
        if (!matchLabel && !matchRef && !matchNorm) return false;
      }
      return true;
    });

    const activeNodeIdSet = new Set(nodes.map(n => n.id));

    // Edge filter
    let edges = graphData.edges.filter(edge => {
      if (!activeNodeIdSet.has(edge.source) || !activeNodeIdSet.has(edge.target)) {
        return false;
      }
      if (selectedRelationship !== 'ALL') {
        const edgeRel = (edge.relationship_type || (edge.rule_applied.includes('OCR') ? 'DIRECT_OBSERVED' : 'INVESTIGATIVE_LEAD')).toUpperCase();
        if (edgeRel !== selectedRelationship.toUpperCase()) {
          return false;
        }
      }
      return true;
    });

    // Calculate 1-hop connected neighbors if a node is selected
    const connNodes = new Set<string>();
    const connEdges = new Set<string>();

    if (selectedNode) {
      connNodes.add(selectedNode.id);
      graphData.edges.forEach(e => {
        if (e.source === selectedNode.id) {
          connNodes.add(e.target);
          connEdges.add(e.id);
        } else if (e.target === selectedNode.id) {
          connNodes.add(e.source);
          connEdges.add(e.id);
        }
      });
    }

    return {
      filteredNodes: nodes,
      filteredEdges: edges,
      connectedNodeIds: connNodes,
      connectedEdgeIds: connEdges
    };
  }, [graphData, searchQuery, selectedCategory, selectedRelationship, selectedNode]);

  // Zoom handlers
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.2, 2.5));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.2, 0.4));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setCustomPositions({});
  };

  // Canvas Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (draggingNodeId) return;
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeId && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const currentX = (e.clientX - rect.left - pan.x) / zoom;
      const currentY = (e.clientY - rect.top - pan.y) / zoom;
      setCustomPositions(prev => ({
        ...prev,
        [draggingNodeId]: {
          x: currentX - dragOffset.x,
          y: currentY - dragOffset.y
        }
      }));
      return;
    }

    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  const startDragNode = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setDraggingNodeId(nodeId);
    const nodePos = nodePositions[nodeId] || { x: 0, y: 0 };
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseY = (e.clientY - rect.top - pan.y) / zoom;
      setDragOffset({
        x: mouseX - nodePos.x,
        y: mouseY - nodePos.y
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '3rem' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Cross-Complaint Intelligence Graph
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            Explainable relationship network linking cases through verified indicators, bank accounts, UPI handles, and phone numbers.
          </p>
        </div>

        {/* Global actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {focusComplaintId && (
            <button
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete('focus_complaint_id');
                setSearchParams(next);
              }}
              style={{
                fontSize: '0.78125rem',
                color: 'var(--brand-teal)',
                backgroundColor: 'var(--surface-primary)',
                border: '1px solid var(--border-light)',
                padding: '0.4rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Clear Case Focus ({focusComplaintId.slice(0, 8)}...)
            </button>
          )}

          <button
            onClick={loadGraph}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.78125rem',
              color: 'var(--text-primary)',
              backgroundColor: 'var(--surface-primary)',
              border: '1px solid var(--border-light)',
              padding: '0.4rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} />
            <span>Reload Graph</span>
          </button>
        </div>
      </div>

      {/* Prominent Legal Disclaimer Banner */}
      <DisclaimerNotice type="lead" />

      {/* Interactive Controls & Filters Bar */}
      <div
        style={{
          backgroundColor: 'var(--surface-primary)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '240px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by case, UPI, phone, name..."
            style={{
              padding: '0.35rem 0.6rem',
              fontSize: '0.8125rem',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-sm)',
              width: '100%'
            }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
            <Filter size={14} color="var(--text-secondary)" />
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ fontSize: '0.78125rem', padding: '0.25rem 0.5rem' }}
            >
              <option value="ALL">All Categories ({graphData?.nodes.length || 0})</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>
                  {CATEGORY_COLORS[cat]?.label || cat}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
            <Layers size={14} color="var(--text-secondary)" />
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Relationship:</span>
            <select
              value={selectedRelationship}
              onChange={(e) => setSelectedRelationship(e.target.value)}
              style={{ fontSize: '0.78125rem', padding: '0.25rem 0.5rem' }}
            >
              <option value="ALL">All Link Types</option>
              <option value="DIRECT_OBSERVED">Directly Observed (Matching)</option>
              <option value="INVESTIGATIVE_LEAD">Investigative Lead</option>
              <option value="EVIDENCE_LINK">Evidence Attachment</option>
            </select>
          </div>
        </div>

        {/* Zoom & Canvas controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            style={{
              padding: '0.35rem',
              backgroundColor: 'var(--surface-subtle)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer'
            }}
          >
            <ZoomIn size={15} />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            style={{
              padding: '0.35rem',
              backgroundColor: 'var(--surface-subtle)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer'
            }}
          >
            <ZoomOut size={15} />
          </button>
          <button
            onClick={handleResetView}
            title="Reset View"
            style={{
              padding: '0.35rem',
              backgroundColor: 'var(--surface-subtle)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={15} />
          </button>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Graph Canvas on Left, Details Drawer on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem' }}>
        
        {/* Left Column: Interactive SVG Viewport */}
        <div
          style={{
            backgroundColor: 'var(--surface-primary)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Visible Legend Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem', padding: '0 0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.71875rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: CATEGORY_COLORS.COMPLAINT.fill, display: 'inline-block' }} />
                Case
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: CATEGORY_COLORS.UPI_ID.fill, display: 'inline-block' }} />
                UPI Handle
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: CATEGORY_COLORS.PHONE_NUMBER.fill, display: 'inline-block' }} />
                Phone
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: CATEGORY_COLORS.TRANSACTION_ID.fill, display: 'inline-block' }} />
                Txn Ref
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: CATEGORY_COLORS.EVIDENCE.fill, display: 'inline-block' }} />
                Evidence
              </span>
            </div>

            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              Drag nodes to rearrange • Click to inspect basis
            </span>
          </div>

          {/* SVG Canvas Area */}
          <div
            style={{
              flex: 1,
              backgroundColor: '#F8FAFC',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              position: 'relative',
              minHeight: '520px',
              overflow: 'hidden',
              cursor: isPanning ? 'grabbing' : 'grab'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {loading ? (
              <div style={{ padding: '6rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.75rem auto', display: 'block' }} />
                <div>Generating intelligence graph from active SQLite records...</div>
              </div>
            ) : filteredNodes.length === 0 ? (
              <div style={{ padding: '6rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <ShieldAlert size={28} style={{ margin: '0 auto 0.75rem auto', display: 'block', color: 'var(--text-secondary)' }} />
                <div style={{ fontWeight: 600 }}>No entities match current filters</div>
                <div style={{ fontSize: '0.78125rem', marginTop: '0.25rem' }}>
                  Try resetting the search query or category filters.
                </div>
              </div>
            ) : (
              <svg
                ref={svgRef}
                width="100%"
                height="520"
                viewBox="0 0 840 540"
                style={{ display: 'block', userSelect: 'none' }}
              >
                <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                  
                  {/* Edges */}
                  {filteredEdges.map((e) => {
                    const s = nodePositions[e.source] || { x: 420, y: 270 };
                    const t = nodePositions[e.target] || { x: 420, y: 270 };
                    const isSelected = selectedEdge?.id === e.id;
                    const isDirectlyConnected = selectedNode && (connectedEdgeIds.has(e.id));
                    const isDimmed = selectedNode && !isDirectlyConnected && !isSelected;

                    const relType = e.relationship_type || (e.rule_applied.includes('OCR') ? 'DIRECT_OBSERVED' : 'INVESTIGATIVE_LEAD');
                    const strokeDash = relType === 'DIRECT_OBSERVED' ? 'none' : relType === 'EVIDENCE_LINK' ? '2 2' : '5 3';
                    const strokeColor = isSelected ? '#0F766E' : relType === 'INVESTIGATIVE_LEAD' ? '#D97706' : '#94A3B8';

                    return (
                      <g
                        key={e.id}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setSelectedEdge(e);
                          setSelectedNode(null);
                        }}
                        style={{ cursor: 'pointer', opacity: isDimmed ? 0.15 : 1, transition: 'opacity 0.2s ease' }}
                      >
                        <line
                          x1={s.x}
                          y1={s.y}
                          x2={t.x}
                          y2={t.y}
                          stroke={strokeColor}
                          strokeWidth={isSelected ? 3.5 : isDirectlyConnected ? 2.5 : 1.5}
                          strokeDasharray={strokeDash}
                        />
                      </g>
                    );
                  })}

                  {/* Nodes */}
                  {filteredNodes.map((node) => {
                    const pos = nodePositions[node.id] || { x: 420, y: 270 };
                    const isSelected = selectedNode?.id === node.id;
                    const isDirectNeighbor = selectedNode && connectedNodeIds.has(node.id);
                    const isDimmed = selectedNode && !isSelected && !isDirectNeighbor;
                    const isComplaint = node.type === 'COMPLAINT';

                    const catKey = node.category || node.indicator_type || node.type;
                    const colorScheme = CATEGORY_COLORS[catKey] || CATEGORY_COLORS.DEFAULT;

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${pos.x}, ${pos.y})`}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setSelectedNode(node);
                          setSelectedEdge(null);
                        }}
                        onMouseDown={(ev) => startDragNode(ev, node.id)}
                        style={{
                          cursor: 'move',
                          opacity: isDimmed ? 0.15 : 1,
                          transition: 'opacity 0.2s ease'
                        }}
                      >
                        {/* Node Shape */}
                        {isComplaint ? (
                          <circle
                            r={isSelected ? 20 : 15}
                            fill={colorScheme.fill}
                            stroke={isSelected ? '#042F2E' : colorScheme.stroke}
                            strokeWidth={isSelected ? 3 : 2}
                          />
                        ) : (
                          <rect
                            x={isSelected ? -16 : -13}
                            y={isSelected ? -16 : -13}
                            width={isSelected ? 32 : 26}
                            height={isSelected ? 32 : 26}
                            rx={4}
                            fill={colorScheme.fill}
                            stroke={isSelected ? '#78350F' : colorScheme.stroke}
                            strokeWidth={isSelected ? 3 : 1.5}
                          />
                        )}

                        {/* Node Text Label */}
                        <text
                          y={isComplaint ? 28 : 26}
                          textAnchor="middle"
                          fill="#1E293B"
                          fontSize={isSelected ? '11px' : '9px'}
                          fontWeight={isSelected ? 700 : 600}
                          fontFamily="var(--font-sans)"
                          style={{ pointerEvents: 'none', userSelect: 'none' }}
                        >
                          {node.label.length > 22 ? node.label.substring(0, 20) + '...' : node.label}
                        </text>
                      </g>
                    );
                  })}

                </g>
              </svg>
            )}
          </div>
        </div>

        {/* Right Column: Node & Edge Inspector Drawer */}
        <div
          style={{
            backgroundColor: 'var(--surface-primary)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
        >
          <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '0.65rem' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Intelligence Provenance Inspector
            </h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Traceable basis and source evidence for selected relationship
            </div>
          </div>

          {/* Node Selected Breakdown */}
          {selectedNode && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: CATEGORY_COLORS[selectedNode.category || selectedNode.indicator_type || selectedNode.type]?.fill || 'var(--brand-teal)'
                  }}
                >
                  {CATEGORY_COLORS[selectedNode.category || selectedNode.indicator_type || selectedNode.type]?.label || selectedNode.type}
                </span>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                  {selectedNode.label}
                </div>
              </div>

              {selectedNode.type === 'COMPLAINT' ? (
                <>
                  <div style={{ fontSize: '0.8125rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', backgroundColor: 'var(--surface-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                    <div>Reference ID: <strong style={{ fontFamily: 'var(--font-mono)' }}>{selectedNode.reference_id || selectedNode.label}</strong></div>
                    <div>Incident Type: <strong>{selectedNode.incident_type || 'Unspecified'}</strong></div>
                    <div>Reported Loss: <strong>{selectedNode.amount ? `₹${selectedNode.amount.toLocaleString('en-IN')}` : 'None'}</strong></div>
                    <div>Review Status: <strong>{selectedNode.status || 'AWAITING_REVIEW'}</strong></div>
                    <div>Priority Level: <strong>{selectedNode.priority || 'MEDIUM'}</strong></div>
                  </div>

                  <Link
                    to={`/officer/complaints/${selectedNode.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      backgroundColor: 'var(--brand-teal)',
                      color: '#FFFFFF',
                      padding: '0.5rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      textDecoration: 'none'
                    }}
                  >
                    <span>Open Case Dossier</span>
                    <ExternalLink size={13} />
                  </Link>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '0.8125rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', backgroundColor: 'var(--surface-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                    <div>Normalized Form: <strong style={{ fontFamily: 'var(--font-mono)' }}>{selectedNode.normalized_value || selectedNode.label}</strong></div>
                    <div>Entity Category: <strong>{selectedNode.indicator_type || selectedNode.category || 'Shared Indicator'}</strong></div>
                    {selectedNode.source_evidence && (
                      <div>Source Evidence: <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{selectedNode.source_evidence}</strong></div>
                    )}
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    This indicator was extracted from authentic stored complaints or evidence items. All connecting links represent common indicators across cases.
                  </div>
                </>
              )}
            </div>
          )}

          {/* Edge Selected Breakdown */}
          {selectedEdge && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.71875rem', fontWeight: 700, color: 'var(--brand-teal)', textTransform: 'uppercase' }}>
                Relationship Link Provenance
              </span>
              <div style={{ fontSize: '0.8125rem', backgroundColor: 'var(--surface-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div>Relationship Type: <strong>{selectedEdge.relationship_type || 'INVESTIGATIVE_LEAD'}</strong></div>
                <div>Rule Applied: <strong>{selectedEdge.rule_applied}</strong></div>
                <div>Basis Explanation: <span>{selectedEdge.explanation}</span></div>
                {selectedEdge.evidence_filename && (
                  <div>Supporting Evidence: <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{selectedEdge.evidence_filename}</strong></div>
                )}
              </div>
            </div>
          )}

          {/* Detected Shared Clusters / Syndicates */}
          {graphData && graphData.clusters.length > 0 && (
            <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
              <div style={{ fontSize: '0.78125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Detected Cross-Case Syndicates ({graphData.clusters.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto' }}>
                {graphData.clusters.map((cl, i) => (
                  <div key={i} style={{ fontSize: '0.75rem', padding: '0.45rem', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 'var(--radius-sm)', color: '#92400E' }}>
                    <strong>{cl.count} complaints</strong> linked by shared indicator:
                    <div style={{ fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
                      {cl.connected_complaints.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
