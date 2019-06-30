
window.addEventListener('load', function () {
  let roomInput = document.getElementById('roomInput');
  

  // get room name
  roomInput.addEventListener('keyup', function (e) {
    e.preventDefault();
    if (e.keyCode === 13) {
      if (roomInput.value != "") {
        let newURL = window.location.origin + "/" + roomInput.value;
        console.log(newURL);
        document.location.href = newURL;
        
      } else {
        console.log("must submit text");
      }
    }
  });
});