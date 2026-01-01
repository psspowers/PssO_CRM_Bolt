import React from 'react';
import { Contact, Account, Partner, Relationship } from '../../types/crm';

interface NetworkGraphProps {
  entityId: string;
  entityType: 'Contact' | 'Account' | 'Partner';
  maxDegrees?: number;
  contacts: Contact[];
  accounts: Account[];
  partners: Partner[];
  relationships: Relationship[];
}

interface NetworkNode {
  id: string;
  name: string;
  type: 'Contact' | 'Account' | 'Partner';
  degree: number;
  strength?: string;
  relationshipType?: string;
}

export const NetworkGraph: React.FC<NetworkGraphProps> = ({ 
  entityId, entityType, maxDegrees = 3, contacts, accounts, partners, relationships 
}) => {
  const nodes = computeNetwork(entityId, entityType, maxDegrees, contacts, accounts, partners, relationships);
  const strengthColors = { Strong: 'bg-emerald-500', Medium: 'bg-amber-500', Weak: 'bg-gray-400' };
  const degreeColors = ['bg-emerald-600', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-red-500'];

  if (nodes.length <= 1) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">No network connections found</p>
        <p className="text-xs mt-1">Add relationships to see the network</p>
      </div>
    );
  }

  const grouped = nodes.reduce((acc, node) => {
    if (!acc[node.degree]) acc[node.degree] = [];
    acc[node.degree].push(node);
    return acc;
  }, {} as Record<number, NetworkNode[]>);

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([degree, degreeNodes]) => (
        <div key={degree}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${degreeColors[parseInt(degree)] || 'bg-gray-400'}`} />
            <span className="text-xs font-medium text-gray-500">
              {degree === '0' ? 'Center' : `${degree} degree${parseInt(degree) > 1 ? 's' : ''} away`}
            </span>
          </div>
          <div className="space-y-2 pl-4">
            {degreeNodes.map(node => (
              <div key={node.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${degreeColors[node.degree] || 'bg-gray-400'}`}>
                  {node.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{node.name}</p>
                  <p className="text-xs text-gray-500">{node.type}{node.relationshipType ? ` • ${node.relationshipType}` : ''}</p>
                </div>
                {node.strength && <div className={`w-2 h-2 rounded-full ${strengthColors[node.strength as keyof typeof strengthColors]}`} title={node.strength} />}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

function computeNetwork(startId: string, startType: string, maxDegrees: number, contacts: Contact[], accounts: Account[], partners: Partner[], relationships: Relationship[]): NetworkNode[] {
  const nodes: NetworkNode[] = [];
  const visited = new Set<string>();
  const queue: { id: string; type: string; degree: number; strength?: string; relType?: string }[] = [{ id: startId, type: startType, degree: 0 }];
  while (queue.length > 0) {
    const { id, type, degree, strength, relType } = queue.shift()!;
    const key = `${type}-${id}`;
    if (visited.has(key) || degree > maxDegrees) continue;
    visited.add(key);
    const entity = type === 'Contact' ? contacts.find(c => c.id === id) : type === 'Account' ? accounts.find(a => a.id === id) : partners.find(p => p.id === id);
    if (entity) {
      nodes.push({ id, name: 'name' in entity ? entity.name : (entity as any).fullName, type: type as any, degree, strength, relationshipType: relType });
      if (degree < maxDegrees) {
        relationships.filter(r => (r.fromEntityId === id && r.fromEntityType === type) || (r.toEntityId === id && r.toEntityType === type))
          .forEach(r => {
            const nextId = r.fromEntityId === id ? r.toEntityId : r.fromEntityId;
            const nextType = r.fromEntityId === id ? r.toEntityType : r.fromEntityType;
            queue.push({ id: nextId, type: nextType, degree: degree + 1, strength: r.strength, relType: r.type });
          });
      }
    }
  }
  return nodes;
}
