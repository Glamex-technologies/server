const axios = require("axios");
const { successRes, errorRes } = require("../utils");

module.exports.hello = async (req, res) => {
  try {
    const response = await axios.get("https://api.ipify.org?format=json");

    return successRes(res, {
      serverStatus: "ACTIVE",
      ip: response.data.ip,
    });
  } catch (error) {
    console.log(error, "<<< error hello api");
    return errorRes(res, 400, "Internal server error.");
  }
};
