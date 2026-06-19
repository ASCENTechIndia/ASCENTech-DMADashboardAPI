# Migration Map from ASP.NET to Node

## Confirmed stored procedures from current C# data layer
- aoup_login_fetch
- aoup_login_RandomPassfetch
- aoup_asset_ins
- aoup_assettransfer_ins
- aoup_assetassignupd_ins_new
- aoup_assetassignupdapi_ins
- aoup_assetassigntabsim_ins
- aoup_assetassign_ins
- aoup_assetassignstatus_ins
- aoup_assetstatus_Upd_insnew
- aoup_assetstatusupd_ins
- aoup_assetstatusupdapi_ins
- aoup_assettransferins_ins
- aoup_simmgnt_ins
- aoup_branch_ins
- aoup_branchtransfer_upd
- aoup_EmployerBrConfig_ins
- aoup_genericupdt_log
- aoup_Pendingdataupload
- aoup_usernotification_ins
- aoup_resetpassword_login
- aoup_updatewalletparent_ins
- aoup_user_ins_New
- aoup_user_ins
- aoup_userstatus_upd
- aoup_userweb_ins
- atbss.aoup_user_pincode_map_ins

## Already migrated endpoints
- POST /auth/login -> aoup_login_fetch
- GET /master/menu -> menu query pattern from MasterPage.Master.cs
- GET /master/dashboard-summary -> dashboard query pattern from FrmDashboard.aspx.cs
- POST /users -> aoup_user_ins_New
- PUT /users -> aoup_user_ins
- PATCH /users/status -> aoup_userstatus_upd
- PATCH /users/role -> aoup_user_ins
- GET /users/search -> query pattern from FrmUserList.aspx.cs / FrmSearchUser.aspx.cs
- POST /assets/register -> aoup_asset_ins
- POST /assets/assign -> aoup_assetassign_ins
- POST /assets/transfer -> aoup_assettransfer_ins
- POST /assets/status -> aoup_assetstatus_Upd_insnew

## Next migration batches
1. Reports APIs
2. Admin configuration APIs
3. Notifications and wallet APIs
4. Access-control and menu-admin APIs

## How to add one more stored procedure
1. Add definition in src/modules/legacy/procedure-catalog.js
2. Add dedicated service in src/modules/<module>/<module>.service.js
3. Add controller and route
4. Add zod input schema
5. Protect route with auth and role checks
