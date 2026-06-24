const { getTilesDataRepo, getModewiseCollectionRepo, getPropertySummaryRepo,
  getCollectioninPerctRepo, getTotalPerfCorpbyCollRepo, getTotalPerfCorpCollectionRepo
 } = require('./Property.repo');

/**
 * Service to fetch dashboard data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function fetchTilesData(req, res) {
  return await getTilesDataRepo(req, res);
}

/**
 * Service to fetch RTS ULB Wise data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function fetchModewiseCollection(req, res) {
  return await getModewiseCollectionRepo(req, res);
}


async function fetchPropertySummary(req, res) {
  return await getPropertySummaryRepo(req, res);
}

async function fetchCollectioninPerct(req, res) {
  return await getCollectioninPerctRepo(req, res);
}

async function fetchTotalPerfCorpbyColl(req, res) {
  return await getTotalPerfCorpbyCollRepo(req, res);
}

async function fetchTotalPerfCorpCollection(req, res) {
  return await getTotalPerfCorpCollectionRepo(req, res);
}

module.exports = {
  fetchTilesData, fetchModewiseCollection, fetchPropertySummary, fetchCollectioninPerct,
  fetchTotalPerfCorpbyColl, fetchTotalPerfCorpCollection
};
