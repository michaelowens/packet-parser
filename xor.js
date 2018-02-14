const fs = require('fs');
const readline = require('readline');
const protocol = require('./protocol.json');

// const clientOrServer = process.argv[2] || 'client'
const logFile = clientOrServer => `logs/2018-02-14/012432_${clientOrServer}.log`;
const quitAtPacket = process.argv[2] || false

let parsed = [];

let lineReader = readline.createInterface({
  input: fs.createReadStream(logFile('client'))
});

lineReader.on('line', function (line) {
  if (line.trim() == '') return;
  // console.log('line client > server', line)

  let timestamp = line.match(/^\[(\d+)\]\s/i)[1]
  line = line.substring(line.length, timestamp.length + 3)
  let buffer = new Buffer(line, 'hex');
  let response = xorPacket(buffer, timestamp, 'client');
  response.direction = 'client to server';

  parsed.push(response);

  if (quitAtPacket === response.name) {
    console.log('========== ' + response.direction + ' ==========')
    console.log(response);
  }

  // console.log(response);
}).on('close', done);

let lineReader2 = readline.createInterface({
  input: fs.createReadStream(logFile('server'))
});

lineReader2.on('line', function (line) {
  if (line.trim() == '') return;
  // console.log('line server > client', line)
  let timestamp = line.match(/^\[(\d+)\]\s/i)[1]
  line = line.substring(line.length, timestamp.length + 3)
  let buffer = new Buffer(line, 'hex');
  let response = xorPacket(buffer, timestamp, 'server');
  response.direction = 'server to client';
  parsed.push(response);

  if (quitAtPacket === response.name) {
    console.log('========== ' + response.direction + ' ==========')
    console.log(response);
  }

  // console.log(response);
}).on('close', done);

let doneCalled = false;
function done() {
  if (!doneCalled) {
    doneCalled = true;
    return;
  }

  if (quitAtPacket) {
    process.exit();
  }

  parsed.sort((a, b) => a.timestamp - b.timestamp);
  // console.log(parsed);

  console.log(parsed.length)
  parsed.forEach(packet => {
    console.log('========== ' + packet.direction + ' ==========')
    console.log(packet)
  })
}

// var buffer = new Buffer("33006966b039005907540750575607555507555857550457025858590504045953565050510229000f06380e141312040d6600", "hex");
//                                     ^ BEGIN MD5

function xorBits(str) {
  return parseInt(str.toString('hex').match(/.{2}/g).reverse().map((hexString, i, arr) => {
    let intVal = parseInt(hexString, 16);
    return (intVal ^ 0x61).toString().padStart(2, 0);
  }).join(''), 16);
}

function xorPacket(buffer, timestamp, clientOrServer) {
  let l = buffer.toString('hex').length / 2
  let packetLength = buffer.readUIntLE(0, 1);
  let command = xorBits(buffer.slice(2, 4));
  let unused = buffer.readUIntLE(4, 2);
  // let packet = buffer.slice(6, packetLength - 1);
  let packet = buffer.slice(clientOrServer === 'client' ? 6 : 2, packetLength - (clientOrServer === 'client' ? 1 : 2));

  // parse packet according to protocol
  // console.log(command.toString('hex'), packetLength, buffer.toString('hex'))
  // console.log(command.toString('hex'))
  // console.log(parseInt(command.toString('hex'), 16))
  // console.log(command == 0x708);
  // console.log(0x708)

  let protocolPacket = protocol.client.find(packet => parseInt(packet.command, 16) === command);
  let response = {
    name: undefined,
    command: command.toString(16),
    length: packetLength,
    unknown: false,
    timestamp: timestamp,
    // buffer: buffer,
    // packet: packet,
    data: {}
  }

  if (!protocolPacket) {
    response.unknown = true;
    return response;
    // return {
    //   command: command,
    //   length: packetLength,
    //   unknown: true,
    //   buffer: buffer
    // };
    //console.error('Could not parse packet with command', command)
  }

  response.name = protocolPacket.name

  if (!protocolPacket.structure || !packet.length) {
    return response;
  }

  // console.log('Packet:', protocolPacket.name, `(${command})`);
  let offset = 0;
  protocolPacket.structure.forEach(struct => {
    var structLength = struct.length || packet.length
    var packetCopy = packet;

    if (packet && struct.trimEnd) {
      packetCopy = packet.slice(0, packet.length - struct.trimEnd);
    }

    // console.log(struct.name, `(${struct.type})`, struct.length || packet.length - offset );

    var section = packetCopy.slice(offset, (struct.length || packetCopy.length))
    let value;
    switch (struct.type) {
      case 'uint':
        value = packetCopy.readUIntLE(offset, struct.length || packetCopy.length);
        break;

      case 'string':
        value = section.toString('hex').match(/.{2}/g).map((hexString, i, arr) => {
          var intVal = parseInt(hexString, 16);
          if (i === arr.length - 1 && structLength === packetCopy.length) {
            return String.fromCharCode(intVal);
          }
          return String.fromCharCode(intVal ^ parseInt(0x61));
        }).join('');
        // console.log(value);
        break;

      case 'raw':
        value = section.toString('hex').match(/.{2}/g).map((hexString, i, arr) => {
          var intVal = parseInt(hexString, 16);
          return String.fromCharCode(intVal);
        }).join('');
        offset += struct.length || packetCopy.length;
        // console.log(value);
        break;
    }
    offset += struct.length || packetCopy.length;

    response.data[struct.name] = value;
  })

  return response;

  // var header =

  // protocol.client.

  // console.log(packetLength);
  // console.log(buffer.readUInt16LE(0));
  // console.log(buffer.readUInt16BE(1));

  // console.log(buffer.readInt8());



  // console.log(buffer.readUIntBE(0, 1)); // length
  // console.log(buffer.readUIntBE(1, 1));
  // console.log(buffer.readUIntBE(2, 1));
  // console.log(buffer.readUIntBE(3, 1));
  // console.log(buffer.readUIntBE(4, 1));
  // console.log(buffer.readUIntBE(5, 1));
  // return packet.toString('hex').match(/.{2}/g).map((hexString, i, arr) => {
  //   var intVal = parseInt(hexString, 16);
  //   if (i === arr.length - 1) {
  //     return String.fromCharCode(intVal);
  //   }
  //   return String.fromCharCode(intVal ^ parseInt(0x61));
  // }).join('');
}

// xorPacket(buffer);
