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
};
