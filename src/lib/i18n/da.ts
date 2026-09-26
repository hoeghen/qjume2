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

  shopQueueStatus: {
    open: 'Åben',
    drainMode: 'Lukker — kun personligt fremmøde',
    paused: 'På pause',
    unavailable: 'Offline',
    closed: 'Lukket',
  },

  shop: {
    signIn: {
      title: 'Driv en kø',
      subtitle: 'Opret en kø. Ingen erhvervsverifikation nødvendig.',
      checkEmailBefore: 'Tjek ',
      checkEmailAfter: ' for et login-link.',
      emailLabel: 'E-mail',
      emailButton: 'Send mig et link',
      or: 'eller',
      continueGoogle: 'Fortsæt med Google',
      continueApple: 'Fortsæt med Apple',
      agreeBefore: 'Ved at fortsætte accepterer du vores ',
      terms: 'vilkår',
      and: ' og ',
      privacy: 'privatlivspolitik',
      period: '.',
    },

    createShop: {
      title: 'Opret din butik',
      subtitle: '"Butik" betyder enhver organisation, der driver en kø — en klinik, en kommunal instans, et værksted.',
      nameLabel: 'Navn',
      exclusiveLabel: 'Mine køer er alternativer til hinanden — en kunde bør kun tilslutte sig én',
      submit: 'Opret butik',
    },

    queueList: {
      plan: 'Abonnement',
      signOut: 'Log ud',
      noQueues: 'Ingen køer endnu.',
      waitingAddress: '{count} venter · {address}',
      serve: 'Betjen',
      settings: 'Indstillinger',
      monitor: 'Skærm',
      newQueue: 'Ny kø',
    },

    queueForm: {
      titleNew: 'Ny kø',
      titleSettings: 'Køindstillinger',
      nameLabel: 'Kø-navn',
      addressLabel: 'Adresse',
      addressHint: 'En fast adresse, ikke din enheds placering — det er den, kunder ser og søger efter.',
      categoryLabel: 'Kategori',
      maxSizeLabel: 'Maksimal størrelse på køen',
      avgServiceLabel: 'Gennemsnitlig tid per kunde (minutter)',
      avgServiceHint: 'Et startestimat. Qjume forfiner det ud fra, hvor lang tid du faktisk bruger.',
      noShowLabel: 'Hvis nogen ikke er der',
      noShowHint: 'Efter tre udeblivelser mister de deres plads helt.',
      descriptionLabel: 'Beskrivelse (valgfrit)',
      descriptionPaidHint: 'Beskrivelser er en del af det betalte abonnement.',
      seePlans: 'Se abonnementer',
      save: 'Gem',
      create: 'Opret kø',
      penalty: {
        back: 'Flyt bagerst i køen',
        back3: 'Flyt 3 pladser tilbage',
        back5: 'Flyt 5 pladser tilbage',
      },
      noticePlacedAt: 'Placeret ved {address}.',
      noticePlacementFailed: 'Kunne ikke placere denne adresse på kortet — den vises ikke i nærhedssøgning, før adressen er rettet.',
      noticeSaved: 'Gemt. {detail}',
      noticeCreated: 'Kø oprettet. {detail}',
    },

    serving: {
      queueNotFound: 'Køen blev ikke fundet.',
      noConnectionTitle: 'Ingen forbindelse',
      noConnectionBefore: 'Bliv ved med at betjene — ',
      pendingTaps: { one: '{count} tryk er', other: '{count} tryk er' },
      noConnectionAfter: ' gemt og synkroniseres, når du er tilbage. Ingen nye kan tilslutte sig i mellemtiden.',
      catchingUpTitle: 'Indhenter',
      catchingUpBody: 'Sender {count} gemt fra dengang du var offline.',
      allQueues: 'Alle køer',
      servingLabel: 'Betjener',
      waitingCount: '{count} venter',
      nowServing: 'Betjener nu',
      readyForNext: 'Klar til næste kunde',
      nobodyWaiting: 'Ingen venter',
      doneNext: 'Færdig — næste',
      callNext: 'Kald næste',
      notHere: 'Ikke til stede',
      alsoServing: 'Betjener også',
      waitingHeading: 'Venter',
      resume: 'Genoptag',
      pause: 'Pause',
      addWalkIn: 'Tilføj fremmødt',
      openQueue: 'Åbn kø',
      close: 'Luk',
      showQr: 'Vis QR',
      changePosition: 'Skift position',
    },

    stationPicker: {
      title: 'Hvilken position betjener du fra?',
      openAnother: 'Åbn en anden position',
    },

    walkIn: {
      dialogLabel: 'Tilføj fremmødt',
      ticketNumber: 'Billet {number}',
      giveBefore: 'Giv ',
      giveAfter: ' dette nummer, og bed dem holde øje med skærmen.',
      hintBefore: 'Har de alligevel en telefon, kan denne kode gøre krav på billetten: ',
      done: 'Færdig',
      nameLabel: 'Navn de skal kaldes ved',
      addToQueue: 'Tilføj til kø',
    },

    pauseBanner: {
      paused: { label: 'På pause', detail: 'Der bliver ikke kaldt. Kunder kan stadig se deres plads.' },
      drainMode: {
        label: 'Lukker',
        detail: 'Ingen nye kan tilslutte sig online. Du kan stadig tilføje fremmødte ved disken.',
      },
      unavailable: {
        label: 'Offline',
        detail: 'Denne enhed mistede forbindelsen. Bliv ved med at betjene — det synkroniseres, når du er tilbage.',
      },
      closed: { label: 'Lukket', detail: 'Åbn køen for at begynde at tage imod nye.' },
    },

    closeDialog: {
      ariaLabel: 'Luk køen',
      title: 'Luk køen',
      nobodyWaiting: 'Ingen venter.',
      someWaiting: { one: '{count} person venter stadig.', other: '{count} personer venter stadig.' },
      drainAction: 'Stop online tilslutning, færdiggør betjening',
      hardAction: 'Luk nu og ryd køen',
    },

    upcomingList: {
      nobodyWaiting: 'Ingen venter.',
      noShowTitle: 'Udeblivelser hidtil',
      noShowCount: '{count} af 3',
      relink: 'Ny kode',
      remove: 'Fjern',
      newCodeTitle: 'Ny kode til {name}',
      newCodeBody: 'Læs denne op. Den erstatter enhver kode, de havde, og giver dem deres plads tilbage på en ny telefon.',
      done: 'Færdig',
    },

    qrDialog: {
      ariaLabel: 'QR-kode til tilslutning',
      title: 'Scan for at tilslutte dig',
      hint: 'Print denne til disken. At scanne den tilslutter denne kø i samme rækkefølge som alle andre.',
      done: 'Færdig',
    },

    billing: {
      title: 'Abonnement',
      onPlanBefore: 'Du er på ',
      onPlanAfter: '.',
      planPaid: 'det betalte abonnement',
      planFree: 'det gratis abonnement',
      shopNotFound: 'Butikken blev ikke fundet.',
      freeSummary: 'Det gratis abonnement dækker én kø, én person der betjener, og omkring {n} personer, der venter ad gangen.',
      paidFeaturesTitle: 'Det betalte abonnement tilføjer',
      features: {
        moreQueues: 'Mere end én kø',
        severalTills: 'Flere diske, der betjener samtidig',
        staffLimited: 'Personale, der kan betjene, men ikke ændre indstillinger',
        analytics: 'Analyser — ventetider, travleste tidspunkter, betjente kunder',
        branding: 'En butiksprofil og dit eget brand',
        descriptions: 'Købeskrivelser og en besked ved tilslutning',
        sms: 'Sms-beskeder såvel som e-mail',
      },
      upgrade: 'Opgrader',
      subscriptionHintBefore: 'Et tilbagevendende abonnement, faktureret indtil du opsiger det. Se vores ',
      terms: 'vilkår',
      subscriptionHintAfter: ' for fakturering og opsigelse.',
      staffTitle: 'Personale',
      staffHint: 'Personale kan betjene en kø. De kan ikke ændre indstillinger eller se denne side.',
      remove: 'Fjern',
      addStaffLabel: 'Tilføj nogen via e-mail',
      addStaffHint: 'De skal have logget ind på Qjume mindst én gang.',
      add: 'Tilføj',
      leavingTitle: 'Forlad det betalte abonnement',
      moveToFree: 'Skift til det gratis abonnement',
    },
  },

  admin: {
    deleteShop: {
      ariaLabel: 'Slet butik',
      title: 'Slet {name}',
      body: 'Fjerner denne butik permanent, alle dens køer, og alle der venter i dem. Der er ingen fortrydelse.',
      confirmLabel: 'Skriv butikkens navn for at bekræfte',
      deletePermanently: 'Slet permanent',
    },

    planLabel: {
      free: 'Gratis',
      paid: 'Betalt',
    },

    gate: {
      title: 'Platformsadministrator',
      mockNotice: 'Dette er mock-udgavens erstatning for platformsadministrator-krav — intet her er en rigtig legitimation.',
      continueAsAdmin: 'Fortsæt som platformsadministrator',
      noAccess: 'Denne konto har ikke platformsadministrator-adgang.',
      signInPrompt: 'Log ind med platformsadministrator-kontoen for at fortsætte.',
    },

    shopList: {
      title: 'Butikker',
      auditLog: 'Aktivitetslog',
      signOut: 'Log ud',
      searchAndFilter: 'Søg og filtrer',
      clearFilters: { one: 'Ryd {count} filter', other: 'Ryd {count} filtre' },
      noMatch: 'Ingen butik matcher disse filtre.',
      noShops: 'Ingen butikker endnu.',
      suspended: 'Suspenderet',
      owner: 'Ejer: {uid}',
      manage: 'Administrer',
    },

    filters: {
      searchLabel: 'Søg butikker efter navn',
      searchPlaceholder: 'Søg efter navn',
      plan: 'Abonnement',
      all: 'Alle',
      free: 'Gratis',
      paid: 'Betalt',
      status: 'Status',
      active: 'Aktiv',
      suspended: 'Suspenderet',
    },

    shopDetail: {
      allShops: '← Alle butikker',
      owner: 'Ejer: {uid}',
      reinstate: 'Genindsæt butik',
      suspend: 'Suspender butik',
      delete: 'Slet butik',
      suspendedHint: 'Hver kø nedenfor er skjult fra søgning og afviser nye deltagere, uanset hvad dens egen status siger. Personale kan stadig betjene alle, der allerede venter.',
      editShop: 'Rediger butik',
      nameLabel: 'Navn',
      exclusiveLabel: 'Én billet per kunde på tværs af alle denne butiks køer',
      hoursLabel: 'Åbningstider (valgfrit)',
      phoneLabel: 'Telefon (valgfrit)',
      logoLabel: 'Logo-URL (valgfrit)',
      descriptionLabel: 'Beskrivelse (valgfrit)',
      shopSaved: 'Butik gemt.',
      queuesHeading: { one: '{count} kø', other: '{count} køer' },
      waitingAddress: '{count} venter · {address}',
      edit: 'Rediger',
      monitor: 'Skærm',
    },

    auditLog: {
      title: 'Administratoraktivitet',
      nothingLogged: 'Intet logget endnu.',
      changed: 'Ændret: {fields}',
      shop: 'Butik',
    },

    buildInfo: {
      aliveFor: ' · aktiv i {duration}',
    },
  },

  legal: {
    terms: {
      title: 'Vilkår for brug',
      lastUpdated: 'Sidst opdateret: [lanceringsdato]',
      intro: 'Disse vilkår regulerer brugen af Qjume ("Tjenesten"), som drives af Bitwork.dk ("Bitwork.dk", "vi", "os"). Ved at oprette en kø, tilslutte dig en, eller på anden måde bruge Tjenesten, accepterer du disse vilkår. Hvis du accepterer dem på vegne af en virksomhed, bekræfter du, at du har bemyndigelse til det.',

      s1Heading: '1. Hvad Tjenesten er',
      s1Body: 'Qjume lader en virksomhed ("Butik") drive en eller flere ventelinjer ("Køer"), som kunder kan se og tilslutte sig eksternt, og lader en kunde tilslutte sig en kø, følge sin plads i den, og få besked, når deres tur nærmer sig. En Butik drives af sin ejer og, på betalte abonnementer, af personale ejeren tilføjer. En kunde behøver ingen konto for at tilslutte sig en kø.',

      s2Heading: '2. Konti',
      s2Body1: 'En Butiks ejer logger ind med en e-mailadresse og er ansvarlig for alt, der sker under vedkommendes konto, herunder personale, de tilføjer. En kundes session er anonym, medmindre kunden vælger at give en e-mailadresse eller et telefonnummer for at få opdateringer om sin plads i en kø.',
      s2Body2Before: 'Du skal give korrekte oplysninger og er ansvarlig for at holde din login-adgang for dig selv. Fortæl os det på ',
      s2Body2After: ', hvis du mener, at din konto er blevet tilgået uden din tilladelse.',

      s3Heading: '3. Abonnementer, gebyrer og fakturering',
      s3Body1Before: 'Qjume tilbyder et gratis abonnement og et betalt abonnement med yderligere funktioner, vist i appen. Det betalte abonnement faktureres som et ',
      s3Body1Strong: 'tilbagevendende abonnement',
      s3Body1After: ' til den pris og det interval, der vises ved betaling, og opkræves automatisk, indtil det opsiges. Betaling behandles af Stripe; Bitwork.dk modtager eller opbevarer aldrig dine kortoplysninger.',
      s3Body2: 'Du kan opsige når som helst fra dine faktureringsindstillinger. Opsigelse stopper fremtidige fornyelser; det refunderer ikke den periode, der allerede er betalt for, og adgang til betalte funktioner fortsætter, indtil den periode udløber. Bortset fra hvor loven giver dig ret til det, refunderes allerede foretagne betalinger ikke. Vi kan ændre abonnementspriser med rimeligt varsel; fortsat brug af det betalte abonnement, efter en prisændring træder i kraft, betyder, at du accepterer den.',

      s4Heading: '4. Acceptabel brug',
      s4Intro: 'Du accepterer ikke at:',
      s4Item1: 'Bruge Tjenesten til noget ulovligt, svigagtigt eller vildledende;',
      s4Item2: 'Oprette en kø for en virksomhed, du ikke er bemyndiget til at repræsentere;',
      s4Item3: 'Forstyrre Tjenestens drift eller forsøge at omgå dens sikkerhed, herunder dens regler for kørækkefølge og udeblivelser;',
      s4Item4: 'Bruge en anden persons navn eller kontaktoplysninger til at tilslutte dig en kø uden vedkommendes viden;',
      s4Item5: 'Scrape, videresælge eller opbygge en konkurrerende tjeneste ud fra data indhentet gennem Tjenesten.',
      s4Body: 'En Butik, der findes at gøre noget af ovenstående, kan blive suspenderet eller fjernet fra søgning, og i alvorlige tilfælde fjernet fra Tjenesten helt, efter vores skøn.',

      s5Heading: '5. Indhold, du angiver',
      s5BodyBefore: 'Du er ansvarlig for det, du indtaster — en Butiks navn, adresse, beskrivelse og kødetaljer; en kundes visningsnavn. Du bevarer ejerskabet af det; ved at angive det giver du os lov til at gemme og vise det, som nødvendigt for at drive Tjenesten (en køs detaljer til kunder, der opdager den; en kundes valgte navn til den Butik, der betjener dem, og til en skærm i den Butik, jf. vores ',
      s5PrivacyLink: 'privatlivspolitik',
      s5BodyAfter: ').',

      s6Heading: '6. Tilgængelighed',
      s6Body: 'Vi bestræber os på at holde Tjenesten kørende, men garanterer ikke, at den vil være uafbrudt eller fejlfri. Hvis en Butiks forbindelse afbrydes, markeres dens kø som utilgængelig for nye deltagere, indtil den genopretter forbindelsen, og fortsætter betjeningen, hvor den slap — vi er ikke ansvarlige for, at en Butiks eget netværk eller enhed svigter.',

      s7Heading: '7. Ansvarsfraskrivelser og ansvar',
      s7Body: 'Tjenesten leveres "som den er", uden garantier af nogen art ud over dem, loven ikke tillader os at udelukke. I det videst mulige omfang, loven tillader, er Bitwork.dk ikke ansvarlig for indirekte tab eller følgeskader som følge af brug af Tjenesten, herunder tabt forretning eller tabte kunder som følge af, at en kø er utilgængelig. Intet i disse vilkår begrænser ansvar for død, personskade eller svig, hvor loven ikke tillader, at det begrænses.',

      s8Heading: '8. Suspension og ophør',
      s8Body: 'Vi kan suspendere eller lukke en Butiks konto ved brud på disse vilkår, manglende betaling, eller hvor loven kræver det. Du kan til enhver tid stoppe med at bruge Tjenesten eller lukke din Butik. Afsnit, der efter deres natur bør overleve afslutningen af din brug af Tjenesten — herunder allerede forfalden fakturering og ansvarsbegrænsningen — fortsætter med at gælde.',

      s9Heading: '9. Ændringer af disse vilkår',
      s9Body: 'Vi kan opdatere disse vilkår, efterhånden som Tjenesten ændrer sig. Vi vil offentliggøre de opdaterede vilkår her med en ny dato; fortsat brug af Tjenesten derefter betyder, at du accepterer dem. Hvis en ændring er væsentlig, vil vi gøre en rimelig indsats for at fortælle Butiksejere direkte.',

      s10Heading: '10. Lovvalg',
      s10BodyBefore: 'Disse vilkår er underlagt dansk ret. Enhver tvist, der ikke kan løses direkte, er underlagt de danske domstoles jurisdiktion. Hvis du er EU-forbruger, kan du også have mulighed for at bruge EU-Kommissionens ',
      s10Link: 'onlineklageportal',
      s10BodyAfter: '.',

      s11Heading: '11. Kontakt',
      s11BodyBefore: 'Bitwork.dk — ',
      s11BodyAfter: '.',
    },

    privacy: {
      title: 'Privatlivspolitik',
      lastUpdated: 'Sidst opdateret: [lanceringsdato]',
      introBefore: 'Bitwork.dk ("vi", "os") er dataansvarlig for personoplysninger indsamlet gennem Qjume. Denne politik forklarer, hvad vi indsamler, hvorfor, og hvad du kan gøre ved det. Spørgsmål eller anmodninger: ',
      introAfter: '.',

      s1Heading: '1. Hvad vi indsamler',
      s1Para1Strong: 'At tilslutte sig en kø som kunde',
      s1Para1Rest: ' kræver ingen konto. Vi gemmer det visningsnavn, du vælger at blive kaldt ved — det behøver ikke at være dit rigtige navn — og, kun hvis du angiver dem, en e-mailadresse eller et telefonnummer, så vi kan fortælle dig, når din tur nærmer sig. Din enhed får også et anonymt, tilfældigt id, der kun bruges til at forhindre dig i at tilslutte dig den samme kø to gange og til at lade dig genoptage din plads, hvis du skifter enhed med en genoptagelseskode.',
      s1Para2Strong: 'At drive en Butik',
      s1Para2Rest: ' kræver en e-mailadresse at logge ind med. Vi gemmer Butikkens egne oplysninger, du indtaster — navn, adresse, de køer, den driver — og, på det betalte abonnement, faktureringsstatus fra vores betalingsudbyder (aldrig dit kortnummer, som vi aldrig modtager).',
      s1Para3Strong: 'Placering.',
      s1Para3Rest: ' Hvis du tillader det, bruges din browsers placering til at sortere søgeresultater efter afstand og gemmes kun på din egen enhed (i lokal browserlagring) for at fremskynde dit næste besøg — vi gemmer den ikke på vores servere eller knytter den til din konto.',
      s1Para4Strong: 'Vi indsamler ikke',
      s1Para4Rest: ' mere end ovenstående: ingen sporing af din aktivitet uden for appen, ingen reklame-id’er, intet salg af personoplysninger til nogen.',

      s2Heading: '2. Hvorfor vi bruger det, og på hvilket grundlag',
      s2Item1: 'At drive den kø, du tilsluttede dig, og fortælle dig, når det er din tur — nødvendigt for at levere den tjeneste, du bad om.',
      s2Item2: 'At lade en Butiks personale kalde en ventende kunde ved navn, og lade en kunde tælle sin egen plads — samme nødvendighed, og det er grunden til, at en kundes valgte navn (ikke deres kontaktoplysninger) er synligt for Butikkens personale og for skærmen i butikken.',
      s2Item3: 'At fakturere en Butiks betalte abonnement — nødvendigt for at opfylde den kontrakt.',
      s2Item4: 'At overholde vores egne juridiske forpligtelser, såsom at føre optegnelser, som skattelovgivningen kræver.',

      s3Heading: '3. Hvem ellers ser det',
      s3Intro: 'Vi bruger et lille antal databehandlere til at drive Tjenesten, hver bundet af sine egne databehandlingsvilkår:',
      s3Item1Strong: 'Google (Firebase / Google Cloud)',
      s3Item1Rest: ' — hoster databasen, appen, og sender push-notifikationer og login-e-mails.',
      s3Item2Strong: 'Stripe',
      s3Item2Rest: ' — behandler betalinger for det betalte abonnement. Stripe modtager og gemmer dine betalingsoplysninger direkte; det gør vi ikke.',
      s3Item3Strong: 'Resend',
      s3Item3Rest: ' — sender de e-mailnotifikationer, du bad om (en statusopdatering, en kvittering).',
      s3Item4Strong: 'OpenCage',
      s3Item4Rest: ' — omdanner en Butiks adresse til kortkoordinater, når den oprettes eller redigeres. Kun adresseteksten sendes; ingen kundedata.',
      s3Body1: 'Nogle af disse behandler data uden for Det Europæiske Økonomiske Samarbejdsområde. Hvor det sker, er det under en mekanisme, loven anerkender for den overførsel, såsom EU’s standardkontraktbestemmelser.',
      s3Body2: 'En Butiks personale kan se de offentlige detaljer for billetter i deres egen kø — en kundes valgte visningsnavn og plads i køen, aldrig en anden Butiks data og aldrig en kundes e-mail eller telefon, medmindre kunden kontakter dem direkte.',

      s4Heading: '4. Hvor længe vi opbevarer det',
      s4Body: 'En billets offentlige detaljer opbevares, så længe det er nødvendigt for at drive køen og i en begrænset periode derefter til Butikkens eget register over, hvem den betjente, og slettes derefter. Kontaktoplysninger (e-mail, telefon) opbevares kun, så længe den billet, der brugte dem, eksisterer. En Butiks egen konto og dens køer opbevares, indtil Butikken lukkes eller slettes, af dens ejer eller, hvor disse vilkår tillader det, af os.',

      s5Heading: '5. Dine rettigheder',
      s5BodyBefore: 'Hvis du er i EU/EØS, giver GDPR dig ret til at få adgang til, rette, slette eller eksportere de personoplysninger, vi opbevarer om dig, og til at gøre indsigelse mod eller begrænse nogle anvendelser af dem. For at udøve nogen af disse, send en e-mail til ',
      s5BodyMiddle: '. Du kan også klage til din nationale databeskyttelsesmyndighed — i Danmark, ',
      s5DatatilsynetLink: 'Datatilsynet',
      s5BodyAfter: '.',

      s6Heading: '6. Sikkerhed',
      s6Body: 'Adgang til en billets kontaktoplysninger er begrænset til den Butik, der betjener den, og den kunde, der har den; en genoptagelseskode, ikke et almindeligt id, er det, der beviser den besiddelse. Al trafik til Tjenesten er krypteret under overførsel. Intet system er fuldstændig sikkert, og vi kan ikke garantere absolut sikkerhed for de oplysninger, du angiver.',

      s7Heading: '7. Børn',
      s7Body: 'Tjenesten er ikke rettet mod børn, og vi indsamler ikke bevidst personoplysninger fra et barn under den alder, dansk/EU-lovgivning fastsætter for samtykke til en informationssamfundstjeneste uden en forælders godkendelse.',

      s8Heading: '8. Ændringer af denne politik',
      s8Body: 'Vi kan opdatere denne politik, efterhånden som Tjenesten ændrer sig. Vi vil offentliggøre den opdaterede version her med en ny dato.',
    },
  },
};
