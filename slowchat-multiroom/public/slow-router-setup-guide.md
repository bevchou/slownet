# Slow Router Set Up Guide

I am using a Raspberry Pi 3 B+ that is running Raspbian Stretch Lite.

## Make an Access Point (AP)

### Remove WPA Supplicant: 
```
sudo apt-get purge wpasupplicant
```

### Install an DHCP server
```
sudo apt-get install isc-dhcp-server
```

### Setup DHCP 
Add your settings to the configuration file. 
```
sudo nano /etc/dhcp/dhcpd.conf
```

And then add to end of file. You can change the ip address of your router to whatever you want. I used 192.168.1.X which is super common. 
```python
subnet 192.168.1.0 netmask 255.255.255.0 {
  range 192.168.1.25 192.168.1.50;
  option domain-name-servers 8.8.4.4;
  option routers 192.168.1.1;
  interface wlan0;
}
```
Change the settings for the IPv4. 
 ```
 sudo nano /etc/default/isc-dhcp-server
 ```

Add your wifi interface under INTERFACESv4.
 ```python
# On what interfaces should the DHCP server (dhcpd) serve DHCP requests?
# Separate multiple interfaces with spaces, e.g. "eth0 eth1".
INTERFACESv4="wlan0"
#INTERFACESv6=""
```

### Install the host access point daemon
```
sudo apt-get install hostapd
```

### Configure hostapd

Create a hostapd.conf file
```
sudo nano /etc/hostapd/hostapd.conf
```

add these lines to hostapd.conf file
```python
interface=wlan0
#driver=nl80211
ssid=YOUR_STATION
hw_mode=g
channel=5
#Use WPA2 if you want to require a password for your wifi connection
wpa=2
wpa_passphrase=SECRETPASSWORD
wpa_key_mgmt=WPA-PSK
wpa_pairwise=TKIP CCMP
wpa_ptk_rekey=600
macaddr_acl=0
```

Modify the 

Set the ip address of the wifi interface
restart the dhcp server

```
sudo ifconfig wlan0 192.168.1.1
sudo /etc/init.d/isc-dhcp-server restart
```

If you get any errors like this:

>Job for isc-dhcp-server.service failed because the control process exited with error code.
>See "systemctl status isc-dhcp-server.service" and "journalctl -xe" for details.

You might need to delete pid files: ```sudo rm /var/run/dhcpd.pid```. Try to run it again: ```sudo service isc-dhcp-server start```. And check the service status: ```systemctl status isc-dhcp-server.service```.

Now try to run your access point! -d is for debug mode so you can see if any errors appear. Try to see if you can connect to it.
```
$ sudo hostapd -d /etc/hostapd/hostapd.conf
```

Ctrl-c to stop the access point. Now make these changes persistent. 
```
$ sudo nano /etc/network/interfaces
```

And add the following lines.
```python
auto wlan0
iface wlan0 inet static
address 192.168.1.1
netmask 255.255.255.0

#EDIT: add these two keep the ethernet interface working while AP is running so you can still use the internet working on the Pi
auto eth0
iface eth0 inet dhcp
```

Edit rc.local. This file runs automatically at the end of the boot sequence.
```
$ sudo nano /etc/rc.local
```

and add these lines before the last line, ```exit 0```.

```python
#run hostapd 
hostapd -B /etc/hostapd/hostapd.conf
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
#EDIT: add this code to bridge eth0 and wlan0
#this will connect wlan0 and eth0, so wlan0 can share internet with people who connect to the wifi
iptables -A FORWARD -i eth0 -o wlan0 -m state --state RELATED,ESTABLISHED -j ACCEPT
iptables -A FORWARD -i wlan0 -o eth0 -j ACCEPT
```

Then uncomment the following line in /etc/sysctrl.conf

```
$ sudo nano /etc/sysctl.conf
```

```python
# Uncomment the next line to enable packet forwarding for IPv4
#net.ipv4.ip_forward=1
```

So above should read:
```python
net.ipv4.ip_forward=1
```

That’s it. Now reboot it! And it should work.
```
$ sudo reboot
```

