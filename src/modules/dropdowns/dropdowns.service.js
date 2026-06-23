const { repoGetServices, repoStatusDropdown, repoGetWards, repoGetUsers, repoGetWardsByUlbId } = require('./dropdowns.repo');

// Get services by ULB
async function serviceGetServices(ulbId,deptId) {
  return repoGetServices(ulbId,deptId);
}

// Get wards by ULB
async function serviceGetWards(ulbId) {
  return repoGetWards(ulbId);
}

// Get wards by ULB ID with detailed information
async function serviceGetWardsByUlbId(ulbId) {
  return repoGetWardsByUlbId(ulbId);
}

// Get users by ULB
async function serviceGetUsers(ulbId) {
  return repoGetUsers(ulbId);
}

async function serviceStatusDropdown(ulbId) {
  return repoStatusDropdown(ulbId);
}

module.exports = { serviceStatusDropdown, serviceGetServices, serviceGetWards, serviceGetWardsByUlbId, serviceGetUsers }
