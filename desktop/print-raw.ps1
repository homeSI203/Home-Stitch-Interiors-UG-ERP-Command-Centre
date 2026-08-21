param(
  [Parameter(Mandatory = $true)][Alias("PrinterName")][string]$Printer,
  [Parameter(Mandatory = $true)][Alias("FilePath")][string]$File
)

$code = @"
using System;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }

  [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

  [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool ClosePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

  [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

  public static string SendFile(string printerName, string filePath) {
    byte[] bytes = System.IO.File.ReadAllBytes(filePath);
    IntPtr hPrinter;
    if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) {
      return "OpenPrinter failed: " + Marshal.GetLastWin32Error();
    }
    DOCINFOA di = new DOCINFOA();
    di.pDocName = "Home Stitch Receipt";
    di.pDataType = "RAW";
    bool ok = false;
    string error = null;
    try {
      if (!StartDocPrinter(hPrinter, 1, di)) {
        error = "StartDocPrinter failed: " + Marshal.GetLastWin32Error();
      } else {
        StartPagePrinter(hPrinter);
        IntPtr p = Marshal.AllocCoTaskMem(bytes.Length);
        Marshal.Copy(bytes, 0, p, bytes.Length);
        int written;
        ok = WritePrinter(hPrinter, p, bytes.Length, out written);
        Marshal.FreeCoTaskMem(p);
        EndPagePrinter(hPrinter);
        EndDocPrinter(hPrinter);
        if (!ok) error = "WritePrinter failed: " + Marshal.GetLastWin32Error();
      }
    } finally {
      ClosePrinter(hPrinter);
    }
    return ok ? "OK" : (error ?? "Print failed");
  }
}
"@

try {
  Add-Type -TypeDefinition $code -Language CSharp -ErrorAction Stop
} catch {
  if ($_.Exception.Message -notmatch "already exists") {
    throw
  }
}

if (-not (Test-Path -LiteralPath $File)) {
  Write-Error "Receipt file not found: $File"
  exit 1
}

$result = [RawPrinterHelper]::SendFile($Printer, $File)
if ($result -ne "OK") {
  Write-Error $result
  exit 1
}
Write-Output $result
