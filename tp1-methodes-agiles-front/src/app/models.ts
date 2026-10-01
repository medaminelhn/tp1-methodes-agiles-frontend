export interface Utilisateur { id: number; nom: string; prenom: string; }
export interface Salle { id: number; nom: string; capacite: number; disponible: boolean; }
export interface Semestre { id: number; libelle: string; }
export interface Solde { volumeTotal: number | null; consomme: number; restant: number | null; }