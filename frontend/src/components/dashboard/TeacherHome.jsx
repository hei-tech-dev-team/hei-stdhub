import { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChalkboardTeacher,
} from "@fortawesome/free-solid-svg-icons";
import Navbar from "../layout/Navbar";
import { useAuth } from "../../context/AuthContext";

export default function TeacherHome() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col h-full">
      <Navbar />
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="bg-gradient-to-br from-navy to-navy-dark rounded-2xl p-6 sm:p-8 mb-6 text-white relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-4 relative">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20 flex items-center justify-center shrink-0">
              <FontAwesomeIcon icon={faChalkboardTeacher} className="text-gold text-xl sm:text-2xl" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">
                Bonjour, {user?.prenom}
              </h1>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}