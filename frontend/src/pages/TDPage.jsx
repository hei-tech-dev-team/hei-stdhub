import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import StudentUpload from "../components/td/StudentUpload";
import TeacherInbox from "../components/td/TeacherInbox";
import { useAuth } from "../context/AuthContext";

export default function TDPage() {
  const { user } = useAuth();

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <Navbar title="TD / Examen" />
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
          {user?.role === "teacher" || user?.role === "admin" ? (
            <TeacherInbox />
          ) : (
            <StudentUpload />
          )}
        </div>
      </main>
    </div>
  );
}
