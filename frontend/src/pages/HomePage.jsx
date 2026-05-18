import Sidebar from "../components/layout/Sidebar";
import TeacherHome from "../components/dashboard/TeacherHome";
import StudentHome from "../components/dashboard/StudentHome";
import AlumniHome from "../components/dashboard/AlumniHome";
import AdminHome from "../components/dashboard/AdminHome";
import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <Sidebar />
      <main
        className="flex-1 flex flex-col min-h-screen overflow-hidden
                       pl-0 lg:pl-0"
      >
        {user?.role === "admin" ? (
          <AdminHome />
        ) : user?.role === "alumni" ? (
          <AlumniHome />
        ) : user?.role === "teacher" ? (
          <TeacherHome />
        ) : (
          <StudentHome />
        )}
      </main>
    </div>
  );
}
