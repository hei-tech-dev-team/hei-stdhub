import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFile, faDownload, faImage } from "@fortawesome/free-solid-svg-icons";

export default function AttachmentList({ attachments = [] }) {
    const [failedImages, setFailedImages] = useState({});

    if (!attachments || attachments.length === 0) return null;

    const images = attachments.filter((att) => att.kind === "image");
    const files = attachments.filter((att) => att.kind === "file");

    const handleImgError = (id) => {
        setFailedImages((prev) => ({...prev, [id]: true}));
    };

    return (
        <div className="mt-3 space-y-3">
            {images.length > 0 && (
                <div
                className={`grid gap-2 ${
                    images.length === 1
                    ? "grid-cols-1"
                    : images.length === 2
                    ? "grid-cols-2"
                    : "grid-cols-2 sm:grid-cols-3"
                }`}
                >
                {images.map((img) => (
                    <div
                    key={img.id || img.url}
                    className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 ring-1 ring-gray-200/50"
                    >
                    {failedImages[img.id] ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-2 text-center">
                            <FontAwesomeIcon icon={faImage} className="text-xl mb-1" />
                            <span className="text-[10px]">Image indisponible</span>
                        </div>
                    ) : (
                        <img
                            src={img.url}
                            alt={img.file_name || "Pièce jointe"}
                            loading="lazy"
                            onError={() => handleImgError(img.id)}
                            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                    )}
                    </div>
                ))}
                </div>
            )}

            {files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {files.map((file) => (
                        <a
                            key={file.id || file.url}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={file.file_name}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface hover:bg-gold/10 text-navy hover:text-gold border border-gray-100 text-xs font-semibold transition-all group"
                        >
                            <FontAwesomeIcon icon={faFile} className="text-gray-400 group-hover:text-gold" />
                            <span className="truncate max-w-[180px]">{file.file_name || "Document"}</span>
                            <FontAwesomeIcon icon={faDownload} className="text-[10px] opacity-60 group-hover:opacity-100 ml-1" />
                        </a>
                    ))}
                </div>
            )}
        </div>
    )
}
