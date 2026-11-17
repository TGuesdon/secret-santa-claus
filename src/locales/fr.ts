import type { ValidationCode } from '../lib/validation-error';
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
  curtain: {
    action: 'Ouvrir le rideau',
  },
  ready: {
    heading: 'Le Père Noël t’a écrit.',
    emphasis: 'Qui vas-tu gâter ?',
    action: 'Ouvrir la lettre',
  },
  opening: {
    heading: 'Roulement',
    emphasis: 'de grelots…',
    description: 'Le cachet va bientôt céder…',
    action: 'Ouverture de la lettre…',
  },
  revealed: {
    heading: 'Cette année,',
    emphasis: 'tu gâtes…',
    recipientLabel: 'Ton cadeau est pour',
    recipientNote: 'À toi de lui mettre des étoiles plein les yeux !',
    note: 'Motus et boule de neige. Ça reste entre nous !',
  },
  link: {
    heading: 'Ton tirage',
    emphasis: 'de Noël.',
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
  config: {
    title: 'Prépare ton prochain',
    titleEmphasis: 'Secret Santa.',
    introduction:
      'Rassemble tes proches, choisis les exclusions et repars avec une configuration prête à utiliser.',
    back: 'Retour au tirage',
    campaigns: 'Tes campagnes',
    addCampaign: 'Ajouter une campagne',
    unnamedCampaign: 'Nouvelle campagne',
    campaignId: 'Identifiant de la campagne',
    campaignHint:
      '1 à 64 caractères : lettres minuscules, chiffres et tirets. Commence par une lettre ou un chiffre.',
    requiredHint: 'Le nom et l’e-mail sont obligatoires pour chaque personne.',
    participants: 'Les participants',
    participantCount: (count: number) => `${count} personne${count > 1 ? 's' : ''}`,
    campaignCount: (count: number) => `${count} campagne${count > 1 ? 's' : ''}`,
    person: (index: number) => `Personne ${index + 1}`,
    name: 'Nom',
    email: 'E-mail',
    emailPlaceholder: 'alice@exemple.fr',
    namePlaceholder: 'Alice',
    addPerson: 'Ajouter une personne',
    removePerson: (name: string) => `Supprimer ${name}`,
    removeCampaign: 'Supprimer la campagne',
    confirmRemove: 'Supprimer cette campagne et ses participants ?',
    confirm: 'Oui, supprimer',
    cancel: 'Annuler',
    exclusions: 'Ajouter une exclusion',
    exclusionPlaceholder: 'Choisir une personne…',
    noExclusionOptions: 'Aucune autre personne à ajouter',
    removeExclusion: (name: string) => `Retirer ${name} des exclusions`,
    noExclusions: 'Peut offrir à tout le monde, sauf à soi-même.',
    exclusionHint:
      'Une exclusion empêche cette personne de tirer le nom choisi. Elle ne s’applique pas dans l’autre sens.',
    exclusionsTitle: 'Qui ne peut pas tirer qui ?',
    importTitle: 'Importer un JSON',
    importHint:
      'Colle une configuration multi-campagne ou une liste de participants, ou choisis un fichier JSON. L’import sera vérifié avant de remplacer tes saisies.',
    importLabel: 'Contenu JSON',
    importFile: 'Choisir un fichier JSON',
    importRead: 'Lire le JSON',
    importReady: (count: number) =>
      `${count} campagne${count > 1 ? 's' : ''} valide${count > 1 ? 's' : ''} à importer. Tes saisies actuelles seront remplacées.`,
    importReplace: 'Remplacer la configuration',
    importFailed: 'Impossible de lire ce fichier. Choisis un fichier texte JSON et réessaie.',
    exportTitle: 'Tout est prêt pour la suite ?',
    exportHint:
      'Vérifie toutes tes campagnes et génère leur JSON. Tu pourras ensuite le copier ou le télécharger.',
    generate: 'Vérifier et générer le JSON',
    generatedLabel: 'JSON généré',
    generatedTitle: 'Ta configuration est prête',
    generatedHint:
      'Les e-mails et les exclusions sont valides. Un tirage est possible pour chaque campagne.',
    copy: 'Copier le JSON',
    copied: 'JSON copié dans le presse-papiers.',
    copyFailed:
      'La copie automatique a échoué. Sélectionne le JSON ci-dessous ou télécharge le fichier.',
    download: 'Télécharger le JSON',
    downloaded: 'Téléchargement du JSON lancé.',
    downloadFailed:
      'Le téléchargement a échoué. Copie le JSON ou sélectionne son contenu ci-dessous.',
    invalidTitle: 'Il reste un détail à corriger',
    issue: (
      campaignId: string | undefined,
      participantIndex: number | undefined,
      message: string,
    ) => {
      const campaign = campaignId ? `${campaignId} : ` : '';
      const participant =
        participantIndex === undefined ? '' : `personne ${participantIndex + 1} — `;

      return `${campaign}${participant}${message}`;
    },
    privacy:
      'Tes saisies restent dans cet onglet. Rien n’est envoyé ni enregistré automatiquement.',
    privacyNote: 'Copie ou télécharge ton JSON avant de quitter cette page.',
    empty: 'Commence par ajouter une campagne.',
    unexpected: 'Une erreur est survenue. Vérifie ta configuration et réessaie.',
    validation: {
      'participant-count': 'Ajoute entre 2 et 500 personnes par campagne.',
      'invalid-participant': 'Chaque personne doit avoir un nom et une adresse e-mail.',
      'missing-fields': 'Renseigne le nom et l’adresse e-mail de chaque personne.',
      'invalid-name': 'Saisis un nom de 1 à 120 caractères, sans caractère de contrôle.',
      'invalid-email': 'Saisis une adresse e-mail valide, comme alice@exemple.fr.',
      'duplicate-name': 'Ce nom est déjà utilisé dans cette campagne. Choisis un nom distinct.',
      'duplicate-email': 'Cette adresse e-mail est déjà utilisée dans cette campagne.',
      'invalid-exclusions': 'Les exclusions doivent être une liste de noms.',
      'unknown-exclusion': 'Une exclusion désigne une personne absente de cette campagne.',
      'self-exclusion':
        'Une personne ne peut pas s’exclure elle-même : cette règle est déjà automatique.',
      'duplicate-exclusion': 'Une même personne apparaît plusieurs fois dans les exclusions.',
      'invalid-campaign-id':
        'Choisis un identifiant de 1 à 64 lettres minuscules, chiffres ou tirets, commençant par une lettre ou un chiffre.',
      'duplicate-campaign-id': 'Cet identifiant est déjà utilisé par une autre campagne.',
      'invalid-json':
        'Ce JSON est invalide. Vérifie les guillemets, les virgules et les accolades.',
      'invalid-configuration':
        'Le JSON doit contenir au moins une campagne avec sa liste de participants.',
      'unsupported-fields':
        'Un champ du JSON est inconnu. Utilise uniquement name, email et exclusions pour chaque personne.',
      'impossible-assignment':
        'Aucun tirage possible avec ces exclusions. Retire certaines exclusions ou ajoute des participants.',
    } satisfies Record<ValidationCode, string>,
  },
} as const;
