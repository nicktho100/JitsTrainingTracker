export const dynamic = "force-dynamic";

export default function AccessRequired() {
  return (
    <main className="access-shell">
      <section className="access-card">
        <div className="brand-mark" aria-hidden="true">M</div>
        <p className="eyebrow">Private training history</p>
        <h1>Cloudflare Access is required.</h1>
        <p>
          This tracker is locked until its Cloudflare Access policy and JWT
          settings are configured. No training data is available without a
          verified Access identity.
        </p>
      </section>
    </main>
  );
}
