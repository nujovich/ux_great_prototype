import type { Engineer } from '../types';

export const ENGINEERS: Engineer[] = [
  { id: 'eng-1', name: 'Ana Martinez', metier: 'Backend', capacityDays: 200 },
  { id: 'eng-2', name: 'Bruno Silva', metier: 'Backend', capacityDays: 200 },
  { id: 'eng-3', name: 'Carla Rossi', metier: 'Frontend', capacityDays: 200 },
  { id: 'eng-4', name: 'Diego Pérez', metier: 'Frontend', capacityDays: 200 },
  { id: 'eng-5', name: 'Elena Costa', metier: 'Data', capacityDays: 200 },
  { id: 'eng-6', name: 'Felipe Núñez', metier: 'Data', capacityDays: 200 },
  { id: 'eng-7', name: 'Gabriela Ortiz', metier: 'DevOps', capacityDays: 200 },
  { id: 'eng-8', name: 'Hugo Romero', metier: 'QA', capacityDays: 200 },
  { id: 'eng-9', name: 'Inés Vega', metier: 'Mobile', capacityDays: 200 },
  { id: 'eng-10', name: 'Joaquín Díaz', metier: 'Mobile', capacityDays: 200 },
];

// El "engineer activo" cuando role=Engineer
export const ACTIVE_ENGINEER_ID = 'eng-1';
