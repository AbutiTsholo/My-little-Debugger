import { createBrowserRouter } from "react-router";
import Registration from "./components/Registration";
import AuthSuccess from "./components/AuthSuccess";
import Login from "./components/Login";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./components/Dashboard";
import UploadCode from "./components/UploadCode";
import AnalyzeCode from "./components/AnalyzeCode";
import ErrorAnalysis from "./components/ErrorAnalysis";
import ChatAssistant from "./components/ChatAssistant";
import ErrorHistory from "./components/ErrorHistory";
import Reports from "./components/Reports";
import Settings from "./components/Settings";
import AdminPanel from "./components/AdminPanel";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Registration,
  },
  {
    path: "/auth-success",
    Component: AuthSuccess,
  },
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/dashboard",
    Component: DashboardLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "upload", Component: UploadCode },
      { path: "analyze", Component: AnalyzeCode },
      { path: "error-analysis", Component: ErrorAnalysis },
      { path: "chat", Component: ChatAssistant },
      { path: "history", Component: ErrorHistory },
      { path: "reports", Component: Reports },
      { path: "settings", Component: Settings },
      { path: "admin", Component: AdminPanel },
    ],
  },
]);
