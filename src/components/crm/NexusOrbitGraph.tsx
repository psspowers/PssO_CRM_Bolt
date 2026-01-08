import React, { useState } from 'react';
import { User, Building2, Star, Target } from 'lucide-react';

interface NexusPath {
  path: Array<{
    entity_id: string;
    entity_type: string;
    entity_name: string;
    relationship?: string;
    strength?: number;
  }>;
  total_strength: number;
  degrees: number;
  win_probability: number;
}

interface NexusOrbitGraphProps {
  paths: NexusPath[];
  targetName: string;
}

interface NodePosition {
  x: number;
  y: number;
  path: NexusPath;
  node: any;
  angle: number;
  isIntermediary: boolean;
}

export const NexusOrbitGraph: React.FC<NexusOrbitGraphProps> = ({ paths, targetName }) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<NexusPath | null>(null);

  const centerX = 50;
  const centerY = 50;
  const innerRadius = 20;
  const outerRadius = 38;

  const directPaths = paths.filter(p => p.degrees === 1);
  const indirectPaths = paths.filter(p => p.degrees > 1);

  const positionNodes = (): NodePosition[] => {
    const positions: NodePosition[] = [];

    directPaths.forEach((path, idx) => {
      const angle = (idx / directPaths.length) * 2 * Math.PI;
      const x = centerX + innerRadius * Math.cos(angle);
      const y = centerY + innerRadius * Math.sin(angle);

      if (path.path.length > 1) {
        positions.push({
          x,
          y,
          path,
          node: path.path[0],
          angle,
          isIntermediary: false
        });
      }
    });

    indirectPaths.forEach((path, idx) => {
      const angle = (idx / Math.max(indirectPaths.length, 1)) * 2 * Math.PI;
      const x = centerX + outerRadius * Math.cos(angle);
      const y = centerY + outerRadius * Math.sin(angle);

      if (path.path.length > 1) {
        const intermediary = path.path[path.path.length - 2];
        positions.push({
          x,
          y,
          path,
          node: intermediary,
          angle,
          isIntermediary: true
        });
      }
    });

    return positions;
  };

  const nodePositions = positionNodes();

  const getStrengthValue = (strength: any): number => {
    if (typeof strength === 'number') return strength;
    const strengthMap: Record<string, number> = { 'Weak': 1, 'Medium': 3, 'Strong': 5 };
    return strengthMap[strength] || 3;
  };

  const getNodeColor = (degrees: number) => {
    if (degrees === 1) return { bg: 'bg-blue-500', border: 'border-blue-400', glow: 'shadow-blue-500/50' };
    return { bg: 'bg-purple-500', border: 'border-purple-400', glow: 'shadow-purple-500/50' };
  };

  return (
    <div className="relative w-full aspect-square max-w-2xl mx-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-4 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.02),transparent_70%)]" />

      <svg
        viewBox="0 0 100 100"
        className="w-full h-full relative z-10"
        style={{ filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))' }}
      >
        <defs>
          <linearGradient id="energyBeam1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="energyBeam2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.6" />
          </linearGradient>

          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <circle
          cx={centerX}
          cy={centerY}
          r={innerRadius}
          fill="none"
          stroke="rgba(148, 163, 184, 0.15)"
          strokeWidth="0.3"
          strokeDasharray="1,1"
        />

        <circle
          cx={centerX}
          cy={centerY}
          r={outerRadius}
          fill="none"
          stroke="rgba(148, 163, 184, 0.15)"
          strokeWidth="0.3"
          strokeDasharray="1,1"
        />

        {nodePositions.map((pos, idx) => {
          const isHovered = hoveredNode === pos.node.entity_id;
          const isSelected = selectedPath?.path.some(n => n.entity_id === pos.node.entity_id);

          return (
            <g key={`connection-${idx}`}>
              <line
                x1={pos.x}
                y1={pos.y}
                x2={centerX}
                y2={centerY}
                stroke={pos.path.degrees === 1 ? "url(#energyBeam1)" : "url(#energyBeam2)"}
                strokeWidth={isHovered || isSelected ? "0.4" : "0.2"}
                strokeDasharray="2,2"
                opacity={isHovered || isSelected ? "0.8" : "0.3"}
                filter="url(#glow)"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to="4"
                  dur={pos.path.degrees === 1 ? "1.5s" : "2s"}
                  repeatCount="indefinite"
                />
              </line>
            </g>
          );
        })}

        <circle
          cx={centerX}
          cy={centerY}
          r="5"
          fill="url(#sunGradient)"
          filter="url(#glow)"
        />
        <defs>
          <radialGradient id="sunGradient">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f97316" />
          </radialGradient>
        </defs>

        {nodePositions.map((pos, idx) => {
          const colors = getNodeColor(pos.path.degrees);
          const isHovered = hoveredNode === pos.node.entity_id;

          return (
            <g key={`node-${idx}`}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isHovered ? "3.5" : "3"}
                fill="rgba(255, 255, 255, 0.1)"
                stroke="white"
                strokeWidth="0.3"
                filter={isHovered ? "url(#glow)" : undefined}
                className="cursor-pointer transition-all"
                onMouseEnter={() => setHoveredNode(pos.node.entity_id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => setSelectedPath(selectedPath?.path === pos.path.path ? null : pos.path)}
              />
            </g>
          );
        })}
      </svg>

      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-400 blur-xl opacity-50 animate-pulse" />
          <div className="relative bg-gradient-to-br from-orange-500 to-amber-400 rounded-full p-4 shadow-2xl">
            <Target className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>

      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-12 pointer-events-none">
        <div className="bg-slate-950/80 backdrop-blur-sm border border-slate-700 rounded-lg px-3 py-1.5 shadow-xl">
          <p className="text-white font-bold text-sm text-center whitespace-nowrap">{targetName}</p>
          <p className="text-emerald-400 text-[10px] text-center font-bold">TARGET</p>
        </div>
      </div>

      {nodePositions.map((pos, idx) => {
        const angle = pos.angle * (180 / Math.PI);
        let labelX = pos.x;
        let labelY = pos.y;

        if (pos.isIntermediary) {
          const offset = 8;
          labelX = pos.x + offset * Math.cos(pos.angle);
          labelY = pos.y + offset * Math.sin(pos.angle);
        } else {
          const offset = 6;
          labelX = pos.x + offset * Math.cos(pos.angle);
          labelY = pos.y + offset * Math.sin(pos.angle);
        }

        const isHovered = hoveredNode === pos.node.entity_id;

        return (
          <div
            key={`label-${idx}`}
            className="absolute pointer-events-none transition-opacity duration-200"
            style={{
              left: `${labelX}%`,
              top: `${labelY}%`,
              transform: 'translate(-50%, -50%)',
              opacity: isHovered ? 1 : 0.7
            }}
          >
            <div className={`${
              isHovered ? 'scale-110' : 'scale-100'
            } transition-transform bg-slate-950/90 backdrop-blur-sm border ${
              pos.path.degrees === 1 ? 'border-blue-500/50' : 'border-purple-500/50'
            } rounded-lg px-2 py-1 shadow-xl`}>
              <div className="flex items-center gap-1.5">
                {pos.node.entity_type === 'User' || pos.node.entity_type === 'Contact' ? (
                  <User className="w-3 h-3 text-white" />
                ) : (
                  <Building2 className="w-3 h-3 text-white" />
                )}
                <p className="text-white font-medium text-[10px] whitespace-nowrap max-w-[100px] truncate">
                  {pos.node.entity_name}
                </p>
              </div>
              {pos.node.strength && (
                <div className="flex gap-0.5 mt-0.5 justify-center">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-2 h-2 ${
                      i < getStrengthValue(pos.node.strength) ?
                      'text-orange-400 fill-orange-400' :
                      'text-slate-600'
                    }`} />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-4 pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />
            <span className="text-white text-[10px] font-medium">Direct (1°)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-purple-500 shadow-lg shadow-purple-500/50" />
            <span className="text-white text-[10px] font-medium">Indirect (2°+)</span>
          </div>
        </div>
        <div className="bg-slate-950/80 backdrop-blur-sm border border-slate-700 rounded-lg px-2 py-1">
          <span className="text-emerald-400 font-bold text-xs">{paths.length} Path{paths.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {selectedPath && (
        <div className="absolute top-4 right-4 bg-slate-950/95 backdrop-blur-sm border border-orange-500/50 rounded-xl p-3 shadow-2xl pointer-events-auto max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                selectedPath.degrees === 1 ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
              }`}>
                {selectedPath.degrees}° Connection
              </div>
              {selectedPath.win_probability !== undefined && (
                <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                  selectedPath.win_probability > 75 ? 'bg-emerald-500/20 text-emerald-400' :
                  selectedPath.win_probability >= 40 ? 'bg-amber-500/20 text-amber-400' :
                  'bg-slate-500/20 text-slate-400'
                }`}>
                  <Target className="w-3 h-3" />
                  {selectedPath.win_probability}%
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedPath(null)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ×
            </button>
          </div>

          <div className="space-y-2">
            {selectedPath.path.map((node, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  idx === 0 ? 'bg-blue-500/20' :
                  idx === selectedPath.path.length - 1 ? 'bg-orange-500/20' :
                  'bg-slate-500/20'
                }`}>
                  {node.entity_type === 'User' || node.entity_type === 'Contact' ? (
                    <User className="w-3 h-3 text-white" />
                  ) : (
                    <Building2 className="w-3 h-3 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-white text-xs font-medium">{node.entity_name}</p>
                  {node.relationship && (
                    <p className="text-emerald-400 text-[10px]">{node.relationship}</p>
                  )}
                </div>
                {node.strength && (
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-2 h-2 ${
                        i < getStrengthValue(node.strength) ?
                        'text-orange-400 fill-orange-400' :
                        'text-slate-600'
                      }`} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
