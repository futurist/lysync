@copy /y "nircmd.exe" "c:\windows"
@copy /y "PrintTcp.exe" "c:\windows"
@nircmd shortcut "~$folder.windows$\PrintTcp.exe" "~$folder.programs$\����" "Զ�̴�ӡ����"
@nircmd exec show "~$folder.windows$\PrintTcp.exe"


