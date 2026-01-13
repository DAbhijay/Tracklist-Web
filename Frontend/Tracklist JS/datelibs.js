function formatDateRelative(dateString) {
  const now = new Date();
  const past = new Date(dateString);
  const diffDays = Math.floor(
    (now - past) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

function formatDateFull(dateString) {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function boughtToday(purchases) {
  if (!purchases.length) return false;
  return (
    new Date(purchases[purchases.length - 1]).toDateString() ===
    new Date().toDateString()
  );
}
