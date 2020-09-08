const socket = io("/");
var myPeer = new Peer();

let myVideoStream;
const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");
myVideo.muted = true;
const peers = {};

navigator.mediaDevices
  .getUserMedia({
    video: {
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
    },
    audio: true,
  })
  .then((stream) => {
    myVideoStream = stream;
    addVideoStream(myVideo, stream);

    myPeer.on("call", (call) => {
      console.log("calling");
      call.answer(stream);
      const video = document.createElement("video");
      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream);
      });
    });

    socket.on("user-connected", (userId) => {
      connectToNewUser(userId, stream);
    });
  });

myPeer.on("open", (id) => {
  socket.emit("join-room", ROOM_ID, id);
});

socket.on("user-disconnected", (userId) => {
  console.log(userId);
  if (peers[userId]) peers[userId].close();
});

function connectToNewUser(userId, stream) {
  console.log("conectando a usuario: " + userId);
  const call = myPeer.call(userId, stream);
  const video = document.createElement("video");

  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream);
  });

  call.on("close", () => {
    video.remove();
  });

  peers[userId] = call;
}

function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  videoGrid.append(video);
}
