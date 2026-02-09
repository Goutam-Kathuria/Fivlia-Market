const admin = require("firebase-admin");

const sendFcmPush = async (token, payload) => {
  if (!token) return;

  return admin.messaging().send({
    token,
    notification: {
      title: payload.title,
      body: payload.body,
      imageUrl: payload.image,
    },
    data: payload.data,
  });
};
