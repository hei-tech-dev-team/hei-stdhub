import { useState, useEffect, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faExternalLinkAlt,
  faBookOpen,
} from "@fortawesome/free-solid-svg-icons";
import EmptyStateAnimation from "../ui/EmptyStateAnimation";
import Navbar from "../layout/Navbar";
import { useAuth } from "../../context/AuthContext";

const SkeletonPostCard = () => (
  <div className="bg-white rounded-2xl border border-contact/60 p-5 animate-pulse">
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
      <div className="h-5 w-12 bg-gray-200 rounded-full"></div>
      <div className="ml-auto h-4 w-20 bg-gray-200 rounded"></div>
    </div>

    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
    <div className="h-3 bg-gray-200 rounded w-5/6 mb-4"></div>

    <div className="flex items-center justify-between mt-auto pt-3 border-t border-surface/80">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 rounded-full bg-gray-200"></div>
        <div className="h-3 bg-gray-200 rounded w-24"></div>
      </div>
      <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
    </div>
  </div>
);

export default function StudentHome() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col h-screen overflow-y-hidden">
      <Navbar />
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
        {/* Hero */}
        <div className="bg-gradient-to-br from-navy to-navy-dark rounded-2xl p-6 sm:p-8 mb-6 text-white relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-4 relative">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20 flex items-center justify-center shrink-0">
              <FontAwesomeIcon icon={faBookOpen} className="text-gold text-xl sm:text-2xl" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">
                Bonjour, {user?.prenom}
              </h1>
            </div>
          </div>
        </div>
        <EmptyStateAnimation />
      </div>
    </div>
  );
}