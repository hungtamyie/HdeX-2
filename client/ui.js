var socket = io();

window.onload = function(){
    setScreen("login");
    createEventHandlers();
    tick();

    /*var names = ["JASON", "johnny", "mei", "Rocket", "Singer", "Taylor", "Jaguar", "Height"]
    $("#nameInput").val(names[getRandomInt(0, names.length)] + " " + getRandomInt(0,100))*/
}

screens = [
    "login",
    "setup",
    "preparation",
    "scoreboard",
    "game",
]
function setScreen(s){
    screens.forEach(function(screen){
        $("#" + screen + "Screen").css("display", "none");
    });
    $("#" + s + "Screen").css("display", "inline-flex");
}

function createEventHandlers(){
    $("#connectBtn").click(function(){
        let myName = $("#nameInput").val();
        let room = $("#roomInput").val().toUpperCase();
        socket.emit("join_room", {name: myName, room: room});
    })

    $("#createBtn").click(function(){
        let myName = $("#nameInput").val();
        socket.emit("create_room", {name: myName});
    })

    $("#switchTeams").click(function(){
        socket.emit("switch_teams", {});
    })

    $("#readyButton").click(function(){
        socket.emit("toggle_ready", {});
    })

    $("#startRound").click(function(){
        socket.emit("start_round", {publicKeys: [
            $("#pkIn1").val(),
            $("#pkIn2").val(),
            $("#pkIn3").val(),
            $("#pkIn4").val(),
            $("#pkIn5").val(),
        ], force: false});
    })

    $("#pkIn1").on('keypress',function(e) {
        if(e.which == 13) {
            $("#pkIn2").focus();
        }
    });
    $("#pkIn2").on('keypress',function(e) {
        if(e.which == 13) {
            $("#pkIn3").focus();
        }
    });
    $("#pkIn3").on('keypress',function(e) {
        if(e.which == 13) {
            $("#pkIn4").focus();
        }
    });
    $("#pkIn4").on('keypress',function(e) {
        if(e.which == 13) {
            $("#pkIn5").focus();
        }
    });
    $("#pkIn1, #pkIn2, #pkIn3, #pkIn4, #pkIn5").on('focusout', function(){
        $("#" + this.id).val($("#" + this.id).val().replace(/[^\w\s]/gi, ''))
    })
    $("#gameInput").on('keypress',function(e) {
        if(e.which == 13) {
            submitGuess()
        }
    });

    $("#sendButton").click(function(){
        submitGuess()
    })

    $("#generateNewKeyButton").click(function(){
        socket.emit("generateNewKey", {});
    })

    $("#giveUpButton").click(function(){
        socket.emit("requestNextRound", {});
    })

    $("#exitInstructions").click(function(){
        $("#instructionsContainer").css("display","none")
    })

    $("#InstructionsButton").click(function(){
        $("#instructionsContainer").css("display","inline-flex")
    })

    $("#Spectate, #Settings").click(function(){
        $("#serverMessage").html("Sorry, this function is not available at the moment.");
        $("#serverMessage").animate({opacity: 1},{duration: 500, complete: ()=>{
            window.setTimeout(()=>{
                $("#serverMessage").animate({opacity: 0},{duration: 500});
            },1000)
        }})
    })
}

socket.on('disconnect', function(){
    setScreen("login");
});

function submitGuess(){
    if($("#gameInput").val() == ""){return};
    socket.emit("submitGuess", {guess: $("#gameInput").val()});
    $("#sendingGuesser").css("display", "block")
    $("#sendingBar").css("width", "0px")
    $("#gameInput").prop("disabled", true);
    $("#gameInput").val("");
}

socket.on("serverMessage", function(data){
    $("#serverMessage").html(data.message);
    $("#serverMessage").animate({opacity: 1},{duration: 500, complete: ()=>{
        window.setTimeout(()=>{
            $("#serverMessage").animate({opacity: 0},{duration: 500});
        },1000)
    }})
})


socket.on('roomJoined', function(data){
    setScreen("setup");
})

socket.on('gameUpdate', function(data){
    console.log(data.game);
    redraw(data.game);
})

socket.on('backToLobby', function(data){
    setScreen("login");
})

socket.on('publicKeyRequest', function(){
    socket.emit("start_round", {publicKeys: [
        $("#pkIn1").val(),
        $("#pkIn2").val(),
        $("#pkIn3").val(),
        $("#pkIn4").val(),
        $("#pkIn5").val(),
    ], force: true});
})

socket.on('timerEvent', function(data){
    setTimer(data.timerType, data.startTime, data.length)
})

socket.on('consoleMessage', function(data){
    if(data.clearAll){
        $("#consoleOutput").html("")
    }
    addToConsole(data.message)
})

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
  }

function addToConsole(text){
    $("#consoleOutput").append(text)
    $("#consoleOutput").append("<br>")
    $("#consoleOutput").scrollTop($("#consoleOutput").prop("scrollHeight"));
}

let flavorTextData = [
    [
        "Professional Penetration Tester",
        [38, 38],
        "NSA Employee",
        "Controls every camera in your house. Likes watching video feeds while eating cold pizza and drinking lukewarm coke",
        1,
    ],
    [
        "Hacker Extraordinaire",
        [24, 24],
        "DEFCON Event Organizer",
        "Uses electromagnets attached to fingertips to pull information from databases. Sees the world as a series of 1s and 0s.",
        3,
    ],
    [
        "New Age Savant",
        [15, 15],
        "Professional Fortnite Streamer",
        "Copy pastes scripts from Tik Tok to boot opponents offline. Hoping to make it big in the streaming world. (Already has 12 followers)",
        2,
    ],
    [
        "Grand Tech Wizard",
        [56, 56],
        "Apple CTO / Google Senior Engineer",
        "Occasionally walks by employees' desks and enters in 2 lines of code, improving database performance by 4000%",
        1,
    ],
    [
        "The Prodigy",
        [12, 12],
        "Harvard Professor",
        "First time touching a computer, started coding in Malbolge at 150 wpm. Built a school in Ghana using only C++",
        3,
    ],
    [
        "Dorito Lord",
        [27, 27],
        "World of Warcraft Guild Leader",
        "Resides in underground chamber, writes scripts to farm gold and xp, fueled by powerful green liquid.",
        1,
    ],
    [
        "The Hippie",
        [42, 42],
        "Growing Flowers, Being Happy",
        "Loves everything and everybody. Uses skills to funnel money from large businesses to puppy shelters.",
        2,
    ],
    [
        "Security Researcher",
        [21, 21],
        "Consultant for AMD and Intel",
        "Loves the simple things in life. Driving late at night with the windows down in the private jet. Taking the cruise ship out for a spin.",
        2,
    ],
    [
        "The Puzzler",
        [23, 23],
        "Professional Scrabble Player",
        "Has a mastery of letters and words. She just mixes them and something amazing comes out. Just like when she mixes steak and orange juice :)",
        0,
    ],
]

function getFlavorText(index){
    let flavorText = flavorTextData[index];
    let output = ''
    output += "<i><span style='font-size: 13px'>" + flavorText[0] + "</span></i><br>"
    output += "Age: " + getRandomInt(flavorText[1][0], flavorText[1][1]) + " - Occupation: " + flavorText[2] + "<br>"
    output += flavorText[3];
    return output;
}