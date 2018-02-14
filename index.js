// const proxy = require('node-tcp-proxy');
const fs = require('fs');

var d = new Date();
var date = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, 0)}-${d.getDate().toString().padStart(2, 0)}`;
var time = `${d.getHours().toString().padStart(2, 0)}${d.getMinutes().toString().padStart(2, 0)}${d.getSeconds().toString().padStart(2, 0)}`;


log = (postfix, data) => {
  if (!fs.existsSync(`logs/${date}`)){
      fs.mkdirSync(`logs/${date}`);
  }

  fs.appendFile(`logs/${date}/${time}_${postfix}.log`, `[${+new Date()}] ${data}\n`, function (err) {
    if (err) throw err;
  });
}

const REMOTE_HOST = '128.241.92.36'; // 'login.rose.warpportal.net';
const REMOTE_PORT = 29000; // 29000;

function xorPacket(buffer) {
  console.log(buffer.readUIntBE(0, 1));
  console.log(buffer.readUIntBE(1, 1));
  console.log(buffer.readUIntBE(2, 1));
  console.log(buffer.readUIntBE(3, 1));
  return buffer.toString('hex').match(/.{2}/g).map(hexString => {
    var intVal = parseInt(hexString, 16);
    return String.fromCharCode(intVal ^ parseInt(0x61));
  }).join('');
}

// var newProxy2 = proxy.createProxy(REMOTE_PORT, REMOTE_HOST, REMOTE_PORT);


var net = require("net");

process.on("uncaughtException", function(error) {
  console.error(error);
});

// if (process.argv.length != 5) {
//   console.log("usage: %s <localport> <remotehost> <remoteport>", process.argv[1]);
//   process.exit();
// }

var localport = REMOTE_PORT;
var remotehost = REMOTE_HOST;
var remoteport = REMOTE_PORT;

var server = net.createServer(function (localsocket) {
  var remotesocket = new net.Socket();

  remotesocket.connect(remoteport, remotehost);

  localsocket.on('connect', function (data) {
    console.log(">>> connection #%d from %s:%d",
      server.connections,
      localsocket.remoteAddress,
      localsocket.remotePort
    );
  });

  localsocket.on('data', function (data) {
    console.log("%s:%d - writing data to remote",
      localsocket.remoteAddress,
      localsocket.remotePort
    );
    log('client', data.toString('hex'))
    console.log('>>>', data.toString('hex'));
    console.log('>>>', xorPacket(data));
    // console.log('>>>', data.toString('utf-8'));
    var flushed = remotesocket.write(data);
    if (!flushed) {
      console.log("  remote not flushed; pausing local");
      localsocket.pause();
    }
  });

  remotesocket.on('data', function(data) {
    console.log("%s:%d - writing data to local",
      localsocket.remoteAddress,
      localsocket.remotePort
    );
    log('server', data.toString('hex'))
    console.log('<<<', data);
    console.log('<<<', xorPacket(data));
    var flushed = localsocket.write(data);
    if (!flushed) {
      console.log("  local not flushed; pausing remote");
      remotesocket.pause();
    }
  });

  localsocket.on('drain', function() {
    console.log("%s:%d - resuming remote",
      localsocket.remoteAddress,
      localsocket.remotePort
    );
    remotesocket.resume();
  });

  remotesocket.on('drain', function() {
    console.log("%s:%d - resuming local",
      localsocket.remoteAddress,
      localsocket.remotePort
    );
    localsocket.resume();
  });

  localsocket.on('close', function(had_error) {
    console.log("%s:%d - closing remote",
      localsocket.remoteAddress,
      localsocket.remotePort
    );
    remotesocket.end();
  });

  remotesocket.on('close', function(had_error) {
    console.log("%s:%d - closing local",
      localsocket.remoteAddress,
      localsocket.remotePort
    );
    localsocket.end();
  });

});

server.listen(localport);

console.log("redirecting connections from 127.0.0.1:%d to %s:%d", localport, remotehost, remoteport);
