param(
    [ValidateSet('list','set','audio')][string]$Action = 'list',
    [string]$MonitorId = '',
    [ValidateRange(1,255)][int]$InputCode = 15
)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
public static class SwitchyDDC {
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
    public struct Physical { public IntPtr handle; [MarshalAs(UnmanagedType.ByValTStr, SizeConst=128)] public string description; }
    [StructLayout(LayoutKind.Sequential)] public struct Rect { public int left,top,right,bottom; }
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
    public struct Info { public int size; public Rect monitor,work; public uint flags; [MarshalAs(UnmanagedType.ByValTStr, SizeConst=32)] public string device; }
    public delegate bool Callback(IntPtr monitor, IntPtr hdc, IntPtr rect, IntPtr data);
    [DllImport("user32.dll")] static extern bool EnumDisplayMonitors(IntPtr hdc, IntPtr clip, Callback callback, IntPtr data);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern bool GetMonitorInfo(IntPtr monitor, ref Info info);
    [DllImport("dxva2.dll", SetLastError=true)] static extern bool GetNumberOfPhysicalMonitorsFromHMONITOR(IntPtr monitor, out uint count);
    [DllImport("dxva2.dll", SetLastError=true)] static extern bool GetPhysicalMonitorsFromHMONITOR(IntPtr monitor,uint count,[Out] Physical[] physical);
    [DllImport("dxva2.dll")] static extern bool DestroyPhysicalMonitors(uint count, Physical[] physical);
    [DllImport("dxva2.dll", SetLastError=true)] static extern bool GetVCPFeatureAndVCPFeatureReply(IntPtr monitor,byte code,out uint type,out uint current,out uint maximum);
    [DllImport("dxva2.dll", SetLastError=true)] static extern bool SetVCPFeature(IntPtr monitor,byte code,uint value);
    [DllImport("dxva2.dll", SetLastError=true)] static extern bool GetCapabilitiesStringLength(IntPtr monitor,out uint length);
    [DllImport("dxva2.dll", SetLastError=true)] static extern bool CapabilitiesRequestAndCapabilitiesReply(IntPtr monitor,StringBuilder caps,uint length);
    public class Display { public string id; public string name; public bool readable; public uint? current; public string capabilities; public int error; }
    public static List<Display> Run(string action,string selected,uint input) {
        var result = new List<Display>();
        bool found=false;
        Exception failure=null;
        Callback callback = delegate(IntPtr h,IntPtr dc,IntPtr rect,IntPtr data) {
            try {
                var info = new Info(); info.size=Marshal.SizeOf(typeof(Info));
                if (!GetMonitorInfo(h,ref info)) return true;
                uint count;
                if (!GetNumberOfPhysicalMonitorsFromHMONITOR(h,out count) || count==0) return true;
                var monitors=new Physical[count];
                if (!GetPhysicalMonitorsFromHMONITOR(h,count,monitors)) return true;
                try {
                    for (int i=0;i<count;i++) {
                        string id=info.device+":"+i;
                        if (action=="set" || action=="audio") {
                            if(id!=selected) continue;
                            found=true;
                            if(action=="audio") { uint type,volume,max,mute; if(!SetVCPFeature(monitors[i].handle,0x62,80) || !SetVCPFeature(monitors[i].handle,0x8D,2)) throw new Exception("Monitor audio restore was rejected."); System.Threading.Thread.Sleep(200); if(!GetVCPFeatureAndVCPFeatureReply(monitors[i].handle,0x62,out type,out volume,out max) || !GetVCPFeatureAndVCPFeatureReply(monitors[i].handle,0x8D,out type,out mute,out max) || volume!=80 || mute!=2) throw new Exception("Monitor audio restore could not be verified."); } else if(!SetVCPFeature(monitors[i].handle,0x60,input)) throw new Exception("Monitor rejected the input command (Windows error "+Marshal.GetLastWin32Error()+"). Enable DDC/CI in the monitor menu and check the cable.");
                        } else {
                            uint type,current,max;
                            bool ok=GetVCPFeatureAndVCPFeatureReply(monitors[i].handle,0x60,out type,out current,out max);
                            int error=ok ? 0 : Marshal.GetLastWin32Error();
                            string caps="";
                            uint length;
                            if(GetCapabilitiesStringLength(monitors[i].handle,out length) && length>0 && length<65536) {
                                var buffer=new StringBuilder((int)length);
                                if(CapabilitiesRequestAndCapabilitiesReply(monitors[i].handle,buffer,length)) caps=buffer.ToString();
                            }
                            result.Add(new Display {id=id,name=monitors[i].description,readable=ok,current=ok?(uint?)current:null,capabilities=caps,error=error});
                        }
                    }
                } finally { DestroyPhysicalMonitors(count,monitors); }
            } catch(Exception ex) { failure=ex; return false; }
            return true;
        };
        if(!EnumDisplayMonitors(IntPtr.Zero,IntPtr.Zero,callback,IntPtr.Zero) && failure==null) throw new Exception("Could not enumerate displays.");
        if(failure!=null) throw failure;
        if(action!="list" && !found) throw new Exception("Selected monitor is no longer connected. Refresh the monitor list.");
        return result;
    }
}
'@
try {
    $items = [SwitchyDDC]::Run($Action, $MonitorId, $InputCode)
    if ($Action -eq 'list') { ConvertTo-Json -InputObject @($items.ToArray()) -Depth 4 -Compress }
    else { '{"sent":true}' }
} catch {
    [Console]::Error.WriteLine($_.Exception.GetBaseException().Message)
    exit 1
}
