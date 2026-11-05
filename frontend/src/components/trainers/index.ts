import { ComponentType } from 'react';
import ReseauTrainer from './ReseauTrainer';

// Registre des entraîneurs interactifs, indexés par la `trainerKey` d'une matière.
// Pour ajouter un entraîneur : créer le composant puis l'enregistrer ici.
export const TRAINERS: Record<string, ComponentType> = {
  reseau: ReseauTrainer,
};

export function getTrainer(key: string | null | undefined): ComponentType | null {
  if (!key) return null;
  return TRAINERS[key] ?? null;
}
