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
};
