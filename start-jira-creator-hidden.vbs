Set WshShell = CreateObject("WScript.Shell")

' Wait 10 seconds for system services to initialize on boot
WScript.Sleep 10000

WshShell.Run chr(34) & CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & "\start-jira-creator.bat" & chr(34), 0
Set WshShell = Nothing
