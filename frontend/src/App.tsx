import { Routes, Route, NavLink } from "react-router-dom";
import UploadPage from "./pages/UploadPage";
import EntitiesPage from "./pages/EntitiesPage";

/**
 * Main App Component
 *
 * Provides navigation and routing for the application.
 */
function App() {
  return (
    <div className="app">
      <header className="navbar">
        <h1>Document Extractor</h1>
        <nav>
          <NavLink
            to="/"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Upload
          </NavLink>
          <NavLink
            to="/entities"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Records
          </NavLink>
        </nav>
      </header>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/entities" element={<EntitiesPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
