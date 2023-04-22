function redraw(game){
    if(game.state == "lobby"){
        setScreen("setup");
        $("#roomCode").html(game.code);
        $("#teamAPlayers").html("");
        $("#teamBPlayers").html("");
        $("#gameScreen").css("background", "linear-gradient(180deg, rgb(0, 0, 0) 0%, #050a13 100%)")
        let teamAPlayers = game.teams.a.players;
        for(player of teamAPlayers){
            let color = player.ready ? "#14FF00" : "white";
            $("#teamAPlayers").append('<div class="player_card">\
            <img src="./images/agent' + flavorTextData[player.flavorText][4] + '.png" class="player_card_image">\
            <div class="player_card_text"><h3 style="color:' + color + '">' + player.name + '</h3>' + getFlavorText(player.flavorText) + '</div>')
        }
        let teamBPlayers = game.teams.b.players;
        for(player of teamBPlayers){
            let color = player.ready ? "#14FF00" : "white";
            $("#teamBPlayers").append('<div class="player_card">\
            <img src="./images/agent' + flavorTextData[player.flavorText][4] + '.png" class="player_card_image">\
            <div class="player_card_text"><h3 style="color:' + color + '">' + player.name + '</h3>' + getFlavorText(player.flavorText) + '</div>')
        }

        var myPlayer;
        var playersReady = 0;
        var playersTotal = 0;
        for(var playerId in game.players) {
            if(game.players.hasOwnProperty(playerId)){
                playersTotal++;
                if(game.players[playerId].ready){
                    playersReady++;
                }
                if(game.players[playerId].id == socket.id){
                    myPlayer = game.players[playerId];
                }
            }
        }

        if(myPlayer.ready){
            $("#readyButton").addClass("ready_button_on")
            $("#readyButton").removeClass("ready_button")
            $("#readyButton").html("Waiting for other players...")
            console.log("state 1")
        }
        else {
            $("#readyButton").addClass("ready_button")
            $("#readyButton").removeClass("ready_button_on")
            $("#readyButton").html("Ready")
            console.log("state 2")
        }

        $("#readyBar").css("width", (2 + (playersReady/playersTotal)*96) + "%");
        if(playersReady == playersTotal){
            $("#readyBar").css("background", "#14FF00");
            if(game.starting){
                $("#readyButton").html("Game <br> starting!")
            }
        }
        else {
            $("#readyBar").css("background", "white");
        }
        publicKeyDisplayRunning = false;
    }
    if(game.state == "waiting_for_transmitter" || game.state == "transmitter_finding_keys"){
        let currentTeam = game.teams[game.round.teamBroadcasting];
        let currentDescriber = currentTeam.players[currentTeam.describerPointer];
        let amDescriber = socket.id == currentDescriber.id;
        if(amDescriber){
            setScreen("preparation");
            if(game.state == "waiting_for_transmitter"){
                $("#startRound").html("Show key");
                $("#pkIn1, #pkIn2, #pkIn3, #pkIn4, #pkIn5").css("visibility", "hidden");
                $("#privateKey").html("*******");
                $("#instructionsSeconds").html("You will have 60 seconds.");
                $("#preparation_bar").css("width", "796px");
                timers.findingKeys.running = false;
            }
            else {
                $("#startRound").html("Lock in");
                $("#pkIn1, #pkIn2, #pkIn3, #pkIn4, #pkIn5").css("visibility", "visible");
                $("#pkIn1").focus();
                $("#pkIn1").val(game.round.publicKeys[0].key);
                $("#pkIn2").val(game.round.publicKeys[1].key);
                $("#pkIn3").val(game.round.publicKeys[2].key);
                $("#pkIn4").val(game.round.publicKeys[3].key);
                $("#pkIn5").val(game.round.publicKeys[4].key);
                for(let i = 0; i < 5; i++){
                    if(game.round.publicKeys[i].valid){
                        $("#lb" + (i+1)).css("color", "white")
                    }
                    else {
                        $("#lb" + (i+1)).css("color", "#ff0000")
                        $("#lb" + (i+1)).animate({
                            color: "#ffffff"
                        }, 1500);
                    }
                }
                $("#privateKey").html(game.round.privateKey);
            }
        }
        else {
            setScreen("scoreboard");
            updateScoreboard(game);
            $("#teamPointsA").html(game.teams.a.points);
            $("#teamPointsB").html(game.teams.b.points);

            if(game.state == "waiting_for_transmitter"){
                $("#preparingMsg").html("Waiting for " + currentDescriber.name + " to start the round. (Rounds left: " + (game.roundsLeft + 1) + ")")
            }
            else {
                $("#preparingMsg").html("Waiting for " + currentDescriber.name + " to create public keys. (<span id='waitingForKeysTimer'></span>)")
            }
        }
        publicKeyDisplayRunning = false;
        $("#gameScreen").css("background", "linear-gradient(180deg, rgb(0, 0, 0) 0%, #050a13 100%)")
    }
    if(game.state == "transmitting_in_progress"){
        setScreen("game");
        timers.findingKeys.running = false;
        let teamTransmitting = game.round.teamBroadcasting;
        let myPlayer = game.players[socket.id];
        let myTeam = myPlayer.team;
        let currentTeam = game.teams[teamTransmitting];
        let currentDescriber = currentTeam.players[currentTeam.describerPointer];
        let amDescriber = socket.id == currentDescriber.id;
        if(myTeam == teamTransmitting){
            $("#gameScreen").css("background", "linear-gradient(180deg, rgb(4, 5, 4) 0%, rgb(3, 28, 11) 100%)")
            $("#topMessage").html("TOP SECRET TRANSMISSION FROM:")
        }
        else {
            $("#gameScreen").css("background", "linear-gradient(180deg, rgb(5, 4, 4) 0%, #2e0202 100%)")
            $("#topMessage").html("INTERCEPTING TRANSMISSION FROM:")
        }
        let publicKeys = game.round.publicKeys;
        publicKeyDisplayRunning = false;
        for(let i in publicKeys){
            i = Number(i);
            if(publicKeys[i].key){
                if(publicKeys[i].guessed){
                    let teamOfSolver = game.players[publicKeys[i].guessedBy].team
                    if(teamOfSolver == "a"){
                        $("#publicKey" + (i + 1)).html("<span style='color: #FF00E5'>" + publicKeys[i].key + "</span>");
                    }
                    else {
                        $("#publicKey" + (i + 1)).html("<span style='color: #FFE500'>" + publicKeys[i].key + "</span>");
                    }
                }
                else {
                    $("#publicKey" + (i + 1)).html("");
                    let keyText = publicKeys[i].key;
                    for(let k = 0; k < keyText.length; k++){
                        if(publicKeys[i].hiddenKey[k] == "#"){
                            $("#publicKey" + (i + 1)).append("<span style='color: #a8a8a8'>" + keyText[k]+ "</span>");
                        }
                        else {
                            $("#publicKey" + (i + 1)).append(keyText[k]);
                        }
                    }
                }
                publicKeyDisplayToggle[i] = false;
            }
            else {
                publicKeyDisplay[i] = publicKeys[i].hiddenKey;
                publicKeyDisplayToggle[i] = true;
                publicKeyDisplayRunning = true;
            }
        }
        if(game.round.privateKey){
            $("#privateKeyDisplay").html(game.round.privateKey)
        }
        else {
            $("#privateKeyDisplay").html("UNKNOWN")
        }

        if(amDescriber){
            $("#inputTransmitter").css("display", "inline-flex");
            $("#inputGuesser").css("display", "none");
            $("#sendingGuesser").css("display", "none");
            $("#clock").css("visibility", "visible");
            $("#generateNewKeyButton").css("visibility", "visible");
            $("#giveUpButton").css("visibility", "visible");
            $("#giveUpButton").html("Give up");
            if(game.round.privateKeyCracked){
                $("#generateNewKeyButton").html("New Private Key")
            }
            else {
                $("#generateNewKeyButton").html("New Private Key <span>(-20 pts)</span>")
            }
            if(game.round.privateKeyRegeneration.canRegenerate){
                $("#generateNewKeyButton").addClass("generateNewKeyButton_clickable")
                $("#generateNewKeyButton").removeClass("generateNewKeyButton_unclickable")
            }
            else {
                $("#generateNewKeyButton").addClass("generateNewKeyButton_unclickable")
                $("#generateNewKeyButton").removeClass("generateNewKeyButton_clickable")
            }
        }
        else {
            $("#inputTransmitter").css("display", "none");
            $("#inputGuesser").css("display", "inline-flex");
        }
        if(teamTransmitting == "a"){
            $("#gameTitle").addClass('team_a');
            $("#gameTitle").removeClass('team_b');
        }
        else {
            $("#gameTitle").addClass('team_b');
            $("#gameTitle").removeClass('team_a');
        }
        $("#gamePlayerCardText").html("<h3>" + currentDescriber.name + "</h3>" + getFlavorText(currentDescriber.flavorText))
        $("#gamePlayerCard").attr("src", [currentDescriber.flavorText][4])
    }
    if (game.state == "transition"){
        setScreen("game");
        let teamTransmitting = game.round.teamBroadcasting;
        let myPlayer = game.players[socket.id];
        let myTeam = myPlayer.team;
        let currentTeam = game.teams[teamTransmitting];
        let currentDescriber = currentTeam.players[currentTeam.describerPointer];
        let amDescriber = socket.id == currentDescriber.id;
        if(myTeam == teamTransmitting){
            $("#gameScreen").css("background", "linear-gradient(180deg, rgb(4, 5, 4) 0%, rgb(3, 28, 11) 100%)")
            $("#topMessage").html("TOP SECRET TRANSMISSION FROM:")
        }
        else {
            $("#gameScreen").css("background", "linear-gradient(180deg, rgb(5, 4, 4) 0%, #2e0202 100%)")
            $("#topMessage").html("INTERCEPTING TRANSMISSION FROM:")
        }
        let publicKeys = game.round.publicKeys;
        publicKeyDisplayRunning = false;
        for(let i in publicKeys){
            i = Number(i);
            if(publicKeys[i].guessed){
                let teamOfSolver = game.players[publicKeys[i].guessedBy].team
                if(teamOfSolver == "a"){
                    $("#publicKey" + (i + 1)).html("<span style='color: #FF00E5'>" + publicKeys[i].key + "</span>");
                }
                else {
                    $("#publicKey" + (i + 1)).html("<span style='color: #FFE500'>" + publicKeys[i].key + "</span>");
                }
            }
            else {
                $("#publicKey" + (i + 1)).html("");
                $("#publicKey" + (i + 1)).html(publicKeys[i].key);
            }
        }
        $("#gameTimeBar").css("width", "0px");
        $("#privateKeyDisplay").html(game.round.privateKey);
        $("#inputTransmitter").css("display", "inline-flex");
        $("#inputGuesser").css("display", "none");
        $("#sendingGuesser").css("display", "none");
        $("#inputGuesser").css("display", "none");
        $("#clock").css("visibility", "hidden");
        $("#generateNewKeyButton").css("visibility", "hidden");
        if(amDescriber && game.newRoundCountdownStarted == false){
            $("#giveUpButton").css("visibility", "visible");
            $("#giveUpButton").html("Next >");
        }
        else {
            $("#giveUpButton").css("visibility", "hidden");
        }
        timers.roundProgress.running = false;
    }
    if(game.state == "endScreen"){
        setScreen("scoreboard");
        $("#teamPointsA").html(game.teams.a.points);
        $("#teamPointsB").html(game.teams.b.points);
        
        updateScoreboard(game);
        

        if(game.teams.a.points > game.teams.b.points){
            $("#preparingMsg").html("Team <span class='team_a'>L33T H4KRZ</span> wins!")
        }
        else if(game.teams.a.points < game.teams.b.points) {
            $("#preparingMsg").html("Team <span class='team_b'>C00L K1DZ</span> wins!")
        }
        else {
            $("#preparingMsg").html("It's a tie!")
        }
    }
}

