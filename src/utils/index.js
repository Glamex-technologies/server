module.exports.successRes = (res, data) => {
  return res.json({
    status: "success",
    data,
  });
};

module.exports.errorRes = (res, code, message) => {
  return res.status(code).json({
    status: "error",
    error: {
      code,
      message,
    },
  });
};

module.exports.internalServerError = (res, err) => {
  console.log(err);
  return this.errorRes(res, 500, "Internal server error. Please try again.");
};

module.exports.isValidContactNo = str => {
  if (str?.length === 10) return true;
  else return false;
};
