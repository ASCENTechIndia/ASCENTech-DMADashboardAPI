const { loginUser } = require('./auth.service');
const { logApiSuccess, logApiError } = require('../../utils/log');
const { encryptPassword } = require('../../utils/login-password-crypto');

async function login(req, res, next) {
  try {
    const payload = req.body;

// console.log("Login payload:", payload);
    let encryptPass;
    try {
      encryptPass = encryptPassword(payload.password);

    } catch (_error) {
      logApiError(req, 400, 'Invalid encrypted password', 'Login failed: invalid encrypted password payload');
      // console.log("Password encryption error:", encryptPass);
      return res.fail('Invalid encrypted password', 400);
    }


    const result = await loginUser(
      payload.userId,
      encryptPass,
      payload.macaddr,
      payload.ipaddr,
      payload.hostname,
      payload.source,
      // payload.deptid
    );
    // console.log("Login result:", result);
    if (!result.success) {
      logApiError(req, 401, result.message, `Login failed for user: ${payload.userId}`);
      return res.fail(result.message, 401, { errorCode: result.errorCode });
    }

    logApiSuccess(req, 200, { userId: result.user.userId, userName: result.user.userFullName }, `Login successful for user: ${result.user.userFullName}`);

    return res.ok({ token: result.token, user: result.user });
  } catch (error) {
    logApiError(req, 500, error.message, 'Login controller error');
    return next(error);
  }
}

module.exports = {
  login,
};
