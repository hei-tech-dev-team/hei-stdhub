import Sidebar from "../components/layout/Sidebar";
import TeacherHome from "../components/dashboard/TeacherHome";
import StudentHome from "../components/dashboard/StudentHome";
import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {user?.role === "teacher" ? <TeacherHome /> : <StudentHome />}
      </main>
    </div>
  );
}
