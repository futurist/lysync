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
            //timer1_Tick(new object(), new EventArgs());

        }

        private void timer1_Tick(object sender, EventArgs e)
        {
            var logFolder = "";
            var logfile0 = "";
            var logfile1 = "";
            try
            {
                DirectoryInfo d = new DirectoryInfo(path);
                
                if (arguments.Length > 1) logFolder = arguments[1];
                else logFolder = d.Parent.Parent.Parent.FullName;

                logfile0 = logFolder + "\\PrintLog0.txt";
                logfile1 = logFolder + "\\PrintLog1.txt";
            }
            catch (Exception err) {
                textBox1.Text = err.Message;
            }
            try
            {
                textBox1.Text = System.IO.File.ReadAllText(logfile0);
            }
            catch (Exception err) {
                textBox1.Text = err.Message;
            }

            try
            {
                textBox2.Text = System.IO.File.ReadAllText(logfile1);
            }
            catch (Exception err)
            {
                textBox2.Text = err.Message;
            }

        }
    }
}
