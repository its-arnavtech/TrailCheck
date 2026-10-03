"use client";
import Link from "next/link";
import NavBar from "@/components/navbar";
import Icon from "@/components/ui-icon";
export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main>
      <NavBar />
      <div className="section-shell detail-page">
        <div className="empty-state">
          <Icon name="compass" size={42} />
          <h1 id="main-content" tabIndex={-1} className="text-4xl">
            A small detour.
          </h1>
          <p>
            We couldn’t load this page. Give it another try, or explore the park
            directory while the connection returns.
          </p>
          <button className="button button-forest" onClick={retry}>
            Try again
          </button>
          <Link href="/#explore-parks" className="text-link">
            Explore parks
          </Link>
        </div>
      </div>
    </main>
  );
}
