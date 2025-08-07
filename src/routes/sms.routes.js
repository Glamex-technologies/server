const express = require("express");
const router = express.Router();
const smsController = require("../controllers/sms.controller");

router.post("/send", smsController.sendOTP);

module.exports = router;
