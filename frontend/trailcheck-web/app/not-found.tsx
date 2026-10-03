import Link from "next/link";
import NavBar from "@/components/navbar";
import Icon from "@/components/ui-icon";
export default function NotFound() {
  return (
    <main>
      <NavBar />
      <div className="section-shell detail-page">
        <div className="empty-state">
          <Icon name="compass" size={42} />
          <p className="eyebrow">Off the beaten path · 404</p>
          <h1 id="main-content" tabIndex={-1} className="text-4xl">
            This trail doesn’t lead anywhere.
          </h1>
          <p>
            The page may have moved. There are plenty of beautiful places
            waiting in the park directory.
          </p>
          <Link href="/#explore-parks" className="button button-forest">
            Find a park <Icon name="arrow" size={17} />
          </Link>
        </div>
      </div>
    </main>
  );
}
