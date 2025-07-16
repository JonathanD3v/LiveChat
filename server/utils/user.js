const users = [];

exports.saveUser = (id, name, room) => {
  const user = { id, name, room };

  users.push(user);
  return user;
};

exports.getDisconnectUser = (id) => {
  const index = users.findIndex((user) => user.id === id);
  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
};

exports.getSameRoomUsers = (room) => {
  return users.filter((user) => user.room === room);
};
