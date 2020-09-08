const socket = io("/");
const myPeer = new Peer();
const screenPeer = new Peer();
const callList = [];
let users = [];

let myVideoStream;
let myScreenStream;
const videoGrid = document.getElementById("video-grid");
const shareButton = document.getElementById("share-button");
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
    userConfig.stream = stream;
    users.push(userConfig);
    renderUsers();

    myPeer.on("call", (call) => {
      call.answer(stream);
      users.push({ id: call.peer, name: "Unknown", call: call });
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
  const goneUser = users.findIndex((user) => user.id === userId);
  console.log(goneUser);
  if (goneUser !== -1) {
    users[goneUser].call.close();
    users.splice(goneUser, 1);
  }
});

function connectToNewUser(newUserConfig, stream) {
  console.log("conectando a usuario: " + newUserConfig.name);
  const call = myPeer.call(newUserConfig.id, stream);

  users.push({ ...newUserConfig, call: call });
  renderUsers();

  call.on("stream", (userVideoStream) => {
    users.find((usr) => usr.id === newUserConfig.id).stream = userVideoStream;
    renderUsers();
  });

  call.on("close", () => {
    users = users.filter((usr) => usr.id !== newUserConfig.id);
    console.log(users);
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
    const userDiv = document.createElement("div");
    userDiv.classList.add("user");
    const name = document.createElement("span");
    name.classList.add("name");
    name.innerText = user.name;
    console.log("apend");
    userDiv.append(name);

    if (user.stream?.id) {
      video.srcObject = user.stream;
      video.addEventListener("loadedmetadata", () => {
        video.play();
      });
      if (user.id === userConfig.id) {
        video.muted = true;
      }
    }
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

shareButton.addEventListener("click", () => {
  navigator.mediaDevices.getDisplayMedia({ video: { height: { ideal: 720 } }, audio: true }).then((stream) => {
    myScreenStream = stream;
    users.forEach((user) => {
      if (user.id !== userConfig.id) {
        const call = screenPeer.call(user.id, myScreenStream);
        console.log("call to: " + user.id);
      }
    });
    users.push({ id: screenPeer.id, stream: myScreenStream, name: "Screen" });
    renderUsers();
  });
});
