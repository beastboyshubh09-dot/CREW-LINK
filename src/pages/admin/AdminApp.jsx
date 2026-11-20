import { Navigate, Route, Routes } from 'react-router-dom';
import AdminOverview from './AdminOverview';
import Verifications from './Verifications';
import People from './People';
import AdminJobs from './AdminJobs';

export default function AdminApp() { return <Routes><Route index element={<AdminOverview/>}/><Route path="verifications" element={<Verifications/>}/><Route path="people" element={<People/>}/><Route path="jobs" element={<AdminJobs/>}/><Route path="*" element={<Navigate to="/app/admin" replace/>}/></Routes>; }