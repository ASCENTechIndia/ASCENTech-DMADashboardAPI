const jwt = require('jsonwebtoken');
const oracledb = require('oracledb');
const { executeQuery } = require('../../db/queryExecutor');
const { executeProcedure } = require('../../db/procedureExecutor');
const { config } = require('../../config/env');

async function loginWithStoredProcedure(
  userId,
  password,
  macaddr = '',
  ipaddr = '',
  hostname = '',
  source = 'RW',
  deptid = 1507
) {
  // console.log("loginWithStoredProcedure called with:", { userId, macaddr, ipaddr, hostname, source, deptid }); // Debugging
  const plsql = `
    BEGIN
      admins.aoma_login_fetch(
        :IN_USERID,
        :IN_PASSWORD,
        :IN_MACADDR,
        :IN_IPADDR,
        :IN_HOSTNAME,
        :IN_SOURCE,
        :IN_DEPTID,
        :OUT_USERNAME,
        :OUT_USERID,
        :OUT_LASTLOGIN,
        :OUT_LASTLOGOUT,
        :OUT_CORPORATION,
        :OUT_CORPORATIONADDRESS,
        :OUT_RECEIPTOFFICENAME,
        :OUT_CHALANOFFICENAME,
        :OUT_PRABHAGNAME,
        :OUT_PRABHAGID,
        :OUT_DESIGID,
        :OUT_USERTYPE,
        :OUT_COLLECTIONCENTER,
        :OUT_MOBILENO,
        :OUT_OTPVALIDATE,
        :OUT_ERRORCODE,
        :OUT_ERRORMSG,
        :OUT_ORGID,
        :OUT_FORCEFULLPASSCHAGE
      );
    END;
  `;

  const binds = {
    IN_USERID: userId,
    IN_PASSWORD: password,
    IN_MACADDR: macaddr || '',
    IN_IPADDR: ipaddr || '',
    IN_HOSTNAME: hostname || '',
    IN_SOURCE: source || 'RW',
    IN_DEPTID: Number(deptid) || 1507,
    OUT_USERNAME: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 500 },
    OUT_USERID: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 200 },
    OUT_LASTLOGIN: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 100 },
    OUT_LASTLOGOUT: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 100 },
    OUT_CORPORATION: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 500 },
    OUT_CORPORATIONADDRESS: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 1000 },
    OUT_RECEIPTOFFICENAME: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 500 },
    OUT_CHALANOFFICENAME: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 500 },
    OUT_PRABHAGNAME: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 200 },
    OUT_PRABHAGID: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 50 },
    OUT_DESIGID: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 50 },
    OUT_USERTYPE: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 50 },
    OUT_COLLECTIONCENTER: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
    OUT_MOBILENO: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 50 },
    OUT_OTPVALIDATE: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 50 },
    OUT_ERRORCODE: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
    OUT_ERRORMSG: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 1000 },
    OUT_ORGID: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
    OUT_FORCEFULLPASSCHAGE: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 50 },
  };

  const result = await executeProcedure({ statement: plsql, binds, useTx: false });
  // console.log("Stored procedure execution result:", result); // Debugging
  const out = result.outBinds || {};

  const errorCode = String(out.OUT_ERRORCODE ?? out.OUT_ERRORCODE ?? '0');
  if (!(errorCode === '9999' )) {
    return {
      success: false,
      errorCode,
      message: out.OUT_ERRORMSG || 'Login failed',
    };
  }

  // use provided ulbId for designation lookup
  const resolvedUlb = out.OUT_ORGID;

  const designationQuery = `
    SELECT CASE
      WHEN u.num_user_userid IN (
        SELECT DISTINCT var_ctpttype_suppid FROM aorts_ctptlist_mas WHERE num_ctpttype_ulbid = :ulb
      ) THEN 'Supervisor'
      WHEN u.num_user_userid IN (
        SELECT DISTINCT var_ctptsanitinspctor_id FROM aorts_ctptsanitinspctor_mas WHERE num_ctptsanitinspctor_ulbid = :ulb
      ) THEN 'Sanitary Inspector'
      ELSE 'Vendor'
    END AS designation
    FROM admins.aoma_user_def u
    WHERE u.num_user_userid = :userId
      AND u.num_user_ulbid = :ulb
  `;

  let designation = null;
  try {
    const desRes = await executeQuery(designationQuery, { userId, ulb: Number(resolvedUlb) });
    designation = desRes.rows?.[0]?.DESIGNATION || desRes.rows?.[0]?.designation || null;
  } catch (e) {
    designation = null;
  }

  const user = {
    userId: out.OUT_USERID || userId,
    userFullName: out.OUT_USERNAME || out.OUT_USERNAME || null,
    lastLogin: out.OUT_LASTLOGIN,
    lastLogout: out.OUT_LASTLOGOUT,
    corporation: out.OUT_CORPORATION,
    corporationAddress: out.OUT_CORPORATIONADDRESS,
    receiptOfficeName: out.OUT_RECEIPTOFFICENAME,
    chalanOfficeName: out.OUT_CHALANOFFICENAME,
    prabhagName: out.OUT_PRABHAGNAME,
    prabhagId: out.OUT_PRABHAGID,
    desigId: out.OUT_DESIGID,
    userType: out.OUT_USERTYPE,
    collectionCenter: out.OUT_COLLECTIONCENTER,
    mobileNo: out.OUT_MOBILENO,
    otpValidate: out.OUT_OTPVALIDATE,
    orgId: out.OUT_ORGID,
    forceFullPassChange: out.OUT_FORCEFULLPASSCHAGE,
    designation,
  };

  const token = jwt.sign(
    {
      sub: user.userId,
      userId: user.userId,
      desigId: user.desigId,
      prabhagId: user.prabhagId,
      orgId: user.orgId,
      designation: user.designation,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  return {
    success: true,
    token,
    user,
  };
}

module.exports = {
  loginWithStoredProcedure,
};
