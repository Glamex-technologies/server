const Taqnyat = require("./taqnyat.js");

const smsClient = new Taqnyat.Taqnyat(process.env.TAQNYAT_API, "Tajdeed");

module.exports = smsClient;
