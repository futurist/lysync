@rem HIDE CMD WINDOW if you don't want to see cmd
title �ֿ�ͬ���������
@ping /n 2 127.1>nul
@nircmd.exe win min ititle "�ֿ�ͬ���������"


set DEBUG=*
supervisor -i . app.js > app_out.log

rem forever start -o app-out.log -e app-err.log -l app-forever.log -a --minUptime 2000 --spinSleepTime 2000 -v app.js



