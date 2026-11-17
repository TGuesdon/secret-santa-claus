import type { DrawErrorCode } from '../lib/draw-error';

export const wording = {
  brand: 'Secret Santa',
  sound: {
    enable: 'Activer le son',
    label: 'Son',
    muted: 'coupé',
    enabled: 'activé',
    blocked: 'Envie des grelots ? Active le son. Ton tirage fonctionne aussi sans musique.',
  },
  motion: {
    label: 'Animations',
    paused: 'en pause',
    enabled: 'activées',
  },
  ready: {
    heading: 'Un cadeau.',
    emphasis: 'Un joli secret.',
    description: 'Ho ho ho… à qui vas-tu faire plaisir cette année ?',
    action: 'Révéler mon tirage',
    note: 'Un clic, des grelots, et le secret est à toi.',
  },
  opening: {
    heading: 'Roulement',
    emphasis: 'de grelots…',
    description: 'Les lutins s’agitent. Le suspense est à son comble !',
    action: 'Les lutins déballent…',
    note: 'Chut… la surprise arrive !',
  },
  revealed: {
    heading: 'Cette année,',
    emphasis: 'tu gâtes…',
    description: (participantName: string) =>
      `Joyeux Noël ${participantName} ! Voici ta mission secrète.`,
    recipientLabel: 'Ton cadeau est pour',
    recipientNote: 'À toi de lui mettre des étoiles plein les yeux.',
    note: 'Motus et boule de neige. Ça reste entre nous !',
  },
  link: {
    invalidHeading: 'Oups, les lutins ont perdu un bout du lien.',
    invalidDescription:
      'Ce lien personnel est incomplet ou invalide. Demande le lien complet à l’organisateur.',
    missing:
      'Il te faut ton lien personnel pour découvrir ton tirage. Ouvre le lien reçu par e-mail ou scanne ton QR code.',
  },
  errors: {
    unexpected: 'Impossible de révéler ton tirage. Réessaie dans un instant.',
    draw: {
      'invalid-link':
        'Ce lien personnel est incomplet ou invalide. Demande le lien complet à l’organisateur.',
      'not-found':
        'Aucun tirage ne correspond à ce lien. Demande ton lien personnel à l’organisateur.',
      'decryption-failed':
        'Impossible de déchiffrer ce tirage. Vérifie que ton lien personnel est complet.',
      'unsupported-version': 'Ce tirage utilise un format incompatible. Contacte l’organisateur.',
      'invalid-draw': 'Impossible de charger ton tirage. Vérifie ta connexion et réessaie.',
      'load-failed': 'Impossible de charger ton tirage. Vérifie ta connexion et réessaie.',
    } satisfies Record<DrawErrorCode, string>,
  },
  footer: {
    credits: 'Préparé avec amour et quelques lutins surexcités.',
    motto: 'La magie, c’est de faire plaisir.',
  },
} as const;
