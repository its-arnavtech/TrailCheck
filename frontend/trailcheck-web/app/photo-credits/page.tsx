import NavBar from "@/components/navbar";
import photos from "@/lib/park-photo-credits.json";
import { PARK_CATALOG } from "@/lib/park-catalog";
export default function PhotoCredits() {
  return (
    <main>
      <NavBar />
      <div className="section-shell detail-page">
        <p className="eyebrow">The people behind the views</p>
        <h1 id="main-content" tabIndex={-1} className="text-5xl">
          Photo credits.
        </h1>
        <p className="detail-description">
          Park photographs are sourced from National Park Service galleries with
          their original credits. All 63 parks have authentic NPS photographs.
          The homepage hero is AI-generated Yosemite-inspired artwork and does
          not show current conditions.
        </p>
        <div className="credits-grid">
          {Object.entries(photos).map(([slug, photo]) => (
            <article key={slug}>
              <h2>
                {PARK_CATALOG.find((park) => park.slug === slug)?.name ?? slug}
              </h2>
              <p>{photo.credit}</p>
              <a
                href={photo.pageUrl}
                className="text-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                View photo source ↗
              </a>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
