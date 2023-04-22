var lastTick = Date.now()
var timers = {
    findingKeys: {
        startTime: undefined,
        length: undefined,
        running: false,
    },
    roundProgress: {
        startTime: undefined,
        length: undefined,
        running: false,
    },
    cantType: {
        startTime: undefined,
        length: undefined,
        running: false,
    }
}
var publicKeyDisplay = [
    "#","#","#","#","#"
]
var publicKeyDisplayToggle = [
    false, false, false, false, false
]
let publicKeyDisplayRate = 0;
var publicKeyDisplayRunning = false;
function tick(){
    let currentTime = Date.now();
    let delta = currentTime - lastTick;
    if(delta > 1000/20){
        if(timers.findingKeys.running){
            let totalTime = timers.findingKeys.length;
            let timeElapsed = (currentTime - timers.findingKeys.startTime)/1000;
            if(timeElapsed > totalTime){
                timeElapsed = totalTime;
            }
            let timePercentage = timeElapsed/totalTime;
            if(timePercentage < 0) timePercentage = 0;
            if(timePercentage > 1) timePercentage = 1;
            $("#preparation_bar").css("width", ((796 - (796 * timePercentage)) + "px"))
            if($("#waitingForKeysTimer")){
                $("#waitingForKeysTimer").html(Math.floor(totalTime - timeElapsed) + "s")
            }
            $("#instructionsSeconds").html("You have " + Math.floor(totalTime - timeElapsed) + " seconds.")

            if(timePercentage >= 1){
                timers.findingKeys.running = false;
            }
        }
        if(timers.roundProgress.running){
            let totalTime = timers.roundProgress.length;
            let timeElapsed = (currentTime - timers.roundProgress.startTime)/1000;
            if(timeElapsed > totalTime){
                timeElapsed = totalTime;
            }
            let timePercentage = timeElapsed/totalTime;
            if(timePercentage < 0) timePercentage = 0;
            if(timePercentage > 1) timePercentage = 1;
            $("#gameTimeBar").css("width", ((906 - (906 * timePercentage)) + "px"))
            $("#clock").html((totalTime - timeElapsed).toFixed(1) + "s")

            if(timePercentage >= 1){
                timers.roundProgress.running = false;
            }
        }
        if(timers.cantType.running){
            let totalTime = timers.cantType.length;
            let timeElapsed = (currentTime - timers.cantType.startTime)/1000;
            if(timeElapsed > totalTime){
                timeElapsed = totalTime;
            }
            let timePercentage = timeElapsed/totalTime;
            if(timePercentage < 0) timePercentage = 0;
            if(timePercentage > 1) timePercentage = 1;
            $("#sendingBar").css("width", (452 * timePercentage + "px"))

            if(timePercentage >= 1){
                timers.cantType.running = false;
                $("#sendingGuesser").css("display", "none")
                $("#gameInput").prop("disabled", false);
                $("#gameInput").focus();
            }
        }
        if(publicKeyDisplayRunning){
            publicKeyDisplayRate++;
            if(publicKeyDisplayRate > 5){
                publicKeyDisplayRate = 0;
                for(let i = 0; i < 5; i++){
                    if(publicKeyDisplayToggle[i]){
                        $("#publicKey" + (i + 1)).html("");
                        for(let j = 0; j < publicKeyDisplay[i].length; j++){
                            if(publicKeyDisplay[i][j] == "#"){
                                $("#publicKey" + (i + 1)).append(randomLetter());
                            }
                            else {
                                $("#publicKey" + (i + 1)).append(publicKeyDisplay[i][j]);
                            }
                        }
                    }
                }
            }
        }
    }
    window.requestAnimationFrame(tick);
}

function setTimer(timerType, startTime, length){
    timers[timerType].startTime = startTime;
    timers[timerType].length = length;
    timers[timerType].running = true;
}

function randomLetter() {
    var chars = 'abcdefghijklmnopqrstuvwxyz*%$@#0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return chars[Math.floor(Math.random() * chars.length)];
}