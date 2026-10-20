import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileAlt, faDownload, faImage } from "@fortawesome/free-solid-svg-icons";

export default function AttachmentList({ attachments = [] }) {
    const [failedImages, setFailedImages] = useState({});

    if (!attachments || attachments.length === 0) return null;

    const images = attachments.filter((att) => att.kind === "image");
    const files = attachments.filter((att) => att.kind === "file");

    const displayImages = images.slice(0, 4);
    const extraCount = images.length - 4;

    return (
        <div className="h-full flex flex-col justify-between gap-3">
            {images.length > 0 && (
                <div className={`grid gap-2 h-full ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                    {displayImages.map((img, idx) => {
                        const isLast = idx === 3 && extraCount > 0;
                        return (
                            <div
                                key={img.id || img.url}
                                className="relative w-full h-full min-h-[100px] rounded-2xl overflow-hidden bg-surface border border-gray-100 group"
                            >
                                {failedImages[img.id] ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-2 text-center bg-gray-50">
                                        <FontAwesomeIcon icon={faImage} className="text-lg" />
                                    </div>
                                ) : (
                                    <img
                                        src={img.url}
                                        alt={img.file_name || "Pièce jointe"}
                                        loading="lazy"
                                        onError={() => setFailedImages((prev) => ({ ...prev, [img.id]: true }))}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                )}

                                {isLast && (
                                    <div className="absolute inset-0 bg-navy/60 backdrop-blur-2xs flex items-center justify-center text-white font-bold text-xl">
                                        +{extraCount}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {files.length > 0 && (
                <div className="flex flex-col gap-2">
                    {files.map((file) => (
                        <a
                            key={file.id || file.url}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={file.file_name}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-surface hover:bg-gold/10 text-navy hover:text-gold border border-gray-100 text-xs font-semibold transition-all group"
                        >
                            <div className="flex items-center gap-2 truncate">
                                <FontAwesomeIcon icon={faFileAlt} className="text-gray-400 group-hover:text-gold shrink-0" />
                                <span className="truncate">{file.file_name || "Document"}</span>
                            </div>
                            <FontAwesomeIcon icon={faDownload} className="text-[10px] opacity-60 group-hover:opacity-100 ml-2 shrink-0" />
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}