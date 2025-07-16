module.exports = format = (name, message) => {
  return {
    name,
    message,
    send_at: Date.now(),
  };
};
