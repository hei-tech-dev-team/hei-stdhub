export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const GROUP_GAP = 5 * MINUTE;

export const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const getDayDiff = (a, b) => {
  const ta = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const tb = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ta - tb) / DAY);
};

export const formatTime = (date) =>
  date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export const formatDateLabel = (date) => {
  const now = new Date();
  const diff = getDayDiff(now, date);

  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Hier";
  if (diff < 7)
    return date.toLocaleDateString("fr-FR", { weekday: "long" });

  if (date.getFullYear() === now.getFullYear())
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
    });

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export const formatMessageTime = (date) => {
  const now = new Date();
  const diff = getDayDiff(now, date);

  if (diff === 0) return formatTime(date);
  if (diff === 1) return `Hier ${formatTime(date)}`;
  if (diff < 7)
    return `${date.toLocaleDateString("fr-FR", { weekday: "short" })} ${formatTime(date)}`;

  if (date.getFullYear() === now.getFullYear())
    return (
      date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
      }) +
      ` ${formatTime(date)}`
    );

  return (
    date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }) +
    ` ${formatTime(date)}`
  );
};

export const formatTooltipDate = (date) =>
  date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }) + ` à ${formatTime(date)}`;

export const isFileMessage = (content) => content.startsWith("[FILE:");

export const parseFileContent = (content) => {
  if (!content.startsWith("[FILE:") || !content.endsWith("]")) return null;
  const inner = content.slice(6, -1);

  // new format: [FILE:filename:url:img] or [FILE:filename:url:file]
  const newMatch = inner.match(/^(.*?):(.+):(img|file)$/);
  if (newMatch) {
    return { filename: newMatch[1], url: newMatch[2], type: newMatch[3] };
  }

  // old format: [FILE:filename:url]
  const oldMatch = inner.match(/^(.*?):(.+)$/);
  if (oldMatch) {
    const filename = oldMatch[1];
    const url = oldMatch[2];
    const isImage =
      /\.(jpg|jpeg|png|gif|webp)/i.test(url) ||
      /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
    return { filename, url, type: isImage ? "img" : "file" };
  }

  return null;
};

export const shouldGroup = (prevMsg, nextMsg) => {
  if (!prevMsg || !nextMsg) return false;
  if (prevMsg.own !== nextMsg.own) return false;
  if (prevMsg.sender !== nextMsg.sender) return false;

  const prevDate = new Date(prevMsg.createdAt);
  const nextDate = new Date(nextMsg.createdAt);
  const gap = nextDate.getTime() - prevDate.getTime();

  return gap > 0 && gap < GROUP_GAP;
};
