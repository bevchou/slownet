//set up express
let express = require("express");
let app = express();
//demo local
// let server = app.listen(8000);
let server = app.listen(80);
app.use(express.static("public"));


//file system
let fs = require('fs');
const url = require('url');
var Datastore = require('nedb');


app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.get('/:roomName', function (request, response) {
  //serve the chat website
  response.sendFile(__dirname + '/views/chat.html');

  // let room = request.params.roomName;
  // console.log("going to room: " + room);
});





//set up sockets
let socket = require("socket.io");
let io = socket(server);


// when new client connects
io.sockets.on("connection", function (socket) {
  console.log("new connection: " + socket.id);
  //variable for this socket's database & room
  let room;

  //get url to get name of room
  socket.on('url', function (data) {
    room = data.substring(1);
    console.log(socket.id + " in " + room);

    //create simple database
    let db = new Datastore({
      filename: "convo-" + room + ".db",
      autoload: true
    });

    socket.join(room);

    //query database all messages, sorted by time
    db.find({}).sort({ time: 1 }).exec(function (err, docs) {
      if (err != null) {
        console.log("err:" + err);
      } else if (docs.length < 2) {

      } else {
        //send conversatino history to newly connected client
        console.log("message history retreived");
        socket.emit('convoHistory', docs);
      }
    });
  });

  //when server receives a message
  socket.on('chatmsg', function (data) {
    //reload database
    let db = new Datastore({
      filename: "convo-" + room + ".db",
      autoload: true
    });

    let errMsg = {
      timeErr: false,
      timeDifference: null,
      lengthErr: false,
      lengthDifference: null
    }
    //query for longest message
    db.find({}).sort({ length: -1 }).limit(1).exec(function (err, lengthObj) {
      //allow first message to go through
      if (lengthObj.length == 0) {
        emitMessage(data, db, room);
      } else {
        // calculate difference betwen lengths
        console.log("longest", lengthObj[0].length, lengthObj[0].msg);
        errMsg.lengthDifference = lengthObj[0].length - data.length;

        //query for two latest messages & caclulate time differences
        db.find({}).sort({ time: -1 }).limit(2).exec(function (err, timeObj) {
          //allow second message to go through if length is longer
          if (timeObj.length < 2 && errMsg.lengthDifference < 0) {
            emitMessage(data, db, room)
          } else if (timeObj.length < 2 && errMsg.lengthDifference >= 0) {
            errMsg.lengthErr = true;
            socket.emit('errMsg', errMsg);
          } else {

            // console.log("time latest", timeObj[0].time, timeObj[0].msg);
            // console.log("time penultimate", timeObj[1].time, timeObj[1].msg);
            let timeWindow = timeObj[0].time - timeObj[1].time;
            let timeToCheck = data.time - timeObj[0].time;
            errMsg.timeDifference = timeWindow - timeToCheck;

            // if time & length are both greater
            if (errMsg.timeDifference < 0 && errMsg.lengthDifference < 0) {
              emitMessage(data, db, room);
              //if time is too short
            } else if (errMsg.timeDifference < 0 && errMsg.lengthDifference >= 0) {
              errMsg.lengthErr = true;
              socket.emit('errMsg', errMsg);

              //if length is too short
            } else if (errMsg.timeDifference >= 0 && errMsg.lengthDifference < 0) {
              errMsg.timeErr = true;
              socket.emit('errMsg', errMsg);

              //if time & length too short
            } else {
              errMsg.timeErr = true;
              errMsg.lengthErr = true;
              socket.emit('errMsg', errMsg);
            }
          }
        });
      }
    });
  });

  //notify when user disconnects
  socket.on('disconnect', function () {
    console.log("Client has disconnected " + socket.id);
  });




});

function emitMessage(data, db, room) {
  //send text message to all users (including the sender)
  io.to(room).emit('chatmsg', data);
  // add to database
  db.insert(data, function (err, newDocs) {
    if (err != null) {
      console.log("err:" + err);
    } else {
      console.log("incoming msg: " + newDocs.msg);
    }
  });
}

//TEST JSON
// {
//   "0": {
//     "time": "time",
//     "msg": "message",
//     "length": "message.length",
//     "user": "username"
//   }
// }
