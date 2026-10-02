"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import ModalShell from "@/components/modal-shell";
import Icon from "@/components/ui-icon";
import { clearStoredSession } from "@/lib/auth";
import { useAuthSession } from "@/lib/use-auth-session";
const AuthPanel = dynamic(() => import("@/components/auth-panel"));
const FavoritesPanel = dynamic(() => import("@/components/favorites-panel"));
type Props = {
  parkHref?: string;
  parkLabel?: string;
  trailHref?: string;
  trailLabel?: string;
  home?: boolean;
};
export default function NavBar({
  parkHref,
  parkLabel,
  trailLabel,
  home = false,
}: Props) {
  const [authOpen, setAuthOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { isLoading, user } = useAuthSession();
  return (
    <>
      <header className="site-header">
        <nav className="section-shell nav-content" aria-label="Main navigation">
          <Link href="/" className="wordmark" aria-label="TrailCheck home">
            <span className="brand-mark">
              <Icon name="mountain" size={26} />
            </span>
            trailcheck<span className="brand-dot">.</span>
          </Link>
          <div className="nav-links">
            <Link href="/#explore-parks">Explore parks</Link>
            <Link href="/#safety-digest">Plan your day</Link>
            <Link href="/#park-map">The park map</Link>
          </div>
          <div className="nav-actions">
            <button
              className="nav-saved"
              onClick={() => (user ? setSavedOpen(true) : setAuthOpen(true))}
            >
              <Icon name="heart" size={17} />
              <span>Saved places</span>
            </button>
            {isLoading ? (
              <span className="nav-loading">Loading…</span>
            ) : user ? (
              <button
                className="button button-outline nav-account"
                onClick={() => clearStoredSession()}
                title={`Sign out of ${user.email}`}
              >
                Sign out
              </button>
            ) : (
              <button
                className="button button-forest nav-account"
                onClick={() => setAuthOpen(true)}
              >
                Sign in <Icon name="arrow" size={15} />
              </button>
            )}
            <button
              className="nav-menu"
              aria-label="Toggle navigation"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((value) => !value)}
            >
              <Icon name={menuOpen ? "close" : "menu"} />
            </button>
          </div>
        </nav>
        {menuOpen && (
          <div className="mobile-navigation">
            <Link href="/#explore-parks" onClick={() => setMenuOpen(false)}>
              Explore parks
            </Link>
            <Link href="/#safety-digest" onClick={() => setMenuOpen(false)}>
              Plan your day
            </Link>
            <Link href="/#park-map" onClick={() => setMenuOpen(false)}>
              The park map
            </Link>
          </div>
        )}
      </header>
      {!home && parkLabel && (
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          {trailLabel && parkHref ? (
            <Link href={parkHref}>{parkLabel}</Link>
          ) : (
            <span aria-current="page">{parkLabel}</span>
          )}
          {trailLabel && (
            <>
              <span>/</span>
              <span aria-current="page">{trailLabel}</span>
            </>
          )}
        </nav>
      )}
      {authOpen && (
        <ModalShell
          title="Your TrailCheck account"
          onClose={() => setAuthOpen(false)}
        >
          <AuthPanel />
        </ModalShell>
      )}
      {savedOpen && (
        <ModalShell
          title="Your saved parks"
          onClose={() => setSavedOpen(false)}
          widthClassName="max-w-lg"
        >
          <FavoritesPanel />
        </ModalShell>
      )}
    </>
  );
}
