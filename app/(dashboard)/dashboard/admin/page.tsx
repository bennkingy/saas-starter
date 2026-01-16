"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Users, TrendingUp, UserCheck } from "lucide-react";
import { SiteLogo } from "@/components/site/site-logo";

interface AdminStats {
  totalUsers: number;
  freeUsers: number;
  proUsers: number;
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  proSignups: Array<{ date: string; count: number }>;
  userSignups: Array<{ date: string; count: number }>;
  revenueData: Array<{ date: string; amount: number }>;
}

const COLORS = ["hsl(188 77% 55%)", "hsl(188 77% 45%)", "hsl(188 77% 65%)", "hsl(188 77% 50%)"];

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/admin/stats");
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            setError("Unauthorized: Admin access required");
          } else {
            setError("Failed to load admin stats");
          }
          return;
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError("Failed to load admin stats");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white to-gray-50">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">Loading admin dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white to-gray-50">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-900 shadow-sm">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const pieData = [
    { name: "Free Users", value: stats.freeUsers },
    { name: "Plus Users", value: stats.proUsers },
  ];

  // Fill in missing dates for charts
  const fillMissingDates = (
    data: Array<{ date: string; count?: number; amount?: number }>,
    days: number = 30
  ) => {
    const result: Array<{ date: string; count: number; amount: number }> = [];
    const today = new Date();
    const dataMap = new Map(
      data.map((d) => [d.date, { count: d.count || 0, amount: d.amount || 0 }])
    );

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const existing = dataMap.get(dateStr);
      result.push({
        date: dateStr,
        count: existing?.count || 0,
        amount: existing?.amount || 0,
      });
    }

    return result;
  };

  const proSignupsChart = fillMissingDates(stats.proSignups);
  const userSignupsChart = fillMissingDates(stats.userSignups);
  const revenueChart = fillMissingDates(stats.revenueData);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white to-gray-50">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-28 -top-28 h-[27rem] w-[27rem] rounded-full bg-primary/10 blur-3xl" />
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <SiteLogo variant="header" showText={true} />
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="mt-1 text-sm text-gray-600">
                Overview of users, subscriptions, and revenue
              </p>
            </div>
          </div>
        </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-primary/10 blur-2xl transition-opacity group-hover:opacity-80" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {stats.totalUsers}
              </p>
            </div>
            <div className="rounded-2xl bg-primary/10 p-3 ring-1 ring-primary/15">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-primary/10 blur-2xl transition-opacity group-hover:opacity-80" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Free Users</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {stats.freeUsers}
              </p>
            </div>
            <div className="rounded-2xl bg-primary/10 p-3 ring-1 ring-primary/15">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-primary/10 blur-2xl transition-opacity group-hover:opacity-80" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Plus Users</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {stats.proUsers}
              </p>
            </div>
            <div className="rounded-2xl bg-primary/10 p-3 ring-1 ring-primary/15">
              <UserCheck className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-primary/10 blur-2xl transition-opacity group-hover:opacity-80" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">MRR</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                £{stats.monthlyRecurringRevenue.toFixed(2)}
              </p>
            </div>
            <div className="rounded-2xl bg-primary/10 p-3 ring-1 ring-primary/15">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Card */}
      <div className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm mb-8 transition-all hover:shadow-md">
        <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-primary/10 blur-2xl transition-opacity group-hover:opacity-80" />
        <div className="relative flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Revenue</h2>
            <p className="text-sm text-gray-600">Last 30 days</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-600">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900">
              £{stats.totalRevenue.toFixed(2)}
            </p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={revenueChart}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              }}
            />
            <YAxis />
            <Tooltip
              formatter={(value: number) => [`£${value.toFixed(2)}`, "Revenue"]}
              labelFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString();
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="hsl(188 77% 55%)"
              strokeWidth={2}
              name="Revenue"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* User Distribution Pie Chart */}
        <div className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-primary/10 blur-2xl transition-opacity group-hover:opacity-80" />
          <h2 className="relative text-xl font-semibold text-gray-900 mb-4">
            User Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Plus Signups Chart */}
        <div className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-primary/10 blur-2xl transition-opacity group-hover:opacity-80" />
          <h2 className="relative text-xl font-semibold text-gray-900 mb-4">
            Plus Signups (Last 30 Days)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={proSignupsChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis />
              <Tooltip
                formatter={(value: number) => [value, "Signups"]}
                labelFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString();
                }}
              />
              <Legend />
              <Bar dataKey="count" fill="hsl(188 77% 55%)" name="Plus Signups" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* User Signups Chart */}
      <div className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
        <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-primary/10 blur-2xl transition-opacity group-hover:opacity-80" />
        <h2 className="relative text-xl font-semibold text-gray-900 mb-4">
          User Signups (Last 30 Days)
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={userSignupsChart}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              }}
            />
            <YAxis />
            <Tooltip
              formatter={(value: number) => [value, "Signups"]}
              labelFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString();
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="count"
              stroke="hsl(188 77% 55%)"
              strokeWidth={2}
              name="User Signups"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      </div>
    </div>
  );
}
