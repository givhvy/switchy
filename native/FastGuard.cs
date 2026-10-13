using System;
using System.Collections.Generic;
using Microsoft.Win32;
using System.Runtime.InteropServices;

public static class FastGuard {
    [StructLayout(LayoutKind.Sequential)]
    struct ProcessInfo {
        public uint next,threads;
        [MarshalAs(UnmanagedType.ByValArray,SizeConst=48)]public byte[] reserved;
        public ushort nameLength,nameMaximum;public IntPtr name;
        public int priority;public IntPtr pid,parent;public uint handles,session;
    }
    [StructLayout(LayoutKind.Sequential)]
    struct ServiceStatus {public uint type,state,controls,winExit,serviceExit,checkpoint,waitHint,pid,flags;}
    [DllImport("ntdll.dll")]static extern int NtQuerySystemInformation(int kind,IntPtr memory,int size,out int needed);
    [DllImport("advapi32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern IntPtr OpenSCManager(string machine,string database,uint access);
    [DllImport("advapi32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern IntPtr OpenService(IntPtr manager,string name,uint access);
    [DllImport("advapi32.dll",SetLastError=true)]static extern bool QueryServiceStatusEx(IntPtr service,int level,ref ServiceStatus status,int size,out int needed);
    [DllImport("advapi32.dll")]static extern bool CloseServiceHandle(IntPtr service);
    public class Core {public uint ProcessId,ParentProcessId,SessionId;}
    public class Service {public uint ProcessId;public string State,PathName;}
    public class Owners {public List<Core> cores=new List<Core>();public Service service;}
    public static List<Core> ProcessOwners() {
        int size=262144;
        for(int attempt=0;attempt<5;attempt++) {
            var memory=Marshal.AllocHGlobal(size);
            try {
                int needed;int status=NtQuerySystemInformation(5,memory,size,out needed);
                if(status==unchecked((int)0xC0000004)){size=Math.Max(size*2,needed+65536);continue;}
                if(status!=0)throw new Exception("Cannot inspect process ownership.");
                var result=new List<Core>();int offset=0,min=Marshal.SizeOf(typeof(ProcessInfo));
                while(offset+min<=size) {
                    var info=(ProcessInfo)Marshal.PtrToStructure(IntPtr.Add(memory,offset),typeof(ProcessInfo));
                    if(info.nameLength>0) {
                        long relative=info.name.ToInt64()-memory.ToInt64();
                        if(info.nameLength%2!=0 || relative<0 || relative+info.nameLength>size)throw new Exception("Invalid process name buffer.");
                        var name=Marshal.PtrToStringUni(info.name,info.nameLength/2);
                        if(String.Equals(name,"deskflow-core.exe",StringComparison.OrdinalIgnoreCase))result.Add(new Core {ProcessId=(uint)info.pid.ToInt64(),ParentProcessId=(uint)info.parent.ToInt64(),SessionId=info.session});
                    }
                    if(info.next==0)return result;
                    if(info.next<min || info.next>size-offset)throw new Exception("Invalid process snapshot.");
                    offset+=(int)info.next;
                }
                throw new Exception("Incomplete process snapshot.");
            }finally{Marshal.FreeHGlobal(memory);}
        }
        throw new Exception("Process snapshot changed repeatedly.");
    }
    public static Owners ReadOwners() {
        var result=new Owners {cores=ProcessOwners()};
        var manager=OpenSCManager(null,null,1);
        if(manager==IntPtr.Zero)throw new Exception("Cannot inspect service manager.");
        try {
            var handle=OpenService(manager,"Deskflow",4);
            if(handle==IntPtr.Zero)throw new Exception("Cannot inspect Deskflow service.");
            try {
                var status=new ServiceStatus();int needed;
                if(!QueryServiceStatusEx(handle,0,ref status,Marshal.SizeOf(typeof(ServiceStatus)),out needed))throw new Exception("Cannot inspect Deskflow status.");
                var image=Registry.GetValue(@"HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Deskflow","ImagePath",null) as string;
                result.service=new Service {ProcessId=status.pid,State=status.state==4?"Running":"Stopped",PathName=image};return result;
            }finally{CloseServiceHandle(handle);}
        }finally{CloseServiceHandle(manager);}
    }
    [DllImport("iphlpapi.dll")] static extern uint GetExtendedTcpTable(IntPtr table,ref int size,bool order,int family,int tableClass,uint reserved);
    public static bool ContainsConnection(IntPtr memory,int size,uint pid,int family) {
        if(size<4)throw new Exception("Invalid TCP table size.");
        if(family!=2 && family!=23)throw new Exception("Invalid TCP address family.");
        int count=Marshal.ReadInt32(memory),stride=family==2?24:56;
        if(count<0 || 4L+(long)count*stride>size)throw new Exception("Invalid TCP table.");
        for(int i=0;i<count;i++) {
            var row=IntPtr.Add(memory,4+i*stride);
            int state=Marshal.ReadInt32(row,family==2?0:48);
            uint owner=unchecked((uint)Marshal.ReadInt32(row,family==2?20:52));
            int raw=Marshal.ReadInt32(row,family==2?16:44);
            int port=((raw&255)<<8)|((raw>>8)&255);
            if(state==5 && owner==pid && port==24800)return true;
        }
        return false;
    }
    public static bool OwnsConnection(uint pid,int family) {
        int size=0;uint status=GetExtendedTcpTable(IntPtr.Zero,ref size,false,family,5,0);
        if(status!=122 && status!=0)throw new Exception("Cannot inspect client TCP connections.");
        for(int attempt=0;attempt<3;attempt++) {
            var memory=Marshal.AllocHGlobal(Math.Max(size,4));
            try {
                status=GetExtendedTcpTable(memory,ref size,false,family,5,0);
                if(status==122)continue;
                if(status!=0)throw new Exception("Cannot inspect client TCP connections.");
                return ContainsConnection(memory,size,pid,family);
            }finally{Marshal.FreeHGlobal(memory);}
        }
        throw new Exception("TCP table changed repeatedly.");
    }
}
