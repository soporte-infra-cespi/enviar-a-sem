// ==UserScript==
// @name         EnviarASEM
// @namespace    http://tampermonkey.net/
// @version      0.1
// @updateURL    https://github.com/soporte-infra-cespi/tampermonkey-send-to-orion/raw/main/EnviarASEM.user.js
// @downloadURL  https://github.com/soporte-infra-cespi/tampermonkey-send-to-orion/raw/main/EnviarASEM.user.js
// @description  Agrega un botón a la consulta del DNRPA para enviar la info a Orion
// @author       CeSPI
// @match        https://sistemas.dnrpa.gov.ar/consultaintegral/consultaGral.php
// @grant        none
// ==/UserScript==

const EXZPORT_BTN_ID = "btnExport";
const LP_DATA_SECTION = "consulta_seleccion_2";
const OTHER_DATA_SECTION = "consulta_seleccion_3";
const BUTTON_TEXT = "Visualizar información";
const ANIMATION_DELAY = 300;

const FETCH_URI = '';
const FETCH_METHOD = 'POST';
let GLOBAL_IS_WAITING = false;


// Gets the sibling of a label element
function getSiblingTextFromLabel(labelEl) {
    return labelEl.parentNode.childNodes[1].innerHTML.trim();
}

// Returns true if the current page is a results page
function onResultsPage() {
    // we depend on the page not changing, this button must exist with this ID
    return !!document.getElementById(EXZPORT_BTN_ID);
}

// Gathers the results from the DOM (can be buggy if page desing changes)
function gatherResults() {
    const resultObject = {};

    const lpFather = document.getElementById(LP_DATA_SECTION);

    // STRONGLY COUPLED with current design of the DNRPA result page
    const lp = getSiblingTextFromLabel(lpFather.getElementsByTagName("b")[0].parentNode);
    resultObject.licensePlate = lp;

    // get other data
    const otherDataFather = document.getElementById(OTHER_DATA_SECTION);
    const fontsElements = otherDataFather.getElementsByTagName("font");

    for (let i = 0; i < fontsElements.length; i++) {
        const label = fontsElements[i].innerHTML.trim();

        switch (label) {
            case "Registro Seccional.": {
                resultObject.registry = getSiblingTextFromLabel(fontsElements[i]);
                break;
            }
            case "Dirección.": {
                resultObject.registryAddress = getSiblingTextFromLabel(fontsElements[i]);
                break;
            }
            case "Localidad.": {
                resultObject.registryCity = getSiblingTextFromLabel(fontsElements[i]);
                break;
            }
            case "Provincia.": {
                resultObject.registryProvince = getSiblingTextFromLabel(fontsElements[i]);
                break;
            }
            case "Código Postal.": {
                resultObject.registryPostalCode = getSiblingTextFromLabel(fontsElements[i]);
                break;
            }
            case "Teléfono.": {
                resultObject.registryPhoneNumber = getSiblingTextFromLabel(fontsElements[i]);
                break;
            }
            case "Origen.": {
                resultObject.vehicleOrigin = getSiblingTextFromLabel(fontsElements[i]);
                break;
            }
            case "Marca.": {
                resultObject.vehicleBrand = getSiblingTextFromLabel(fontsElements[i]);
                break;
            }
            case "Modelo.": {
                resultObject.vehicleModel = getSiblingTextFromLabel(fontsElements[i]);
                break;
            }
            case "Tipo de automotor.": {
                resultObject.vehicleType = getSiblingTextFromLabel(fontsElements[i]);
                break;
            }
            case "Inscripción inicial.": {
                resultObject.vehicleRegistryDate = getSiblingTextFromLabel(fontsElements[i]);
                break;
            }
            case "Placa.": {
                resultObject.vehiclePlaque = getSiblingTextFromLabel(fontsElements[i]);
                break;
            }
            case "Fecha adquisición.": {
                resultObject.vehicleAdquirementDate = getSiblingTextFromLabel(fontsElements[i]);
                break;
            }
            case "Nombre.&nbsp;": {
                resultObject.ownerName = getSiblingTextFromLabel(fontsElements[i]);
                break;
            }
            case "Tipo documento.&nbsp;": {
                const dniArray = fontsElements[i].parentNode.childNodes[1].innerText.trim().split("Nro.")
                resultObject.ownerDniType = dniArray[0].trim();
                resultObject.ownerDniNumber = dniArray[1].trim();
                break;
            }
            case "Cuit/Cuil.&nbsp;": {
                resultObject.ownerCuitOrCuil = getSiblingTextFromLabel(fontsElements[i]);
                break;
            }
            case "Porcentaje de titularidad.&nbsp;": {
                resultObject.ownerPercentage = getSiblingTextFromLabel(fontsElements[i]);
                break;
            }
            case "Dirección.&nbsp;": {
                const addrArray = fontsElements[i].parentNode.childNodes[1].innerText.trim().split(/Número.|Piso.|Depto./);
                resultObject.ownerAddressStreet = addrArray[0].trim();
                resultObject.ownerAddressNumber = addrArray[1].trim();
                resultObject.ownerAddressFloor = addrArray[2].trim();
                resultObject.ownerAddressAppartmentNumber = addrArray[3].trim();
                break;
            }
            case "Código postal.&nbsp;": {
                const postalCodeArray = fontsElements[i].parentNode.childNodes[1].innerText.trim().split("Localidad.");
                resultObject.ownerPostalCode = postalCodeArray[0].trim();
                resultObject.ownerCity = postalCodeArray[1].trim();
                break;
            }
            case "Provincia.&nbsp;": {
                resultObject.ownerProvince = getSiblingTextFromLabel(fontsElements[i]);
                break;
            }
            case "Fecha titularidad.&nbsp;": {
                resultObject.ownerTitularityDate = getSiblingTextFromLabel(fontsElements[i]);
                break;
            }
            default: console.log("font tag", label, "not recognized");
        }
    }

    return resultObject;
}

