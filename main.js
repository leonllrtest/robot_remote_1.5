/*
const serviceUUID = 0xFFE0;
const serialUUID = 0xFFE1;

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
*/

async function writeToSerial(text)
{
    if(!window.serialPort) return;
    
    const writer = window.serialOutputStream.getWriter();
    writer.write(text + '\n');
    writer.releaseLock();
}

window.serialPort = undefined;

document.querySelector('#BLE_connect').addEventListener('click', async () => {
    // Prompt user to select any serial window.serialPort.
    window.serialPort = await navigator.serial.requestPort();

    console.log(window.serialPort);
    await window.serialPort.open({ baudRate: 115200 });

    const encoder = new TextEncoderStream();

    window.serialOutputDone = encoder.readable.pipeTo(window.serialPort.writable);
    window.serialOutputStream = encoder.writable;
    
    console.log(window.serialOutputDone, window.serialOutputStream);
  });

setInterval(async () => {
    if(!window.serialPort) return;

    while (window.serialPort.readable) {
        if(window.serialPort.readable.locked) return;

        const reader = window.serialPort.readable.getReader();
      
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) {
              // Allow the serial window.serialPort to be closed later.
              reader.releaseLock();
              break;
            }
            if (value) {
              console.log(new TextDecoder().decode(value));
              
            }
          }
        } catch (error) {
          // TODO: Handle non-fatal read error.
        }
      }
}, 100)

window.gamepad = undefined;


function gamepadHandler(event, connected) {
  const gamepad = event.gamepad;

  // Note:
  // gamepad === navigator.getGamepads()[gamepad.index]

  if (connected) {
    window.gamepad = gamepad;

    const gp = gamepad;
    console.log(
    "Gamepad connected at index %d: %s. %d buttons, %d axes.",
    gp.index,
    gp.id,
    gp.buttons.length,
    gp.axes.length,
  );
  } else {
    window.gamepad = null;
    console.log("Please connect a controller !");
  }
}

window.addEventListener(
  "gamepadconnected",
  (e) => {
    gamepadHandler(e, true);
  },
  false,
);
window.addEventListener(
  "gamepaddisconnected",
  (e) => {
    gamepadHandler(e, false);
  },
  false,
);

window.instructionQueue = []


setInterval(() => {
    if(!window.gamepad) return console.log("No controller !");
    const axisDeadzone = 0.005;

    var turnDirection // true for right 
    , turnAngle;
    var advanceDirection // 1 = forward
    var advanceMagnitude;

    // We do that to update the gamePad
    window.gamepad = navigator.getGamepads()[window.gamepad.index];

    if(window.gamepad.buttons[9].pressed) // start buttons
    {
        window.instructionQueue.push("ST"); // stop button
        return;
    }


    var stickVectorX = window.gamepad.axes[0];
    var stickVectorY = -window.gamepad.axes[1]; // invert the Y axis

    if(Math.abs(stickVectorX) > axisDeadzone) // deadzone of .1%
    {9
        var turnDirection = (stickVectorX > 0); // true for right 
        var turnAngle = Math.round(Math.abs(stickVectorX) * 5); // rotating it to have the 0 face forward
    }
    else
    {
        var turnDirection = false;
        var turnAngle = 0;
    }

    if(Math.abs(stickVectorY) > axisDeadzone) // deadzone of .1%
    {
        var advanceDirection = (stickVectorY > 0); // true for right 
        // trying an exp function to combine speed and presision
        var advanceMagnitude = Math.round(Math.abs(stickVectorY) * 5);
    }
    else
    {
        var advanceDirection = false;
        var advanceMagnitude = 0;
    }


    // sending the instructions
    if(turnDirection)
    {
        window.instructionQueue.push("DR" + turnAngle);
        console.log("Sent turn right of %d°", turnAngle);
    }
    else if (turnAngle > 0)
    {
        window.instructionQueue.push("GA" + turnAngle);
        console.log("Sent turn left of %d°", turnAngle);
    }

    if(advanceDirection)
    {
        window.instructionQueue.push("AV" + advanceMagnitude);
        console.log("Sent advance forward of %dmm", advanceMagnitude);
    }
    else if (advanceMagnitude > 0)
    {
        window.instructionQueue.push("RE" + advanceMagnitude);
        console.log("Sent advance backward of %dmm", advanceMagnitude);
    }

}, 500);

setInterval(() => {
    let instruction = window.instructionQueue.pop();
    if(!instruction || typeof(instruction) == undefined) return;

    console.log("Sent instuction: %s", instruction);
    writeToSerial(instruction);
}, 200)