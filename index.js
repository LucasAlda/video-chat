const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const { v4: uuidV4 } = require("uuid");
const rooms = {};

app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.redirect(`/${uuidV4()}`);
});

app.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room });
});

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userConfig) => {
    socket.join(roomId);
    console.log("joined");

    if (!rooms[roomId]) rooms[roomId] = [];
    socket.emit("users-list", rooms[roomId]);
    manageUsers(roomId, userConfig);

    socket.to(roomId).broadcast.emit("user-connected", userConfig);

    socket.on("disconnect", () => {
      const disconectedUserIndex = rooms[roomId].findIndex((usr) => usr.id === userConfig.id);
      rooms[roomId].splice(disconectedUserIndex, 1);
      socket.to(roomId).broadcast.emit("user-disconnected", userConfig.id);
    });

    socket.on("stream-off", (userId) => {
      socket.to(roomId).broadcast.emit("stream-off", userId);
    });

    socket.on("user-change", (newUserConfig) => {
      socket.to(roomId).broadcast.emit("user-change", newUserConfig);
      manageUsers(roomId, newUserConfig);
    });

    socket.on("stream-on", (userId) => {
      socket.to(roomId).broadcast.emit("stream-on", userId);
    });
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Server listening on port " + (process.env.PORT || 3000));
});

function manageUsers(roomId, newUserData) {
  const userIndex = rooms[roomId].findIndex((u) => u.id === newUserData.id);
  console.log(userIndex);
  if (userIndex > -1) {
    Object.keys(newUserData).forEach((prop) => {
      rooms[roomId][userIndex][prop] = newUserData[prop];
    });
  } else {
    rooms[roomId].push(newUserData);
  }

  console.log(rooms[roomId]);
}
