const socket = io("/");
const myPeer = new Peer();
const screenPeer = new Peer();
let users = [];
let myStreaming = false;
let someoneStreaming = false;
let showBig = false;

let devices = [];
let myVideoStream;
let myScreenStream;

let currentSongData;

const videoGrid = document.getElementById("video-grid");
const videoSelect = document.getElementById("video-devices");
const audioSelect = document.getElementById("audio-devices");
const enterCallControls = document.getElementById("enter-call-controls");
const callControls = document.getElementById("call-controls");

const userConfig = {
  name: window.localStorage.getItem("name") || "John Doe",
  stream: false,
  video: false,
  audio: false,
};

const colors = ["red", "orange", "yellow", "white", "blue", "violet"];
let availableColors = [...colors];

/*****  DEVICES  ******/

navigator.mediaDevices.enumerateDevices().then((dvs) => {
  devices = dvs;
  videoSelect.innerHTML = "";
  audioSelect.innerHTML = "";
  const defVideoOption = document.createElement("option");
  defVideoOption.innerText = "Sin Cámara";
  defVideoOption.value = "";
  videoSelect.appendChild(defVideoOption);
  const defAudioOption = document.createElement("option");
  defAudioOption.innerText = "Sin Microfono";
  defAudioOption.value = "";
  audioSelect.appendChild(defAudioOption);
  let count = 1;
  devices.forEach((device) => {
    const option = document.createElement("option");
    option.value = device.deviceId;
    const label = device.label;
    const textNode = document.createTextNode(label);
    option.appendChild(textNode);

    if (device.kind === "videoinput") {
      videoSelect.appendChild(option);
    } else if (device.kind === "audioinput") {
      audioSelect.appendChild(option);
    }
  });
});

/*****  PEERJS  ******/

myPeer.on("call", (call) => {
  console.log(call);
  console.log("llamada");
  call.answer();

  manageUsers({ peerId: call.peer, call: call });
  call.on("stream", (userVideoStream) => {
    users.find((usr) => usr.peerId === call.peer).stream = userVideoStream;
    renderUsers();
  });
});

myPeer.on("open", (id) => {
  userConfig.peerId = id;
  manageUsers(userConfig);
  // if (userConfig.id && userConfig.peerId) socket.emit("join-room", ROOM_ID, userConfig);
});

/*****  SOCKETS  ******/

socket.on("connect", () => {
  userConfig.id = socket.id;
  manageUsers(userConfig);
  renderUsers();

  // if (userConfig.id && userConfig.peerId) socket.emit("join-room", ROOM_ID, userConfig);
  if (userConfig.id || userConfig.peerId) socket.emit("join-room", ROOM_ID, userConfig);
});

socket.on("users-list", (usersList) => {
  usersList.forEach((user) => {
    manageUsers(user);
  });
  renderUsers();
});

socket.on("user-connected", (newUserConfig) => {
  console.log("usuario conectado");
  connectToNewUser(newUserConfig);
  if (userConfig.video || userConfig.audio) {
    const call = myPeer.call(newUserConfig.peerId, myVideoStream);
  }
});

socket.on("user-change", (newUserConfig) => {
  connectToNewUser(newUserConfig);
});

socket.on("user-disconnected", (userId) => {
  const goneUser = users.findIndex((user) => user.id === userId);
  if (goneUser !== -1) {
    if (users[goneUser].call) users[goneUser].call.close();
    users.splice(goneUser, 1);
    renderUsers();
  }
});

socket.on("stream-on", (userId) => {
  console.log("stream on", userId);

  manageUsers({ peerId: userId, video: true, audio: true, name: `Pantalla Compartida (${userConfig.name})` });
  showBig = userId;
  someoneStreaming = true;
  if (userConfig.video && myVideoStream) myVideoStream.getVideoTracks()[0].enabled = false;
  renderUsers();
});

socket.on("stream-off", (userId) => {
  const goneUser = users.findIndex((user) => user.peerId === userId);
  if (goneUser !== -1) {
    users[goneUser].call.close();
    users.splice(goneUser, 1);
    someoneStreaming = false;
    if (userConfig.video && myVideoStream) myVideoStream.getVideoTracks()[0].enabled = true;
    showBig = false;
    renderUsers();
  }
});

socket.on("stop-call", (userId) => {
  const userIndex = users.findIndex((u) => u.id === userId);
  if (userIndex > -1) {
    users[userIndex].call.close();
    users[userIndex].call = undefined;
    users[userIndex].video = false;
    users[userIndex].audio = false;
  }
  renderUsers();
});

socket.on("message", (message) => addMessage(message));

socket.on("pause-music", () => {
  document.querySelector(".music").classList.remove("playing");
  video.pause();
});

socket.on("play-music", (time) => {
  document.querySelector(".music").classList.add("playing");
  video.currentTime = time;
  video.play();
});

