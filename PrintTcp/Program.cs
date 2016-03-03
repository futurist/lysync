using System;
using System.Collections.Generic;
using System.Text;
using System.Net.Sockets;
using System.Net;
using System.Media;
using System.IO;

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
                server = new TcpListener(localAddr, port);

                // Start listening for client requests.
                server.Start();

                // Buffer for reading data
                Byte[] bytes = new Byte[2560];
                String data = null;

                // Enter the listening loop.
                while (true)
                {
                    Console.Write("Waiting for a connection... ");

                    // Perform a blocking call to accept requests.
                    // You could also user server.AcceptSocket() here.
                    TcpClient client = server.AcceptTcpClient();
                    Console.WriteLine("Connected!");

                    data = null;

                    // Get a stream object for reading and writing
                    NetworkStream stream = client.GetStream();

                    int i;

                    // Loop to receive all the data sent by the client.
                    while ((i = stream.Read(bytes, 0, bytes.Length)) != 0)
                    {
                        // Translate data bytes to a ASCII string.
                        data = System.Text.Encoding.ASCII.GetString(bytes, 0, i);
                        Console.WriteLine("Received: {0}", data);

                        // Process the data sent by the client.
                        //data = data.ToUpper();
                        data = "HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n";

                        byte[] msg = System.Text.Encoding.ASCII.GetBytes(data);

                        // Send back a response.
                        stream.Write(msg, 0, msg.Length);
                        Console.WriteLine("Sent: {0}", data);
                        playSound();
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


            Console.WriteLine("\nHit enter to continue...");
            Console.Read();
        }

        static void playSound()
        {
            string path = Directory.GetCurrentDirectory();
            DirectoryInfo d = new DirectoryInfo(path);
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
