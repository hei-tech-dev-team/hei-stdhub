import React from "react";
import { HEI_BLUE_LOGO } from "../../assets/logos";

const GlassDomeLogo = ({ size = "h-12 w-12" }) => {
  return (
    <div className={`relative ${size} flex items-center justify-center select-none group`}>
      
      <div className="absolute inset-0 flex items-center justify-center z-0">
        <img
          src={HEI_BLUE_LOGO}
          alt="HEI Logo"
          className="w-full h-full object-contain"
        />
      </div>

      <div className="absolute inset-[10%] rounded-full bg-black/20 blur-2xl translate-y-[10%] z-10" />

      <div className="absolute inset-0 rounded-full z-20 overflow-hidden pointer-events-none">
        
        <div
          className="absolute inset-0 rounded-full border border-white/[0.12]"
          style={{
            background:
              "radial-gradient(circle at 28% 22%, rgba(255,255,255,0.18), transparent 55%)",
          }}
        />

        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 78% 82%, rgba(0,0,0,0.18), transparent 60%)",
          }}
        />

        <div
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow:
              "inset -12px -16px 24px rgba(0,0,0,0.18), inset 6px 8px 16px rgba(255,255,255,0.16)",
          }}
        />
      </div>
    </div>
  );
};

export default GlassDomeLogo;