socket.on("music", async (musicData) => {
  if (musicData.title !== currentSongData?.title) getBufferIntoBlob(musicData.song, musicData.start);
  if (musicData.playing) {
    document.querySelector(".music").classList.add("playing");
  } else {
    document.querySelector(".music").classList.remove("playing");
  }

  manageMusic(musicData);
  currentSongData = musicData;
});

/*****  USERS  ******/

function manageUsers(newUserData) {
  const userIndex = users.findIndex((u) =>
    newUserData.id ? u.id === newUserData.id : u.peerId === newUserData.peerId
  );
  if (userIndex > -1) {
    Object.keys(newUserData).forEach((prop) => {
      users[userIndex][prop] = newUserData[prop];
    });
  } else {
    const userColorIndex = Math.round((availableColors.length - 1) * Math.random());
    users.push({ ...newUserData, color: availableColors[userColorIndex] });
    availableColors.splice(userColorIndex, 1);
    if (availableColors.length === 0) availableColors = [...colors];
  }
}

function connectToNewUser(newUserConfig) {
  manageUsers({ ...newUserConfig });
  renderUsers();
}

/*****  CALL CONFIG  ******/

const muteUnmuteButton = document.getElementById("micro-button");
muteUnmuteButton.addEventListener("click", muteOrUnmute);

function muteOrUnmute(e) {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  if (enabled) {
    userConfig.audio = false;
    document.getElementById("micro-button").classList.add("active");
    myVideoStream.getAudioTracks()[0].enabled = false;
    socket.emit("user-change", {
      id: userConfig.id,
      name: userConfig.name,
      audio: userConfig.audio,
      video: userConfig.video,
    });
    manageUsers(userConfig);
    renderUsers();
  } else {
    userConfig.audio = true;
    document.getElementById("micro-button").classList.remove("active");
    myVideoStream.getAudioTracks()[0].enabled = true;
    socket.emit("user-change", {
      id: userConfig.id,
      name: userConfig.name,
      audio: userConfig.audio,
      video: userConfig.video,
    });
    manageUsers(userConfig);
    renderUsers();
  }
}
const playStopVideoButton = document.getElementById("camara-button");
playStopVideoButton.addEventListener("click", playStopVideo);

function playStopVideo(e) {
  const enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    userConfig.video = false;
    document.getElementById("camara-button").classList.add("active");
    myVideoStream.getVideoTracks()[0].enabled = false;
    socket.emit("user-change", {
      id: userConfig.id,
      name: userConfig.name,
      audio: userConfig.audio,
      video: userConfig.video,
    });
    manageUsers(userConfig);
    renderUsers();
  } else {
    userConfig.video = true;
    document.getElementById("camara-button").classList.remove("active");
    myVideoStream.getVideoTracks()[0].enabled = true;
    socket.emit("user-change", {
      id: userConfig.id,
      name: userConfig.name,
      audio: userConfig.audio,
      video: userConfig.video,
    });
    manageUsers(userConfig);
    renderUsers();
  }
}

document.getElementById("enter-call-button").addEventListener("click", enterCall);

function enterCall(e) {
  const options = {
    video: { height: { ideal: 480 } },
    audio: true,
  };
  if (videoSelect.value !== "") {
    options.video = { deviceId: { exact: videoSelect.value }, height: { ideal: 480 } };
    playStopVideoButton.classList.remove("active");
  } else {
    options.video = false;
    playStopVideoButton.classList.add("active");
  }

  if (audioSelect.value) {
    options.audio = { deviceId: { exact: audioSelect.value } };
    muteUnmuteButton.classList.remove("active");
  } else {
    options.audio = false;
    muteUnmuteButton.classList.add("active");
  }

  userConfig.video = options.video ? true : false;
  userConfig.audio = options.audio ? true : false;

  navigator.mediaDevices.getUserMedia(options).then((stream) => {
    myVideoStream = stream;
    userConfig.stream = myVideoStream;

    users.forEach((user) => {
      if (user.id !== userConfig.id) {
        const call = myPeer.call(user.peerId, myVideoStream);
      }
    });

    socket.emit("user-change", {
      id: userConfig.id,
      name: userConfig.name,
      audio: userConfig.audio,
      video: userConfig.video,
    });
    manageUsers(userConfig);
    renderUsers();
  });
  callControls.classList.remove("d-none");
  enterCallControls.classList.add("d-none");
  modal.classList.remove("open");
}

const shareButton = document.getElementById("share-button");
shareButton.addEventListener("click", shareScreen);

