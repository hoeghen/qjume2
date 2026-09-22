/**
 * A first draft, not a finished legal document — reviewed by no lawyer yet.
 * Written to match what the app actually does (CLAUDE.md, PRD) rather than
 * generic boilerplate, so the gap between what this says and what the app
 * does stays at zero as the app changes.
 */
export function Terms() {
  return (
    <main className="screen">
      <div className="screen-intro">
        <h1>Terms of Service</h1>
      </div>

      <div className="legal">
        <p className="legal-updated">Last updated: [date of launch]</p>

        <p>
          These Terms govern use of Qjume (the &ldquo;Service&rdquo;), operated
          by Bitwork.dk (&ldquo;Bitwork.dk&rdquo;, &ldquo;we&rdquo;,
          &ldquo;us&rdquo;). By creating a queue, joining one, or otherwise
          using the Service, you agree to these Terms. If you are accepting
          them on behalf of a business, you confirm you have the authority to
          do so.
        </p>

        <h2>1. What the Service is</h2>
        <p>
          Qjume lets a business (a &ldquo;Shop&rdquo;) run one or more waiting
          lines (&ldquo;Queues&rdquo;) that customers can see and join
          remotely, and lets a customer join a Queue, track their place in
          it, and be notified as their turn approaches. A Shop is run by its
          owner and, on paid plans, staff the owner adds. A customer does not
          need an account to join a Queue.
        </p>

        <h2>2. Accounts</h2>
        <p>
          A Shop owner signs in with an email address and is responsible for
          everything done under their account, including staff they add. A
          customer's session is anonymous unless they choose to give an email
          or phone number for updates on their place in a Queue.
        </p>
        <p>
          You must give accurate information and are responsible for keeping
          your sign-in access to yourself. Tell us at{' '}
          <a href="mailto:bitwork@gmail.com">bitwork@gmail.com</a> if you
          believe your account has been accessed without your permission.
        </p>

        <h2>3. Plans, fees and billing</h2>
        <p>
          Qjume offers a free plan and a paid plan with additional features,
          shown in the app. The paid plan is billed on a <strong>recurring
          subscription</strong> at the price and interval shown at checkout,
          charged automatically until cancelled. Payment is processed by
          Stripe; Bitwork.dk never receives or stores your card details.
        </p>
        <p>
          You can cancel at any time from your billing settings. Cancelling
          stops future renewals; it does not refund the period already paid
          for, and access to paid features continues until that period ends.
          Except where the law gives you a right to one, payments already
          made are not refundable. We may change plan pricing with reasonable
          notice; continuing to use the paid plan after a price change takes
          effect means you accept it.
        </p>

        <h2>4. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for anything unlawful, fraudulent, or misleading;</li>
          <li>Create a Queue for a business you are not authorised to represent;</li>
          <li>Interfere with the Service's operation or try to bypass its security, including its queue-ordering and no-show rules;</li>
          <li>Use another person's name or contact details to join a Queue without their knowledge;</li>
          <li>Scrape, resell, or build a competing service from data obtained through the Service.</li>
        </ul>
        <p>
          A Shop found to be doing any of the above may be suspended or
          removed from discovery, and in serious cases removed from the
          Service entirely, at our discretion.
        </p>

        <h2>5. Content you provide</h2>
        <p>
          You are responsible for what you enter — a Shop's name, address,
          description and queue details; a customer's display name. You keep
          ownership of it; by providing it you let us store and display it
          as needed to run the Service (a Queue's details to customers
          discovering it; a customer's chosen name to the Shop serving them
          and to a monitor screen in that Shop, per our{' '}
          <a href="/privacy">Privacy Policy</a>).
        </p>

        <h2>6. Availability</h2>
        <p>
          We aim to keep the Service running but do not guarantee it will be
          uninterrupted or error-free. If a Shop's connection drops, its
          Queue is marked unavailable to new joiners until it reconnects, and
          picks up service from where it left off — we are not responsible
          for a Shop's own network or device failing.
        </p>

        <h2>7. Disclaimers and liability</h2>
        <p>
          The Service is provided &ldquo;as is&rdquo;, without warranties of
          any kind beyond those the law does not allow us to exclude. To the
          fullest extent permitted by law, Bitwork.dk is not liable for
          indirect or consequential losses arising from use of the Service,
          including lost business or lost custom from a Queue being
          unavailable. Nothing in these Terms limits liability for death,
          personal injury, or fraud, where the law does not allow it to be
          limited.
        </p>

        <h2>8. Suspension and termination</h2>
        <p>
          We may suspend or close a Shop's account for breach of these Terms,
          non-payment, or where the law requires it. You may stop using the
          Service, or close your Shop, at any time. Sections that by their
          nature should survive ending your use of the Service — including
          billing already due and the limitation of liability — continue to
          apply.
        </p>

        <h2>9. Changes to these Terms</h2>
        <p>
          We may update these Terms as the Service changes. We will post the
          updated Terms here with a new date; continuing to use the Service
          after that means you accept them. If a change is material, we will
          make a reasonable effort to tell Shop owners directly.
        </p>

        <h2>10. Governing law</h2>
        <p>
          These Terms are governed by the laws of Denmark. Any dispute that
          cannot be resolved directly will be subject to the jurisdiction of
          the Danish courts. If you are an EU consumer, you may also be able
          to use the European Commission's{' '}
          <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noreferrer">
            Online Dispute Resolution
          </a>{' '}
          platform.
        </p>

        <h2>11. Contact</h2>
        <p>
          Bitwork.dk — <a href="mailto:bitwork@gmail.com">bitwork@gmail.com</a>.
        </p>
      </div>
    </main>
  );
}
