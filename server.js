const app = require("./startup/app");
const env = require("dotenv").config();

app.listen(process.env.APP_PORT || 8000, () => {
  console.log(`erver is running on port : ${process.env.APP_PORT}`);
});