import { Relationship } from '../types/crm';

export const mockRelationships: Relationship[] = [
  { id: 'r1', fromEntityId: 'c1', fromEntityType: 'Contact', toEntityId: 'a1', toEntityType: 'Account', type: 'Works At', strength: 'Strong', notes: 'VP level decision maker' },
  { id: 'r2', fromEntityId: 'c2', fromEntityType: 'Contact', toEntityId: 'a2', toEntityType: 'Account', type: 'Works At', strength: 'Strong', notes: 'CFO with budget authority' },
  { id: 'r3', fromEntityId: 'c6', fromEntityType: 'Contact', toEntityId: 'c2', toEntityType: 'Contact', type: 'Friend', strength: 'Medium', notes: 'College alumni connection' },
  { id: 'r4', fromEntityId: 'c7', fromEntityType: 'Contact', toEntityId: 'c2', toEntityType: 'Contact', type: 'Banker', strength: 'Strong', notes: 'Handles Vardhman financing' },
  { id: 'r5', fromEntityId: 'c6', fromEntityType: 'Contact', toEntityId: 'p1', toEntityType: 'Partner', type: 'Advisor To', strength: 'Strong', notes: 'Regulatory guidance' },
  { id: 'r6', fromEntityId: 'c8', fromEntityType: 'Contact', toEntityId: 'c1', toEntityType: 'Contact', type: 'Works At', strength: 'Strong', notes: 'Same company, legal team' },
  { id: 'r7', fromEntityId: 'c7', fromEntityType: 'Contact', toEntityId: 'p4', toEntityType: 'Partner', type: 'Banker', strength: 'Strong', notes: 'Tata Power financing lead' },
  { id: 'r8', fromEntityId: 'c3', fromEntityType: 'Contact', toEntityId: 'a3', toEntityType: 'Account', type: 'Works At', strength: 'Medium', notes: 'Energy department' },
  { id: 'r9', fromEntityId: 'c4', fromEntityType: 'Contact', toEntityId: 'a4', toEntityType: 'Account', type: 'Works At', strength: 'Strong', notes: 'Key procurement contact' },
  { id: 'r10', fromEntityId: 'c5', fromEntityType: 'Contact', toEntityId: 'a5', toEntityType: 'Account', type: 'Works At', strength: 'Medium', notes: 'Plant operations' },
  { id: 'r11', fromEntityId: 'c6', fromEntityType: 'Contact', toEntityId: 'c7', toEntityType: 'Contact', type: 'Introduced By', strength: 'Medium', notes: 'Rajesh introduced Anita for BOI' },
  { id: 'r12', fromEntityId: 'c1', fromEntityType: 'Contact', toEntityId: 'c4', toEntityType: 'Contact', type: 'Friend', strength: 'Weak', notes: 'Met at ASEAN summit' },
  { id: 'r13', fromEntityId: 'p1', fromEntityType: 'Partner', toEntityId: 'p4', toEntityType: 'Partner', type: 'JV Partner', strength: 'Strong', notes: 'Joint India projects' },
  { id: 'r14', fromEntityId: 'c7', fromEntityType: 'Contact', toEntityId: 'a2', toEntityType: 'Account', type: 'Banker', strength: 'Strong', notes: 'Project financing' },
];
