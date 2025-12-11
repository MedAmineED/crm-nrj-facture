// router/Router.tsx
/* eslint-disable @typescript-eslint/no-unused-vars */
import DashboardLayout from "@/components/DashboardLayout";
import Contacts from "@/pages/Contacts";
import Login from "@/pages/Login";
import MesLeads from "@/pages/MesLeads";
import MyInvoices from "@/pages/MyInvoices";
import WebsiteLeads from "@/pages/WebsiteLeads";
import React from "react";
import { Navigate, useRoutes, type RouteObject } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import UsersManagement from "@/pages/UsersManagement";
import UnassignedContacts from "@/pages/UnassignedContacts";
import Page from "@/pages/Page";
import UsersVerify from "@/pages/UsersVerify";
import Clients from "@/pages/Clients";
import ClientDetails from "@/pages/ClientDetails";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import Dispatcher from "@/pages/Dispatcher";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  console.log("ProtectedRoute isAuthenticated in ROUTER : ", isAuthenticated);
  if (!isAuthenticated) {
    console.log("ProtectedRoute redirecting to /login");
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const Router: React.FC = () => {
  const routes: RouteObject[] = [
    {
      path: "/",
      element: <Login />,
    },
    {
      path: "/dashboard",
      element: (
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      ),
      children: [
        {
          index: true,
          element: (
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          ),
        },
        {
          path: "contact",
          element: (
            <ProtectedRoute>
              <Contacts />
            </ProtectedRoute>
          ),
        },
        {
          path: "clients",
          element: (
            <ProtectedRoute>
              <Clients />
            </ProtectedRoute>
          ),
        },
        {
          path: "clients/:id",
          element: (
            <ProtectedRoute>
              <ClientDetails />
            </ProtectedRoute>
          ),
        },
        {
          path: "unassigned/:userId",
          element: (
            <ProtectedRoute>
              <UnassignedContacts />
            </ProtectedRoute>
          ),
        },
        {
          path: "mes-leads",
          element: (
            <ProtectedRoute>
              <MesLeads />
            </ProtectedRoute>
          ),
        },
        {
          path: "my-invoices",
          element: (
            <ProtectedRoute>
              <MyInvoices />
            </ProtectedRoute>
          ),
        },
        {
          path: "website-leads",
          element: (
            <ProtectedRoute>
              <WebsiteLeads />
            </ProtectedRoute>
          ),
        },
        {
          path: "users",
          element: (
            <ProtectedRoute>
              <UsersManagement />
            </ProtectedRoute>
          ),
        },
        {
          path: "verify",
          element: (
            <ProtectedRoute>
              <Page />
            </ProtectedRoute>
          ),
        },
        {
          path: "profile",
          element: (
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          ),
        },
        {
          path: "dispatcher",
          element: (
            <ProtectedRoute>
              <Dispatcher />
            </ProtectedRoute>
          ),
        },
        {
          path: "dispatcher/:userId",
          element: (
            <ProtectedRoute>
              <Dispatcher />
            </ProtectedRoute>
          ),
        },
        {
          path: "dispatcher/:userId/assign",
          element: (
            <ProtectedRoute>
              <Dispatcher />
            </ProtectedRoute>
          ),
        },
        {
          path: "dispatcher/:userId/manage",
          element: (
            <ProtectedRoute>
              <Dispatcher />
            </ProtectedRoute>
          ),
        },
      ],
    },
    {
      path: "/login",
      element: <Login />,
    },
                    {
          path: "verify-users",
          element: (
              <UsersVerify />
          ),
        }
  ];

  return useRoutes(routes);
};

export default Router;