import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCommentDots } from "@fortawesome/free-solid-svg-icons";

export default function WelcomeMessageBubble({ message, bubbleUrl, isPreview = false }) {
  const bubbleStyle = bubbleUrl ? {
    backgroundImage: `url(${bubbleUrl})`,
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat',
    padding: '24px 32px',
    minWidth: '180px',
    minHeight: '80px',
    color: '#1a1a1a',
  } : {};

  return (
    <>
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
      `}</style>
      <div className={`${isPreview ? 'relative' : 'fixed bottom-4 right-4 z-50'} animate-fade-in-up`}>
        {bubbleUrl ? (
          <div
            className="relative flex items-center justify-center drop-shadow-xl"
            style={bubbleStyle}
          >
            <p className="text-sm font-bold text-gray-800 text-center leading-tight">
              {message}
            </p>
          </div>
        ) : (
          <div className="bg-navy text-white px-5 py-3 rounded-2xl shadow-lg flex items-center gap-3 border border-white/10">
            <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
              <FontAwesomeIcon icon={faCommentDots} className="text-gold text-sm" />
            </div>
            <p className="text-sm font-medium pr-1">{message}</p>
          </div>
        )}
      </div>
    </>
  );
}
