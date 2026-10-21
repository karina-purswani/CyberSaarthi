import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { fetchGraph } from '../services/api';
import type { GraphData, GraphNode, GraphEdge } from '../types';
import { DisclaimerNotice } from '../components/DisclaimerNotice';

export const GraphPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);

  const focusComplaintId = searchParams.get('focus_complaint_id') || '';
  const indicatorTypeFilter = searchParams.get('indicator_type') || '';

  const loadGraph = () => {
    setLoading(true);
    fetchGraph({
      focus_complaint_id: focusComplaintId || undefined,
      indicator_type: indicatorTypeFilter || undefined
    })
      .then(res => {
        setGraphData(res);
        if (res.nodes.length > 0 && !selectedNode) {
          // Default selection to first cluster or node
          setSelectedNode(res.nodes[0]);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadGraph();
  }, [focusComplaintId, indicatorTypeFilter]);

  // Compute 2D coordinates for SVG visualization using deterministic layout
  const layout = useMemo(() => {
    if (!graphData || graphData.nodes.length === 0) return { nodes: [], edges: [] };

    const width = 760;
    const height = 480;
    const centerX = width / 2;
    const centerY = height / 2;

    const complaints = graphData.nodes.filter(n => n.type === 'COMPLAINT');
    const indicators = graphData.nodes.filter(n => n.type === 'INDICATOR');

    const positions = new Map<string, { x: number; y: number }>();

    // Place complaints on outer ellipse
    complaints.forEach((c, i) => {
      const angle = (2 * Math.PI * i) / Math.max(complaints.length, 1);
      const rx = width * 0.38;
      const ry = height * 0.38;
      positions.set(c.id, {
        x: centerX + rx * Math.cos(angle),
        y: centerY + ry * Math.sin(angle)
      });
    });

    // Place indicators on inner circle or near their connected complaints
    indicators.forEach((ind, i) => {
      const angle = (2 * Math.PI * i) / Math.max(indicators.length, 1) + Math.PI / 4;
      const rx = width * 0.18;
      const ry = height * 0.18;
      positions.set(ind.id, {
        x: centerX + rx * Math.cos(angle),
        y: centerY + ry * Math.sin(angle)
      });
    });

    const positionedNodes = graphData.nodes.map(n => ({
      ...n,
      ...(positions.get(n.id) || { x: centerX, y: centerY })
    }));

    const positionedEdges = graphData.edges.map(e => {
      const s = positions.get(e.source) || { x: centerX, y: centerY };
      const t = positions.get(e.target) || { x: centerX, y: centerY };
      return {
        ...e,
        x1: s.x,
        y1: s.y,
        x2: t.x,
        y2: t.y
      };
    });

    return { nodes: positionedNodes, edges: positionedEdges };
  }, [graphData]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '3rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Cross-Complaint Intelligence Graph
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            Deterministic relationship graph linking complaints through verified shared payment handles, phone numbers, and transaction references.
          </p>
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <select
            value={indicatorTypeFilter}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams);
              if (e.target.value) next.set('indicator_type', e.target.value);
              else next.delete('indicator_type');
              setSearchParams(next);
            }}
            style={{ fontSize: '0.8125rem' }}
          >
            <option value="">All Indicator Types</option>
            <option value="UPI_ID">UPI Handles (VPAs)</option>
            <option value="PHONE_NUMBER">Phone Numbers</option>
            <option value="TRANSACTION_ID">Transaction References (UTRs)</option>
          </select>

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
                padding: '0.4rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600
              }}
            >
              Reset Focus
            </button>
          )}
        </div>
      </div>

      {/* Prominent Investigative Disclaimer */}
      <DisclaimerNotice type="lead" />

      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', color: '#991B1B' }}>
          Failed to load graph: {error}
        </div>
      )}

      {/* Main Graph Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
        
        {/* Left Column: Interactive Graph Canvas */}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', padding: '0 0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--brand-teal)', display: 'inline-block' }} />
                Complaint Node
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#D97706', display: 'inline-block' }} />
                Shared Indicator Node
              </span>
            </div>

            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Click any node or link line to inspect provenance
            </span>
          </div>

          <div
            style={{
              flex: 1,
              backgroundColor: '#FAFCFB',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              position: 'relative',
              minHeight: '480px',
              overflow: 'hidden'
            }}
          >
            {loading ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Constructing relationship graph from database records...
              </div>
            ) : layout.nodes.length === 0 ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No graph entities match the selected filter.
              </div>
            ) : (
              <svg width="100%" height="480" viewBox="0 0 760 480" style={{ display: 'block' }}>
                {/* Edges */}
                {layout.edges.map((e) => {
                  const isSelected = selectedEdge?.id === e.id;
                  return (
                    <g key={e.id} onClick={() => { setSelectedEdge(e); setSelectedNode(null); }} style={{ cursor: 'pointer' }}>
                      <line
                        x1={e.x1}
                        y1={e.y1}
                        x2={e.x2}
                        y2={e.y2}
                        stroke={isSelected ? '#125650' : '#CBD5E1'}
                        strokeWidth={isSelected ? 3 : 1.5}
                        strokeDasharray={e.rule_applied.includes('OCR') ? 'none' : '4 2'}
                      />
                    </g>
                  );
                })}

                {/* Nodes */}
                {layout.nodes.map((node: any) => {
                  const isSelected = selectedNode?.id === node.id;
                  const isComplaint = node.type === 'COMPLAINT';
                  
                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      onClick={() => { setSelectedNode(node); setSelectedEdge(null); }}
                      style={{ cursor: 'pointer' }}
                    >
                      {isComplaint ? (
                        <circle
                          r={isSelected ? 18 : 14}
                          fill={isSelected ? '#125650' : '#176B65'}
                          stroke="#FFFFFF"
                          strokeWidth={2}
                          style={{ transition: 'all 0.15s ease' }}
                        />
                      ) : (
                        <rect
                          x={isSelected ? -16 : -13}
                          y={isSelected ? -16 : -13}
                          width={isSelected ? 32 : 26}
                          height={isSelected ? 32 : 26}
                          rx={4}
                          fill={isSelected ? '#B45309' : '#D97706'}
                          stroke="#FFFFFF"
                          strokeWidth={2}
                          style={{ transition: 'all 0.15s ease' }}
                        />
                      )}

                      <text
                        y={isComplaint ? 26 : 24}
                        textAnchor="middle"
                        fill="#202B35"
                        fontSize={isSelected ? '11px' : '9.5px'}
                        fontWeight={isSelected ? 700 : 500}
                        fontFamily="var(--font-sans)"
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >
                        {node.label.length > 20 ? node.label.substring(0, 18) + '...' : node.label}
                      </text>
                    </g>
                  );
                })}
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
              Entity Provenance Inspector
            </h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Detailed breakdown of selected relationship or indicator node
            </div>
          </div>

          {selectedNode && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.71875rem', fontWeight: 600, textTransform: 'uppercase', color: selectedNode.type === 'COMPLAINT' ? 'var(--brand-teal)' : '#B45309' }}>
                  {selectedNode.type === 'COMPLAINT' ? 'Complaint Incident Record' : `Indicator: ${selectedNode.indicator_type}`}
                </span>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                  {selectedNode.label}
                </div>
              </div>

              {selectedNode.type === 'COMPLAINT' ? (
                <>
                  <div style={{ fontSize: '0.8125rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', backgroundColor: 'var(--surface-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                    <div>Category: <strong>{selectedNode.incident_type}</strong></div>
                    <div>Reported Amount: <strong>{selectedNode.amount ? `₹${selectedNode.amount.toLocaleString()}` : 'None'}</strong></div>
                    <div>Review Status: <strong>{selectedNode.status}</strong></div>
                    <div>Priority: <strong>{selectedNode.priority}</strong></div>
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
                  <div style={{ fontSize: '0.8125rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', backgroundColor: 'var(--surface-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                    <div>Normalized Value: <strong style={{ fontFamily: 'var(--font-mono)' }}>{selectedNode.normalized_value}</strong></div>
                    <div>Entity Category: <strong>{selectedNode.indicator_type}</strong></div>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    This identifier was extracted from one or more payment receipts or reported by citizens. It connects all complaints displaying links to this node.
                  </div>
                </>
              )}
            </div>
          )}

          {selectedEdge && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.71875rem', fontWeight: 700, color: 'var(--brand-teal)', textTransform: 'uppercase' }}>
                Relationship Link Provenance
              </span>
              <div style={{ fontSize: '0.8125rem', backgroundColor: 'var(--surface-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div>Rule Applied: <strong>{selectedEdge.rule_applied}</strong></div>
                <div>Explanation: <span>{selectedEdge.explanation}</span></div>
                {selectedEdge.evidence_filename && (
                  <div>Supporting Receipt: <strong>{selectedEdge.evidence_filename}</strong></div>
                )}
              </div>
            </div>
          )}

          {/* Syndicates / Shared Clusters summary */}
          {graphData && graphData.clusters.length > 0 && (
            <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
              <div style={{ fontSize: '0.78125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Detected Shared Clusters ({graphData.clusters.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {graphData.clusters.map((cl, i) => (
                  <div key={i} style={{ fontSize: '0.75rem', padding: '0.45rem', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 'var(--radius-sm)', color: '#92400E' }}>
                    <strong>{cl.count} complaints</strong> linked by common identifier:
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
