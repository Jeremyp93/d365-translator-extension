import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { FluentProvider } from "@fluentui/react-components";
import { useTheme } from "../context/ThemeContext";
import FieldReportPage from "./pages/FieldReportPage";
import FormReportPage from "./pages/FormReportPage";

function KeepSearchNavigate({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
}

export default function AppRouter(): JSX.Element {
  const { theme } = useTheme();
  
  return (
    <HashRouter basename="/report">
      <FluentProvider
        theme={theme}
        style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
      >
        <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <Routes>
            <Route path="/field" element={<FieldReportPage />} />
            <Route path="/form" element={<FormReportPage />} />
            {/* default → field, but keep query params */}
            <Route path="*" element={<KeepSearchNavigate to="/field" />} />
          </Routes>
        </main>
      </FluentProvider>
    </HashRouter>
  );
}
