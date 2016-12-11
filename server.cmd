@rem HIDE CMD WINDOW if you don't want to see cmd

@echo 仓库同步程序启动中，请勿关闭...

@title synck

@nircmd execmd "nircmd.exe cmdwait 6000 win hide title synck"
@nircmd execmd "nircmd.exe cmdwait 9000 win show title synck"
@nircmd execmd "nircmd.exe cmdwait 12000 win hide title synck"


set DEBUG=*
supervisor -i . app.js > app_out.log

@rem forever start -o app-out.log -e app-err.log -l app-forever.log -a --minUptime 2000 --spinSleepTime 2000 -v app.js



