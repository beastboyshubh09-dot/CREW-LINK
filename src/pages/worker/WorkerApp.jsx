import { Navigate, Route, Routes } from 'react-router-dom';
import WorkerOverview from './WorkerOverview';
import WorkerRequests from './WorkerRequests';
import ActiveJob from './ActiveJob';
import WorkerEarnings from './WorkerEarnings';
import WorkerProfile from './WorkerProfile';
import { WorkerLocationPublisher } from './WorkerOverview';

export default function WorkerApp() { return <><WorkerLocationPublisher/><Routes><Route index element={<WorkerOverview/>}/><Route path="requests" element={<WorkerRequests/>}/><Route path="active" element={<ActiveJob/>}/><Route path="earnings" element={<WorkerEarnings/>}/><Route path="profile" element={<WorkerProfile/>}/><Route path="*" element={<Navigate to="/app/worker" replace/>}/></Routes></>; }