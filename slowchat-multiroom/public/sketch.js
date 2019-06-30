//GLOBAL VARIABLES
//msg attributes
let username;
//load message history once
let historyLoaded = false;
//text area
let msgInput;
//room management
let currentRoom;


// socket io script
let socket = io.connect("http://bc2542.itp.io");
// let socket = io.connect("http://localhost:8000/");
// let socket = io.connect("http://bc2542.itp.io:8000/");


//receive conversation history only once
socket.on('convoHistory', function (data) {
  if (!historyLoaded) {
    for (let i = 0; i < data.length; i++) {
      //add messages to chat body
      postMessage(data[i]);
    }
    historyLoaded = true;
  }
});

//get broadcasted text & post to browser
socket.on('chatmsg', function (data) {
  console.log("got msg", data);
  postMessage(data);
  if (username == data.user) {
    //clear input for current user
    msgInput.value = "";
  }

});

//deal with error messages
socket.on('errMsg', function (data) {
  if (data.timeErr) {
    //output 
    let warning = 'wait ' + convertTime(data.timeDifference) + ' before sending a message';
    postError(warning);
  }
  if (data.lengthErr) {
    data.lengthDifference++;
    let warning = 'your message needs ' + data.lengthDifference + ' more characters';
    postError(warning);
  }
});


window.addEventListener('load', function () {
  //get dom elements
  let nameInput = document.getElementById('nameInput');
  let nameAlert = document.getElementById('nameAlert');
  let chatbody = document.getElementById('chatbody');
  msgInput = document.getElementById('msgInput');
  let sendButton = document.getElementById('sendButton');
  let roomTitle = document.getElementById('roomTitle');

  //change site title to room name
  roomTitle.innerText = "room: " + window.location.pathname.substring(1);

  //send url pathname to the server --> determines chat room
  socket.emit('url', window.location.pathname);

  //get user's username
  nameInput.addEventListener('keyup', function (e) {
    e.preventDefault();
    if (e.keyCode === 13) {
      if (nameInput.value != "") {
        username = nameInput.value;
        console.log('you are ' + username);
        //remove username input field
        nameInput.remove();
        nameAlert.remove();
        //show text areas
        msgInput.style.visibility = "visible";
        sendButton.style.visibility = "visible";
      } else {
        console.log("must submit text");
      }
    }
  });

  //hit enter of send a message via hit send
  msgInput.addEventListener('keyup', function (e) {
    if (e.keyCode === 13) {
      e.preventDefault();
      //remove extra new line
      msgInput.value = msgInput.value.replace(/\n/g, '');
      sendMessage();
    }
  });
  sendButton.addEventListener('click', sendMessage, false);

});


function sendMessage() {
  //check if empty white space
  if (msgInput.value.replace(/^\s+|\s+$|\s+(?=\s)/g, "") == "") {
    console.log("error: cannot submit empty enter text!");
  } else {
    //create object w/ new message info
    let newMessage = {
      time: new Date().getTime() / 1000,
      msg: msgInput.value,
      length: msgInput.value.length,
      user: username
    }
    // console.log(newMessage);
    //send message to server
    socket.emit('chatmsg', newMessage);
  }
}

function postMessage(chatMsgObj) {
  let posttext = chatMsgObj.user + " (" + convertDate(chatMsgObj.time) + "): " + chatMsgObj.msg;
  //create a paragraph element
  let p = document.createElement('p');
  p.innerText = posttext;
  //add to chatbody
  chatbody.appendChild(p);
  //scroll to bottom
  chatbody.scrollTo(0, chatbody.scrollHeight);
}

function postError(errTxt) {
  //create a paragraph element
  let p = document.createElement('p');
  p.className = "warning";
  p.innerText = errTxt;
  //add to chatbody
  chatbody.appendChild(p);
  //scroll to bottom
  chatbody.scrollTo(0, chatbody.scrollHeight);
}
