import { Link } from "react-router-dom";

export function Home() {
  return (
    <div className="page page-home">
      <h1>מצא מניין</h1>
      <p className="subtitle">Find or start a minyan wherever you are.</p>
      <div className="home-actions">
        <Link to="/find" className="big-button big-button-primary">
          מצא מניין
        </Link>
        <Link to="/create" className="big-button big-button-secondary">
          התחל מניין
        </Link>
      </div>
    </div>
  );
}
