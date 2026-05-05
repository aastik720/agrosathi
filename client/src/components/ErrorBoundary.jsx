import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  handleReset = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-shell flex min-h-[75vh] items-center justify-center">
          <div className="max-w-lg rounded-lg border border-red-100 bg-white p-6 text-center shadow-soft">
            <p className="text-sm font-bold text-red-600">कुछ गलत हुआ / Something went wrong</p>
            <h1 className="mt-2 text-2xl font-extrabold text-slate-950">
              AgroSaathi ko dobara load karein
            </h1>
            <button className="primary-button mt-5" type="button" onClick={this.handleReset}>
              Dobara Koshish Karein / Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
