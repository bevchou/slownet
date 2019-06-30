//convert to date & time
function convertDate(epochdate) {
  let myDate = new Date(epochdate * 1000);
  return myDate.toLocaleString();
}

//convert seconds to appropriate time metric
function convertTime(seconds) {
  let words;
  if (seconds < 60) {
    words = roundplace(seconds) + " seconds";
  } else if (seconds >= 60 && seconds < 60 * 60) {
    let minutes = seconds / 60;
    words = roundplace(minutes) + " minutes";
  } else if (seconds >= 60 * 60 && seconds < 60 * 60 * 24) {
    let hours = seconds / 3600;
    words = roundplace(hours) + " hours";
  } else {
    let days = seconds / (3600 * 24);
    words = roundplace(days) + " days";
  }
  return words;
}

//round to second decimal place
function roundplace(number){
  return Math.round(100*number)/100;
}
