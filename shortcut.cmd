@copy /y "nircmd.exe" "c:\windows"
@copy /y "PrintTcp.exe" "c:\windows"
@nircmd shortcut "~$folder.windows$\PrintTcp.exe" "~$folder.programs$\启动" "远程打印服务"
@nircmd exec show "~$folder.windows$\PrintTcp.exe"


