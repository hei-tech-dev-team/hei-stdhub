import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileAlt,
  faLink,
  faDownload,
} from "@fortawesome/free-solid-svg-icons";

export default function ArchiveCard({ post }) {
  const isFile = !!post.file_path;

  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden hover:shadow-md transition-all flex flex-col h-full border border-transparent hover:border-gold/30">
      <div className="p-5 flex flex-col h-full">
        <div className="flex items-start justify-between mb-3">
          <span className="inline-block px-2 py-1 rounded bg-navy/5 text-navy text-[10px] font-bold uppercase tracking-wider">
            {post.ue}
          </span>
          <span
            className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
              post.type === "cours"
                ? "bg-blue-100 text-blue-600"
                : post.type === "td"
                ? "bg-gold/10 text-gold"
                : "bg-purple-100 text-purple-600"
            }`}
          >
            {post.type}
          </span>
        </div>

        <h3 className="font-bold text-navy text-base mb-2 line-clamp-2" title={post.title}>
          {post.title}
        </h3>

        {post.description && (
          <p className="text-gray-500 text-xs mb-4 line-clamp-2">
            {post.description}
          </p>
        )}

        <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="text-[10px] text-gray-400">
            Par <span className="font-semibold text-gray-600">{post.author_pseudo || "Anonyme"}</span>
          </div>

          <a
            href={isFile ? `/${post.file_path}` : post.link}
            target={isFile ? "_self" : "_blank"}
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-navy hover:text-gold transition-colors text-xs font-bold"
          >
            <FontAwesomeIcon icon={isFile ? faDownload : faLink} className="text-[10px]" />
            {isFile ? "Télécharger" : "Lien"}
          </a>
        </div>
      </div>
    </div>
  );
}