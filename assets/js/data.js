// Données de la maquette SURF FM +. Un seul fichier à mettre à jour.

// Émissions d'après le trombinoscope de l'équipe en 2015 (à mettre à jour avec l'équipe actuelle).
export const EMISSIONS = [
  { nom: 'L\'Actusurf', animateurs: 'Julien, Kaël & Chewie', img: 'format-glisse', alt: 'Vague qui déferle la nuit, vue depuis l\'eau' },
  { nom: 'Rock Session', animateurs: 'Arnaud', img: 'format-rock', alt: 'Guitare électrique dans une cabane de plage ouverte sur l\'océan' },
  { nom: 'The Boom Rap Show', animateurs: 'Doc Lamixe, Jay Wigga', img: 'format-platines', alt: 'Platines vinyles sur une terrasse de plage la nuit' },
  { nom: 'This Could Be Bad', animateurs: 'Dan, David, Kene', img: 'emission-studio', real: true, credit: 'Archives 2015', alt: 'Bénévoles autour des micros au studio' },
  { nom: 'Musicalement vôtre', animateurs: 'Clément', img: 'micro', real: true, credit: 'Archives 2015', alt: 'Micro Surf FM 102.3' },
  { nom: 'Mais pas que…', animateurs: 'Arnaud, Clément, Julien, Kaël & Chewie', img: 'emission-participer', real: true, credit: 'Photo : Céline Hamelin', alt: 'Animateurs au micro pendant une émission' },
  { nom: 'Délivrez-moi', animateurs: 'Élise', img: 'studio-console-nuit', alt: 'Console de mixage et micro la nuit' },
  { nom: 'Frequency', animateurs: 'Sean', img: 'format-nuit', alt: 'Reflet de lune sur l\'océan vu depuis la dune' },
  { nom: 'Cover', animateurs: 'Clément, Élise', img: 'studio-technique', real: true, credit: 'Photo : Jean Charles Barthelet', alt: 'Casque et micro sur la table de mixage' },
];

// Grille D'EXEMPLE : créneaux génériques à remplacer par la vraie grille (heure de Paris).
const SEMAINE = [
  { de: 0, a: 7, nom: 'Nuit non-stop', img: 'format-nuit' },
  { de: 7, a: 10, nom: 'Matinale', img: 'lineup-aube' },
  { de: 10, a: 12, nom: 'Musique non-stop', img: 'capter-web' },
  { de: 12, a: 13, nom: 'Magazine glisse', img: 'format-glisse' },
  { de: 13, a: 18, nom: 'Musique non-stop', img: 'capter-fm' },
  { de: 18, a: 20, nom: 'Émission thématique', img: 'studio-console-nuit' },
  { de: 20, a: 22, nom: 'Émission du soir', img: 'format-rock' },
  { de: 22, a: 24, nom: 'Session DJ', img: 'format-platines' },
];
const WEEKEND = [
  { de: 0, a: 8, nom: 'Nuit non-stop', img: 'format-nuit' },
  { de: 8, a: 11, nom: 'Matinale du week-end', img: 'lineup-aube' },
  { de: 11, a: 18, nom: 'Musique non-stop', img: 'capter-web' },
  { de: 18, a: 20, nom: 'Magazine glisse', img: 'format-glisse' },
  { de: 20, a: 24, nom: 'Session DJ', img: 'format-platines' },
];
export const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
export const GRILLE = JOURS.map((_, i) => (i >= 5 ? WEEKEND : SEMAINE));

// Agenda : ajouter les dates ici ({ date: 'AAAA-MM-JJ', titre, lieu, heure }). Tri à venir / passé automatique.
// Le site actuel indique « Pas d'événements pour le moment ».
export const AGENDA = [];
