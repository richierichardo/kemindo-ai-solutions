export default function HomePage() {
  return (
    <main>
      <section className="shell" aria-labelledby="page-title">
        <div className="eyebrow">Local-first operations</div>
        <h1 id="page-title">Kemindo Operations Platform</h1>
        <p>
          Runtime foundation for Recruitment Intelligence: local CV processing,
          explainable candidate matching, and interview support.
        </p>
        <div className="status" role="status">
          <strong>Runtime ready.</strong> Use <code>/api/health</code> to inspect application and database status.
        </div>
      </section>
    </main>
  );
}
