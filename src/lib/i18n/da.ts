import type { en } from './en.js';

/** Every branch optional: an untranslated key reads from `en` instead. */
type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export const da: DeepPartial<typeof en> = {
  common: {
    cancel: 'Annuller',
    save: 'Gem',
    loading: 'Indlæser…',
    allQueues: '← Alle køer',
  },

  categories: {
    'food-and-drink': 'Mad og drikke',
    'health-and-medical': 'Sundhed',
    'government-and-finance': 'Det offentlige og bank',
    'shopping-and-services': 'Indkøb og service',
    'travel-and-leisure': 'Rejser og fritid',
    other: 'Andet',
  },

  status: {
    badge: {
      drainMode: 'Lukker snart',
      paused: 'På pause',
      unavailable: 'Midlertidigt utilgængelig',
      closed: 'Lukket',
    },
    note: {
      drainMode: 'Lukker snart — tager ikke imod nye.',
      paused: 'På pause et øjeblik. Der bliver ikke kaldt lige nu.',
      unavailable:
        'Butikken er offline, så tallene kan være forældede, og ingen nye kan tilslutte sig.',
      closed: 'Lukket.',
    },
    closedToJoiners: {
      paused: 'Det er ikke muligt at tilslutte sig lige nu.',
      unavailable: 'Tager ikke imod nye lige nu.',
      closed: 'Denne kø er lukket.',
      default: 'Tager ikke imod nye.',
    },
  },

  format: {
    noWait: 'Ingen ventetid',
    lessThanMinute: 'Under et minut',
    aboutMinutes: 'Cirka {minutes} min',
    aboutHours: 'Cirka {hours} t',
    aboutHoursMinutes: 'Cirka {hours} t {minutes} min',
    lessThanMinuteCompact: '< 1 min',
    minutesCompact: '{minutes} min',
    hoursCompact: '{hours} t',
    hoursMinutesCompact: '{hours} t {minutes} min',
  },

  splash: {
    lede: 'Se ventetiden, inden du tager af sted. Tilslut dig en kø hvor som helst — ingen login nødvendig.',
    join: 'Tilslut dig en kø',
    createLink: 'eller opret en til din forretning →',
  },

  discovery: {
    eyebrow: '[ KUNDETILSTAND ]',
    nearby: '{count} i nærheden',
    noCount: '—',
    titleLight: 'Find en kø.',
    titleRest: 'Spring ventetiden over.',
    lede: 'Se hvor lang køen er, inden du tager af sted. Tilslut dig hvor som helst — ingen login, ingen ventetid.',
    searchAndFilter: 'Søg og filtrer',
    clearFilters: { one: 'Ryd {count} filter', other: 'Ryd {count} filtre' },
    locationDenied: 'Placering er slået fra, så afstande er skjult.',
    tryAgain: 'Prøv igen',
    locationUnavailable: 'Denne enhed kan ikke dele en placering, så afstande er skjult.',
    finding: 'Finder køer i nærheden af dig…',
    updating: 'Opdaterer…',
    noQueuesAnywhere: 'Ingen køer endnu.',
    noQueuesMatch: 'Ingen køer matcher disse filtre.',
    showingClosest: 'Viser de {n} nærmeste.',
    showAll: 'Vis alle {n}',
    showingAll: 'Viser alle {n}.',
    showFewer: 'Vis de {n} nærmeste',
  },

  filters: {
    searchLabel: 'Søg',
    searchPlaceholder: 'Søg efter navn, adresse eller service',
    within: 'Inden for',
    anyDistance: 'Enhver afstand',
    category: 'Kategori',
    all: 'Alle',
    status: 'Status',
    statusOpen: 'Åben nu',
    statusClosed: 'Lukket',
    statusAny: 'Alle',
  },

  queueCard: {
    waiting: '{count} venter',
  },

  shopQueues: {
    shopGone: 'Denne butik findes ikke længere.',
    queuesHere: { one: '{count} kø her', other: '{count} køer her' },
  },

  queueDetail: {
    notFound: 'Denne kø findes ikke længere.',
    peopleWaiting: { one: '{count} person venter', other: '{count} personer venter' },
    estimatedWait: 'anslået ventetid',
    address: 'Adresse',
    category: 'Kategori',
    alsoAtShop: 'Også hos denne butik',
    otherQueues: { one: '{count} anden kø', other: '{count} andre køer' },
    join: 'Tilslut dig denne kø',
    notTakingJoiners: 'Tager ikke imod nye',
    joinHint: 'Ingen konto nødvendig — bare et navn at blive kaldt ved.',
  },

  joinQueue: {
    nameLabel: 'Hvad skal vi kalde dig?',
    nameHint: 'Personalet kalder dette navn op, så et fornavn er rigeligt.',
    emailLabel: 'E-mail (valgfrit)',
    emailHint: 'Så vi kan nå dig, hvis notifikationer ikke virker på din telefon.',
    joining: 'Tilslutter…',
    join: 'Tilslut dig køen',
  },

  resumeForm: {
    prompt: 'Allerede i denne kø? Indtast din kode',
    codeLabel: 'Din kode',
    hint: 'Mistet den? Spørg butikken — de kan finde dig ved navn og udstede en ny.',
    submit: 'Få min plads tilbage',
  },

  resumeCodePrompt: {
    ariaLabel: 'Din genoptagelseskode',
    title: 'Du er med i køen',
    body: 'Gem denne kode. Den giver dig din plads tilbage, hvis du mister din telefon eller skifter til en anden.',
    hint: 'Uden den skal du bede butikken om at finde dig ved navn.',
    dismiss: 'Forstået',
  },

  ticketView: {
    loading: 'Indlæser din plads…',
    notFound: 'Vi kan ikke længere finde den billet.',
    backToQueue: 'Tilbage til køen',
    yourTurn: 'Det er din tur',
    goTo: 'Gå til {station}',
    missedThreeTimes: 'Du gik glip af din tur tre gange, så din plads er væk.',
    removedByShop: 'Butikken tog dig ud af køen.',
    leftQueue: 'Du forlod denne kø.',
    alreadyServed: 'Du er blevet betjent.',
    youAre: 'Du er',
    next: 'næste',
    calledAnyMoment: 'Du bliver kaldt op når som helst',
    peopleAhead: { one: '{count} person foran dig', other: '{count} personer foran dig' },
    estimatedWait: 'anslået ventetid',
    calledAs: 'kaldes som',
    offlineNotice: 'Butikken er offline, så dette kan være forældet. Din plads er sikker.',
    missedCalls: 'Du har misset {count} af 3 opkald. Efter tre mister du din plads.',
    leaveQueue: 'Forlad køen',
  },

  enableNotifications: {
    off: 'Notifikationer er slået fra for dette websted. Din plads er på denne skærm alligevel, og vi sender dig en e-mail, hvis du gav os en adresse.',
    needsInstallTitle: 'Vil du have et praj, når din tur nærmer sig?',
    needsInstallBefore: 'På iPhone kræver det, at Qjume er på din hjemmeskærm først. Tryk på ',
    share: 'Del',
    needsInstallMiddle: ', derefter ',
    addToHomeScreen: 'Føj til hjemmeskærm',
    needsInstallAfter: ', og åbn den derfra.',
    needsInstallHint: 'Spring det over, hvis du vil — denne side virker stadig, og vi sender dig en e-mail, hvis du gav os en adresse.',
    turnOnQuestion: 'Giv mig besked, når min tur nærmer sig',
    turningOn: 'Slår til…',
  },

  monitor: {
    helpTitle: 'Skærm i butikken',
    helpBefore: 'Åbn denne med en kø, for eksempel ',
    helpAfter: '. Knappen "Vis QR" på betjeningsskærmen har id’erne.',
    notFound: 'Køen blev ikke fundet.',
    nowServing: 'Betjener nu',
    nobodyServed: 'Der bliver ikke betjent nogen lige nu.',
    comingUp: 'På vej',
    nobodyWaiting: 'Ingen venter.',
    scanToJoin: 'Scan for at tilslutte dig',
    scanHint: 'Ret kameraet mod koden. Du beholder din plads på din egen telefon, og vi fortæller dig, når du er tæt på.',
  },
};
