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
        <div className="flex-1 lg:overflow-hidden overflow-y-auto p-3 sm:p-4 lg:p-5">
          <div className="lg:h-full">
            {user?.role === "teacher" || user?.role === "admin" ? (
              <TeacherInbox />
            ) : (
              <StudentUpload />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
