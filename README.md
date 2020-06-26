# rpi-plc-gateway
Raspberry Pi - Wireless to Wired PLC Targeted Router Manager

## Description
This project is intended to contain everything that is required to build a 3.5" Touchscreen Raspberry Pi that can be used to route network traffic from a wireless network to an island LAN network on the industrial machine.  Specifically the application in this repo is targeting an EthernetIP PLC at port 44818 so that a remote PC running a development environment using RSLinx can make a direct connection to the PLC.

## Technology
A Raspberry Pi with a 3.5" touchscreen was selected to host the application because of its small size and low price.  The standard Raspbian Desktop OS was selected as the operating system because of its wide support and well documented instructions.  Nodejs and Electron will be used as the platform for the router manager application.  Electron makes it easy to create a small user friendly interface and also provides the opportunity to create a webbased version in the future.  Nodejs is well supported.

## Typical Architecture
Typically this will be used to access a machine's local network.  Connect an Ethernet cable between the port on the Pi and the switch in the main control panel that is connected to the PLC.  Then connect to the office network over wifi.  (It is assumed that the Ethernet port will be statically addresses and the wifi will be DHCP (or dynamically) addressed.

<img src="./documentation/figure1-architecture.png">

## Bill of Material
1. Raspberry Pi 3B+, 16GB Micro SD Card and 2.0A power adapter. (The touchscreen and case that have been selected will not work with the Pi 4.)
2. Raspberry Pi 3.5" touchscreen and case. 
<br/>https://smile.amazon.com/gp/product/B07N38B86S/ref=ppx_yo_dt_b_asin_title_o01_s00?ie=UTF8&psc=1
3. Circular magnet (1.26" diameter) with double-sided adhesive.
<br/>https://smile.amazon.com/gp/product/B076Z81891/ref=ppx_yo_dt_b_asin_title_o08_s00?ie=UTF8&psc=1
4. Circular felt (1" diameter) with self adhesive.
<br/>https://smile.amazon.com/gp/product/B01C2EMIIS/ref=ppx_yo_dt_b_asin_title_o08_s00?ie=UTF8&psc=1

## Raspberry Pi Setup
The following steps were used to install and configure the Raspberry Pi.

### Initial OS Installation
For the initial installation, the touchscreen was not mounted.  Instead a standard monitor was connected to the HDMI port.  The latest (as of 06/23/2020) Raspbian Desktop OS image was downloaded and transferred to the 16GB micro SD card using dd.  No special steps were taken during the installation other than connecting to the local wifi for internet access, selecting the appropriate localization options and allowing the update to be performed.  

#### Raspberry Pi Configuration (raspi-config)
Enable the SSH command with password access.  In order to use the touchscreen drivers the SPI kernel module must be enabled.  After the configuration changes are made reboot the Pi and run ```ip addr``` to get the IP address at wlan0.  This will be used to ssh into the Pi for the Touchscreen Driver Installation.

### Touchscreen Driver Installation
1. With the Pi powered off, mount the touchscreen.  Installation instructions can be found here:
<br/>http://www.lcdwiki.com/MHS-3.5inch_RPi_Display#How_to_use_in_the_Raspberry.2FUbuntu_Mate.2FKali.2FRetropie_system
2. Once the screen is mounted turn on the Pi.  (Note: The display will remain blank until the drivers have been installed.)
3. Using another computer ssh into the Pi. (e.g.```ssh pi@192.168.1.57```, change IP to the address exposed by the ```ip addr``` command from earlier.)  
4. Since the base OS has already been installed go to step 3 of the lcdwiki instructions.  This will reboot the Pi and the desktop should now appear on the touchscreen.
  ```
  git clone https://github.com/goodtft/LCD-show.git
  chmod -R 755 LCD-show
  cd LCD-show/
  sudo ./MHS35-show
  ```
  

5. Optionally, this might be a good place to make an image of the micro SD card.

### Router and Port Forwarding Configuration
A quick note about this section.  The following steps are simply for setting up some basic port forwarding and NAT to the PLC.  No consideration has been given to security of any kind.  It is not recommended that you use this on an unsecured network or to connect over the internet on a public IP.

#### Enable Port Forwarding
To enable port forwarding, ssh into the Pi and edit the /etc/sysctl.conf file:
```
sudo nano /etc/sysctl.conf
```
Uncomment the following line by removing the # from the front:
```
net.ipv4.ip_forward=1
```
Then press **Ctrl+x**, then **y**, then **Enter**, to save the changes to the file.
  
Make the change take effect by running the following commands:
```
sudo sysctl -p
sudo sysctl --system
```
If this is done correctly several messages should appear similar to the following:
```
* Applying /etc/sysctl.d/98-rpi.conf ...
kernel.printk = 3 4 1 3
vm.min_free_kbytes = 16384
* Applying /etc/sysctl.d/99-sysctl.conf ...
net.ipv4.ip_forward = 1
* Applying /etc/sysctl.d/protect-links.conf ...
fs.protected_hardlinks = 1
fs.protected_symlinks = 1
* Applying /etc/sysctl.conf ...
net.ipv4.ip_forward = 1
```
#### IP Tables Configuration
Install the following package so iptables are persistent.
```
sudo apt-get udpate
sudo apt-get install iptables-persistent
```
During the installation you will be asked if you want to save the current rules.  Just say yes.  This will create a /etc/iptables/rules.v4 and /etc/iptables/rules.v6 file.

Open and edit the rules.v4 file:
```
*filter
:INPUT DROP [0:0]
:FORWARD DROP [0:0]
:OUTPUT ACCEPT [0:0]
:UDP - [0:0]
:TCP - [0:0]
:ICMP - [0:0]
-A INPUT -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
-A INPUT -i lo -j ACCEPT
-A INPUT -m conntrack --ctstate INVALID -j DROP
-A INPUT -p udp -m conntrack --ctstate NEW -j UDP
-A INPUT -p tcp -m tcp --tcp-flags FIN,SYN,RST,ACK SYN -m conntrack --ctstate NEW -j TCP
-A INPUT -p icmp -m conntrack --ctstate NEW -j ICMP
-A INPUT -p udp -j REJECT --reject-with icmp-port-unreachable
-A INPUT -p tcp -j REJECT --reject-with tcp-reset
-A INPUT -j REJECT --reject-with icmp-proto-unreachable
-A FORWARD -i wlan0 -o eth0 -p tcp -m tcp --dport 44818 --tcp-flags FIN,SYN,RST,ACK SYN -m conntrack --ctstate NEW -j ACCEPT
-A FORWARD -i wlan0 -o eth0 -p tcp -m tcp --dport 1433 --tcp-flags FIN,SYN,RST,ACK SYN -m conntrack --ctstate NEW -j ACCEPT
-A FORWARD -i wlan0 -o eth0 -p tcp -m tcp --dport 8080 --tcp-flags FIN,SYN,RST,ACK SYN -m conntrack --ctstate NEW -j ACCEPT
-A FORWARD -i wlan0 -o eth0 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
-A FORWARD -i eth0 -o wlan0 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
-A TCP -p tcp -m tcp --dport 22 -j ACCEPT
-A TCP -p tcp -m tcp --dport 443 -j ACCEPT
COMMIT
*raw
:PREROUTING ACCEPT [0:0]
:OUTPUT ACCEPT [0:0]
COMMIT
*nat
:PREROUTING ACCEPT [0:0]
:INPUT ACCEPT [0:0]
:POSTROUTING ACCEPT [0:0]
:OUTPUT ACCEPT [0:0]
-A PREROUTING -i wlan0 -p tcp -m tcp --dport 44818 -j DNAT --to-destination 100.100.100.50
-A POSTROUTING -d 100.100.100.50/24 -o eth0 -p tcp -m tcp --dport 44818 -j SNAT --to-source 100.100.100.101
-A PREROUTING -i wlan0 -p tcp -m tcp --dport 1433 -j DNAT --to-destination 100.100.100.51
-A POSTROUTING -d 100.100.100.51/24 -o eth0 -p tcp -m tcp --dport 1433 -j SNAT --to-source 100.100.100.101
-A PREROUTING -i wlan0 -p tcp -m tcp --dport 8080 -j DNAT --to-destination 100.100.100.51
-A POSTROUTING -d 100.100.100.51/24 -o eth0 -p tcp -m tcp --dport 8080 -j SNAT --to-source 100.100.100.101
COMMIT
*security
:INPUT ACCEPT [0:0]
:FORWARD ACCEPT [0:0]
:OUTPUT ACCEPT [0:0]
COMMIT
*mangle
:PREROUTING ACCEPT [0:0]
:INPUT ACCEPT [0:0]
:FORWARD ACCEPT [0:0]
:OUTPUT ACCEPT [0:0]
:POSTROUTING ACCEPT [0:0]
COMMIT

```
##### Explanation of rules.v4

In this example case the EthernetIP PLC is at 100.100.100.50.  Port 44818 is forwarded using the line:
```
-A FORWARD -i wlan0 -o eth0 -p tcp -m tcp --dport 44818 --tcp-flags FIN,SYN,RST,ACK SYN -m conntrack --ctstate NEW -j ACCEPT
```
In addition to forwarding port 44818 our example industrial machine also has an HMI at 100.100.100.51 which hosts a webserver at port 8080 and a SQL server using the standard TCP port 1433.  Since we would like to gain access to these as well the following lines are added:
```
-A FORWARD -i wlan0 -o eth0 -p tcp -m tcp --dport 1433 --tcp-flags FIN,SYN,RST,ACK SYN -m conntrack --ctstate NEW -j ACCEPT
-A FORWARD -i wlan0 -o eth0 -p tcp -m tcp --dport 8080 --tcp-flags FIN,SYN,RST,ACK SYN -m conntrack --ctstate NEW -j ACCEPT
```
We also want to be able to continue to ssh into the Raspberry Pi, so the following lines are added:
```
-A TCP -p tcp -m tcp --dport 22 -j ACCEPT
-A TCP -p tcp -m tcp --dport 443 -j ACCEPT
```
Now that the ports will be forwarded between the wireless (wlan0) and hardwired (eth0) connections we use NAT (Network Address Translation) to allow direct connections from outside of the hardwired network without setting the gateway on the PLC.  The key here is that the PLC will think the conenction is local.
```
-A PREROUTING -i wlan0 -p tcp -m tcp --dport 44818 -j DNAT --to-destination 100.100.100.50
-A POSTROUTING -d 100.100.100.50/24 -o eth0 -p tcp -m tcp --dport 44818 -j SNAT --to-source 100.100.100.101
```
The HMI SQL Server and Webserver ports are nat'ed as well:
```
-A PREROUTING -i wlan0 -p tcp -m tcp --dport 1433 -j DNAT --to-destination 100.100.100.51
-A POSTROUTING -d 100.100.100.51/24 -o eth0 -p tcp -m tcp --dport 1433 -j SNAT --to-source 100.100.100.101
-A PREROUTING -i wlan0 -p tcp -m tcp --dport 8080 -j DNAT --to-destination 100.100.100.51
-A POSTROUTING -d 100.100.100.51/24 -o eth0 -p tcp -m tcp --dport 8080 -j SNAT --to-source 100.100.100.101
```
More information on the rest of the settings can be found here:
https://www.digitalocean.com/community/tutorials/how-to-forward-ports-through-a-linux-gateway-with-iptables

#### Save the Changes
Using **Ctrl**+**x** then **y** and **Enter**, save the changes made to the file.  Then verify that the file is valid by using:
```
sudo iptables-restore -t < /etc/iptables/rules.v4
```
Finally, reboot the Pi to make the changes active.
```
sudo reboot
```
If your configuration matches the settings above you will still be able to make an ssh connection to the Pi, but if you try to ping the Pi it will respond like this:
```
ping 192.168.1.57
PING 192.168.1.57 (192.168.1.57) 56(84) bytes of data.
From 192.168.1.57 icmp_seq=1 Destination Protocol Unreachable
From 192.168.1.57 icmp_seq=2 Destination Protocol Unreachable
From 192.168.1.57 icmp_seq=3 Destination Protocol Unreachable
From 192.168.1.57 icmp_seq=4 Destination Protocol Unreachable
From 192.168.1.57 icmp_seq=5 Destination Protocol Unreachable
```
At this point, if you connect the Pi's hardwired Ethernet port to the machine's local network you will be able to connect to the PLC from any computer on the wireless network using the Pi's wlan0 IP address as if it were the PLC's address.  The rest of the instructions involve installing the Electron desktop application for easily managing the router.

## Installation

### Node and Electron Installation

### Application Installation

### Start on Boot Configuration

## Example Connection Using RSLinx
