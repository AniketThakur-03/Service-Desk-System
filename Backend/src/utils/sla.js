function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function computeSlaDueAt(priority) {
  const now = new Date();
  switch (priority) {
    case "URGENT":
      return addHours(now, 4);
    case "HIGH":
      return addHours(now, 24);
    case "MEDIUM":
      return addHours(now, 72);
    case "LOW":
      return addHours(now, 120);
    default:
      return addHours(now, 72);
  }
}

module.exports = { computeSlaDueAt };
