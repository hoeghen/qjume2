/**
 * A first draft, not a finished legal document — reviewed by no lawyer yet.
 * Describes what the app actually collects (see the Ticket/TicketContact
 * split in src/types/ticket.ts, and useGeolocation) rather than a generic
 * template, so it can't drift into claiming more or less than the code does.
 */
export function Privacy() {
  return (
    <main className="screen">
      <div className="screen-intro">
        <h1>Privacy Policy</h1>
      </div>

      <div className="legal">
        <p className="legal-updated">Last updated: [date of launch]</p>

        <p>
          Bitwork.dk (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is the data
          controller for personal data collected through Qjume. This policy
          explains what we collect, why, and what you can do about it.
          Questions or requests:{' '}
          <a href="mailto:bitwork@gmail.com">bitwork@gmail.com</a>.
        </p>

        <h2>1. What we collect</h2>
        <p>
          <strong>Joining a Queue as a customer</strong> needs no account.
          We store the display name you choose to be called by — it does
          not have to be your real name — and, only if you give them, an
          email address or phone number so we can tell you when your turn is
          near. Your device also gets an anonymous, random id, used only to
          stop you joining the same Queue twice and to let you reclaim your
          place if you switch devices with a resume code.
        </p>
        <p>
          <strong>Running a Shop</strong> needs an email address to sign in
          with. We store the Shop's own details you enter — name, address,
          the queues it runs — and, on the paid plan, billing status from
          our payment processor (never your card number, which we never
          receive).
        </p>
        <p>
          <strong>Location.</strong> If you allow it, your browser's location
          is used to sort search results by distance and is kept only on
          your own device (in local browser storage) to speed up your next
          visit — we do not store it on our servers or attach it to your
          account.
        </p>
        <p>
          <strong>We do not collect</strong> more than the above: no
          tracking of your activity outside the app, no advertising
          identifiers, no sale of personal data to anyone.
        </p>

        <h2>2. Why we use it, and on what basis</h2>
        <ul>
          <li>Running the Queue you joined, and telling you when it's your turn — necessary to provide the service you asked for.</li>
          <li>Letting a Shop's staff call a waiting customer by name, and letting a customer count their own place — the same necessity, and it is why a customer's chosen name (not their contact details) is visible to Shop staff and to the in-shop screen.</li>
          <li>Billing a Shop's paid plan — necessary to perform that contract.</li>
          <li>Meeting our own legal obligations, such as keeping records tax law requires.</li>
        </ul>

        <h2>3. Who else sees it</h2>
        <p>
          We use a small number of processors to run the Service, each bound
          by its own data processing terms:
        </p>
        <ul>
          <li><strong>Google (Firebase / Google Cloud)</strong> — hosts the database, the app, and sends push notifications and sign-in emails.</li>
          <li><strong>Stripe</strong> — processes payments for the paid plan. Stripe receives and stores your payment details directly; we do not.</li>
          <li><strong>Resend</strong> — sends the email notifications you asked for (a milestone update, a receipt).</li>
          <li><strong>OpenCage</strong> — turns a Shop's address into map coordinates when it is created or edited. Only the address text is sent; no customer data.</li>
        </ul>
        <p>
          Some of these process data outside the European Economic Area.
          Where that happens, it is under a mechanism the law recognises for
          that transfer, such as the EU Standard Contractual Clauses.
        </p>
        <p>
          A Shop's staff can see the public details of tickets in their own
          Queue — a customer's chosen display name and place in line, never
          another Shop's data and never a customer's email or phone unless
          the customer contacts them directly.
        </p>

        <h2>4. How long we keep it</h2>
        <p>
          A ticket's public details are kept for as long as needed to run
          the Queue and for a limited period afterwards for the Shop's own
          record of who it served, then deleted. Contact details (email,
          phone) are kept only as long as the ticket that used them. A
          Shop's own account and its queues are kept until the Shop is
          closed or deleted, by its owner or, where these Terms allow, by
          us.
        </p>

        <h2>5. Your rights</h2>
        <p>
          If you are in the EU/EEA, the GDPR gives you the right to access,
          correct, delete, or export the personal data we hold about you,
          and to object to or restrict some uses of it. To exercise any of
          these, email{' '}
          <a href="mailto:bitwork@gmail.com">bitwork@gmail.com</a>. You can
          also complain to your national data protection authority — in
          Denmark, the{' '}
          <a href="https://www.datatilsynet.dk" target="_blank" rel="noreferrer">
            Datatilsynet
          </a>
          .
        </p>

        <h2>6. Security</h2>
        <p>
          Access to a ticket's contact details is restricted to the Shop
          serving it and the customer who holds it; a resume code, not a
          plain id, is what proves that hold. All traffic to the Service is
          encrypted in transit. No system is perfectly secure, and we cannot
          guarantee absolute security of information you provide.
        </p>

        <h2>7. Children</h2>
        <p>
          The Service is not directed at children, and we do not knowingly
          collect personal data from a child below the age Danish/EU law
          sets for consent to an information-society service without a
          parent's agreement.
        </p>

        <h2>8. Changes to this policy</h2>
        <p>
          We may update this policy as the Service changes. We will post the
          updated version here with a new date.
        </p>
      </div>
    </main>
  );
}
