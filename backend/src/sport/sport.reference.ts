export interface ReferenceExercise {
  name: string;
  weight?: number;
  sets?: number;
  reps?: number;
  durationSeconds?: number;
  notes?: string;
}
export interface ProgramTemplate {
  name: string;
  type: string;
  dayOfWeek: number;
  weeklyTarget: number;
  description: string;
  exercises: ReferenceExercise[];
}

export const referenceProgram: ProgramTemplate[] = [
  {
    name: 'Lundi · Pecs / triceps', type: 'pecs_triceps', dayOfWeek: 0, weeklyTarget: 1,
    description: 'Repère du lundi, déplaçable. Charges de référence, pas de performance enregistrée.',
    exercises: [
      { name: 'DC haltères', weight: 32, sets: 3, reps: 8, notes: 'Objectif 3 × 8. Référence déclarée : 8 / 8 / 6. Unité de charge à préciser (par haltère ou total).' },
      { name: 'Écartés machine', weight: 30 },
      { name: 'Dips assis machine', weight: 150 },
      { name: 'Extension triceps poulie barre', weight: 30 },
      { name: 'Extension triceps haltère', weight: 12, notes: 'Unité de charge à préciser (par haltère ou total).' },
      { name: 'EMOM pompes', durationSeconds: 600, notes: '15 pompes chaque minute pendant 10 minutes.' },
      { name: 'Abdos bloc A', notes: 'Contenu à préciser.' },
    ],
  },
  {
    name: 'Mardi · Dos / biceps', type: 'dos_biceps', dayOfWeek: 1, weeklyTarget: 1,
    description: 'Repère du mardi, déplaçable. Charges de référence.',
    exercises: [
      { name: 'Tractions lestées', weight: 25, notes: 'Lest ajouté : 25 kg. Référence 3 à 5 répétitions ; nombre de séries à préciser.' },
      { name: 'Tirage vertical', weight: 85 },
      { name: 'Tirage machine 45°', weight: 50 },
      { name: 'Curl poulie', weight: 35 },
      { name: 'Curl marteau', weight: 18, notes: 'Unité de charge à préciser (par haltère ou total).' },
      { name: 'Curl pupitre', weight: 12 },
      { name: 'EMOM tractions', durationSeconds: 600, notes: '6 tractions chaque minute pendant 10 minutes.' },
    ],
  },
  {
    name: 'Mercredi · Jambes', type: 'jambes', dayOfWeek: 2, weeklyTarget: 1,
    description: 'Repère du mercredi, déplaçable. Charges de référence.',
    exercises: [
      { name: 'Presse', weight: 150 },
      { name: 'Fentes arrière sur place', weight: 20, notes: 'Unité de charge à préciser (par haltère ou total).' },
      { name: 'Leg curl allongé', weight: 37.5 },
      { name: 'Leg extension', weight: 55 },
      { name: 'Mollets debout', weight: 85, notes: 'Tempo lent.' },
      { name: 'Circuit abdos', notes: '40 secondes d’effort / 20 secondes de repos. Exercices et nombre de tours à préciser.' },
    ],
  },
  {
    name: 'Jeudi · Épaules / bras', type: 'epaules', dayOfWeek: 3, weeklyTarget: 1,
    description: 'Repère du jeudi, déplaçable. Charges de référence.',
    exercises: [
      { name: 'Shoulder press', weight: 47.5 },
      { name: 'Élévations latérales', weight: 12, notes: 'Unité de charge à préciser (par haltère ou total).' },
      { name: 'Élévations frontales', weight: 8, notes: 'Associées aux élévations latérales. Unité de charge à préciser.' },
      { name: 'Reverse fly', weight: 22.5 },
      { name: 'Curl incliné', weight: 16, notes: 'Unité de charge à préciser (par haltère ou total).' },
      { name: 'Barre au front EZ', weight: 25 },
      { name: 'Extension triceps corde', weight: 25 },
      { name: 'Abdos bloc A', notes: 'Contenu à préciser.' },
    ],
  },
];
