import type { Locale } from './i18n/locale.js';

/**
 * One landing page per kind of business that typically has a queue, at
 * `/koesystem-til-<slug>` — the words someone searches with ("køsystem til
 * bager"). Plain data, read by the page (`routes/Industry.tsx`), by
 * `SEO_PAGES` and by the build's static text, so all three say the same.
 *
 * Each page is written for its own trade rather than run off one template
 * with the name swapped in: near-identical pages are what Google discounts.
 * Every claim must be something the app actually does — no booking, no SMS.
 */
type L = Record<Locale, string>;

export interface Industry {
  slug: string;
  /** The trade, as it reads in a running sentence and a link list. */
  name: L;
  title: L;
  description: L;
  h1: L;
  intro: L;
  /** What the trade's queue is actually like, and what changes. */
  points: L[];
  /** One concrete way to set it up in this trade. */
  setup: L;
}

export const INDUSTRY_PATH_PREFIX = '/koesystem-til-';
export const industryPath = (i: Industry) => `${INDUSTRY_PATH_PREFIX}${i.slug}`;

export const INDUSTRIES: Industry[] = [
  {
    slug: 'bager',
    name: { da: 'bager', en: 'bakery' },
    title: { da: 'Køsystem til bager — digitalt kønummer | Qjume', en: 'Queue system for bakeries | Qjume' },
    description: {
      da: 'Erstat bagerens kønummer-automat med en QR-kode. Kunderne trækker nummer på telefonen og ser, hvornår det er deres tur. Gratis for de første 1000 kunder.',
      en: 'Replace the bakery’s ticket dispenser with a QR code. Customers take a number on their phone and see when it is their turn. Free for the first 1000 customers.',
    },
    h1: { da: 'Køsystem til bageren', en: 'A queue system for the bakery' },
    intro: {
      da: 'Lørdag morgen står køen ud ad døren, og papirnumrene ryger på gulvet. Med Qjume scanner kunden en QR-kode ved døren, får et nummer på telefonen og kan se præcis, hvor mange der er foran.',
      en: 'Saturday morning the queue runs out of the door and the paper tickets end up on the floor. With Qjume the customer scans a QR code at the door, gets a number on their phone and sees exactly how many are ahead.',
    },
    points: [
      {
        da: 'Ingen talonruller at købe eller automat at fylde op — nummeret ligger på kundens telefon.',
        en: 'No ticket rolls to buy and no dispenser to refill — the number is on the customer’s phone.',
      },
      {
        da: 'Kunderne kan vente udenfor eller i bilen i stedet for at fylde butikken, og får besked, når de er tæt på.',
        en: 'Customers can wait outside or in the car instead of filling the shop, and are told when they are close.',
      },
      {
        da: 'Stamkunder uden smartphone tilføjer du med et tryk ved disken, så alle står i samme kø.',
        en: 'Regulars without a smartphone are added with one tap at the counter, so everyone stands in the same queue.',
      },
    ],
    setup: {
      da: 'Hæng QR-koden i vinduet og ved døren, og stil en tablet eller gammel skærm op med monitoren, så nummeret, der betjenes, kan ses fra hele butikken. Har I to ekspedienter, åbner I to kasser i samme kø.',
      en: 'Put the QR code in the window and by the door, and set up a tablet or old screen with the monitor so the number being served is visible from the whole shop. Two people behind the counter open two tills on the same queue.',
    },
  },
  {
    slug: 'slagter',
    name: { da: 'slagter', en: 'butcher' },
    title: { da: 'Køsystem til slagter — kønummer uden papir | Qjume', en: 'Queue system for butchers | Qjume' },
    description: {
      da: 'Digitalt kønummersystem til slagteren. Kunderne stiller sig i kø via QR-kode og kan handle videre, mens de venter. Gratis for de første 1000 kunder.',
      en: 'A digital ticket system for the butcher. Customers join via QR code and can shop on while they wait. Free for the first 1000 customers.',
    },
    h1: { da: 'Køsystem til slagteren', en: 'A queue system for the butcher' },
    intro: {
      da: 'Hos slagteren tager hver kunde tid: der skal skæres, vejes og rådgives. Det gør køen lang og uforudsigelig. Med Qjume kan kunden se den forventede ventetid og bruge den på noget andet end at stå foran montren.',
      en: 'At the butcher every customer takes time: cutting, weighing and advice. That makes the queue long and unpredictable. With Qjume the customer sees the expected wait and can spend it on something other than standing at the counter.',
    },
    points: [
      {
        da: 'Ventetiden beregnes ud fra, hvor lang tid jeres kunder faktisk tager — ikke et gæt.',
        en: 'The wait is worked out from how long your customers actually take — not a guess.',
      },
      {
        da: 'I et butikstorv kan kunden handle i nabobutikkerne og komme tilbage, når telefonen siger til.',
        en: 'In a shopping centre the customer can shop next door and come back when the phone says so.',
      },
      {
        da: 'Har I en separat disk til bestillinger, kører den som sin egen kø.',
        en: 'A separate counter for orders runs as its own queue.',
      },
    ],
    setup: {
      da: 'Sæt QR-koden på montren og ved indgangen. Opret én kø til disken og eventuelt en til afhentning af bestillinger, så de to ikke blokerer for hinanden.',
      en: 'Put the QR code on the counter and by the entrance. Create one queue for the counter and perhaps one for collecting orders, so the two don’t block each other.',
    },
  },
  {
    slug: 'fiskehandler',
    name: { da: 'fiskehandler', en: 'fishmonger' },
    title: { da: 'Køsystem til fiskehandler | Qjume', en: 'Queue system for fishmongers | Qjume' },
    description: {
      da: 'Kønummersystem til fiskehandleren uden papir og automat. Kunderne trækker nummer med telefonen og venter, hvor de vil. Gratis for de første 1000 kunder.',
      en: 'A ticket system for the fishmonger without paper or dispenser. Customers take a number with their phone and wait where they like. Free for the first 1000 customers.',
    },
    h1: { da: 'Køsystem til fiskehandleren', en: 'A queue system for the fishmonger' },
    intro: {
      da: 'Fredag eftermiddag og før højtiderne er der rift om disken. En papirautomat i et vådt miljø er ikke sjov at holde kørende — en QR-kode på væggen kan ikke gå i stykker.',
      en: 'Friday afternoons and before holidays the counter is busy. A paper dispenser in a wet shop is no fun to keep running — a QR code on the wall can’t break.',
    },
    points: [
      {
        da: 'Intet udstyr ved disken, der skal tåle vand og kulde — kun en QR-kode og en telefon eller tablet til personalet.',
        en: 'No equipment at the counter that has to survive water and cold — just a QR code and a phone or tablet for staff.',
      },
      {
        da: 'Kunderne ser ventetiden, før de går ind, og kan vælge at komme tilbage senere.',
        en: 'Customers see the wait before they come in and can choose to come back later.',
      },
      {
        da: 'Til højtiderne kan I åbne flere kasser i samme kø og lukke dem igen bagefter.',
        en: 'For the holidays you can open more tills on the same queue and close them again afterwards.',
      },
    ],
    setup: {
      da: 'Hæng QR-koden ved døren. Betjen fra en telefon i et vandtæt cover ved disken, og tryk "Kald næste", når en kunde er færdig.',
      en: 'Put the QR code by the door. Serve from a phone in a waterproof case at the counter, and tap "Call next" when a customer is done.',
    },
  },
  {
    slug: 'delikatesse',
    name: { da: 'ost og delikatesse', en: 'deli and cheese shop' },
    title: { da: 'Køsystem til delikatesse og osteforretning | Qjume', en: 'Queue system for delis and cheese shops | Qjume' },
    description: {
      da: 'Digitalt køsystem til delikatesse-, oste- og specialbutikker. Kunderne kan kigge sig omkring, mens de venter på tur. Gratis for de første 1000 kunder.',
      en: 'A digital queue system for delis, cheese and speciality shops. Customers can browse while they wait their turn. Free for the first 1000 customers.',
    },
    h1: { da: 'Køsystem til delikatessen og osteforretningen', en: 'A queue system for the deli and cheese shop' },
    intro: {
      da: 'I en specialbutik handler kunderne med smagsprøver og gode råd, og det er netop dét, der gør køen lang. Med Qjume står de ikke i kø — de kigger på hylderne og bliver kaldt, når det er deres tur.',
      en: 'In a speciality shop customers buy with tastings and advice, which is exactly what makes the queue long. With Qjume they don’t stand in line — they browse the shelves and are called when it is their turn.',
    },
    points: [
      {
        da: 'Ventetiden bliver til tid ved hylderne — og ofte ekstra salg.',
        en: 'Waiting time becomes time at the shelves — and often extra sales.',
      },
      {
        da: 'Ingen trængsel foran disken, så de kunder, der betjenes, får ro til at smage og vælge.',
        en: 'No crowd at the counter, so the customer being served has room to taste and choose.',
      },
      {
        da: 'Kunden kan følge sin plads live og kommer tilbage til disken i rette tid.',
        en: 'The customer follows their place live and is back at the counter in time.',
      },
    ],
    setup: {
      da: 'Sæt QR-koden ved indgangen og på disken. Når en kunde er kaldt tre gange uden at dukke op, fjernes de automatisk, så køen ikke går i stå.',
      en: 'Put the QR code at the entrance and on the counter. When a customer has been called three times without showing up, they are removed automatically, so the queue doesn’t stall.',
    },
  },
  {
    slug: 'isbutik',
    name: { da: 'isbutik', en: 'ice cream shop' },
    title: { da: 'Køsystem til isbutik — slip for køen på fortovet | Qjume', en: 'Queue system for ice cream shops | Qjume' },
    description: {
      da: 'Digitalt køsystem til isbutikker og ishuse. Kunderne stiller sig i kø med en QR-kode og venter i skyggen i stedet for på fortovet. Gratis for de første 1000 kunder.',
      en: 'A digital queue system for ice cream shops. Customers join with a QR code and wait in the shade instead of on the pavement. Free for the first 1000 customers.',
    },
    h1: { da: 'Køsystem til isbutikken', en: 'A queue system for the ice cream shop' },
    intro: {
      da: 'En varm sommerdag kan køen til isbutikken nå hele vejen ned ad gaden. Med Qjume kan familien sætte sig på en bænk eller gå en tur på havnen og komme tilbage, når det er deres tur.',
      en: 'On a hot summer day the queue for the ice cream shop can reach down the street. With Qjume the family can sit on a bench or walk along the harbour and come back when it is their turn.',
    },
    points: [
      {
        da: 'Kunderne ser køen, før de stiller sig i den — og en lang kø skræmmer færre væk, når man ikke skal stå i den.',
        en: 'Customers see the queue before they join — and a long queue scares fewer away when you don’t have to stand in it.',
      },
      {
        da: 'Ingen kø, der blokerer for naboerne eller fortovet.',
        en: 'No queue blocking the neighbours or the pavement.',
      },
      {
        da: 'Sæsonbutik? Gratis til de første 1000 kunder, og derefter et abonnement uden binding, som I kan stoppe uden for sæsonen.',
        en: 'Seasonal shop? Free for the first 1000 customers, then a subscription with no lock-in that you can stop out of season.',
      },
    ],
    setup: {
      da: 'Hæng QR-koden i vinduet og på et skilt ved køens start. Sæt køen til "Lukker snart", når I stopper for nye kunder om aftenen — dem, der allerede venter, betjenes stadig.',
      en: 'Put the QR code in the window and on a sign where the queue starts. Set the queue to "Closing soon" when you stop taking new customers in the evening — those already waiting are still served.',
    },
  },
  {
    slug: 'frisoer',
    name: { da: 'frisør og barber', en: 'hairdresser and barber' },
    title: { da: 'Køsystem til frisør og barber uden tidsbestilling | Qjume', en: 'Queue system for walk-in hairdressers and barbers | Qjume' },
    description: {
      da: 'Digital venteliste til frisører og barbershops med drop-in. Kunderne stiller sig i kø fra telefonen og kommer, når det er deres tur. Gratis for de første 1000 kunder.',
      en: 'A digital waitlist for walk-in hairdressers and barbershops. Customers join from their phone and come in when it is their turn. Free for the first 1000 customers.',
    },
    h1: { da: 'Køsystem til frisør og barber uden tidsbestilling', en: 'A queue system for walk-in hairdressers and barbers' },
    intro: {
      da: 'Drop-in er godt for forretningen, men ventestolene bliver hurtigt fulde, og kunderne ved aldrig, hvor længe de skal sidde. Med Qjume kan de stille sig i kø hjemmefra og komme, når de er de næste.',
      en: 'Walk-ins are good for business, but the waiting chairs fill up fast and customers never know how long they will sit. With Qjume they can join from home and come in when they are next.',
    },
    points: [
      {
        da: 'Kunderne ser ventetiden online, før de tager af sted — også når de søger efter køer i nærheden på Qjume.',
        en: 'Customers see the wait online before they set off — also when they look for nearby queues on Qjume.',
      },
      {
        da: 'Hver frisørstol er en kasse, så ventetiden deles på dem, der klipper lige nu.',
        en: 'Each chair is a till, so the wait is divided among those cutting right now.',
      },
      {
        da: 'Besked, når der er 3, 2 og 1 foran — så kunden når frem, uden at sidde og vente.',
        en: 'A notification at 3, 2 and 1 ahead — so the customer arrives in time without sitting and waiting.',
      },
    ],
    setup: {
      da: 'Opret én kø for salonen og en kasse for hver stol. Sæt QR-koden i vinduet og link til køen fra jeres hjemmeside og Instagram, så kunderne kan stille sig i kø, før de går hjemmefra.',
      en: 'Create one queue for the salon and a till for each chair. Put the QR code in the window and link to the queue from your website and Instagram, so customers can join before they leave home.',
    },
  },
  {
    slug: 'vaerksted',
    name: { da: 'dækskifte og værksted', en: 'tyre change and garage' },
    title: { da: 'Køsystem til dækskifte og autoværksted | Qjume', en: 'Queue system for tyre changes and garages | Qjume' },
    description: {
      da: 'Digitalt køsystem til dækskifte og værksted. Kunderne stiller sig i kø fra bilen og får besked, når det er deres tur. Gratis for de første 1000 kunder.',
      en: 'A digital queue system for tyre changes and garages. Customers join from the car and are told when it is their turn. Free for the first 1000 customers.',
    },
    h1: { da: 'Køsystem til dækskifte og værksted', en: 'A queue system for tyre changes and the garage' },
    intro: {
      da: 'Når vinterdækkene skal på, holder bilerne i kø rundt om blokken. Med Qjume stiller kunden sig i kø fra bilen eller hjemmefra og kører først ind, når der er plads på liften.',
      en: 'When the winter tyres go on, cars queue round the block. With Qjume the customer joins from the car or from home and only drives in when there is room on the lift.',
    },
    points: [
      {
        da: 'Ingen kø af biler på pladsen eller ude på vejen i dækskiftesæsonen.',
        en: 'No queue of cars in the yard or on the road during tyre season.',
      },
      {
        da: 'Hver lift er en kasse, så ventetiden passer til, hvor mange der arbejder lige nu.',
        en: 'Each lift is a till, so the wait matches how many are working right now.',
      },
      {
        da: 'Kunden kan vente på caféen eller hjemme og får besked, inden det er tid.',
        en: 'The customer can wait at a café or at home and is told before it is time.',
      },
    ],
    setup: {
      da: 'Lav en kø til "dækskift uden tid" og sæt QR-koden ved indkørslen. Når dagens kapacitet er nået, sætter I køen til "Lukker snart", så ingen stiller sig i en kø, I ikke kan nå — dem, der venter, betjenes færdig.',
      en: 'Create a "walk-in tyre change" queue and put the QR code at the entrance. When the day’s capacity is reached, set the queue to "Closing soon" so nobody joins one you can’t get through — those waiting are still served.',
    },
  },
  {
    slug: 'cykelvaerksted',
    name: { da: 'cykelværksted', en: 'bike workshop' },
    title: { da: 'Køsystem til cykelværksted | Qjume', en: 'Queue system for bike workshops | Qjume' },
    description: {
      da: 'Digitalt køsystem til cykelværksteder. Kunderne stiller sig i kø med en QR-kode og går en tur, mens de venter. Gratis for de første 1000 kunder.',
      en: 'A digital queue system for bike workshops. Customers join with a QR code and take a walk while they wait. Free for the first 1000 customers.',
    },
    h1: { da: 'Køsystem til cykelværkstedet', en: 'A queue system for the bike workshop' },
    intro: {
      da: 'En punktering kan ikke vente til næste uge, og om foråret står kunderne i kø med cyklen i hånden. Med Qjume får de en plads i køen og kan gå en tur imens.',
      en: 'A puncture can’t wait until next week, and in spring customers queue with their bike in hand. With Qjume they get a place in the queue and can take a walk meanwhile.',
    },
    points: [
      {
        da: 'Ingen kø af cykler, der blokerer indgangen eller fortovet.',
        en: 'No queue of bikes blocking the entrance or the pavement.',
      },
      {
        da: 'Hurtige reparationer kan få deres egen kø, så en punktering ikke venter bag et stort eftersyn.',
        en: 'Quick repairs can have their own queue, so a puncture doesn’t wait behind a full service.',
      },
      {
        da: 'Kunderne ser ventetiden online og kan vælge et roligere tidspunkt.',
        en: 'Customers see the wait online and can choose a quieter time.',
      },
    ],
    setup: {
      da: 'Opret en kø til "hurtig reparation" og en til "aflevering", og hæng QR-koden ved døren. Mekanikerne betjener fra deres telefon.',
      en: 'Create a "quick repair" queue and a "drop-off" queue, and put the QR code by the door. Mechanics serve from their phone.',
    },
  },
  {
    slug: 'reparation',
    name: { da: 'mobil- og computerreparation', en: 'phone and computer repair' },
    title: { da: 'Køsystem til mobil- og computerreparation | Qjume', en: 'Queue system for phone and computer repair | Qjume' },
    description: {
      da: 'Digitalt køsystem til reparationsbutikker. Kunderne stiller sig i kø via QR-kode og handler videre, mens de venter. Gratis for de første 1000 kunder.',
      en: 'A digital queue system for repair shops. Customers join via QR code and shop on while they wait. Free for the first 1000 customers.',
    },
    h1: { da: 'Køsystem til mobil- og computerreparation', en: 'A queue system for phone and computer repair' },
    intro: {
      da: 'Hver kunde i en reparationsbutik skal have forklaret fejlen og et overslag, og det tager tid. Med Qjume står de ikke og tripper ved disken — de handler i centret og kommer tilbage, når det er deres tur.',
      en: 'Every customer in a repair shop needs the fault explained and a quote, and that takes time. With Qjume they don’t wait around at the counter — they shop in the centre and come back when it is their turn.',
    },
    points: [
      {
        da: 'Kunderne kan se ventetiden fra telefonen, inden de kommer.',
        en: 'Customers can see the wait from their phone before they come.',
      },
      {
        da: 'Afhentning af færdige reparationer kan køre i sin egen hurtige kø.',
        en: 'Collecting finished repairs can run in its own quick queue.',
      },
      {
        da: 'I butikscentre: kunden får besked på telefonen og kan gå videre imens.',
        en: 'In shopping centres: the customer is notified on their phone and can move on meanwhile.',
      },
    ],
    setup: {
      da: 'Lav en kø til "reparation" og en til "afhentning", og sæt QR-koden på disken og i vinduet.',
      en: 'Create a "repair" queue and a "collection" queue, and put the QR code on the counter and in the window.',
    },
  },
  {
    slug: 'pakkeshop',
    name: { da: 'pakkeshop og posthus', en: 'parcel shop and post office' },
    title: { da: 'Køsystem til pakkeshop og posthus | Qjume', en: 'Queue system for parcel shops and post offices | Qjume' },
    description: {
      da: 'Digitalt køsystem til pakkeshops og posthuse. Kunderne stiller sig i kø med en QR-kode i stedet for i butikken. Gratis for de første 1000 kunder.',
      en: 'A digital queue system for parcel shops and post offices. Customers join with a QR code instead of standing in the shop. Free for the first 1000 customers.',
    },
    h1: { da: 'Køsystem til pakkeshop og posthus', en: 'A queue system for the parcel shop and post office' },
    intro: {
      da: 'Før jul og efter Black Friday fylder pakkekøen hele butikken — og blokerer for de kunder, der bare skal handle. Med Qjume står pakkekunderne i en digital kø og kommer op, når det er deres tur.',
      en: 'Before Christmas and after Black Friday the parcel queue fills the whole shop — and blocks customers who just want to shop. With Qjume parcel customers stand in a digital queue and come up when it is their turn.',
    },
    points: [
      {
        da: 'Pakker og almindelig handel kan køre i hver sin kø, så kassen ikke går i stå.',
        en: 'Parcels and ordinary shopping can run in separate queues, so the till doesn’t stall.',
      },
      {
        da: 'Kunderne kan handle eller vente udenfor i stedet for at stå mellem hylderne.',
        en: 'Customers can shop or wait outside instead of standing between the shelves.',
      },
      {
        da: 'Ingen hardware at installere — det kører på den telefon eller pc, I allerede har.',
        en: 'No hardware to install — it runs on the phone or PC you already have.',
      },
    ],
    setup: {
      da: 'Opret en kø til "pakker" og hæng QR-koden ved pakkeskranken. Kunder uden smartphone tilføjer I selv ved skranken.',
      en: 'Create a "parcels" queue and put the QR code at the parcel counter. Customers without a smartphone are added by staff at the counter.',
    },
  },
  {
    slug: 'apotek',
    name: { da: 'apotek', en: 'pharmacy' },
    title: { da: 'Køsystem til apotek — digitalt kønummer | Qjume', en: 'Queue system for pharmacies | Qjume' },
    description: {
      da: 'Digitalt kønummersystem til apoteket. Kunderne trækker nummer med telefonen, med separate køer til recept og rådgivning. Gratis for de første 1000 kunder.',
      en: 'A digital ticket system for the pharmacy. Customers take a number with their phone, with separate queues for prescriptions and advice. Free for the first 1000 customers.',
    },
    h1: { da: 'Køsystem til apoteket', en: 'A queue system for the pharmacy' },
    intro: {
      da: 'På apoteket er kønummeret en selvfølge — men syge kunder har ikke lyst til at stå tæt i et fyldt lokale. Med Qjume trækker de nummer på telefonen og kan vente udenfor eller i bilen.',
      en: 'At the pharmacy a queue number is a given — but sick customers don’t want to stand close together in a full room. With Qjume they take a number on their phone and can wait outside or in the car.',
    },
    points: [
      {
        da: 'Separate køer til recept, håndkøb og rådgivning — hver med sine egne skranker.',
        en: 'Separate queues for prescriptions, over-the-counter and advice — each with its own counters.',
      },
      {
        da: 'Monitoren viser numrene og hvilken skranke, der kalder, og kan stå på en skærm, I allerede har.',
        en: 'The monitor shows the numbers and which counter is calling, on a screen you already have.',
      },
      {
        da: 'Ældre kunder uden smartphone tilføjes ved skranken og står i samme kø som alle andre.',
        en: 'Older customers without a smartphone are added at the counter and stand in the same queue as everyone else.',
      },
    ],
    setup: {
      da: 'Opret en kø pr. type ekspedition og en kasse pr. skranke. Sæt QR-koden ved indgangen, og vis monitoren på skærmen i venteområdet.',
      en: 'Create a queue per type of service and a till per counter. Put the QR code at the entrance and show the monitor on the screen in the waiting area.',
    },
  },
  {
    slug: 'dyrlaege',
    name: { da: 'dyrlæge', en: 'vet' },
    title: { da: 'Køsystem til dyrlæge — akut og drop-in | Qjume', en: 'Queue system for vets — emergency and walk-in | Qjume' },
    description: {
      da: 'Digitalt køsystem til dyrlæger med drop-in og akut. Dyreejerne venter i bilen i stedet for i venteværelset. Gratis for de første 1000 kunder.',
      en: 'A digital queue system for vets with walk-in and emergency hours. Pet owners wait in the car instead of the waiting room. Free for the first 1000 customers.',
    },
    h1: { da: 'Køsystem til dyrlægen', en: 'A queue system for the vet' },
    intro: {
      da: 'Et fyldt venteværelse med nervøse hunde og katte er stress for både dyr og ejere. Med Qjume kan dyreejeren vente i bilen eller gå en tur med hunden og bliver kaldt ind, når det er deres tur.',
      en: 'A full waiting room of nervous dogs and cats is stressful for animals and owners alike. With Qjume the owner can wait in the car or walk the dog and is called in when it is their turn.',
    },
    points: [
      {
        da: 'Færre dyr samlet i venteværelset — mindre stress og smitte.',
        en: 'Fewer animals together in the waiting room — less stress and less infection.',
      },
      {
        da: 'Drop-in-tider får en kø med en ærlig ventetid, så ejeren ved, hvad de går ind til.',
        en: 'Walk-in hours get a queue with an honest wait, so owners know what they are in for.',
      },
      {
        da: 'Haster det, kan personalet stadig tage et dyr ind med det samme — køen styres fra skranken.',
        en: 'In an emergency, staff can still take an animal straight in — the queue is run from the desk.',
      },
    ],
    setup: {
      da: 'Lav en kø til drop-in-tiden og sæt QR-koden ved indgangen og på parkeringspladsen. Hver behandlingsstue er en kasse.',
      en: 'Create a queue for walk-in hours and put the QR code at the entrance and in the car park. Each treatment room is a till.',
    },
  },
  {
    slug: 'klinik',
    name: { da: 'klinik og blodprøver', en: 'clinic and blood tests' },
    title: { da: 'Køsystem til klinik, blodprøver og vaccination | Qjume', en: 'Queue system for clinics, blood tests and vaccination | Qjume' },
    description: {
      da: 'Digitalt køsystem til lægeklinikker, blodprøvetagning og vaccination. Patienterne venter, hvor de vil, og bliver kaldt på telefonen. Gratis for de første 1000 patienter.',
      en: 'A digital queue system for clinics, blood tests and vaccination. Patients wait where they like and are called on their phone. Free for the first 1000 patients.',
    },
    h1: { da: 'Køsystem til klinik, blodprøver og vaccination', en: 'A queue system for clinics, blood tests and vaccination' },
    intro: {
      da: 'Blodprøvetagning og vaccination uden tidsbestilling giver et fyldt venteværelse og patienter, der ikke ved, hvor længe de skal vente. Med Qjume får patienten et nummer på telefonen og en løbende ventetid.',
      en: 'Blood tests and vaccination without appointments mean a full waiting room and patients who don’t know how long they will wait. With Qjume the patient gets a number on their phone and a live wait.',
    },
    points: [
      {
        da: 'Patienterne behøver ingen app eller login — kun et navn, de vil kaldes op med.',
        en: 'Patients need no app or login — just a name to be called by.',
      },
      {
        da: 'Færre mennesker samlet i venteværelset.',
        en: 'Fewer people together in the waiting room.',
      },
      {
        da: 'Flere prøvetagere arbejder som hver sin kasse i samme kø, og ventetiden følger med.',
        en: 'Several staff work as separate tills on the same queue, and the wait follows.',
      },
    ],
    setup: {
      da: 'Opret en kø pr. ydelse — fx "blodprøver" og "vaccination" — og vis monitoren på skærmen i venteværelset, så patienterne kan se, hvem der kaldes.',
      en: 'Create a queue per service — for example "blood tests" and "vaccination" — and show the monitor in the waiting room, so patients can see who is called.',
    },
  },
  {
    slug: 'optiker',
    name: { da: 'optiker', en: 'optician' },
    title: { da: 'Køsystem til optiker | Qjume', en: 'Queue system for opticians | Qjume' },
    description: {
      da: 'Digitalt køsystem til optikere. Kunderne prøver stel, mens de venter på tur, og bliver kaldt på telefonen. Gratis for de første 1000 kunder.',
      en: 'A digital queue system for opticians. Customers try frames while they wait their turn and are called on their phone. Free for the first 1000 customers.',
    },
    h1: { da: 'Køsystem til optikeren', en: 'A queue system for the optician' },
    intro: {
      da: 'Hos optikeren kommer kunderne både for at hente briller, få dem justeret og finde nye stel. Med Qjume ved alle, hvor de er i køen, og bruger ventetiden på at prøve stel i stedet for at stå ved disken.',
      en: 'At the optician customers come to collect glasses, have them adjusted and find new frames. With Qjume everyone knows where they are in the queue and spends the wait trying frames instead of standing at the counter.',
    },
    points: [
      {
        da: 'Hurtige ærinder som afhentning og justering kan få deres egen kø.',
        en: 'Quick errands like collection and adjustment can have their own queue.',
      },
      {
        da: 'Ventetiden bliver til tid ved stelvæggen.',
        en: 'The wait becomes time at the frame wall.',
      },
      {
        da: 'Ingen uklarhed om, hvem der var først.',
        en: 'No doubt about who was first.',
      },
    ],
    setup: {
      da: 'Lav en kø til "afhentning og justering" og en til "rådgivning", og sæt QR-koden ved indgangen.',
      en: 'Create a "collection and adjustment" queue and an "advice" queue, and put the QR code at the entrance.',
    },
  },
  {
    slug: 'foodtruck',
    name: { da: 'food truck og street food', en: 'food truck and street food' },
    title: { da: 'Køsystem til food truck og street food | Qjume', en: 'Queue system for food trucks and street food | Qjume' },
    description: {
      da: 'Digitalt køsystem til food trucks og street food-boder. Gæsterne stiller sig i kø med en QR-kode og får besked, når maden er klar. Gratis for de første 1000 kunder.',
      en: 'A digital queue system for food trucks and street food stalls. Guests join with a QR code and are told when it is their turn. Free for the first 1000 customers.',
    },
    h1: { da: 'Køsystem til food truck og street food', en: 'A queue system for food trucks and street food' },
    intro: {
      da: 'Ved en food truck er køen ofte det første, gæsterne ser — og grunden til, at nogle går videre. Med Qjume kan de stille sig i kø, finde et bord og blive kaldt op, når det er deres tur.',
      en: 'At a food truck the queue is often the first thing guests see — and why some walk on. With Qjume they can join, find a table and be called up when it is their turn.',
    },
    points: [
      {
        da: 'Kører på en telefon — perfekt til en vogn uden plads til udstyr.',
        en: 'Runs on a phone — perfect for a truck with no room for equipment.',
      },
      {
        da: 'Gæsterne kan sidde ned eller handle ved nabobodene, mens de venter.',
        en: 'Guests can sit down or visit the neighbouring stalls while they wait.',
      },
      {
        da: 'Står I et nyt sted hver dag, flytter I bare køen — adressen kan ændres når som helst.',
        en: 'In a new spot every day? Just move the queue — the address can be changed at any time.',
      },
    ],
    setup: {
      da: 'Sæt QR-koden på vognen og på et skilt foran. Tryk "Kald næste", når en ordre er klar, og kunden får besked med det samme.',
      en: 'Put the QR code on the truck and on a sign in front. Tap "Call next" when an order is ready, and the customer is told straight away.',
    },
  },
  {
    slug: 'takeaway',
    name: { da: 'take-away og pizzeria', en: 'takeaway and pizzeria' },
    title: { da: 'Køsystem til take-away og pizzeria | Qjume', en: 'Queue system for takeaways and pizzerias | Qjume' },
    description: {
      da: 'Digitalt køsystem til take-away, pizzeriaer og grillbarer. Kunderne venter udenfor og får besked på telefonen. Gratis for de første 1000 kunder.',
      en: 'A digital queue system for takeaways, pizzerias and grills. Customers wait outside and are told on their phone. Free for the first 1000 customers.',
    },
    h1: { da: 'Køsystem til take-away og pizzeria', en: 'A queue system for the takeaway and pizzeria' },
    intro: {
      da: 'Fredag aften er der fyldt foran disken med kunder, der venter på deres mad. Med Qjume kan de vente i bilen eller udenfor og bliver kaldt, når det er deres tur.',
      en: 'On Friday night the counter is crowded with customers waiting for their food. With Qjume they can wait in the car or outside and are called when it is their turn.',
    },
    points: [
      {
        da: 'Mindre trængsel i en lille butik.',
        en: 'Less crowding in a small shop.',
      },
      {
        da: 'Kunderne ser ventetiden, før de bestiller, og ved, hvad de går ind til.',
        en: 'Customers see the wait before they order and know what they are in for.',
      },
      {
        da: 'Ingen papirnumre eller råb ud i lokalet — kunden får besked på telefonen.',
        en: 'No paper numbers or shouting across the room — the customer is told on their phone.',
      },
    ],
    setup: {
      da: 'Sæt QR-koden ved disken. Kunden stiller sig i kø med sit navn, og I trykker "Kald næste", når maden er klar.',
      en: 'Put the QR code by the counter. The customer joins with their name, and you tap "Call next" when the food is ready.',
    },
  },
  {
    slug: 'events',
    name: { da: 'festivaler og markeder', en: 'festivals and markets' },
    title: { da: 'Køsystem til festivaler, events og markeder | Qjume', en: 'Queue system for festivals, events and markets | Qjume' },
    description: {
      da: 'Digitalt køsystem til festivaler, events, markeder og loppemarkeder. Gæsterne stiller sig i kø via QR-kode og oplever mere i stedet for at stå i kø. Gratis for de første 1000 gæster.',
      en: 'A digital queue system for festivals, events and markets. Guests join via QR code and see more instead of standing in line. Free for the first 1000 guests.',
    },
    h1: { da: 'Køsystem til festivaler, events og markeder', en: 'A queue system for festivals, events and markets' },
    intro: {
      da: 'Til events er køen til merchandise, signering eller den populære bod tid, gæsterne ikke oplever noget. Med Qjume står de i kø på telefonen og bruger ventetiden på resten af arrangementet.',
      en: 'At events the queue for merchandise, a signing or the popular stall is time guests spend experiencing nothing. With Qjume they queue on their phone and spend the wait on the rest of the event.',
    },
    points: [
      {
        da: 'Ingen hardware at leje eller sætte op — kun QR-koder og telefoner.',
        en: 'No hardware to hire or set up — just QR codes and phones.',
      },
      {
        da: 'Hver bod eller station kan have sin egen kø, og gæsterne finder dem i nærheden på Qjume.',
        en: 'Each stall or station can have its own queue, and guests find nearby ones on Qjume.',
      },
      {
        da: 'Gratis til de første 1000 betjente gæster — ofte nok til et helt arrangement.',
        en: 'Free for the first 1000 served guests — often enough for a whole event.',
      },
    ],
    setup: {
      da: 'Opret en kø pr. bod eller aktivitet, og print QR-koderne på skilte. Sæt køen til "Lukker snart", når der ikke er plads til flere.',
      en: 'Create a queue per stall or activity and print the QR codes on signs. Set the queue to "Closing soon" when there is no room for more.',
    },
  },
];
