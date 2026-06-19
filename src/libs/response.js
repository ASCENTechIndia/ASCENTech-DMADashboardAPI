function ok(res, data = null, message = "success", status = 200, extra = {}) {
  return res.status(status).json({ success: true, message, data, ...extra });
}

function fail(res, message = "failed", status = 400, extra = {}) {
  return res.status(status).json({ success: false, message, ...extra });
}

function attachResponseHelpers(req, res, next) {
  res.ok = (data = null, message = "success", status = 200, extra = {}) => ok(res, data, message, status, extra);
  res.fail = (message = "failed", status = 400, extra = {}) => fail(res, message, status, extra);
  next();
}

module.exports = { ok, fail, attachResponseHelpers };
