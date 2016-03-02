using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Text;
using System.Windows.Forms;

using System.Net.Sockets;
using System.Net;
using System.Web.Script.Serialization;
using System.Diagnostics;
using System.Timers;
using System.IO;


namespace PrintLog
{
    public partial class Form1 : Form
    {
        String[] arguments = Environment.GetCommandLineArgs();
        string path = Directory.GetCurrentDirectory();
        

        public Form1()
        {
            InitializeComponent();
        }

        private void Form1_Load(object sender, EventArgs e)
        {
            timer1_Tick(null, null);

        }

        private void timer1_Tick(object sender, EventArgs e)
        {
            DirectoryInfo d = new DirectoryInfo(path);
            var logfile =  d.Parent.Parent.Parent.FullName + "\\PrintLog.txt";
            if(arguments.Length>1) logfile = arguments[1];
            try
            {
                string text = System.IO.File.ReadAllText(logfile);
                textBox1.Text = text;
            }
            catch (Exception err) {
                textBox1.Text = err.Message;
            }
        }
    }
}
