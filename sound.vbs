Set objArgs = Wscript.Arguments

if (objArgs.Count = 0) then
    ' WScript.Quit 123
end if

Set Sound = CreateObject("WMPlayer.OCX.7")
Sound.URL = "success.wav"
Sound.Controls.play
do while Sound.currentmedia.duration = 0
wscript.sleep 100
loop

' wscript.sleep (int(Sound.currentmedia.duration)+1)*1000
MsgBox "��˾���ļ��Ѵ�ӡ��ʱ�䣺" & FormatDateTime(Now) & vbNewLine & vbNewLine & "               (��ȷ���ر���Ϣ)" , vbInformation, "��˾Զ�̴�ӡ��Ϣ"

