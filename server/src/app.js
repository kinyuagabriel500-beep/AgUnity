const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const routes = require("./routes");
const { errorHandler } = require("./middleware/error-handler");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({
  limit: "1mb",
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(morgan("combined"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "ufip-server" });
});

app.use("/api", routes);
app.use(errorHandler);

module.exports = app;
