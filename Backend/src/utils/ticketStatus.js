const allowedTransitions = {
  OPEN: ["IN_PROGRESS"],
  IN_PROGRESS: ["WAITING", "RESOLVED", "OPEN"],
  WAITING: ["IN_PROGRESS", "RESOLVED", "OPEN"],
  RESOLVED: ["CLOSED", "OPEN"],
  CLOSED: ["OPEN"],
};

function canTransition(from, to) {
  return allowedTransitions[from]?.includes(to);
}

module.exports = { canTransition };
