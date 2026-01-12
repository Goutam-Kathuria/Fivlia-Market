const express = require("express");
// const path = require("path");
require("dotenv").config();
require("./jobs/index");

const connectDb = require("./database");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const routes = require("./routes/routes");
app.get("/", (req, res) => {
  res.send("Fivlia api is running ...");
});
app.use("/fivlia", routes);
app.use("/", routes);

const startServer = async () => {
  await connectDb();

  // const agenda = await initAgenda(mongoConnection);
  // backgroundInvoice(agenda);

  const PORT = process.env.PORT || 8090;
  const HOST = process.env.HOST || "0.0.0.0";
  app.listen(PORT,HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
    console.log(`✅ Access from same network: http://192.168.29.124:${PORT}`);
  });
};

startServer();