// sends the data to the server
function sendDataToOrion(e) {
    e.preventDefault();

    // show info
    toggleInfo(true);

    const resultsJSON = gatherResults();

    toggle();

    fetch(FETCH_URI, {
        method: FETCH_METHOD,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(resultsJSON)
    })
        .then(() => {console.log("Exito"); toggle(); console.log("Datos enviados con exito a SEM.")})
        .catch((e) => { console.error("error enviando a sem", e); toggle(); console.log("Ocurrio un error enviando los datos a SEM"); });
}

function animateWaitingSpan() {
    //disable toggling
    return;

    if (GLOBAL_IS_WAITING) {
        switch (document.getElementById("sem_waiting_span").innerHTML) {
            case ".": document.getElementById("sem_waiting_span").innerHTML = ".."; break;
            case "..": document.getElementById("sem_waiting_span").innerHTML = "..."; break;
            default: document.getElementById("sem_waiting_span").innerHTML = ".";
        }
        setTimeout(animateWaitingSpan, ANIMATION_DELAY)
    }
}

function toggle() {
    GLOBAL_IS_WAITING = !GLOBAL_IS_WAITING;
    if (GLOBAL_IS_WAITING) {
        document.getElementById("sem_send_btn").disabled = true;
        document.getElementById("sem_waiting_span").innerHTML = "."
        document.getElementById("sem_waiting_span").style.display = "inline";
        setTimeout(animateWaitingSpan, ANIMATION_DELAY);
    } else {
        document.getElementById("sem_send_btn").disabled = false;
        document.getElementById("sem_waiting_span").style.display = "none";
    }
}

function constructButton() {
    let sendBtn = document.createElement("button");
    sendBtn.id = "sem_send_btn";
    sendBtn.innerHTML = BUTTON_TEXT;
    sendBtn.onclick = sendDataToOrion;
	sendBtn.style.color = '#161D5A';
	sendBtn.style["background-color"] = '#2ED366';
	sendBtn.style["font-size"] = '20px';
	sendBtn.style.padding = '15px 25px';
	sendBtn.style.border = 'none';
	sendBtn.style.cursor = 'pointer';
	sendBtn.style["border-radius"] = '15px';

    const section = document.getElementById(LP_DATA_SECTION);
    const tbody = section.getElementsByTagName("tbody")[0];
    tbody.insertBefore(sendBtn, tbody.firstChild);

    let waitingSpan = document.createElement("span");
    waitingSpan.id = "sem_waiting_span";
    waitingSpan.innerHTML = ".";
    waitingSpan.style = "display: none; margin-left: 2px";
    tbody.insertBefore(waitingSpan, sendBtn.nextSibling);
}

function toggleInfo(show) {
    const visValue = show ? 'visible' : 'hidden';

    document.querySelectorAll("#consulta_seleccion_2 table tr").forEach((tr) => {tr.style.visibility = visValue;});
    document.querySelectorAll("#consulta_seleccion_3 table tr").forEach((tr) => {tr.style.visibility = visValue;});
    document.getElementById("consulta_seleccion_4").style.visibility = visValue;
    document.getElementById("consulta_seleccion_5").style.visibility = visValue;
    document.querySelectorAll("center input[type=BUTTON]").forEach((tr) => {tr.style.visibility = visValue});
    document.querySelectorAll("center input[type=submit]").forEach((tr) => {tr.style.visibility = visValue});
}

(function() {
    'use strict';
    console.log("are we on results page", onResultsPage());

    if (onResultsPage()) {
        constructButton();
        toggleInfo(false);
    }
})();
