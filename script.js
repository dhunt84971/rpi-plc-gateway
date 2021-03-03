"use strict";

//#region REQUIRES EXTERNAL MODULES
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
const libAppSettings = require("lib-app-settings");
var piWifi = require('pi-wifi');
var ssidConnectRequest = "";
//#endregion REQUIRES EXTERNAL MODULES

//#region GLOBAL DECLARATIONS
const settingsFile = ".settings";
const appSettings = new libAppSettings(settingsFile);
var quitApp = false;
var plcIP = "100.100.100.50";
var plcCheckTimeSet = 10;
var plcCheckTimeAcc = 0;
var plcChecking = false;
let appDir = path.dirname(require.main.filename);

// Page component references.
var lblWANIP = document.getElementById("lblWANIP");
var lblLANIP = document.getElementById("lblLANIP");
var lblPLCIP = document.getElementById("lblPLCIP");
var txtSSID = document.getElementById("txtSSID");
var lstSSIDs = document.getElementById("lstSSIDs");
//#endregion GLOBAL DECLARATIONS

//#region ONSCREEN KEYBOARD
var lowerKeys = ["\`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", 
    "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\", 
    " ", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "\'", " ", 
    " ", " ", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", " "];
var shiftKeys = ["~", "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "_", "+", 
    "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "{", "}", "|", 
    " ", "A", "S", "D", "F", "G", "H", "J", "K", "L", ":", "\"", " ", 
    " ", " ", "Z", "X", "C", "V", "B", "N", "M", "<", ">", "?", " "];
var loadedKeys = lowerKeys;  // Initialize the keyboard to lowercase keys.

function loadKeys(keys){
    let row = 1;
    let keysPerRow = 13;
    let i = 1;
    removeChildren(`row${row}`);
    for (let key of keys){
        let keyEl = addItemtoDiv(`row${row}`, key, "btnKey");
        if (key == " "){  // Empty key
            keyEl.classList.add("background");
        }
        else{
            // Add the click event handler
            keyEl.addEventListener("click", ()=>{
                txtKeyboardEntry.value += key;
            });
        }
        i += 1;
        if (i > keysPerRow && row < 4){
            i=1;
            row += 1;
            removeChildren(`row${row}`);
        }
    }
}

//#endregion ONSCREEN KEYBOARD

//#region LAN FUNCTIONS
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
//#endregion LAN FUNCTIONS

//#region SYSTEM FUNCTIONS
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
//#endregion SYSTEM FUNCTIONS

//#region DOM HELPER FUNCTIONS
function addItemtoDiv(divById, itemInnerText, classAdd) {
    var newItem = document.createElement("div");
    newItem.innerText = itemInnerText;
    newItem.classList.add(classAdd);
    return document.getElementById(divById).appendChild(newItem);
}


function removeChildren(elId) {
    let elChildren = document.getElementById(elId);
    while (elChildren.childElementCount > 0) {
        elChildren.removeChild(elChildren.lastChild);
    }
}

function ShowPage(page){
    divHomePage.classList.add("hide");
    divSettingsPage.classList.add("hide");
    divKeyboardPage.classList.add("hide");
    if (page=="Home") divHomePage.classList.remove("hide");
    else if (page=="Settings") divSettingsPage.classList.remove("hide");
    else if (page=="Keyboard") divKeyboardPage.classList.remove("hide");
}
//#endregion DOM HELPER FUNCTIONS


//#region NOTIFICATION WINDOWS

function showWarningMessageBox(message) {
    const options = {
        type: "warning",
        title: "Warning",
        buttons: ["OK"],
        message: message,
    };

    dialog.showMessageBox(null, options);
}

function showOKMessageBox(message) {
    const options = {
        type: "info",
        title: "Information",
        buttons: ["OK"],
        message: message,
    };

    dialog.showMessageBox(null, options);
}

function showConfirmationBox(message) {
    const options = {
        type: "info",
        title: "Confirm",
        buttons: ["Yes", "No", "Cancel"],
        message: message,
    };

    let response = dialog.showMessageBoxSync(null, options);

    return response == 0;
}

//#endregion NOTIFICATION WINDOWS


//#region SAVED SSID FUNCTIONS
function addSSID(ssid){
    var newItem = document.createElement("div");
    newItem.innerText = ssid;
    newItem.classList.add("btn");
    newItem.classList.add("btnTight");
    lstConnectSSIDs.appendChild(newItem).addEventListener("click", (e)=>{
        selectSSID(e.target);
    });
}

function loadSSIDs(){
    piWifi.listNetworks(function(err, networksArray) {
        if (err) {
          return console.log(err.message);
        }
        for (let network of networksArray){
            addSSID(network.ssid);
        }
    });
}

function getSSIDNetIndex(ssid){
    let index = 0;
    if (lstConnectSSIDs.childElementCount > 0){
        let child = lstConnectSSIDs.firstChild;
        while (child.innerText != ssid){
            console.log(child);
            console.log({index:index, ssid:child.innerText});
            index += 1;
            child = child.nextSibling;
        }
    }
    return index;
}

function selectSSID(el){
    console.log(el.innerText);
    lblSSID.value = el.innerText;
    let netId = getSSIDNetIndex(lblSSID.value);
    console.log(netId);
    // piWifi.connectToId(0, (err)=>{
    //     //if (err) showWarningMessageBox(`Connection failed.\n${err.message}`);
    // });
}
//#endregion SAVED SSID FUNCTIONS

//#region SCANNED SSID FUNCTIONS
function scanForSSIDs(){
    // Scan for SSIDs and add to the list.
    removeChildren("lstAddSSIDs");
    piWifi.scan((err, networks)=>{
        if (err) {
            console.log("Scan failed..." + err.message);
        }
        else{
            let listed = [];
            for (let network of networks){
                if (!listed.includes(network.ssid) && network.ssid != undefined){
                    let ssidEl = addItemtoDiv("lstAddSSIDs", network.ssid, "btn");
                    ssidEl.classList.add("btnTight");
                    ssidEl.addEventListener("click", ()=>{
                        getPassword(network.ssid);
                    });
                    listed.push(network.ssid);
                }
            }
        }
    });
}

function getPassword(ssid){
    ssidConnectRequest = ssid;
    ShowPage("Keyboard");
    txtKeyboardEntry.value = "";
}

function ssidConnect(ssid, password){
    piWifi.connect(ssid, password, (err)=>{
        if (!err){
            lblSSID.value = ssid;
            ShowPage("Home");
        }
        else {
            showWarningMessageBox(`Connection failed.\n${err.message}`);
        }
    });
}
//#region SCANNED SSID FUNCTIONS

//#region INITIALIZATION
async function init() {
    await wait(1000);
    // Initialize the page components
    lblLANIP.innerText = "UNPLUGGED";
    lblLANIP.classList.add("invalid");
    lblWANIP.innerText = "UNPLUGGED";
    lblWANIP.classList.add("invalid");
    lblPLCIP.innerText = plcIP;
    lblPLCIP.classList.add("invalid");

    // Load the SSID list.
    loadSSIDs();

    // Fill the page components
    getIPAddresses();

    // Load the keyboard
    loadKeys(loadedKeys);

    // Run the connected status loop.
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
//#endregion INITIALIZATION

//#region EVENT HANDLERS
function wait(time_ms) {
    return new Promise(function (resolve, reject) {
        setTimeout(() => {
            resolve();
        }, time_ms);
    });
}

function ssid_clicked(e){
    selectSSID(e.target);
}

btnSettings.addEventListener("click", ()=>{
    ShowPage("Settings");
});

btnHome.addEventListener("click", ()=>{
    ShowPage("Home");
});

btnKeyCancel.addEventListener("click", ()=>{
    ShowPage("Settings");
});

btnReboot.addEventListener("click", () => {
    reboot();
});

btnScanWifi.addEventListener("click", ()=>{
    scanForSSIDs();
});


//#region KEYBOARD EVENTS
btnKeyShift.addEventListener("click", ()=>{
    loadedKeys = loadedKeys == lowerKeys ? shiftKeys : lowerKeys;
    loadKeys(loadedKeys);
});

btnKeySpace.addEventListener("click", ()=>{
    txtKeyboardEntry.value += " ";
});

btnKeyBackSp.addEventListener("click", ()=>{
    let entryText = txtKeyboardEntry.value;
    if (entryText.length > 0){
        txtKeyboardEntry.value = entryText.slice(0,-1);
    }
});

btnKeyEnter.addEventListener("click", ()=>{
    ssidConnect(ssidConnectRequest, txtKeyboardEntry.value);
});
//#endregion KEYBOARD EVENTS

//#endregion EVENT HANDLERS

init();
