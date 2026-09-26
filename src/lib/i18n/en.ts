/**
 * English strings - the source of truth. `da.ts` mirrors this shape but is
 * typed as a deep partial: a missing Danish key falls back to the English
 * value here rather than the app crashing or showing a raw key. See
 * LanguageContext.tsx.
 */
export const en = {
  common: {
    cancel: 'Cancel',
    save: 'Save',
    loading: 'Loading…',
    allQueues: '← All queues',
  },

  /** One copy, shared by every screen that names a category. See CLAUDE.md decision 7. */
  categories: {
    'food-and-drink': 'Food and drink',
    'health-and-medical': 'Health and medical',
    'government-and-finance': 'Government and finance',
    'shopping-and-services': 'Shopping and services',
    'travel-and-leisure': 'Travel and leisure',
    other: 'Other',
  },

  /** Shared across every screen that shows a queue's status. */
  status: {
    badge: {
      drainMode: 'Closing soon',
      paused: 'Paused',
      unavailable: 'Temporarily unavailable',
      closed: 'Closed',
    },
    note: {
      drainMode: 'Closing soon — not taking anyone new.',
      paused: 'Paused for a moment. Nobody is being called right now.',
      unavailable:
        'This shop is offline, so these numbers may be out of date and nobody new can join.',
      closed: 'Closed.',
    },
    closedToJoiners: {
      paused: 'Joining is paused right now.',
      unavailable: 'Not taking new joiners at the moment.',
      closed: 'This queue is closed.',
      default: 'Not taking new joiners.',
    },
  },

  format: {
    noWait: 'No wait',
    lessThanMinute: 'Less than a minute',
    aboutMinutes: 'About {minutes} min',
    aboutHours: 'About {hours} hr',
    aboutHoursMinutes: 'About {hours} hr {minutes} min',
    lessThanMinuteCompact: '< 1 min',
    minutesCompact: '{minutes} min',
    hoursCompact: '{hours} hr',
    hoursMinutesCompact: '{hours} hr {minutes} min',
  },

  splash: {
    lede: 'See the wait before you go. Join any queue from anywhere — no login required.',
    join: 'Join a queue',
    createLink: 'or create one for your business →',
  },

  discovery: {
    eyebrow: '[ CUSTOMER MODE ]',
    nearby: '{count} nearby',
    noCount: '—',
    titleLight: 'Find a queue.',
    titleRest: 'Skip the wait.',
    lede: 'See how long the line is before you go. Join from anywhere — no login, no standing around.',
    searchAndFilter: 'Search and filter',
    clearFilters: { one: 'Clear {count} filter', other: 'Clear {count} filters' },
    locationDenied: 'Location is off, so distances are hidden.',
    tryAgain: 'Try again',
    locationUnavailable: 'This device cannot share a location, so distances are hidden.',
    finding: 'Finding queues near you…',
    updating: 'Updating…',
    noQueuesAnywhere: 'No queues anywhere yet.',
    noQueuesMatch: 'No queues match these filters.',
    showingClosest: 'Showing the {n} closest.',
    showAll: 'Show all {n}',
    showingAll: 'Showing all {n}.',
    showFewer: 'Show the {n} closest',
  },

  filters: {
    searchLabel: 'Search',
    searchPlaceholder: 'Search by name, address or service',
    within: 'Within',
    anyDistance: 'Any distance',
    category: 'Category',
    all: 'All',
    status: 'Status',
    statusOpen: 'Open now',
    statusClosed: 'Closed',
    statusAny: 'Any',
  },

  queueCard: {
    waiting: '{count} waiting',
  },

  shopQueues: {
    shopGone: 'This shop no longer exists.',
    queuesHere: { one: '{count} queue here', other: '{count} queues here' },
  },

  queueDetail: {
    notFound: 'This queue no longer exists.',
    peopleWaiting: { one: '{count} person waiting', other: '{count} people waiting' },
    estimatedWait: 'estimated wait',
    address: 'Address',
    category: 'Category',
    alsoAtShop: 'Also at this shop',
    otherQueues: { one: '{count} other queue', other: '{count} other queues' },
    join: 'Join this queue',
    notTakingJoiners: 'Not taking joiners',
    joinHint: 'No account needed — just a name to be called by.',
  },

  joinQueue: {
    nameLabel: 'What should we call you?',
    nameHint: 'Staff will call this out, so a first name is plenty.',
    emailLabel: 'Email (optional)',
    emailHint: 'So we can reach you if notifications do not work on your phone.',
    joining: 'Joining…',
    join: 'Join the queue',
  },

  resumeForm: {
    prompt: 'Already in this queue? Enter your code',
    codeLabel: 'Your code',
    hint: 'Lost it? Ask the shop — they can find you by name and issue a new one.',
    submit: 'Get my place back',
  },

  resumeCodePrompt: {
    ariaLabel: 'Your resume code',
    title: 'You’re in the queue',
    body: 'Keep this code. It gets your place back if you lose your phone or switch to another one.',
    hint: 'Without it, you would have to ask the shop to find you by name.',
    dismiss: 'Got it',
  },

  ticketView: {
    loading: 'Loading your place…',
    notFound: 'We can no longer find that ticket.',
    backToQueue: 'Back to the queue',
    yourTurn: 'It’s your turn',
    goTo: 'Go to {station}',
    missedThreeTimes: 'You missed your turn three times, so your place has gone.',
    removedByShop: 'The shop took you out of the queue.',
    leftQueue: 'You left this queue.',
    alreadyServed: 'You have been served.',
    youAre: 'You are',
    next: 'next',
    calledAnyMoment: 'You should be called any moment',
    peopleAhead: { one: '{count} person ahead of you', other: '{count} people ahead of you' },
    estimatedWait: 'estimated wait',
    calledAs: 'called as',
    offlineNotice: 'The shop is offline, so this may be out of date. Your place is safe.',
    missedCalls: 'You have missed {count} of 3 calls. After three, you lose your place.',
    leaveQueue: 'Leave the queue',
  },

  enableNotifications: {
    off: 'Notifications are switched off for this site. Your place is on this screen either way, and we’ll email you if you gave us an address.',
    needsInstallTitle: 'Want a nudge when your turn is close?',
    needsInstallBefore: 'On iPhone that needs Qjume on your Home Screen first. Tap ',
    share: 'Share',
    needsInstallMiddle: ', then ',
    addToHomeScreen: 'Add to Home Screen',
    needsInstallAfter: ', and open it from there.',
    needsInstallHint: 'Skip it if you like — this page keeps working, and we’ll email you if you gave us an address.',
    turnOnQuestion: 'Notify me when my turn is close',
    turningOn: 'Turning on…',
  },

  monitor: {
    helpTitle: 'In-shop monitor',
    helpBefore: 'Open this with a queue, for example ',
    helpAfter: '. The Show QR button on the serving screen has the ids.',
    notFound: 'Queue not found.',
    nowServing: 'Now serving',
    nobodyServed: 'Nobody is being served right now.',
    comingUp: 'Coming up',
    nobodyWaiting: 'Nobody waiting.',
    scanToJoin: 'Scan to join',
    scanHint: 'Point your camera at the code. You keep your place on your own phone and we tell you when you are near the front.',
  },

  /** The full statuses a staff member sees, more detailed than a customer's badge. */
  shopQueueStatus: {
    open: 'Open',
    drainMode: 'Closing — walk-ins only',
    paused: 'Paused',
    unavailable: 'Offline',
    closed: 'Closed',
  },

  shop: {
    signIn: {
      title: 'Run a queue',
      subtitle: 'Sign up to create a queue. No business verification needed.',
      checkEmailBefore: 'Check ',
      checkEmailAfter: ' for a sign-in link.',
      emailLabel: 'Email',
      emailButton: 'Email me a link',
      or: 'or',
      continueGoogle: 'Continue with Google',
      continueApple: 'Continue with Apple',
      agreeBefore: 'By continuing you agree to our ',
      terms: 'Terms',
      and: ' and ',
      privacy: 'Privacy Policy',
      period: '.',
    },

    createShop: {
      title: 'Set up your shop',
      subtitle: '“Shop” means any organisation running a queue — a clinic, a council office, a workshop.',
      nameLabel: 'Name',
      exclusiveLabel: 'My queues are alternatives to each other — a customer should join only one',
      submit: 'Create shop',
    },

    queueList: {
      plan: 'Plan',
      signOut: 'Sign out',
      noQueues: 'No queues yet.',
      waitingAddress: '{count} waiting · {address}',
      serve: 'Serve',
      settings: 'Settings',
      monitor: 'Monitor',
      newQueue: 'New queue',
    },

    queueForm: {
      titleNew: 'New queue',
      titleSettings: 'Queue settings',
      nameLabel: 'Queue name',
      addressLabel: 'Address',
      addressHint: 'A fixed address, not your device’s location — this is what customers see and search by.',
      categoryLabel: 'Category',
      maxSizeLabel: 'Maximum queue size',
      avgServiceLabel: 'Average time per customer (minutes)',
      avgServiceHint: 'A starting estimate. Qjume refines it from how long you actually take.',
      noShowLabel: 'If someone isn’t there',
      noShowHint: 'After three no-shows they lose their place entirely.',
      descriptionLabel: 'Description (optional)',
      descriptionPaidHint: 'Descriptions are part of the paid plan.',
      seePlans: 'See plans',
      save: 'Save',
      create: 'Create queue',
      penalty: {
        back: 'Move to the back of the queue',
        back3: 'Move back 3 places',
        back5: 'Move back 5 places',
      },
      noticePlacedAt: 'Placed at {address}.',
      noticePlacementFailed: 'Couldn’t place this address on the map — it won’t show up in nearby search until the address is fixed.',
      noticeSaved: 'Saved. {detail}',
      noticeCreated: 'Queue created. {detail}',
    },

    serving: {
      queueNotFound: 'Queue not found.',
      noConnectionTitle: 'No connection',
      noConnectionBefore: 'Keep serving — ',
      pendingTaps: { one: '{count} tap is', other: '{count} taps are' },
      noConnectionAfter: ' saved and will sync when you are back. Nobody new can join meanwhile.',
      catchingUpTitle: 'Catching up',
      catchingUpBody: 'Sending {count} saved from while you were offline.',
      allQueues: 'All queues',
      servingLabel: 'Serving',
      waitingCount: '{count} waiting',
      nowServing: 'Now serving',
      readyForNext: 'Ready for the next customer',
      nobodyWaiting: 'Nobody waiting',
      doneNext: 'Done — next',
      callNext: 'Call next',
      notHere: 'Not here',
      alsoServing: 'Also serving',
      waitingHeading: 'Waiting',
      resume: 'Resume',
      pause: 'Pause',
      addWalkIn: 'Add walk-in',
      openQueue: 'Open queue',
      close: 'Close',
      showQr: 'Show QR',
      changePosition: 'Change position',
    },

    stationPicker: {
      title: 'Which position are you serving from?',
      openAnother: 'Open another position',
    },

    walkIn: {
      dialogLabel: 'Add a walk-in',
      ticketNumber: 'Ticket {number}',
      giveBefore: 'Give ',
      giveAfter: ' this number, and tell them to watch the screen.',
      hintBefore: 'If they do have a phone after all, this code claims the ticket: ',
      done: 'Done',
      nameLabel: 'Name to call them by',
      addToQueue: 'Add to queue',
    },

    pauseBanner: {
      paused: { label: 'Paused', detail: 'Nobody is being called. Customers can still see their place.' },
      drainMode: {
        label: 'Closing',
        detail: 'Nobody new can join online. You can still add walk-ins at the counter.',
      },
      unavailable: {
        label: 'Offline',
        detail: 'This device lost its connection. Keep serving — it will sync when you are back.',
      },
      closed: { label: 'Closed', detail: 'Open the queue to start taking joiners.' },
    },

    closeDialog: {
      ariaLabel: 'Close the queue',
      title: 'Close the queue',
      nobodyWaiting: 'Nobody is waiting.',
      someWaiting: { one: '{count} person is still waiting.', other: '{count} people are still waiting.' },
      drainAction: 'Stop online joiners, finish serving',
      hardAction: 'Close now and clear the queue',
    },

    upcomingList: {
      nobodyWaiting: 'Nobody waiting.',
      noShowTitle: 'No-shows so far',
      noShowCount: '{count} of 3',
      relink: 'Re-link',
      remove: 'Remove',
      newCodeTitle: 'New code for {name}',
      newCodeBody: 'Read this out. It replaces any code they had, and gets their place back on a new phone.',
      done: 'Done',
    },

    qrDialog: {
      ariaLabel: 'Join QR code',
      title: 'Scan to join',
      hint: 'Print this for the counter. Scanning it joins this queue in the same order as everyone else.',
      done: 'Done',
    },

    billing: {
      title: 'Plan',
      onPlanBefore: 'You are on the ',
      onPlanAfter: ' plan.',
      planPaid: 'paid',
      planFree: 'free',
      shopNotFound: 'Shop not found.',
      freeSummary: 'The free plan covers one queue, one person serving, and about {n} people waiting at a time.',
      paidFeaturesTitle: 'The paid plan adds',
      features: {
        moreQueues: 'More than one queue',
        severalTills: 'Several tills serving at once',
        staffLimited: 'Staff who can serve but not change settings',
        analytics: 'Analytics — wait times, busiest hours, people served',
        branding: 'A shop profile and your own branding',
        descriptions: 'Queue descriptions and a message on joining',
        sms: 'Text messages as well as email',
      },
      upgrade: 'Upgrade',
      subscriptionHintBefore: 'A recurring subscription, billed until you cancel. See our ',
      terms: 'Terms',
      subscriptionHintAfter: ' for billing and cancellation.',
      staffTitle: 'Staff',
      staffHint: 'Staff can serve a queue. They cannot change settings or see this page.',
      remove: 'Remove',
      addStaffLabel: 'Add someone by email',
      addStaffHint: 'They need to have signed in to Qjume at least once.',
      add: 'Add',
      leavingTitle: 'Leaving the paid plan',
      moveToFree: 'Move to the free plan',
    },
  },

  admin: {
    deleteShop: {
      ariaLabel: 'Delete shop',
      title: 'Delete {name}',
      body: 'Permanently removes this shop, every one of its queues, and everyone waiting in them. There is no undo.',
      confirmLabel: 'Type the shop’s name to confirm',
      deletePermanently: 'Delete permanently',
    },

    planLabel: {
      free: 'Free',
      paid: 'Paid',
    },

    gate: {
      title: 'Platform admin',
      mockNotice: 'This is the mock’s stand-in for the platform admin claim — nothing here is a real credential.',
      continueAsAdmin: 'Continue as platform admin',
      noAccess: 'This account doesn’t have platform admin access.',
      signInPrompt: 'Sign in with the platform admin account to continue.',
    },

    shopList: {
      title: 'Shops',
      auditLog: 'Audit log',
      signOut: 'Sign out',
      searchAndFilter: 'Search and filter',
      clearFilters: { one: 'Clear {count} filter', other: 'Clear {count} filters' },
      noMatch: 'No shop matches these filters.',
      noShops: 'No shops yet.',
      suspended: 'Suspended',
      owner: 'Owner: {uid}',
      manage: 'Manage',
    },

    filters: {
      searchLabel: 'Search shops by name',
      searchPlaceholder: 'Search by name',
      plan: 'Plan',
      all: 'All',
      free: 'Free',
      paid: 'Paid',
      status: 'Status',
      active: 'Active',
      suspended: 'Suspended',
    },

    shopDetail: {
      allShops: '← All shops',
      owner: 'Owner: {uid}',
      reinstate: 'Reinstate shop',
      suspend: 'Suspend shop',
      delete: 'Delete shop',
      suspendedHint: 'Every queue below is hidden from discovery and refusing new joiners, whatever its own status says. Staff can still serve anyone already waiting.',
      editShop: 'Edit shop',
      nameLabel: 'Name',
      exclusiveLabel: 'One ticket per customer across all of this shop’s queues',
      hoursLabel: 'Hours (optional)',
      phoneLabel: 'Phone (optional)',
      logoLabel: 'Logo URL (optional)',
      descriptionLabel: 'Description (optional)',
      shopSaved: 'Shop saved.',
      queuesHeading: { one: '{count} queue', other: '{count} queues' },
      waitingAddress: '{count} waiting · {address}',
      edit: 'Edit',
      monitor: 'Monitor',
    },

    auditLog: {
      title: 'Admin activity',
      nothingLogged: 'Nothing logged yet.',
      changed: 'Changed: {fields}',
      shop: 'Shop',
    },

    buildInfo: {
      aliveFor: ' · alive for {duration}',
    },
  },

  legal: {
    terms: {
      title: 'Terms of Service',
      lastUpdated: 'Last updated: [date of launch]',
      intro: 'These Terms govern use of Qjume (the “Service”), operated by Bitwork.dk (“Bitwork.dk”, “we”, “us”). By creating a queue, joining one, or otherwise using the Service, you agree to these Terms. If you are accepting them on behalf of a business, you confirm you have the authority to do so.',

      s1Heading: '1. What the Service is',
      s1Body: 'Qjume lets a business (a “Shop”) run one or more waiting lines (“Queues”) that customers can see and join remotely, and lets a customer join a Queue, track their place in it, and be notified as their turn approaches. A Shop is run by its owner and, on paid plans, staff the owner adds. A customer does not need an account to join a Queue.',

      s2Heading: '2. Accounts',
      s2Body1: 'A Shop owner signs in with an email address and is responsible for everything done under their account, including staff they add. A customer’s session is anonymous unless they choose to give an email or phone number for updates on their place in a Queue.',
      s2Body2Before: 'You must give accurate information and are responsible for keeping your sign-in access to yourself. Tell us at ',
      s2Body2After: ' if you believe your account has been accessed without your permission.',

      s3Heading: '3. Plans, fees and billing',
      s3Body1Before: 'Qjume offers a free plan and a paid plan with additional features, shown in the app. The paid plan is billed on a ',
      s3Body1Strong: 'recurring subscription',
      s3Body1After: ' at the price and interval shown at checkout, charged automatically until cancelled. Payment is processed by Stripe; Bitwork.dk never receives or stores your card details.',
      s3Body2: 'You can cancel at any time from your billing settings. Cancelling stops future renewals; it does not refund the period already paid for, and access to paid features continues until that period ends. Except where the law gives you a right to one, payments already made are not refundable. We may change plan pricing with reasonable notice; continuing to use the paid plan after a price change takes effect means you accept it.',

      s4Heading: '4. Acceptable use',
      s4Intro: 'You agree not to:',
      s4Item1: 'Use the Service for anything unlawful, fraudulent, or misleading;',
      s4Item2: 'Create a Queue for a business you are not authorised to represent;',
      s4Item3: 'Interfere with the Service’s operation or try to bypass its security, including its queue-ordering and no-show rules;',
      s4Item4: 'Use another person’s name or contact details to join a Queue without their knowledge;',
      s4Item5: 'Scrape, resell, or build a competing service from data obtained through the Service.',
      s4Body: 'A Shop found to be doing any of the above may be suspended or removed from discovery, and in serious cases removed from the Service entirely, at our discretion.',

      s5Heading: '5. Content you provide',
      s5BodyBefore: 'You are responsible for what you enter — a Shop’s name, address, description and queue details; a customer’s display name. You keep ownership of it; by providing it you let us store and display it as needed to run the Service (a Queue’s details to customers discovering it; a customer’s chosen name to the Shop serving them and to a monitor screen in that Shop, per our ',
      s5PrivacyLink: 'Privacy Policy',
      s5BodyAfter: ').',

      s6Heading: '6. Availability',
      s6Body: 'We aim to keep the Service running but do not guarantee it will be uninterrupted or error-free. If a Shop’s connection drops, its Queue is marked unavailable to new joiners until it reconnects, and picks up service from where it left off — we are not responsible for a Shop’s own network or device failing.',

      s7Heading: '7. Disclaimers and liability',
      s7Body: 'The Service is provided “as is”, without warranties of any kind beyond those the law does not allow us to exclude. To the fullest extent permitted by law, Bitwork.dk is not liable for indirect or consequential losses arising from use of the Service, including lost business or lost custom from a Queue being unavailable. Nothing in these Terms limits liability for death, personal injury, or fraud, where the law does not allow it to be limited.',

      s8Heading: '8. Suspension and termination',
      s8Body: 'We may suspend or close a Shop’s account for breach of these Terms, non-payment, or where the law requires it. You may stop using the Service, or close your Shop, at any time. Sections that by their nature should survive ending your use of the Service — including billing already due and the limitation of liability — continue to apply.',

      s9Heading: '9. Changes to these Terms',
      s9Body: 'We may update these Terms as the Service changes. We will post the updated Terms here with a new date; continuing to use the Service after that means you accept them. If a change is material, we will make a reasonable effort to tell Shop owners directly.',

      s10Heading: '10. Governing law',
      s10BodyBefore: 'These Terms are governed by the laws of Denmark. Any dispute that cannot be resolved directly will be subject to the jurisdiction of the Danish courts. If you are an EU consumer, you may also be able to use the European Commission’s ',
      s10Link: 'Online Dispute Resolution',
      s10BodyAfter: ' platform.',

      s11Heading: '11. Contact',
      s11BodyBefore: 'Bitwork.dk — ',
      s11BodyAfter: '.',
    },

    privacy: {
      title: 'Privacy Policy',
      lastUpdated: 'Last updated: [date of launch]',
      introBefore: 'Bitwork.dk (“we”, “us”) is the data controller for personal data collected through Qjume. This policy explains what we collect, why, and what you can do about it. Questions or requests: ',
      introAfter: '.',

      s1Heading: '1. What we collect',
      s1Para1Strong: 'Joining a Queue as a customer',
      s1Para1Rest: ' needs no account. We store the display name you choose to be called by — it does not have to be your real name — and, only if you give them, an email address or phone number so we can tell you when your turn is near. Your device also gets an anonymous, random id, used only to stop you joining the same Queue twice and to let you reclaim your place if you switch devices with a resume code.',
      s1Para2Strong: 'Running a Shop',
      s1Para2Rest: ' needs an email address to sign in with. We store the Shop’s own details you enter — name, address, the queues it runs — and, on the paid plan, billing status from our payment processor (never your card number, which we never receive).',
      s1Para3Strong: 'Location.',
      s1Para3Rest: ' If you allow it, your browser’s location is used to sort search results by distance and is kept only on your own device (in local browser storage) to speed up your next visit — we do not store it on our servers or attach it to your account.',
      s1Para4Strong: 'We do not collect',
      s1Para4Rest: ' more than the above: no tracking of your activity outside the app, no advertising identifiers, no sale of personal data to anyone.',

      s2Heading: '2. Why we use it, and on what basis',
      s2Item1: 'Running the Queue you joined, and telling you when it’s your turn — necessary to provide the service you asked for.',
      s2Item2: 'Letting a Shop’s staff call a waiting customer by name, and letting a customer count their own place — the same necessity, and it is why a customer’s chosen name (not their contact details) is visible to Shop staff and to the in-shop screen.',
      s2Item3: 'Billing a Shop’s paid plan — necessary to perform that contract.',
      s2Item4: 'Meeting our own legal obligations, such as keeping records tax law requires.',

      s3Heading: '3. Who else sees it',
      s3Intro: 'We use a small number of processors to run the Service, each bound by its own data processing terms:',
      s3Item1Strong: 'Google (Firebase / Google Cloud)',
      s3Item1Rest: ' — hosts the database, the app, and sends push notifications and sign-in emails.',
      s3Item2Strong: 'Stripe',
      s3Item2Rest: ' — processes payments for the paid plan. Stripe receives and stores your payment details directly; we do not.',
      s3Item3Strong: 'Resend',
      s3Item3Rest: ' — sends the email notifications you asked for (a milestone update, a receipt).',
      s3Item4Strong: 'OpenCage',
      s3Item4Rest: ' — turns a Shop’s address into map coordinates when it is created or edited. Only the address text is sent; no customer data.',
      s3Body1: 'Some of these process data outside the European Economic Area. Where that happens, it is under a mechanism the law recognises for that transfer, such as the EU Standard Contractual Clauses.',
      s3Body2: 'A Shop’s staff can see the public details of tickets in their own Queue — a customer’s chosen display name and place in line, never another Shop’s data and never a customer’s email or phone unless the customer contacts them directly.',

      s4Heading: '4. How long we keep it',
      s4Body: 'A ticket’s public details are kept for as long as needed to run the Queue and for a limited period afterwards for the Shop’s own record of who it served, then deleted. Contact details (email, phone) are kept only as long as the ticket that used them. A Shop’s own account and its queues are kept until the Shop is closed or deleted, by its owner or, where these Terms allow, by us.',

      s5Heading: '5. Your rights',
      s5BodyBefore: 'If you are in the EU/EEA, the GDPR gives you the right to access, correct, delete, or export the personal data we hold about you, and to object to or restrict some uses of it. To exercise any of these, email ',
      s5BodyMiddle: '. You can also complain to your national data protection authority — in Denmark, the ',
      s5DatatilsynetLink: 'Datatilsynet',
      s5BodyAfter: '.',

      s6Heading: '6. Security',
      s6Body: 'Access to a ticket’s contact details is restricted to the Shop serving it and the customer who holds it; a resume code, not a plain id, is what proves that hold. All traffic to the Service is encrypted in transit. No system is perfectly secure, and we cannot guarantee absolute security of information you provide.',

      s7Heading: '7. Children',
      s7Body: 'The Service is not directed at children, and we do not knowingly collect personal data from a child below the age Danish/EU law sets for consent to an information-society service without a parent’s agreement.',

      s8Heading: '8. Changes to this policy',
      s8Body: 'We may update this policy as the Service changes. We will post the updated version here with a new date.',
    },
  },
};
