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
MsgBox "公司有文件已打印，时间：" & FormatDateTime(Now) & vbNewLine & vbNewLine & "               (按确定关闭消息)" , vbInformation, "公司远程打印消息"

