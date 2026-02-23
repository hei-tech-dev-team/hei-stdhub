import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import StudentUpload from "../components/td/StudentUpload";
import TeacherInbox from "../components/td/TeacherInbox";
import { useAuth } from "../context/AuthContext";

export default function TDPage() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <Navbar title="TD / Examen" />
        <div className="flex-1 p-8 overflow-y-auto">
          {user?.role === "teacher" ? <TeacherInbox /> : <StudentUpload />}
        </div>
      </main>
    </div>
  );
}
