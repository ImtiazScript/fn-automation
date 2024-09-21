import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from "react-router-dom";
import store from "./store.js";
import { Provider } from "react-redux";
import App from "./App.jsx";
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";

//? ==================================== User Screens Import ====================================
import PrivateRoutes from "./screens/userScreens/PrivateRoutes.jsx";
import RegisterScreen from "./screens/userScreens/RegisterScreen.jsx";
import ProfileScreen from "./screens/userScreens/ProfileScreen.jsx";

//? ==================================== Admin Screens Import ====================================
import AdminPrivateRoutes from "./screens/adminScreens/PrivateRoutes.jsx";
import AdminRegisterScreen from "./screens/adminScreens/RegisterScreen.jsx";
import AdminProfileScreen from "./screens/adminScreens/ProfileScreen.jsx";
import CommonPrivateRoutes from "./screens/commonScreens/PrivateRoutes.jsx";
import UsersManagementScreen from "./screens/adminScreens/UsersManagementScreen.jsx";
import CronsManagementScreen from "./screens/commonScreens/CronsManagementScreen.jsx";
import CronConfigureScreen from "./screens/commonScreens/CronConfigureScreen.jsx";
import LogsScreen from "./screens/adminScreens/LogsScreen.jsx";

//? ==================================== Common Screens Import ====================================
import HomeScreen from "./screens/commonScreens/HomeScreen.jsx";
import LoginScreen from "./screens/commonScreens/LoginScreen.jsx";
import IntegrationScreen from "./screens/commonScreens/IntegrationScreen.jsx";
import AboutScreen from "./screens/commonScreens/AboutScreen.jsx";
import ContactScreen from "./screens/commonScreens/ContactScreen.jsx";
import PasswordForgotScreen from "./screens/commonScreens/PasswordForgotScreen.jsx";
import PasswordResetScreen from './screens/commonScreens/PasswordResetScreen.jsx';

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />}>
      {/* ===================================== Common Routes ===================================== */}
      <Route index={true} path="/" element={<HomeScreen />} />
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/register" element={<RegisterScreen />} />
      <Route path="/about" element={<AboutScreen />} />
      <Route path="/contact" element={<ContactScreen />} />
      <Route path="/forgot-password" element={<PasswordForgotScreen />} />
      <Route path="/reset-password" element={<PasswordResetScreen />} />
      {/* COMMON PRIVATE ROUTES */}
      <Route path="" element={<CommonPrivateRoutes />}>
        <Route path="/crons/manage-crons" element={<CronsManagementScreen />} />
        <Route path="/crons/configure-cron/:cronId" element={<CronConfigureScreen />} />
        <Route path="/connect-account" element={<IntegrationScreen />} />
      </Route>

      {/* ===================================== User Routes ===================================== */}
      {/* USER PRIVATE ROUTES */}
      <Route path="" element={<PrivateRoutes />}>
        <Route path="/profile" element={<ProfileScreen />} />
      </Route>

      {/* ===================================== Admin Routes ===================================== */}
      <Route path="/admin/register" element={<AdminRegisterScreen />} />
      {/* ADMIN PRIVATE ROUTES */}
      <Route path="" element={<AdminPrivateRoutes />}>
        <Route path="/admin/profile" element={<AdminProfileScreen />} />
        <Route path="/admin/manage-users" element={<UsersManagementScreen />} />
        <Route path="/crons/manage-crons" element={<CronsManagementScreen />} />
        <Route path="/crons/configure-cron/:cronId" element={<CronConfigureScreen />} />
        <Route path="/admin/logs" element={<LogsScreen />} />
      </Route>
    </Route>
  )
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  </Provider>
);