function shareScreen() {
  if (someoneStreaming) return;
  if (!myStreaming) {
    navigator.mediaDevices.getDisplayMedia({ video: { height: { ideal: 720 } }, audio: true }).then((stream) => {
      myScreenStream = stream;
      users.forEach((user) => {
        if (user.id !== userConfig.id) {
          const call = screenPeer.call(user.peerId, myScreenStream);
        }
      });
      manageUsers({
        id: screenPeer.id,
        stream: myScreenStream,
        myStream: true,
        name: "Tu Pantalla",
        video: true,
        audio: true,
      });
      socket.emit("stream-on", screenPeer.id);
      showBig = screenPeer.id;
      if (userConfig.video && myVideoStream) myVideoStream.getVideoTracks()[0].enabled = false;
      myStreaming = true;
      renderUsers();
      shareButton.classList.add("active");
    });
  } else {
    socket.emit("stream-off", screenPeer.id);
    myScreenStream.getTracks().forEach(function (track) {
      track.stop();
    });
    users = users.filter((user) => user.id !== screenPeer.id);
    myScreenStream = undefined;
    if (userConfig.video && myVideoStream) myVideoStream.getVideoTracks()[0].enabled = true;
    showBig = false;
    renderUsers();
    myStreaming = false;
    shareButton.classList.remove("active");
  }
}

document.getElementById("stop-call-button").addEventListener("click", stopCall);

function stopCall() {
  userConfig.video = false;
  userConfig.audio = false;
  playStopVideoButton.classList.remove("active");
  muteUnmuteButton.classList.remove("active");

  myVideoStream.getTracks().forEach((track) => track.stop());
  myVideoStream = undefined;

  socket.emit("stop-call", userConfig.id);

  callControls.classList.add("d-none");
  enterCallControls.classList.remove("d-none");

  manageUsers(userConfig);
  renderUsers();
}

/*****  CHAT  ******/
const messages = document.getElementById("messages");
const sendMessage = document.getElementById("send-message");

sendMessage.addEventListener("submit", (e) => {
  e.preventDefault();
  const messageInput = sendMessage.firstElementChild;
  const message = { id: userConfig.id, message: messageInput.value, moment: new Date() };
  socket.send(message);
  addMessage(message);
  messageInput.value = "";
});

function addMessage(message) {
  const newMessage = document.createElement("li");
  const messageOwner = document.createElement("h6");
  const messageTime = document.createElement("span");
  const messageContent = document.createElement("p");
  const momentDate = new Date(message.moment);
  messageOwner.innerText = message.id == 1 ? "Botardophite v2" : users.find((usr) => usr.id === message.id)?.name;
  messageOwner.classList.add(`text-${users.find((usr) => usr.id === message.id)?.color}`);
  messageTime.innerText = `${momentDate.getHours() < 10 ? "0" + momentDate.getHours() : momentDate.getHours()}:${
    momentDate.getMinutes() < 10 ? "0" + momentDate.getMinutes() : momentDate.getMinutes()
  }`;
  messageContent.innerText = message.message;
  newMessage.append(messageOwner);
  newMessage.append(messageTime);
  newMessage.append(messageContent);
  messages.append(newMessage);
}

document.getElementById("music-pause").addEventListener("click", () => {
  socket.emit("pause-music");
});

document.getElementById("music-play").addEventListener("click", () => {
  socket.emit("play-music", video.currentTime);
});

function getBufferIntoBlob(buffer, start) {
  video.src = window.URL.createObjectURL(new Blob([buffer], { type: "audio/mpeg" }));
  video.addEventListener("loadedmetadata", () => {
    video.currentTime = (new Date().getTime() - new Date(start).getTime()) / 1000;
    console.log((new Date().getTime() - new Date(start).getTime()) / 1000, video.currentTime);
    video.play();
  });
}

function manageMusic(musicData) {
  const fac = new FastAverageColor();
  if (musicData.thumbnail) {
    document.querySelector(".music img").src = "https://cors-anywhere.herokuapp.com/" + musicData.thumbnail;
    document.querySelector(".music img").setAttribute("crossOrigin", "");
    document.querySelector(".music .music-img i").classList.add("d-none");
    document.querySelector(".music img").classList.remove("d-none");
    document.querySelector(".music-info h4").innerText = musicData.title;
    document.querySelector(".music-info h6").innerHTML = `<a target="_blank" href="${musicData.singer.ref}">${
      musicData.singer.name
    } ${musicData.singer.verified ? '<i class="fas fa-check-circle"></i></a>' : ""}`;
    if (musicData.playing) document.querySelector(".music").classList.add("playing");
    fac
      .getColorAsync(document.querySelector(".music img"))
      .then((color) => {
        document.querySelector(".music").style.backgroundColor = color.rgba;
        document.querySelector(
          ".music-img .gradient"
        ).style.background = `linear-gradient(90deg, ${color.rgba} 0%, rgba(255,255,255,0) 100%)`;
        if (color.isDark) document.querySelector(".music").classList.remove("light");
        else document.querySelector(".music").classList.add("light");
      })
      .catch(function (e) {
        console.log(e);
      });
    fac.destroy();
  } else {
    document.querySelector(".music-info h4").innerText = musicData.title;
    document.querySelector(".music-info h6").innerHTML = `<a target="_blank" href="${musicData.singer.ref}">${
      musicData.singer.name
    } ${musicData.singer.verified ? '<i class="fas fa-check-circle"></i></a>' : ""}`;
    if (musicData.playing) document.querySelector(".music").classList.add("playing");
  }
}
