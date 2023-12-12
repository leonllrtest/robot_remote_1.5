const serviceUUID = "0000ffe0-0000-1000-8000-00805f9b34fb";
const serialUUID = "0000ffe1-0000-1000-8000-00805f9b34fb";

let device;
let serialCharacteristic;

async function connect(){

    device = await navigator.bluetooth.requestDevice({
        filters: [{ 
            services: [serviceUUID]
        }],
    });

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(serviceUUID);

    serialCharacteristic = await service.getCharacteristic(serialUUID);

    await serialCharacteristic.startNotifications();

    serialCharacteristic.addEventListener('characteristicvaluechanged', read);

    document.getElementById('BLE_connect').removeEventListener("click", connect);
    document.getElementById('BLE_connect').addEventListener("click", disconnect);
    document.getElementById('BLE_connect').textContent = "Disconnect";
}

function disconnect(){
    device.gatt.disconnect();

    document.getElementById('BLE_connect').removeEventListener("click", disconnect);
    document.getElementById('BLE_connect').addEventListener("click", connect);
    document.getElementById('BLE_connect').textContent = "Connect";
}

function read(event) {
    let buffer = event.target.value.buffer;
    let view = new Uint8Array(buffer);
    let decodedMessage = String.fromCharCode.apply(null, view);

    let newNode = document.createElement('p');
    newNode.classList.add("received-message");
    newNode.textContent = decodedMessage;

    document.getElementById("terminal").appendChild(newNode);

    let placeholder = document.getElementsByClassName('placeholder');
    if(placeholder.length != 0) placeholder[0].remove();
}

async function write(event){
    let message = "AV100";//document.getElementById("message-input").value;
    message += '\n';
    let buffer = new ArrayBuffer(message.length);
    let encodedMessage = new Uint8Array(buffer);
    
    for(let i=0; i<message.length; i++){
        encodedMessage[i] = message.charCodeAt(i);
    }

    await serialCharacteristic.writeValue(encodedMessage);
}

document.getElementById('BLE_connect').addEventListener("click", connect);
document.getElementById('BLE_test').addEventListener("click", write);