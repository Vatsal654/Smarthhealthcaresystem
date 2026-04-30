'use client';

import { useAuth } from '@/lib/auth';
import PatientProfile from '@/components/profile/PatientProfile';
import DoctorProfile from '@/components/profile/DoctorProfile';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  if (loading || !user) return null;
  return user.role === 'doctor' ? <DoctorProfile /> : <PatientProfile />;
}