function teamColor(team){
    return team == a ? "#FF00E5" : "#FFE500";
}

function updateScoreboard(game){
    $("#score_T1_p1").html("");
    $("#score_T1_p2").html("");
    $("#score_T1_p3").html("");
    $("#score_T1_p4").html("");
    for(let i = 1; i < game.teams["a"].players.length + 1; i++){
        let pStats = game.teams["a"].players[i-1].stats;
        $("#score_T1_p" + i).html("");
        $("#score_T1_p" + i).append("<td class='team_a'>" + game.teams["a"].players[i-1].name + "</td>");
        $("#score_T1_p" + i).append("<td>" + pStats.publicKeysSolved + "</td>");
        $("#score_T1_p" + i).append("<td>" + pStats.publicKeysIntercepted + "</td>");
        $("#score_T1_p" + i).append("<td>" + pStats.privateKeysCracked + "</td>");
        $("#score_T1_p" + i).append("<td>" + pStats.publicKeysTransmitted + "</td>");
        $("#score_T1_p" + i).append("<td>" + pStats.publicKeysLost + "</td>");
        $("#score_T1_p" + i).append("<td>" + pStats.averageConversionRate + "</td>");
        $("#score_T1_p" + i).append("<td>" + pStats.score + "</td>");
    }

    $("#score_T2_p1").html("");
    $("#score_T2_p2").html("");
    $("#score_T2_p3").html("");
    $("#score_T2_p4").html("");
    for(let i = 1; i < game.teams["b"].players.length + 1; i++){
        let pStats = game.teams["b"].players[i-1].stats;
        $("#score_T2_p" + i).html("");
        $("#score_T2_p" + i).append("<td class='team_b'>" + game.teams["b"].players[i-1].name + "</td>");
        $("#score_T2_p" + i).append("<td>" + pStats.publicKeysSolved + "</td>");
        $("#score_T2_p" + i).append("<td>" + pStats.publicKeysIntercepted + "</td>");
        $("#score_T2_p" + i).append("<td>" + pStats.privateKeysCracked + "</td>");
        $("#score_T2_p" + i).append("<td>" + pStats.publicKeysTransmitted + "</td>");
        $("#score_T2_p" + i).append("<td>" + pStats.publicKeysLost + "</td>");
        $("#score_T2_p" + i).append("<td>" + pStats.averageConversionRate + "</td>");
        $("#score_T2_p" + i).append("<td>" + pStats.score + "</td>");
    }
}