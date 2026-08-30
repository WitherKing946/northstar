import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LearnerProvider } from '@/context/LearnerContext';
import Navbar from '@/components/Navbar/Navbar';
import Dashboard from '@/views/Dashboard/Dashboard';
import GoalChat from '@/views/GoalChat/GoalChat';
import RoadmapView from '@/views/RoadmapView/RoadmapView';
import ProfileForm from '@/views/ProfileForm/ProfileForm';
import './styles/global.css';

export default function App() {
  return (
    <BrowserRouter>
      <LearnerProvider>
        <Navbar />
        <main style={{ flex: 1, paddingTop: 'var(--nav-height)' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/goal" element={<GoalChat />} />
            <Route path="/roadmap/:pathId" element={<RoadmapView />} />
            <Route path="/profile" element={<ProfileForm />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </LearnerProvider>
    </BrowserRouter>
  );
}
