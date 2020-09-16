const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const yt = require("ytdl-core");
const ytsr = require("ytsr");
const { v4: uuidV4 } = require("uuid");
const fs = require("fs");

const rooms = {};
const currentSong = {};
const lists = {};

let musicEmmiter;

app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.redirect(`/${uuidV4()}`);
});

app.get("/stream", (req, res) => {
  res.sendFile(__dirname + "/public/song.mp3");
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

    socket.on("user-change", (newUserConfig) => {
      socket.to(roomId).broadcast.emit("user-change", newUserConfig);
      manageUsers(roomId, newUserConfig);
    });

    socket.on("stream-on", (userId) => {
      socket.to(roomId).broadcast.emit("stream-on", userId);
    });

    socket.on("stream-off", (userId) => {
      socket.to(roomId).broadcast.emit("stream-off", userId);
    });

    socket.on("stop-call", (userId) => {
      socket.to(roomId).broadcast.emit("stop-call", userId);
    });

    socket.on("pause-music", () => {
      io.to(roomId).emit("pause-music");
    });

    socket.on("play-music", (time) => {
      io.to(roomId).emit("play-music", time);
    });

    socket.on("message", async (message) => {
      socket.to(roomId).broadcast.emit("message", message);

      const command = message.message.split(" ")[0];
      const firstLetter = message.message.charAt(0);
      const args =
        message.message.indexOf(" ") > -1
          ? message.message.slice(message.message.indexOf(" ") + 1, message.message.length)
          : "";

      if (message.message == "puto")
        io.in(roomId).emit("message", { message: "EHHHH, a quien le deci?", id: 1, moment: new Date() });
      if (message.message == "a vo") {
        io.in(roomId).emit("message", {
          message: "Callate boludo que vos te queres culiar al vecino de 90 años",
          id: 1,
          moment: new Date(),
        });
        io.in(roomId).emit("message", {
          message: "que me vas a venir a decir puto a mi",
          id: 1,
          moment: new Date(),
        });
      }

      if (firstLetter !== ".") return;

      switch (command) {
        case firstLetter + "play":
          if (!musicEmmiter) musicEmmiter = socket.id;

          let musicData = {};

          if (args.trimStart().length > 0) {
            if (args.startsWith("http")) {
              musicData.link = args.split("?v=")[1];
            } else {
              musicData.link = args;
            }
            const sr = await ytsr(args, { limit: 1 });
            musicData.link = sr.items[0].link;
            musicData.title = sr.items[0].title;
            musicData.thumbnail = sr.items[0].thumbnail;
            musicData.singer = sr.items[0].author;
            musicData.duration = sr.items[0].duration;

            if (!lists[roomId]) {
              lists[roomId] = [];
            }
            lists[roomId].push(musicData);
          }

          playFollowingSong(roomId);

          break;

        case firstLetter + "pause":
          io.to(roomId).emit("pause-music");
          break;

        default:
          break;
      }
    });
  });
});

async function playFollowingSong(roomId) {
  if (!lists[roomId] || lists[roomId].length == 0) {
    io.in(roomId).emit("message", { message: "No caze que temita queres", id: 1, moment: new Date() });
    return;
  }
  musicData = lists[roomId][0];

  const video = yt(musicData.link, {
    filter: "audioonly",
  });

  const chunks = [];
  for await (let chunk of video) {
    chunks.push(chunk);
  }

  io.to(roomId).emit("music", { ...musicData, start: new Date(), song: Buffer.concat(chunks), playing: true });
  io.in(roomId).emit("message", {
    message: "Perri escuchate " + musicData.title,
    id: 1,
    moment: new Date(),
  });
}

server.listen(process.env.PORT || 3000, () => {
  console.log("Server listening on port " + (process.env.PORT || 3000));
});

function manageUsers(roomId, newUserData) {
  const userIndex = rooms[roomId].findIndex((u) => u.id === newUserData.id);
  if (userIndex > -1) {
    Object.keys(newUserData).forEach((prop) => {
      rooms[roomId][userIndex][prop] = newUserData[prop];
    });
  } else {
    rooms[roomId].push(newUserData);
  }
}
