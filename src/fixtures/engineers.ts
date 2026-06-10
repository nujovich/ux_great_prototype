import type { Metier } from '../types';

export type Engineer = {
  id: string;
  name: string;
  metier: Metier;
  capacityDays: number;
};

export const ENGINEERS: Engineer[] = [
  { id: 'eng-1', name: 'Ana Martinez', metier: 'H-DESIGN', capacityDays: 200 },
  { id: 'eng-2', name: 'Bruno Silva', metier: 'H-DESIGN', capacityDays: 200 },
  { id: 'eng-3', name: 'Carla Rossi', metier: 'H-SOFTWARE', capacityDays: 200 },
  { id: 'eng-4', name: 'Diego Pérez', metier: 'H-SOFTWARE', capacityDays: 200 },
  { id: 'eng-5', name: 'Elena Costa', metier: 'H-TUNING', capacityDays: 200 },
  { id: 'eng-6', name: 'Felipe Núñez', metier: 'H-TUNING', capacityDays: 200 },
  { id: 'eng-7', name: 'Gabriela Ortiz', metier: 'H-PROJECT', capacityDays: 200 },
  { id: 'eng-8', name: 'Hugo Romero', metier: 'H-TESTING', capacityDays: 200 },
  { id: 'eng-9', name: 'Inés Vega', metier: 'H-CUSTOMER', capacityDays: 200 },
  { id: 'eng-10', name: 'Joaquín Díaz', metier: 'H-CUSTOMER', capacityDays: 200 },
];

// El "engineer activo" cuando role=Engineer
export const ACTIVE_ENGINEER_ID = 'eng-1';
