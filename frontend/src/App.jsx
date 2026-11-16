import Dashboard from "./components/Dashboard";
import "./App.css";

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-dot" />
          <h1>NetSight AI</h1>
        </div>
        <p className="subtitle">Intelligent Network Traffic Analyzer</p>
      </header>
      <Dashboard />
    </div>
  );
}

export default App;
