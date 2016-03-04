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
        string logFolder = "";
        string logfile0 = "";
        string logfile1 = "";

        public Form1()
        {
            InitializeComponent();
        }

        private void Form1_Load(object sender, EventArgs e)
        {
            try
            {
                DirectoryInfo d = new DirectoryInfo(path);
                
                if (arguments.Length > 1) logFolder = arguments[1];
                else logFolder = d.Parent.Parent.Parent.FullName;

                logfile0 = logFolder + "\\PrintLog0.txt";
                logfile1 = logFolder + "\\PrintLog1.txt";
            }
            catch (Exception err)
            {
                textBox1.Text = err.Message;
            }

            //timer1_Tick(new object(), new EventArgs());

        }

        private void timer1_Tick(object sender, EventArgs e)
        {
            updateText();

        }

        public void updateText()
        {
            try
            {
                textBox1.Text = System.IO.File.ReadAllText(logfile0);
            }
            catch (Exception err)
            {
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
            textBox3.Text = DateTime.Now.ToString();
        }

        private void button1_Click(object sender, EventArgs e)
        {
            updateText();
        }

    }
}
