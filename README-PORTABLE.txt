SMARTBIZ RWANDA - PORTABLE EDITION
===================================

START SMARTBIZ
--------------
1. Connect the external drive.
2. Open the SmartBiz-Rwanda folder.
3. Double-click START-SMARTBIZ.bat.
4. Wait for the services to start.
5. SmartBiz will open in your browser.

APPLICATION
----------
Frontend:  http://localhost:5500
Login:    http://localhost:5500/login.html
Backend:  http://localhost:5000
API:      http://localhost:5000/api/v1

PORTABLE COMPONENTS
------------------
Node.js is included in portable\node.
MySQL is included in portable\mysql-8.0.45-winx64.
The SmartBiz database is stored in portable\data.

The application is designed to run from the external drive without
installing Node.js or MySQL separately.

STOP SMARTBIZ
------------
Double-click STOP-SMARTBIZ.bat when finished.

IMPORTANT
--------
- Keep the entire SmartBiz-Rwanda folder together.
- Do not delete the portable\data directory.
- Do not delete backend\node_modules.
- Do not share backend\.env.
- Do not unplug the drive while MySQL is running.
- Use STOP-SMARTBIZ.bat before safely ejecting the external drive.
- Port 3307 is used for the portable database.
- Port 5000 is used for the backend.
- Port 5500 is used for the frontend.
- The database uses localhost.

TROUBLESHOOTING
----------------
If SmartBiz does not start:
1. Run START-SMARTBIZ.bat again.
2. Check portable\logs.
3. Ensure ports 3307, 5000, and 5500 are not being used by unrelated programs.
4. Do not delete or recreate the database to solve startup problems.

PORTABILITY
----------
The launcher detects the project's location so the external drive can
use a different drive letter on another Windows computer.

A complete portability test on a second Windows computer is still
recommended before relying on this package.
