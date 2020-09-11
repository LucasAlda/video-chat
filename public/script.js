const socket = io("/");
const myPeer = new Peer();
const screenPeer = new Peer();
let users = [];
let streaming = false;
let showBig = false;

let devices = [];
let myVideoStream;
let myScreenStream;

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
const availableColors = [...colors];

navigator.mediaDevices.enumerateDevices().then((dvs) => {
  devices = dvs;
  videoSelect.innerHTML = "";
  audioSelect.innerHTML = "";
  const defVideoOption = document.createElement("option");
  defVideoOption.innerText = "Sin Cámara";
  videoSelect.appendChild(defVideoOption);
  const defAudioOption = document.createElement("option");
  defAudioOption.innerText = "Sin Microfono";
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

myPeer.on("call", (call) => {
  console.log("llamada");
  call.answer(myVideoStream);

  manageUsers({ peerId: call.peer, call: call });
  call.on("stream", (userVideoStream) => {
    users.find((usr) => usr.peerId === call.peer).stream = userVideoStream;
    renderUsers();
  });
});

myPeer.on("open", (id) => {
  userConfig.peerId = id;
  manageUsers(userConfig);
  if (userConfig.id && userConfig.peerId) socket.emit("join-room", ROOM_ID, userConfig);
});

socket.on("connect", () => {
  userConfig.id = socket.id;
  manageUsers(userConfig);
  renderUsers();

  if (userConfig.id && userConfig.peerId) socket.emit("join-room", ROOM_ID, userConfig);
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
    users.splice(goneUser, 1);
    renderUsers();
  }
});

socket.on("stream-off", (userId) => {
  const goneUser = users.findIndex((user) => user.peerId === userId);
  if (goneUser !== -1) {
    users.splice(goneUser, 1);
    renderUsers();
  }
});

socket.on("stream-on", (userId) => {
  console.log("stream on", userId);

  manageUsers({ peerId: userId, video: true, audio: true, name: `Pantalla Compartida (${userConfig.name})` });
  showBig = userId;
  renderUsers();
});

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
    if (availableColors.length === 0) availableColors = [...colors];
  }
}

function connectToNewUser(newUserConfig) {
  manageUsers({ ...newUserConfig });
  renderUsers();
}

document.getElementById("micro-button").addEventListener("click", muteOrUnmute);

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
  }
}

document.getElementById("camara-button").addEventListener("click", playStopVideo);

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
  }
}

document.getElementById("enter-call-button").addEventListener("click", enterCall);

function enterCall(e) {
  const options = {
    video: true,
    audio: true,
  };
  userConfig.video = true;
  userConfig.audio = true;

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

document.getElementById("share-button").addEventListener("click", shareScreen);

function shareScreen() {
  if (!streaming) {
    navigator.mediaDevices.getDisplayMedia({ video: { height: { ideal: 720 } }, audio: true }).then((stream) => {
      myScreenStream = stream;
      users.forEach((user) => {
        if (user.id !== userConfig.id) {
          const call = screenPeer.call(user.peerId, myScreenStream);
        }
      });
      manageUsers({ id: screenPeer.id, stream: myScreenStream, name: "Tu Pantalla", video: true, audio: true });
      socket.emit("stream-on", screenPeer.id);
      showBig = screenPeer.id;
      streaming = true;
      renderUsers();
    });
  } else {
    socket.emit("stream-off", screenPeer.id);
    myScreenStream.getTracks().forEach(function (track) {
      track.stop();
    });
    users = users.filter((user) => user.id !== screenPeer.id);
    myScreenStream = undefined;
    renderUsers();
    streaming = false;
  }
}

document.getElementById("stop-call-button").addEventListener("click", stopCall);

function stopCall() {
  console.log("endCall");
}
