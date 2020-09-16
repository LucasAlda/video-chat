module.exports = {
  name: "queue",
  description: "searches & plays youtube videos",
  execute(msg, args, queue) {
    return new Promise((resolve, reject) => {
      youtube
        .searchVideos(args, 4)
        .then((results) => {
          msg.channel.send(`Added  ${results[0].title} to queue`);
          resolve({ code: 200 });
          queue.push(results[0].url);
        })

        .catch((error) => {
          console.log(error);
          reject({ code: 400 });
        });
    });
  },
};
