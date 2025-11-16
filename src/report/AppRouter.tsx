import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { FluentProvider, webDarkTheme } from "@fluentui/react-components";
import FieldReportPage from "./pages/FieldReportPage";

function KeepSearchNavigate({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
}

export default function AppRouter(): JSX.Element {
  return (
    <HashRouter basename="/report">
      <FluentProvider
        theme={webDarkTheme}
        style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
      >
        <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <Routes>
            <Route path="/field" element={<FieldReportPage />} />
            {/* default → field, but keep query params */}
            <Route path="*" element={<KeepSearchNavigate to="/field" />} />
          </Routes>
        </main>
      </FluentProvider>
    </HashRouter>
  );
}
