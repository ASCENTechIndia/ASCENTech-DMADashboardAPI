const { executeQuery } = require('../../../db/queryExecutor');

async function getDashboardModulesRepo(ulbId = 2) {
  const sql = `
    SELECT *
    FROM admins.aoms_dashboard_module_mst
    WHERE num_ulbid = :ulbId
  `;

  const result = await executeQuery(sql, { ulbId: Number(ulbId) });
  return result.rows || [];
}

module.exports = {
  getDashboardModulesRepo,
};
