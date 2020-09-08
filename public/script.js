const socket = io("/");
var myPeer = new Peer();
const callList = [];
let users = [];

let myVideoStream;
const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");
myVideo.muted = true;
const peers = {};
const userConfig = { name: window.localStorage.getItem("name") || "John Doe", video: true, audio: true };

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
    // addVideoStream(myVideo, stream, userConfig);
    userConfig.stream = stream;
    users.push(userConfig);
    renderUsers();

    myPeer.on("call", (call) => {
      call.answer(stream);
      users.push({ id: call.peer, name: "Unknown", call: call });
      const video = document.createElement("video");
      call.on("stream", (userVideoStream) => {
        users.find((usr) => usr.id === call.peer).stream = userVideoStream;
        renderUsers();
      });
    });

    socket.on("user-connected", (newUserConfig) => {
      connectToNewUser(newUserConfig, stream);
    });
  });

myPeer.on("open", (id) => {
  userConfig.id = id;
  socket.emit("join-room", ROOM_ID, userConfig);
});

socket.on("user-disconnected", (userId) => {
  console.log(userId);
  if (peers[userId]) peers[userId].close();
});

function connectToNewUser(newUserConfig, stream) {
  console.log("conectando a usuario: " + newUserConfig.name);
  const call = myPeer.call(newUserConfig.id, stream);
  const video = document.createElement("video");
  peers[newUserConfig.id] = call;

  users.push({ ...newUserConfig, call: call });
  renderUsers();

  call.on("stream", (userVideoStream) => {
    users.find((usr) => usr.id === newUserConfig.id).stream = userVideoStream;
    renderUsers();
  });

  call.on("close", () => {
    users = users.filter((usr) => usr.id !== newUserConfig.id);
    console.log(users);
    video.remove();
    callList.filter((cl) => cl !== call.peer);
  });
}

// function addVideoStream(video, stream, userConfig) {
//   video.srcObject = stream;
//   video.addEventListener("loadedmetadata", () => {
//     video.play();
//   });
//   const user = document.createElement("div");
//   user.classList.add("user");
//   const name = document.createElement("span");
//   name.classList.add("name");
//   name.innerText = userConfig.name;
//   console.log("apend");
//   user.append(name);
//   user.append(video);
//   videoGrid.append(user);
// }

function renderUsers() {
  videoGrid.innerHTML = "";
  users.forEach((user) => {
    const video = document.createElement("video");
    console.log(user.stream);
    if (user.stream.id) {
      video.srcObject = user.stream;
      video.addEventListener("loadedmetadata", () => {
        video.play();
      });
    }
    const userDiv = document.createElement("div");
    userDiv.classList.add("user");
    const name = document.createElement("span");
    name.classList.add("name");
    name.innerText = user.name;
    console.log("apend");
    userDiv.append(name);
    userDiv.append(video);
    videoGrid.append(userDiv);
  });
}

document.getElementById("micro-button").addEventListener("click", muteOrUnmute);

function muteOrUnmute(e) {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  console.log("camara was " + enabled);
  if (enabled) {
    userConfig.audio = false;
    document.getElementById("micro-button").classList.add("active");
    myVideoStream.getAudioTracks()[0].enabled = false;
  } else {
    userConfig.audio = true;
    document.getElementById("micro-button").classList.remove("active");
    myVideoStream.getAudioTracks()[0].enabled = true;
  }
}

document.getElementById("camara-button").addEventListener("click", playStopVideo);

function playStopVideo(e) {
  const enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    userConfig.video = true;
    document.getElementById("camara-button").classList.add("active");
    myVideoStream.getVideoTracks()[0].enabled = false;
  } else {
    userConfig.video = false;
    document.getElementById("camara-button").classList.remove("active");
    myVideoStream.getVideoTracks()[0].enabled = true;
  }
}
