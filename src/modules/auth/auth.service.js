const { loginWithStoredProcedure } = require('./auth.repo');

async function loginUser(
  userId,
  password,
  macaddr = '',
  ipaddr = '',
  hostname = '',
  source = 'RW',
  deptid = 1507
) {
  // console.log("loginUser called with:", { userId, macaddr, ipaddr, hostname, source, deptid }); // Debugging
  return loginWithStoredProcedure(userId, password, macaddr, ipaddr, hostname, source, deptid);
}

module.exports = {
  loginUser,
};
