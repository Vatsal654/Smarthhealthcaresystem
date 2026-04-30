'use client';

import { useAuth } from '@/lib/auth';
import PatientDashboard from '@/components/dashboards/PatientDashboard';
import DoctorDashboard from '@/components/dashboards/DoctorDashboard';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  if (loading || !user) return null;

  if (user.role === 'doctor') return <DoctorDashboard />;
  return <PatientDashboard />;
}
