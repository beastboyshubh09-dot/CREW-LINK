import { Navigate, Route, Routes } from 'react-router-dom';
import RequesterOverview from './RequesterOverview';
import MyJobs from './MyJobs';
import PostJob from './PostJob';
import JobDetail from './JobDetail';

export default function RequesterApp() {
  return <Routes><Route index element={<RequesterOverview/>}/><Route path="jobs" element={<MyJobs/>}/><Route path="post" element={<PostJob/>}/><Route path="jobs/:jobId" element={<JobDetail/>}/><Route path="*" element={<Navigate to="/app/requester" replace/>}/></Routes>;
}