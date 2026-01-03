import { Project } from '../types/crm';

export const mockProjects: Project[] = [
  { id: 'pr1', name: 'Vardhman 31.5 MWp Phase 1', linkedAccountId: 'a2', country: 'India', capacity: 31.5, status: 'Engineering', ownerId: 'u3', linkedPartnerIds: ['p1', 'p4'], clickupLink: 'https://app.clickup.com/t/proj001', notes: 'Land acquisition complete', createdAt: new Date('2024-03-01'), updatedAt: new Date('2024-11-20') },
  { id: 'pr2', name: 'SM Mall of Asia Rooftop', linkedAccountId: 'a4', country: 'Philippines', capacity: 5.2, status: 'Construction', ownerId: 'u5', linkedPartnerIds: ['p3'], clickupLink: 'https://app.clickup.com/t/proj002', notes: 'Phase 1 of 15 sites', createdAt: new Date('2024-01-15'), updatedAt: new Date('2024-11-18') },
  { id: 'pr3', name: 'Tata Power Utility 100MW', linkedAccountId: 'a2', country: 'India', capacity: 100, status: 'Operational', ownerId: 'u1', linkedPartnerIds: ['p4'], clickupLink: 'https://app.clickup.com/t/proj003', notes: 'Flagship project', createdAt: new Date('2023-06-01'), updatedAt: new Date('2024-10-15') },
  { id: 'pr4', name: 'GreenWave Floating Solar 8MW', linkedAccountId: 'a3', country: 'Vietnam', capacity: 8, status: 'Won', ownerId: 'u2', linkedPartnerIds: ['p2'], notes: 'Reservoir installation', createdAt: new Date('2024-07-01'), updatedAt: new Date('2024-11-10') },
  { id: 'pr5', name: 'Central Retail Bangkok 3MW', linkedAccountId: 'a8', country: 'Thailand', capacity: 3, status: 'Permit/EPC', ownerId: 'u6', linkedPartnerIds: ['p5'], clickupLink: 'https://app.clickup.com/t/proj005', notes: 'First of 8 sites', createdAt: new Date('2024-08-15'), updatedAt: new Date('2024-11-05') },
  { id: 'pr6', name: 'Mahindra Campus Solar 2MW', linkedAccountId: 'a6', country: 'India', capacity: 2, status: 'Won', ownerId: 'u3', linkedPartnerIds: ['p1'], notes: 'Educational institution pilot', createdAt: new Date('2024-10-01'), updatedAt: new Date('2024-11-01') },
];
