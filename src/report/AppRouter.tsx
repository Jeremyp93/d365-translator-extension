import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import FieldReportPage from './pages/FieldReportPage';

export default function AppRouter(): JSX.Element {
  return (
    <FluentProvider theme={webLightTheme}>
      <BrowserRouter>
        <Routes>
          <Route path="/report/field" element={<FieldReportPage />} />
          {/* default → field for now */}
          <Route path="*" element={<Navigate to="/report/field" replace />} />
        </Routes>
      </BrowserRouter>
    </FluentProvider>
  );
}
