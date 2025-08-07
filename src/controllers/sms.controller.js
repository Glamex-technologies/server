const smsClient = require("../services/smsClient");
const { successRes, internalServerError, errorRes } = require("../utils");

module.exports.sendOTP = async (req, res) => {
  try {
    const { recipients, message } = req.body;

    if (!recipients || !message)
      return errorRes(res, 404, "Recipients and message is required.");

    console.log("recipient", recipients, "msg", message);
    const result = await smsClient.sendSMS(message, recipients, null);

    console.log("Taqnyat Response:", result);

    return successRes(res, {
      response: result,
      body: req.body,
    });
  } catch (error) {
    return internalServerError(res, error);
  }
};
