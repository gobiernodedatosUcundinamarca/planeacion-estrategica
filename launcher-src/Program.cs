using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading;

class Launcher
{
    /// <summary>
    /// Identifica al paquete embebido en ESTE ejecutable. Se usa para decidir
    /// si hay que volver a extraer el sitio en la carpeta temporal.
    ///
    /// Es el ModuleVersionId del propio ensamblado: csc lo regenera en cada
    /// compilación, así que un .exe recién compilado nunca reutiliza los
    /// archivos que dejó una versión anterior — y dos copias del mismo .exe
    /// comparten el valor, que es justo lo que se quiere. Antes era una
    /// constante que había que subir a mano: al olvidarla, el .exe nuevo
    /// encontraba el marcador viejo, saltaba la extracción y seguía sirviendo
    /// el sitio anterior.
    /// </summary>
    static string VersionPaquete
    {
        get { return Assembly.GetExecutingAssembly().ManifestModule.ModuleVersionId.ToString("N"); }
    }

    static int Main()
    {
        IntPtr job = IntPtr.Zero;
        Process proceso = null;
        try
        {
            string destino = Path.Combine(Path.GetTempPath(), "PlaneacionEstrategica2027");
            string marcador = Path.Combine(destino, ".version");

            bool necesitaExtraer = true;
            if (Directory.Exists(destino) && File.Exists(marcador))
            {
                string versionExistente = File.ReadAllText(marcador).Trim();
                if (versionExistente == VersionPaquete) necesitaExtraer = false;
            }

            if (necesitaExtraer)
            {
                Console.WriteLine("Preparando Planeación Estratégica 2027-2037 (solo la primera vez)...");
                if (Directory.Exists(destino)) Directory.Delete(destino, true);
                Directory.CreateDirectory(destino);

                var asm = Assembly.GetExecutingAssembly();
                using (var stream = asm.GetManifestResourceStream("portal.zip"))
                using (var zip = new ZipArchive(stream, ZipArchiveMode.Read))
                {
                    foreach (var entry in zip.Entries)
                    {
                        string rutaCompleta = Path.Combine(destino, entry.FullName.Replace('/', Path.DirectorySeparatorChar));
                        if (string.IsNullOrEmpty(entry.Name))
                        {
                            Directory.CreateDirectory(rutaCompleta);
                        }
                        else
                        {
                            string carpeta = Path.GetDirectoryName(rutaCompleta);
                            if (!Directory.Exists(carpeta)) Directory.CreateDirectory(carpeta);
                            entry.ExtractToFile(rutaCompleta, true);
                        }
                    }
                }
                File.WriteAllText(marcador, VersionPaquete);
            }

            int puerto = PuertoLibre();
            Console.WriteLine("Iniciando Planeación Estratégica 2027-2037 en el puerto " + puerto + "...");

            string nodeExe = Path.Combine(destino, @"node\node.exe");
            string serverJs = Path.Combine(destino, "server.js");

            var psi = new ProcessStartInfo
            {
                FileName = nodeExe,
                Arguments = "\"" + serverJs + "\"",
                WorkingDirectory = destino,
                UseShellExecute = false,
                CreateNoWindow = true,
            };
            psi.EnvironmentVariables["PORT"] = puerto.ToString();
            psi.EnvironmentVariables["HOSTNAME"] = "127.0.0.1";
            psi.EnvironmentVariables["NODE_ENV"] = "production";
            psi.EnvironmentVariables["BASE_LOCAL_DIR"] = Path.Combine(destino, "base-local");

            proceso = Process.Start(psi);

            // Job Object: garantiza que node.exe muera si este launcher se
            // cierra de cualquier forma (X de la ventana, Task Manager,
            // taskkill /F) — un simple try/finally no cubre esos casos.
            job = CrearJobConMataAlCerrar();
            AssignProcessToJobObject(job, proceso.Handle);

            string url = "http://127.0.0.1:" + puerto;
            bool listo = false;
            for (int i = 0; i < 60; i++)
            {
                if (proceso.HasExited)
                {
                    Console.WriteLine("El servidor se cerró inesperadamente.");
                    return 1;
                }
                try
                {
                    var req = (HttpWebRequest)WebRequest.Create(url);
                    req.Timeout = 1500;
                    using (var resp = (HttpWebResponse)req.GetResponse())
                    {
                        if (resp.StatusCode == HttpStatusCode.OK) { listo = true; break; }
                    }
                }
                catch
                {
                    Thread.Sleep(500);
                }
            }

            if (!listo)
            {
                Console.WriteLine("El servidor no respondió a tiempo.");
                return 1;
            }

            Console.WriteLine("Listo. Abriendo " + url + " en el navegador.");
            Console.WriteLine("Cierra esta ventana para detener el servidor.");
            Process.Start(new ProcessStartInfo { FileName = url, UseShellExecute = true });

            proceso.WaitForExit();
            return 0;
        }
        catch (Exception ex)
        {
            Console.WriteLine("Ocurrió un error: " + ex.Message);
            Console.WriteLine("Presiona una tecla para salir...");
            Console.ReadKey();
            return 1;
        }
        finally
        {
            try { if (proceso != null && !proceso.HasExited) proceso.Kill(); } catch { }
            if (job != IntPtr.Zero) CloseHandle(job);
        }
    }

    static int PuertoLibre()
    {
        int[] candidatos = { 3000, 3001, 3002, 3003, 3004 };
        foreach (int puerto in candidatos)
        {
            try
            {
                var listener = new TcpListener(IPAddress.Loopback, puerto);
                listener.Start();
                listener.Stop();
                return puerto;
            }
            catch { }
        }
        return 3000;
    }

    static IntPtr CrearJobConMataAlCerrar()
    {
        IntPtr job = CreateJobObject(IntPtr.Zero, null);
        var info = new JOBOBJECT_BASIC_LIMIT_INFORMATION
        {
            LimitFlags = 0x2000 // JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
        };
        var extendedInfo = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION
        {
            BasicLimitInformation = info
        };
        int length = Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION));
        IntPtr extendedInfoPtr = Marshal.AllocHGlobal(length);
        Marshal.StructureToPtr(extendedInfo, extendedInfoPtr, false);
        SetInformationJobObject(job, JobObjectInfoType.ExtendedLimitInformation, extendedInfoPtr, (uint)length);
        Marshal.FreeHGlobal(extendedInfoPtr);
        return job;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct JOBOBJECT_BASIC_LIMIT_INFORMATION
    {
        public long PerProcessUserTimeLimit;
        public long PerJobUserTimeLimit;
        public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize;
        public UIntPtr MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass;
        public uint SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct IO_COUNTERS
    {
        public ulong ReadOperationCount;
        public ulong WriteOperationCount;
        public ulong OtherOperationCount;
        public ulong ReadTransferCount;
        public ulong WriteTransferCount;
        public ulong OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
    {
        public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
        public IO_COUNTERS IoInfo;
        public UIntPtr ProcessMemoryLimit;
        public UIntPtr JobMemoryLimit;
        public UIntPtr PeakProcessMemoryUsed;
        public UIntPtr PeakJobMemoryUsed;
    }

    enum JobObjectInfoType
    {
        ExtendedLimitInformation = 9
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    static extern IntPtr CreateJobObject(IntPtr lpJobAttributes, string lpName);

    [DllImport("kernel32.dll")]
    static extern bool SetInformationJobObject(IntPtr hJob, JobObjectInfoType infoType, IntPtr lpJobObjectInfo, uint cbJobObjectInfoLength);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool AssignProcessToJobObject(IntPtr hJob, IntPtr hProcess);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool CloseHandle(IntPtr hObject);
}
