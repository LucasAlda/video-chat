const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const { v4: uuidV4 } = require("uuid");
const users = {};

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
    if (!users[roomId]) users[roomId] = [];
    users[roomId].push(userConfig);
    socket.to(roomId).broadcast.emit("user-connected", userConfig);
    console.log(users);

    socket.on("disconnect", () => {
      socket.to(roomId).broadcast.emit("user-disconnected", userConfig.id);
    });
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Server listening on port " + (process.env.PORT || 3000));
});
