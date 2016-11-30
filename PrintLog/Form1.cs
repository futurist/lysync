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

                if (arguments.Length > 1 && arguments[1] != "") logFolder = arguments[1];
                else logFolder = System.IO.Path.GetDirectoryName(System.Reflection.Assembly.GetEntryAssembly().Location);

                logfile0 = logFolder + "\\PrintLog0.txt";
                logfile1 = logFolder + "\\PrintLog1.txt";
            }
            catch (Exception err)
            {
                textBox1.Text = err.Message;
            }

            var selTab = 0;
            try
            {
                if (arguments.Length > 2) selTab = Int32.Parse(arguments[2]);
                 
            }
            catch (Exception err)
            {
                selTab = 0;
            }
            tabControl1.SelectedTab = tabControl1.TabPages[selTab];

            updateText();

        }

        private void timer1_Tick(object sender, EventArgs e)
        {
            updateText();

        }

        public void updateText()
        {
            try
            {
                // textBox1.Text = System.IO.File.ReadAllText(logfile0);
                string[] myString = System.IO.File.ReadAllLines(logfile0);
                Array.Reverse(myString);
                textBox1.Text = String.Join(Environment.NewLine, myString);
            }
            catch (Exception err)
            {
                textBox1.Text = err.Message;
            }

            try
            {
                //textBox2.Text = System.IO.File.ReadAllText(logfile1);
                string[] myString = System.IO.File.ReadAllLines(logfile1);
                Array.Reverse(myString);
                textBox2.Text = String.Join(Environment.NewLine, myString);

            }
            catch (Exception err)
            {
                textBox2.Text = err.Message;
            }
            textBox3.Text = DateTime.Now.ToString();

            
            this.Show();
            this.WindowState = FormWindowState.Normal;

        }

        private void button1_Click(object sender, EventArgs e)
        {
            updateText();
        }


    }
}
