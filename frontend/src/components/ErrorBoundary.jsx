import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || "The page could not be displayed."
    };
  }

  componentDidCatch(error, info) {
    console.error("BlogVerse render error:", error, info);
  }

  reloadPage = () => {
    window.location.reload();
  };

  goHome = () => {
    window.location.assign("/");
  };

  clearSessionAndReload = () => {
    localStorage.removeItem("blogverse_token");
    localStorage.removeItem("blogverse_user");
    window.location.assign("/login");
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="crash-screen">
        <div className="crash-card">
          <div className="crash-badge">BV</div>
          <span className="overline">Recovery mode</span>
          <h1>This page did not load correctly.</h1>
          <p>
            BlogVerse caught the error instead of showing a blank white screen.
            Reload the page first. If the problem happened after login, reset the local session.
          </p>
          {this.state.errorMessage && <code>{this.state.errorMessage}</code>}
          <div className="crash-actions">
            <button className="button button-primary" onClick={this.reloadPage}>Reload page</button>
            <button className="button button-ghost" onClick={this.goHome}>Go to home</button>
            <button className="button button-ghost" onClick={this.clearSessionAndReload}>Reset login</button>
          </div>
        </div>
      </main>
    );
  }
}
