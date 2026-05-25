import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./components/app-shell";
import { LibraryPage } from "./pages/library";
import { TargetsPage } from "./pages/targets";
import { ActivityPage } from "./pages/activity";
import { SettingsPage } from "./pages/settings";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <LibraryPage /> },
      { path: "targets", element: <TargetsPage /> },
      { path: "activity", element: <ActivityPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
