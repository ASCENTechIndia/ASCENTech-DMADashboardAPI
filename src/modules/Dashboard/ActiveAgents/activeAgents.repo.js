
const { executeQuery } = require('../../../db/queryExecutor');

function normalizeUserId(userId) {
  const value = String(userId || '').trim();
  if (!value) {
    return value;
  }
  return value.startsWith('E') ? value : `E${value}`;
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function daysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

async function getDashboardData({ userId, month, year }) {
  const normalizedUserId = normalizeUserId(userId);
  const selectedMonth = Number(month) || new Date().getMonth() + 1;
  const selectedYear = Number(year) || new Date().getFullYear();
  const monthText = pad2(selectedMonth);
  const firstDate = `01-${monthText}-${selectedYear}`;

  const chartSql = `
    SELECT TO_CHAR(Login, 'DD') AS day,
           COUNT(DISTINCT UserID) AS unique_user_count
      FROM asadmins.aoup_user_count
      INNER JOIN etech.aoup_usermst_def
             ON var_usermst_userid = userid
      INNER JOIN etech.view_user_level_new
             ON Main_compid = num_usermst_brid
             OR center_compid = num_usermst_brid
             OR Zone_compid = num_usermst_brid
             OR State_compid = num_usermst_brid
             OR branch_compid = num_usermst_brid
      INNER JOIN etech.aoup_usermst_def t
             ON Main_compid = t.num_usermst_brid
             OR center_compid = t.num_usermst_brid
             OR Zone_compid = t.num_usermst_brid
             OR State_compid = t.num_usermst_brid
             OR branch_compid = t.num_usermst_brid
     WHERE t.var_usermst_userid = :userId
       AND TO_CHAR(Login, 'MM') = :month
       AND TO_CHAR(Login, 'YYYY') = :year
     GROUP BY TO_CHAR(Login, 'DD')
  `;

  const activeAgentsSql = `
    SELECT COUNT(DISTINCT VAR_USER_USERNAME) AS UserCount
      FROM asadmins.aoup_user_def
      INNER JOIN etech.aoup_usermst_def u
             ON var_user_username = var_usermst_userid
      INNER JOIN etech.view_user_level_new
             ON Main_compid = num_usermst_brid
             OR center_compid = num_usermst_brid
             OR Zone_compid = num_usermst_brid
             OR State_compid = num_usermst_brid
             OR branch_compid = num_usermst_brid
      INNER JOIN etech.aoup_usermst_def t
             ON Main_compid = t.num_usermst_brid
             OR center_compid = t.num_usermst_brid
             OR Zone_compid = t.num_usermst_brid
             OR State_compid = t.num_usermst_brid
             OR branch_compid = t.num_usermst_brid
     WHERE u.VAR_USERMST_STATUS != 'I'
       AND t.var_usermst_userid = :userId
  `;

  const uniqueLoginsSql = `
    SELECT COUNT(DISTINCT USERID) AS UserCount
      FROM asadmins.aoup_user_count
      INNER JOIN etech.aoup_usermst_def
             ON var_usermst_userid = userid
      INNER JOIN etech.view_user_level_new
             ON Main_compid = num_usermst_brid
             OR center_compid = num_usermst_brid
             OR Zone_compid = num_usermst_brid
             OR State_compid = num_usermst_brid
             OR branch_compid = num_usermst_brid
      INNER JOIN etech.aoup_usermst_def t
             ON Main_compid = t.num_usermst_brid
             OR center_compid = t.num_usermst_brid
             OR Zone_compid = t.num_usermst_brid
             OR State_compid = t.num_usermst_brid
             OR branch_compid = t.num_usermst_brid
     WHERE t.var_usermst_userid = :userId
       AND TO_CHAR(Login, 'MM') = :month
       AND TO_CHAR(Login, 'YYYY') = :year
  `;

  const assignedAccountsSql = `
    select count(distinct ASSIGNEDFOS) as assignedcount
      from atbss.aoup_etech_contractUploadAllocationDetails
      inner join atbss.aoup_etech_bankdata
              on contractnumber = var_bankdata_contractnum
      inner join etech.aoup_usermst_def tb
              on var_usermst_userid = 'E' || var_bankdata_userid
      inner join etech.view_user_level_new
              on Main_compid = num_usermst_brid
             or center_compid = num_usermst_brid
             or Zone_compid = num_usermst_brid
             or State_compid = num_usermst_brid
             or branch_compid = num_usermst_brid
      inner join etech.aoup_usermst_def t
              on Main_compid = t.num_usermst_brid
             or center_compid = t.num_usermst_brid
             or Zone_compid = t.num_usermst_brid
             or State_compid = t.num_usermst_brid
             or branch_compid = t.num_usermst_brid
     where ASSIGNEDFOS is not null
       and t.var_usermst_userid = :userId
       and VAR_BANKDATA_CONTRACTNUM is not null
       and TRUNC(CONTRACTALLOCATIONDATE) >= TO_DATE('${firstDate}', 'DD-MM-YYYY')
       and TRUNC(CONTRACTALLOCATIONDATE) <= LAST_DAY(TO_DATE('${firstDate}', 'DD-MM-YYYY'))
       and tb.VAR_USERMST_STATUS != 'I'
  `;

  const gridSql = `
    WITH mergedsessions AS(
      SELECT userid,
             TRUNC(login) AS login_date,
             MIN(login) AS min_login,
             MAX(LOGOUT) AS max_logout
        FROM ASADMINS.aoup_user_count
       WHERE TRUNC(login) >= TO_DATE('${firstDate}', 'DD-MM-YYYY')
         AND TRUNC(login) <= LAST_DAY(TO_DATE('${firstDate}', 'DD-MM-YYYY'))
       GROUP BY userid, TRUNC(login)
    )
    SELECT ms.userid,
           ms.login_date,
           MIN(ms.min_login) AS min_login,
           MAX(ms.max_logout) AS max_logout,
           ud.num_usermst_email AS mdm_id,
           ud.var_usermst_userfullname,
           cc.VAR_COMPANYMST_BRANCHNAME AS current_branch_name,
           cc.NUM_COMPANYMST_PARENTID,
           parent_company.VAR_COMPANYMST_BRANCHNAME AS parent_branch_name,
           parent_company.NUM_COMPANYMST_PARENTID AS grandparent_id,
           grandparent_company.VAR_COMPANYMST_BRANCHNAME AS grandparent_branch_name
      FROM mergedsessions ms
      INNER JOIN etech.aoup_usermst_def ud
              ON ud.var_usermst_userid = ms.userid
      INNER JOIN etech.AOUP_COMPANYMST_DEF cc
              ON ud.NUM_USERMST_BRID = cc.NUM_COMPANYMST_COMPID
      INNER JOIN etech.view_user_level_new vl
              ON vl.Main_compid = ud.num_usermst_brid
             OR vl.center_compid = ud.num_usermst_brid
             OR vl.Zone_compid = ud.num_usermst_brid
             OR vl.State_compid = ud.num_usermst_brid
             OR vl.branch_compid = ud.num_usermst_brid
      INNER JOIN etech.aoup_usermst_def t
              ON t.num_usermst_brid = vl.Main_compid
             OR t.num_usermst_brid = vl.center_compid
             OR t.num_usermst_brid = vl.Zone_compid
             OR t.num_usermst_brid = vl.State_compid
             OR t.num_usermst_brid = vl.branch_compid
      LEFT JOIN etech.AOUP_COMPANYMST_DEF parent_company
             ON cc.NUM_COMPANYMST_PARENTID = parent_company.NUM_COMPANYMST_COMPID
      LEFT JOIN etech.AOUP_COMPANYMST_DEF grandparent_company
             ON parent_company.NUM_COMPANYMST_PARENTID = grandparent_company.NUM_COMPANYMST_COMPID
     WHERE t.var_usermst_userid = :userId
     GROUP BY ms.userid,
              ms.login_date,
              ud.var_usermst_userfullname,
              ud.num_usermst_email,
              cc.VAR_COMPANYMST_BRANCHNAME,
              cc.NUM_COMPANYMST_PARENTID,
              parent_company.VAR_COMPANYMST_BRANCHNAME,
              parent_company.NUM_COMPANYMST_PARENTID,
              grandparent_company.VAR_COMPANYMST_BRANCHNAME
     ORDER BY ms.login_date DESC
  `;

  const [chartResult, activeAgentsResult, uniqueLoginsResult, assignedAccountsResult, gridResult] = await Promise.all([
    executeQuery(chartSql, {
      userId: normalizedUserId,
      month: monthText,
      year: String(selectedYear),
    }),
    executeQuery(activeAgentsSql, { userId: normalizedUserId }),
    executeQuery(uniqueLoginsSql, {
      userId: normalizedUserId,
      month: monthText,
      year: String(selectedYear),
    }),
    executeQuery(assignedAccountsSql, { userId: normalizedUserId }),
    executeQuery(gridSql, { userId: normalizedUserId }),
  ]);

  const chartMap = new Map();
  for (const row of chartResult.rows || []) {
    const day = Number(row.DAY ?? row.day);
    chartMap.set(day, Number(row.UNIQUE_USER_COUNT ?? row.unique_user_count ?? 0));
  }

  const labels = [];
  const data = [];
  const totalDays = daysInMonth(selectedMonth, selectedYear);
  for (let day = 1; day <= totalDays; day += 1) {
    labels.push(String(day));
    data.push(chartMap.get(day) || 0);
  }

  return {
    month: selectedMonth,
    year: selectedYear,
    monthLabel: new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
    }),
    summary: {
      onboardedActiveAssociates: Number(activeAgentsResult.rows?.[0]?.USERCOUNT ?? activeAgentsResult.rows?.[0]?.usercount ?? 0),
      accountsAssigned: Number(assignedAccountsResult.rows?.[0]?.ASSIGNEDCOUNT ?? assignedAccountsResult.rows?.[0]?.assignedcount ?? 0),
      uniqueLogins: Number(uniqueLoginsResult.rows?.[0]?.USERCOUNT ?? uniqueLoginsResult.rows?.[0]?.usercount ?? 0),
    },
    chart: {
      labels,
      data,
    },
    grid: gridResult.rows || [],
  };
}

module.exports = {
  getDashboardData,
};
