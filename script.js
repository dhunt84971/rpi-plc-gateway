//#region GLOBAL DECLARATIONS
"use strict";
const electron = require("electron");
const {
    remote
} = require("electron");
const {
    dialog
} = require("electron").remote;
const fs = require("fs");
const exec = require("child_process").exec;
const path = require('path');
const os = require('os');
const ping = require('ping');

var quitApp = false;
var plcIP = "100.100.100.50";
var plcCheckTimeSet = 10;
var plcCheckTimeAcc = 0;
var plcChecking = false;

let appDir = path.dirname(require.main.filename);

var lblWANIP = document.getElementById("lblWANIP");
var lblLANIP = document.getElementById("lblLANIP");
var lblPLCIP = document.getElementById("lblPLCIP");

function plcCheckConn(){
    plcChecking = true;
    console.log("ping " + plcIP);
    if (lblPLCIP.classList.contains("invalid")){
        lblPLCIP.innerText = "Checking...";
    }
    ping.sys.probe(plcIP, (isAlive) => {
        lblPLCIP.innerText = plcIP;
        isAlive ? lblPLCIP.classList.remove("invalid") : lblPLCIP.classList.add("invalid");
        plcChecking = false;
        plcCheckTimeAcc = plcCheckTimeSet;
    });
}

function getIPAddresses(){
    var eth0 = false;
    var wlan0 = false;

    var ifaces = os.networkInterfaces();
    Object.keys(ifaces).forEach(function (ifname) {
        var alias = 0;
        ifaces[ifname].forEach(function (iface) {
            if ('IPv4' !== iface.family || iface.internal !== false) {
            // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
            return;
            }
            if (alias >= 1) {
            // this single interface has multiple ipv4 addresses
                console.log(ifname + ':' + alias, iface.address);
            } else {
            // this interface has only one ipv4 adress
                console.log(ifname, iface.address);
            }
            if (ifname == "eth0"){
                lblLANIP.innerText = iface.address;
                lblLANIP.classList.remove("invalid");
                eth0 = true;
            }
            if (ifname == "wlan0"){
                lblWANIP.innerText = iface.address;
                lblWANIP.classList.remove("invalid");
                wlan0 = true;
            }
            ++alias;
        });
    });
    if (!eth0) {
        lblLANIP.innerText = "UNPLUGGED";
        lblLANIP.classList.add("invalid");
    }
    if (!wlan0) {
        lblWANIP.innerText = "UNPLUGGED";
        lblWANIP.classList.add("invalid");
    }
}

function reboot(){
    exec("sudo reboot", (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
        quitApp = true;
    });
}

async function init() {
    await wait(1000);
    lblLANIP.innerText = "UNPLUGGED";
    lblLANIP.classList.add("invalid");
    lblWANIP.innerText = "UNPLUGGED";
    lblWANIP.classList.add("invalid");
    lblPLCIP.innerText = plcIP;
    lblPLCIP.classList.add("invalid");
    getIPAddresses();
    loop();
}

async function loop() {
    while (!quitApp) {
        await wait(1000);
        if (!plcChecking){
            plcCheckTimeAcc -= 1;
            if (plcCheckTimeAcc <= 0){
                plcCheckConn();
                getIPAddresses();
            }
            
        }
    }
}

function wait(time_ms) {
    return new Promise(function (resolve, reject) {
        setTimeout(() => {
            resolve();
        }, time_ms);
    });
}

document.getElementById("btnReboot").addEventListener("click", () => {
    reboot();
});

init();
