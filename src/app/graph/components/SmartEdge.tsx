import React from 'react';
import { EdgeProps, getSmoothStepPath, EdgeLabelRenderer, BaseEdge, useViewport } from 'reactflow';

export function SmartEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
}: EdgeProps) {
  const { zoom } = useViewport();

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 24,
  });

  const type = data?.type || 'normal';
  const confidence = data?.confidence || 1.0;
  
  // Style configurations based on type
  let strokeWidth = 3;
  let strokeColor = 'rgba(255, 255, 255, 0.4)';
  let isAnimated = false;
  let filter = 'none';
  let dashArray = 'none';

  if (type === 'mastery_path') {
    strokeWidth = 6;
    strokeColor = '#60a5fa'; // Bright blue
    filter = 'drop-shadow(0 0 8px rgba(96, 165, 250, 0.8))';
    isAnimated = true;
  } else if (type === 'remediation') {
    strokeWidth = 4;
    strokeColor = '#fb923c'; // Orange
    filter = 'drop-shadow(0 0 6px rgba(251, 146, 60, 0.6))';
    dashArray = '8 8';
  } else if (type === 'prerequisite') {
    strokeWidth = 3;
    strokeColor = '#9ca3af'; // Gray
  }

  // Smart Zoom Priority:
  // Show labels only when zoomed in > 0.6, or if it's mastery/remediation
  const isEssential = type === 'mastery_path' || type === 'remediation' || type === 'prerequisite';
  const showLabel = isEssential && zoom > 0.45;
  const hideEdge = !isEssential && zoom < 0.3;

  if (hideEdge) return null;

  return (
    <>
      <style>{`
        .edge-animated {
          stroke-dasharray: 10 10;
          animation: flow 1s linear infinite;
        }
        @keyframes flow {
          from { stroke-dashoffset: 20; }
          to { stroke-dashoffset: 0; }
        }
        .smart-edge-path {
          transition: stroke-width 0.2s, stroke 0.2s;
        }
        .smart-edge-path:hover {
          stroke-width: ${strokeWidth + 2}px;
          filter: brightness(1.2) drop-shadow(0 0 10px rgba(255,255,255,0.5));
          cursor: pointer;
        }
      `}</style>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth,
          stroke: strokeColor,
          filter,
          strokeDasharray: dashArray !== 'none' ? dashArray : (isAnimated ? '10 10' : 'none'),
          opacity: 0.8 * confidence + 0.2,
        }}
        // @ts-ignore - BaseEdge passes rest props to path but types are missing className
        className={`smart-edge-path ${isAnimated ? 'edge-animated' : ''}`}
        id={id}
      />
      
      {showLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: 'rgba(15, 15, 18, 0.85)',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '10px',
              fontWeight: 700,
              color: strokeColor,
              border: `1px solid ${strokeColor}`,
              backdropFilter: 'blur(4px)',
              pointerEvents: 'all',
              cursor: 'pointer',
              zIndex: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
            className="nodrag nopan"
          >
            {type.replace('_', ' ')}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
