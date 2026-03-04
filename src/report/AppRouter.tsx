import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { lazy, Suspense } from "react";
import { FluentProvider, Spinner } from "@fluentui/react-components";

import { useTheme } from "../context/ThemeContext";

const FieldReportPage = lazy(() => import('./pages/FieldReportPage'));
const FormReportPage = lazy(() => import('./pages/FormReportPage'));
const GlobalOptionSetPage = lazy(() => import('./pages/GlobalOptionSetPage'));
const EntityAttributeBrowserPage = lazy(() => import('./pages/EntityAttributeBrowserPage'));
const PluginTraceLogPage = lazy(() => import('./pages/PluginTraceLogPage'));

function KeepSearchNavigate({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
}

function LoadingFallback() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Spinner size="large" label="Loading..." />
    </div>
  );
}

export default function AppRouter(): JSX.Element {
  const { theme } = useTheme();

  return (
    <HashRouter basename="/report">
      <FluentProvider
        theme={theme}
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh"
        }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <Routes>
              <Route path="/field" element={<FieldReportPage />} />
              <Route path="/form" element={<FormReportPage />} />
              <Route path="/plugin-trace-logs" element={<PluginTraceLogPage />} />
              <Route path="/global-optionsets" element={<GlobalOptionSetPage />} />
              <Route path="/entity-browser" element={<EntityAttributeBrowserPage />} />
              {/* default → field, but keep query params */}
              <Route path="*" element={<KeepSearchNavigate to="/field" />} />
            </Routes>
          </main>
        </Suspense>
      </FluentProvider>
    </HashRouter>
  );
}
