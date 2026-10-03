import Link from "next/link";
import Icon from "@/components/ui-icon";
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="section-shell footer-main">
        <div>
          <Link href="/" className="wordmark">
            <Icon name="mountain" size={28} />
            trailcheck.
          </Link>
          <p>
            For the places worth getting lost in.
            <br />
            And the information that helps you get home.
          </p>
        </div>
        <div className="footer-links">
          <Link href="/#explore-parks">Explore parks</Link>
          <Link href="/#park-map">Park map</Link>
          <Link href="/photo-credits">Photo credits</Link>
          <Link href="/privacy">Privacy</Link>
          <a href="https://github.com/its-arnavtech/TrailCheck">
            GitHub <Icon name="arrow" size={14} />
          </a>
        </div>
      </div>
      <div className="section-shell footer-bottom">
        <span>© {new Date().getFullYear()} TrailCheck</span>
        <span>Made for a life outside.</span>
        <span>Scenic hero artwork generated with AI.</span>
      </div>
    </footer>
  );
}
