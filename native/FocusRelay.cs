using System;
using System.Diagnostics;
using System.IO;
using System.Security.AccessControl;
using System.Security.Principal;
using System.Text;
using System.Threading;

internal static class FocusRelay {
  static void Trace(string message) {
    try {
      var identity=WindowsIdentity.GetCurrent();
      if(identity.IsSystem)return;
      var directory=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),"SwitchyFocusIPC",identity.User.Value);
      File.AppendAllText(Path.Combine(directory,"relay-trace.log"),DateTime.UtcNow.ToString("o")+" "+message+Environment.NewLine);
    } catch {}
  }
  [STAThread] static int Main(string[] args) {
    try {
      var identity=WindowsIdentity.GetCurrent();
      Trace("start sid="+identity.User.Value+" session="+Process.GetCurrentProcess().SessionId+" argc="+args.Length);
      if(args.Length!=1 || (args[0]!="--deskflow-focus=windows" && args[0]!="--deskflow-focus=mac")){Trace("invalid enum");return 2;}
      if(identity.IsSystem || Process.GetCurrentProcess().SessionId==0)return 3;
      var user=identity.User;
      var directory=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),"Switchy","deskflow-focus");
      Trace("target="+args[0]+" profile="+directory);
      Directory.CreateDirectory(directory);
      var info=new DirectoryInfo(directory);
      if((info.Attributes & FileAttributes.ReparsePoint)!=0)return 4;
      var acl=new DirectorySecurity();acl.SetAccessRuleProtection(true,false);acl.SetOwner(user);
      foreach(var sid in new[]{user,new SecurityIdentifier(WellKnownSidType.LocalSystemSid,null)}) {
        acl.AddAccessRule(new FileSystemAccessRule(sid,FileSystemRights.FullControl,InheritanceFlags.ContainerInherit|InheritanceFlags.ObjectInherit,PropagationFlags.None,AccessControlType.Allow));
      }
      info.SetAccessControl(acl);
      using(var mutex=new Mutex(false,"Local\\SwitchyFocusRelay-"+user.Value)) {
        if(!mutex.WaitOne(3000))return 5;
        try {
          var target=args[0].Substring("--deskflow-focus=".Length);
          var stamp=(long)(DateTime.UtcNow-new DateTime(1970,1,1,0,0,0,DateTimeKind.Utc)).TotalMilliseconds;
          var data="{\"id\":\""+Guid.NewGuid().ToString()+"\",\"target\":\""+target+"\",\"createdAt\":"+stamp+",\"sessionId\":"+Process.GetCurrentProcess().SessionId+",\"userSid\":\""+user.Value+"\"}";
          var destination=Path.Combine(directory,"request.json");var temporary=Path.Combine(directory,Guid.NewGuid().ToString()+".tmp");
          File.WriteAllText(temporary,data,new UTF8Encoding(false));
          if(File.Exists(destination))File.Replace(temporary,destination,null);else File.Move(temporary,destination);
        } finally {mutex.ReleaseMutex();}
      }
      Trace("posted");
      return 0;
    } catch(Exception error) {Trace("error="+error.GetType().Name+" "+error.Message);return 1;}
  }
}