If you see the error "Failed to start dhcpcd on all interfaces", it's possible there are two dhcp processes trying to run at once. See which ones are running.

```
$ dpkg -l | grep dhcp
```
If you have an extra "dhcpcd5" process running, the remove the program. And reboot to see if the error goes away.
```
$ sudo apt-get remove dhcpcd5
```

## Limit Bandwidth

Download Wondershaper. Github repo is here: https://github.com/magnific0/wondershaper

```
cd ~
git clone  https://github.com/magnific0/wondershaper.git
```

Run a system install

```
cd wondershaper
sudo make install
```

Check if it installed. This command should return ```/usr/bin/wondershaper```.

```
which wondershaper
```

Edit the rc.local file again. Add these lines before ```exit 0```:

```
wondershaper -a wlan0 -d 100
wondershaper -a wlan0 -u 100
```

You're just setting the adapter (-a) and the setting the download (-d) and upload (-u) speeds in kbps.

You can view the documentation to modify the rates from the command line by running ```sudo wondershaper -h```. 

The internet should be pretty slow at this point!

## Add a splash page

Install dnsmasq: ```sudo apt-get install dnsmasq```.

Install dependency that nodogsplash requires to compile: ```sudo apt-get install libmicrohttpd-dev```

Download and compile nodogsplash. I used version 2.0.1 because it seemed more stable. You can pick a different release version [here](https://github.com/nodogsplash/nodogsplash/releases).

```
sudo wget https://github.com/nodogsplash/nodogsplash/archive/v2.0.1.zip
unzip v2.0.1.zip 
rm v2.0.1.zip 
cd nodogsplash-2.0.1/
sudo make
```

_This is an optional method (instead of "sudo make install"), but highly recommend doing this when installing programs that aren't installed through a package manager so you can more easily uninstall it when you inevitably fuck up. [View checkinstall doc here.](https://help.ubuntu.com/community/CheckInstall)_

If you don't already have checkinstall: ```sudo apt-get install checkinstall```

Now run it and fix any errors if it fails. You might need to use mkdir to add some directories: ```sudo checkinstall```

Check to make sure it installed by pulling up the help page: ```sudo nodogsplash -h```

Make a copy of the original config file in case: ```sudo cp /etc/nodogsplash/nodogsplash.conf /etc/nodogsplash/nodogsplash.conf.orig```

And now open it ```sudo nano /etc/nodogsplash/nodogsplash.conf``` and then add the following:

```
GatewayInterface wlan0
GatewayAddress 192.168.1.1
MaxClients 250
ClientIdleTimeout 480
```

_I'm not sure if you need to turn on traffic control. But you might need to set it to "yes" to get wondershaper to work. But I have not confirmed this yet. Mine is currently set on "yes" which doesn't seem to break anything._

And finally run it in debug mode: ```sudo nodogsplash -f -d 5```

This should work. And if it does, you can add it to the rc.local file. This file is run every time the raspberry pi boots up: ```sudo nano /etc/rc.local```

And then add ```nodogsplash``` before the line that says ```exit 0```.

This is the resulting order of my commands in the rc.local file. I have an (optional) extra script "shutdown.py" which is a button that allows me to shutdown the pi. 

```python
# Print the IP address
_IP=$(hostname -I) || true
if [ "$_IP" ]; then
  printf "My IP address is %s\n" "$_IP"
fi
hostapd -B /etc/hostapd/hostapd.conf
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
#additional code to connect wlan0 and eth0
iptables -A FORWARD -i eth0 -o wlan0 -m state --state RELATED,ESTABLISHED -j ACCEPT
iptables -A FORWARD -i wlan0 -o eth0 -j ACCEPT
wondershaper -a wlan0 -d 100
wondershaper -a wlan0 -u 100
nodogsplash
sudo python3 /home/bev/shutdown.py &
exit 0
```

You can customize the captive portal splash page here: ```sudo nano /etc/nodogsplash/htdocs/splash.html```. Look at the documentation here for details: https://nodogsplashdocs.readthedocs.io/en/stable/customize.html
