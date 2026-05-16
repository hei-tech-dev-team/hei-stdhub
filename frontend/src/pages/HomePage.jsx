import Sidebar from "../components/layout/Sidebar";
import TeacherHome from "../components/dashboard/TeacherHome";
import StudentHome from "../components/dashboard/StudentHome";
import AlumniHome from "../components/dashboard/AlumniHome";
import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {user?.role === "alumni" ? (
          <AlumniHome />
        ) : user?.role === "teacher" || user?.role === "admin" ? (
          <TeacherHome />
        ) : (
          <StudentHome />
        )}
      </main>
    </div>
  );
}
