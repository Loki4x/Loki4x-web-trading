export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-content px-6 py-12">
      <h1 className="text-h2 text-text-primary">Privacy Policy</h1>
      <p className="mt-2 text-body-sm text-text-muted">Last updated: September 2026</p>

      <div className="mt-8 flex flex-col gap-8 text-body-sm text-text-secondary">
        <section>
          <h2 className="mb-2 text-h3 text-text-primary">1. Introduction</h2>
          <p>
            Loki4x Academy (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) respects your privacy. This
            Privacy Policy explains what information we collect when you use our trading journal and
            market news platform, and how we use, store, and protect it.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-h3 text-text-primary">2. Information We Collect</h2>
          <ul className="list-disc pl-5">
            <li>Account information: name, email address, and authentication data (including via Google sign-in).</li>
            <li>Trading data you enter: trades, notes, screenshots, and other journal content you submit.</li>
            <li>Usage data: pages visited, features used, and general device/browser information.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-h3 text-text-primary">3. How We Use Your Information</h2>
          <p>
            We use your information to operate and improve the platform, provide the features you request
            (such as your journal, dashboard, and account settings), secure your account, and communicate
            important updates such as OTP verification codes.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-h3 text-text-primary">4. Third-Party Services</h2>
          <p>We rely on trusted third-party providers to run the platform, including:</p>
          <ul className="mt-2 list-disc pl-5">
            <li>Supabase — authentication and database hosting.</li>
            <li>Google — optional sign-in.</li>
            <li>Cloudflare R2 — storage for uploaded images.</li>
            <li>Resend — sending verification and account emails.</li>
            <li>TradingView — embedded market data and economic calendar widgets.</li>
          </ul>
          <p className="mt-2">These providers process data only as needed to deliver their service to us.</p>
        </section>

        <section>
          <h2 className="mb-2 text-h3 text-text-primary">5. Data Security</h2>
          <p>
            We take reasonable technical and organizational measures to protect your data. However, no
            method of transmission or storage is 100% secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-h3 text-text-primary">6. Your Rights</h2>
          <p>
            You may request to access, correct, or delete your personal data at any time by contacting us
            at the email below.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-h3 text-text-primary">7. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. Continued use of the platform after changes means you accept the updated policy.</p>
        </section>

        <section>
          <h2 className="mb-2 text-h3 text-text-primary">8. Contact Us</h2>
          <p>Questions about this policy? Reach us at support@4xcomunity.my.id.</p>
        </section>
      </div>
    </main>
  );
}
