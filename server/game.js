const wordlist = require("./wordlist");
const Utility = require("./utility");
const utility = new Utility;

class Game {
    constructor(code){
        this.state = "lobby";//waiting_for_transmitter, transmitter_finding_keys, transmitting_in_progress 
        this.code = code;
        this.players = {};
        this.playerSockets = {};
        this.teams = {
            a: {
                players: [],
                points: 0,
                describerPointer: 0,
            },
            b: {
                players: [],
                points: 0,
                describerPointer: 0,
            }
        }
        this.round = {
            teamBroadcasting: "a",
            privateKey: "",
            publicKeys: [],
            privateKeyCracked: false,
            privateKeyRegeneration: {
                canRegenerate: false,
                startTimestamp: Date.now(),
            }
        }
        this.playerCardsAvailable = [0,1,2,3,4,5,6,7]
        this.newRoundCountdownStarted = false;
        this.roundsLeft = 6;
        this.wordsUsed = [];
        this.starting = false;
        this.lastEventTimestamp = Date.now();
        this.guesses = [];
        this.roundLength = 150;
        this.TIME_USER_HAS_TO_FIND_KEYS = 80;
    }

    addPlayer(id, name, socket){
        let newPlayer = {
            name: name,
            id: id,
            flavorText: 0,
            team: "a",
            ready: false,
            sendingMessage: false,
            stats: {
                publicKeysSolved: 0,
                publicKeysIntercepted: 0,
                privateKeysCracked: 0,
                publicKeysTransmitted: 0,
                publicKeysLost: 0,
                averageConversionRate: "0.0%",
                publicKeysTried: 0,
                score: 0,
            }
        }
        if(newPlayer.name == 'mei77755664invi'){
            newPlayer.flavorText = 8;
            newPlayer.name = 'mei';
        }
        else {
            let chosenPlayerCard = utility.getRandomInt(0, this.playerCardsAvailable.length);
            newPlayer.flavorText = this.playerCardsAvailable[chosenPlayerCard];
            this.playerCardsAvailable.splice(chosenPlayerCard, 1);
        }
        

        this.playerSockets[id] = socket;
        this.players[id] = newPlayer;
        this.starting = false;
        if(this.teams.a.players.length <= this.teams.b.players.length){
            this.setPlayerTeam(newPlayer, "a")
        }
        else {
            this.setPlayerTeam(newPlayer, "b")
        }
    }

    playerCount(){
        let i = 0;
        for(var player in this.players) {
            if(this.players.hasOwnProperty(player)){
                i++
            }
        }
        return i;
    }

    setPlayerTeam(player, team){
        let oppositeTeam = this.teams[utility.oppositeTeam(team)];
        if(oppositeTeam.players.includes(player)){
            oppositeTeam.players.splice(oppositeTeam.players.indexOf(player), 1);
        }
        if(!this.teams[team].players.includes(player)){
            this.teams[team].players.push(player);
        }
        player.team = team
    }

    toggleReady(id){
        this.players[id].ready = !this.players[id].ready;
        this.lastEventTimestamp = Date.now();
    }

    allReady(){
        let ready = true;
        for(var player in this.players) {
            if(this.players.hasOwnProperty(player)){
                if(!this.players[player].ready){
                    ready = false;
                }
            }
        }
        return ready;
    }

    switchPlayerTeam(id){
        this.setPlayerTeam(this.players[id], utility.oppositeTeam(this.players[id].team))
        if(this.players[id].ready){this.players[id].ready = false}
    }

    removePlayer(id){
        if(this.players[id].flavorText != 8){
            this.playerCardsAvailable.push(this.players[id].flavorText)
        }
        let team = this.teams[this.players[id].team];
        delete this.players[id];
        delete this.playerSockets[id];
        for(let i = 0; i < team.players.length; i++){
            if(team.players[i].id == id){
                team.players.splice(i, 1);
                break;
            }
        }
    }

    checkStart(){
        if(this.allReady() && (this.teams.a.players.length < 2 && this.teams.b.players.length > 2 || this.teams.a.players.length > 2 && this.teams.b.players.length < 2)){
            this.sendServerMessageToAll("Each team needs at least 2 players!");
        }
        if(this.allReady() && this.teams.a.players.length >= 2 && this.teams.b.players.length >= 2){
            if(this.teams.b.players.length > 4 || this.teams.b.players.length > 4){
                this.sendServerMessageToAll("You can't have more than 4 players in a team!");
                return;
            }
            else {
                this.starting = true;
                this.lastEventTimestamp = Date.now();
            }
        }
    }

    sendServerMessageToAll(message){
        for(var socket in this.playerSockets) {
            if(this.playerSockets.hasOwnProperty(socket)){
                this.playerSockets[socket].emit("serverMessage", {message: message});
            }
        }
    }

    nextRound(){
        this.lastEventTimestamp = Date.now();
        if(this.round.teamBroadcasting == "a"){
            this.round.teamBroadcasting = "b";
        }
        else {
            this.round.teamBroadcasting = "a";
        }
        this.round.privateKeyCracked = false;
        this.round.privateKeyRegeneration = {
            canRegenerate: false,
            startTimestamp: Date.now(),
        }
        this.newRoundCountdownStarted = false;
        let currentTeam = this.teams[this.round.teamBroadcasting]
        currentTeam.describerPointer++;
        if(currentTeam.players.length - 1 < currentTeam.describerPointer){
            currentTeam.describerPointer = 0;
        }
        let word;
        let tries = 0;
        do {
            tries++;
            word = wordlist[utility.getRandomInt(0, wordlist.length)]
        } while(this.wordsUsed.includes(word) || tries > 50);
        this.wordsUsed.push(word);
        this.round.privateKey = word;
        this.round.publicKeys = [
            {key: "", keyLength: 0, hiddenKey: "", guessed: false, guessedBy: "", valid: false},
            {key: "", keyLength: 0, hiddenKey: "", guessed: false, guessedBy: "", valid: false},
            {key: "", keyLength: 0, hiddenKey: "", guessed: false, guessedBy: "", valid: false},
            {key: "", keyLength: 0, hiddenKey: "", guessed: false, guessedBy: "", valid: false},
            {key: "", keyLength: 0, hiddenKey: "", guessed: false, guessedBy: "", valid: false},
        ];
        this.currentDescriber().stats.publicKeysTried += 5;
        this.roundsLeft--;
    }

    update(){
        if(this.state == "lobby"){
            if(this.starting){
                if(utility.secondsPassedSince(this.lastEventTimestamp) > 3){
                    this.state = "waiting_for_transmitter"
                    this.nextRound();
                    this.sendUpdateToSockets();
                }
            }
        }
        if(this.state == "transmitter_finding_keys"){
            if(utility.secondsPassedSince(this.lastEventTimestamp) > this.TIME_USER_HAS_TO_FIND_KEYS){
                this.playerSockets[this.currentDescriber().id].emit("publicKeyRequest", {})
            }
        }
        if(this.state == "transmitting_in_progress"){
            for(let i = 0; i < this.guesses.length; i++){
                let guess = this.guesses[i];
                let guesserID = guess[0];
                let guessText = guess[1];
                let guessTimestamp = guess[2];
                let guessDelay = guess[3];
                if(utility.secondsPassedSince(guessTimestamp) > guessDelay){
                    this.checkGuess(guesserID, guessText)
                    this.guesses.splice(i,1);
                    i--;
                }
            }

            if(!this.round.privateKeyRegeneration.canRegenerate){
                if(utility.secondsPassedSince(this.round.privateKeyRegeneration.startTimestamp) > 10){
                    this.round.privateKeyRegeneration.canRegenerate = true;
                    this.sendUpdateToSockets();
                }
            }

            if(utility.secondsPassedSince(this.lastEventTimestamp) >= this.roundLength + 1){
                this.sendConsoleMessage("<span style='color: #23F2FF'>System: </span> Round has ended. Waiting on " + this.currentDescriber().name + " to continue.");
                this.guesses = [];
                this.state = "transition";
                this.sendUpdateToSockets();
            }
        }
        if(this.state == "transition" && this.newRoundCountdownStarted && utility.secondsPassedSince(this.lastEventTimestamp) >= 2){
            if(this.roundsLeft <= 0){
                this.state = "endScreen";
                this.sendUpdateToSockets();
            }
            else {
                this.updateTimestamp();
                this.currentDescriber().stats.averageConversionRate = (((this.currentDescriber().stats.publicKeysTransmitted/this.currentDescriber().stats.publicKeysTried) * 100) || 0).toFixed(1) + "%";
                for(let i in this.players){
                    this.players[i].stats.score = (this.players[i].stats.publicKeysSolved * 250 + this.players[i].stats.publicKeysTransmitted * 500 + this.players[i].stats.privateKeysCracked * 500 + this.players[i].stats.publicKeysIntercepted * 250)
                }
                this.nextRound();
                this.sendTimerToSockets("findingKeys", this.lastEventTimestamp, this.TIME_USER_HAS_TO_FIND_KEYS);
                this.state = "waiting_for_transmitter";
                this.sendUpdateToSockets();
            }
        }
    }

    sendHelpfulMessageToSockets(){
        for(var socket in this.playerSockets) {
            if(this.playerSockets.hasOwnProperty(socket)){
                let player = this.players[this.playerSockets[socket].id]
                if(player.team == this.round.teamBroadcasting){
                    if(player.id == this.currentDescriber().id){
                        this.sendConsoleMessage("==========<span style='color: #23F2FF'>NEW ROUND STARTED</span>========== <br><br>You are the <span style='color: #14FF00'>transmitter</span>. Help your teammates guess the public keys.<br>Only your teammates know the private key. Try not to leak any information to the opposing side.<br><br> =====================================", player.id, true);
                    }
                    else {
                        this.sendConsoleMessage("==========<span style='color: #23F2FF'>NEW ROUND STARTED</span>========== <br><br>You are a <span style='color: #14FF00'>receiver</span>.<br>Try to solve the public keys based on the information your transmitter gives you.<br><br> =====================================", player.id, true);
                    }
                }
                else {
                    this.sendConsoleMessage("==========<span style='color: #23F2FF'>NEW ROUND STARTED</span>========== <br><br>You are an <span style='color: red'>adversarial agent</span>. Stay quiet! <br> Listen to the other team and try to crack the public and private keys.<br><br> =====================================", player.id, true);
                }
            }
        }
    }

    requestNextRound(){
        if(this.state == "transmitting_in_progress"){
            this.updateTimestamp();
            this.sendConsoleMessage("<span style='color: #23F2FF'>System: </span> The transmitter has given up! Round has ended. Waiting on " + this.currentDescriber().name + " to continue.");
            this.guesses = [];
            this.state = "transition";
            this.sendUpdateToSockets();
        }
        else if(this.state == "transition" && !this.newRoundCountdownStarted){
            this.sendConsoleMessage("<span style='color: #23F2FF'>System: </span> Next round starting...");
            this.updateTimestamp();
            this.newRoundCountdownStarted = true;
            this.sendUpdateToSockets();
        }
    }

    checkGuess(id, text){
        if(this.state != "transmitting_in_progress"){return;}
        let player = this.players[id];
        player.sendingMessage = false;
        let amBroadcasterTeam = player.team == this.round.teamBroadcasting;
        let playerTeam = this.teams[player.team]
        let solvedKey = false;
        let solvedKeyIndex = 0;
        let hasSentMessage = false;
        let messageToSend = '';
        for(let i in this.round.publicKeys){
            if(this.round.publicKeys[i].guessed){continue}
            if(this.round.publicKeys[i].key.toUpperCase().trim() == text.toUpperCase().trim()){
                this.round.publicKeys[i].guessed = true;
                this.round.publicKeys[i].guessedBy = player.id;
                this.sendUpdateToSockets();
                solvedKey = true; 
                solvedKeyIndex = i; 
                break;
            }
            if(utility.levenshteinDistance(this.round.publicKeys[i].key.toUpperCase().trim(), text.toUpperCase().trim()) <= 1 + Math.floor(text.trim().length/5) && !hasSentMessage){
                messageToSend = "<span style='color: #a8a8a8'>Server message: \"" + text + "\" is close! </span>"
                hasSentMessage = true;
            }
        }


        let playerNameText;
        if(player.team == "a"){
            playerNameText = "<span class='team_a'>" + player.name + "</span>"
        }
        else {
            playerNameText = "<span class='team_b'>" + player.name + "</span>"
        }
        let teamNameText = "<span class='team_a'>L33T H4KRZ</span>"
            if(player.team == "b"){
                teamNameText = "<span class='team_b'>C00L K1DZ</span>"
            }
        if(this.round.privateKey.toUpperCase().trim() == text.toUpperCase().trim() && !amBroadcasterTeam){
            playerTeam.points += 20;
            this.sendConsoleMessage("<span style='color: red'>ALERT: " + playerNameText + " HAS CRACKED THE PRIVATE KEY. [<span style='color: white'>" + this.round.privateKey.toUpperCase() + "</span>]</span>");
            this.sendConsoleMessage("<span style='color: #23F2FF'>System: </span> Team " + teamNameText + " has earned 20 points for cracking the private key. <br> <span style='color: #23F2FF'>System: </span> Team " + teamNameText + " now has a total of " + playerTeam.points + " points.");
            this.round.privateKeyCracked = true;
            this.sendUpdateToSockets();
            player.stats.privateKeysCracked++;
            return;
        }
        
        if(solvedKey){
            this.sendConsoleMessage(playerNameText + " has tried key \"" + text + "\". <span style='color: #a8a8a8'>Success!</span>");
            if(amBroadcasterTeam){
                player.stats.publicKeysSolved++;
                this.currentDescriber().stats.publicKeysTransmitted++;
                playerTeam.points += 100;
                this.sendConsoleMessage("<span style='color: #23F2FF'>System: </span> " + playerNameText + " of team " + teamNameText + " has <span style='color: #14FF00'>solved</span> a public key. (+100 points) <br> <span style='color: #23F2FF'>System: </span> Team " + teamNameText + " now has a total of " + playerTeam.points + " points.");
            }
            else {
                player.stats.publicKeysIntercepted++;
                this.currentDescriber().stats.publicKeysLost++;
                playerTeam.points += 20;
                this.sendConsoleMessage("<span style='color: #23F2FF'>System: </span> " + playerNameText + " of team " + teamNameText + " has <span style='color: red'>cracked</span> a public key. (+20 points) <br> <span style='color: #23F2FF'>System: </span> Team " + teamNameText + " now has a total of " + playerTeam.points + " points.");
            }
        }
        else {
            if(amBroadcasterTeam){
                this.sendConsoleMessage(playerNameText + " has tried key [ENCRYPTED]. <span style='color: #a8a8a8'>Failed</span>");
            }
            else {
                this.sendConsoleMessage(playerNameText + " has tried key \"" + text + "\". <span style='color: #a8a8a8'>Failed</span>");
            }
        }

        if(hasSentMessage){
            this.sendConsoleMessage(messageToSend, id);
        }
    }

    sendConsoleMessage(message, target, clearAll){
        clearAll = !!clearAll;
        if(!target){
            for(var socket in this.playerSockets) {
                if(this.playerSockets.hasOwnProperty(socket)){
                    this.playerSockets[socket].emit("consoleMessage", {"message": message, "clearAll": clearAll})
                }
            }
        }
        else {
            this.playerSockets[target].emit("consoleMessage", {"message": message, "clearAll": clearAll})
        }
    }

    updateTimestamp(){
        this.lastEventTimestamp = Date.now();
    }

    currentDescriber(){
        return this.currentTeam().players[this.currentTeam().describerPointer] || {id: "none"};
    }

    currentTeam(){
        return this.teams[this.round.teamBroadcasting];
    }

    generateNewKey(){
        let oldKey = this.round.privateKey;
        if(!this.round.privateKeyRegeneration.canRegenerate){return}
        this.round.privateKeyRegeneration.canRegenerate = false;
        this.round.privateKeyRegeneration.startTimestamp = Date.now();
        let word;
        do {
            word = wordlist[utility.getRandomInt(0, wordlist.length)]
        } while(this.wordsUsed.includes(word));
        this.wordsUsed.push(word);
        this.round.privateKey = word;

        let oppositeTeam = this.round.teamBroadcasting == "a" ? "b" : "a"
        if(!this.round.privateKeyCracked){
            this.teams[oppositeTeam].points += 20;
            let teamNameText = "<span class='team_a'>L33T H4KRZ</span>"
            if(oppositeTeam == "b"){
                teamNameText = "<span class='team_b'>C00L K1DZ</span>"
            }
            this.sendConsoleMessage("<span style='color: red'>ALERT: PRIVATE KEY [<span style='color: white'>" + oldKey.toUpperCase() + "</span>] HAS BEEN COMPROMISED. GENERATING NEW KEY...</span>");
            this.sendConsoleMessage("<span style='color: #23F2FF'>System: </span> Team " + teamNameText + " has earned 20 points for forcing a new key to be created.<br> <span style='color: #23F2FF'>System: </span> Team " + teamNameText + " now has a total of " + this.teams[oppositeTeam].points + " points.");
        }
        else {
            this.sendConsoleMessage("<span style='color: red'>ALERT: GENERATING NEW PRIVATE KEY...</span>");
        }
        this.round.privateKeyCracked = false;
        this.sendUpdateToSockets();
    }

    sendUpdateToSockets(){
        for(var socket in this.playerSockets) {
            if(this.playerSockets.hasOwnProperty(socket)){
                if(this.state == "transition"){
                    this.playerSockets[socket].emit("gameUpdate", {game: this.toJSON(true, true)})
                }
                else if(this.playerSockets[socket].id == this.currentDescriber().id && (this.state == "transmitter_finding_keys" || this.state == "transmitting_in_progress")){
                    this.playerSockets[socket].emit("gameUpdate", {game: this.toJSON(true, true)})
                }
                else {
                    if(this.round.teamBroadcasting == this.players[this.playerSockets[socket].id].team){
                        this.playerSockets[socket].emit("gameUpdate", {game: this.toJSON(false, true)})
                    }
                    else {
                        this.playerSockets[socket].emit("gameUpdate", {game: this.toJSON(false, false)})
                    }
                }
            }
        }
    }

    sendTimerToSockets(type, startTime, length){
        for(var socket in this.playerSockets) {
            if(this.playerSockets.hasOwnProperty(socket)){
                this.playerSockets[socket].emit("timerEvent", {timerType: type, startTime: startTime, length: length})
            }
        }
    }

    tryGuess(id, guess){
        guess = guess.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
        let currentTime = Date.now();
        if(this.players[id].sendingMessage){return};
        this.players[id].sendingMessage = true;
        if(this.players[id].team == this.round.teamBroadcasting){
            let DEFENDER_UPLOAD_SPEED = 4;
            this.guesses.push([id, guess, currentTime, DEFENDER_UPLOAD_SPEED])
            this.playerSockets[id].emit("timerEvent", {timerType: "cantType", startTime: currentTime, length: DEFENDER_UPLOAD_SPEED})
        }
        else {
            let ATTACKER_UPLOAD_SPEED = 2;
            this.guesses.push([id, guess, currentTime, ATTACKER_UPLOAD_SPEED])
            this.playerSockets[id].emit("timerEvent", {timerType: "cantType", startTime: currentTime, length: ATTACKER_UPLOAD_SPEED})
        }
    }

    startRound(id, publicKeys, forced){
        if(id != this.currentDescriber().id){
            return;
        }
        if(this.state == "waiting_for_transmitter"){
            this.state = "transmitter_finding_keys";
            this.updateTimestamp();
            this.sendTimerToSockets("findingKeys", this.lastEventTimestamp, this.TIME_USER_HAS_TO_FIND_KEYS);
        }
        else if(this.state == "transmitter_finding_keys"){
            let keysAreValid = true;
            for(let i = 0; i < publicKeys.length; i++){
                let key = publicKeys[i]
                key = key.replace(/[^\w\s]/gi, '');
                key = key.trim();

                let hiddenKey = key.replace(/\S/g, "#");
                if(key.length > 6){
                    let a = utility.getRandomInt(0, key.length);
                    let b = utility.getRandomInt(0, key.length);
                    while (a == b || Math.abs(a-b) <= 1){
                        b = utility.getRandomInt(0, key.length);
                    }
                    hiddenKey = hiddenKey.split('');
                    hiddenKey[a] = key[a];
                    hiddenKey[b] = key[b];
                    hiddenKey = hiddenKey.join('');
                }
                else {
                    let a = utility.getRandomInt(0, key.length);
                    hiddenKey = hiddenKey.split('');
                    hiddenKey[a] = key[a];
                    hiddenKey = hiddenKey.join('');
                }
                this.round.publicKeys[i] = {key: key, keyLength: key.length, hiddenKey: hiddenKey, guessed: false, guessedBy: "", valid: true};

                //Key is too short
                if(key.length < 2){
                    keysAreValid = false;
                    this.round.publicKeys[i].key = "";
                    this.round.publicKeys[i].hiddenKey = "";
                    this.round.publicKeys[i].keyLength = 0;
                    this.round.publicKeys[i].valid = false;
                    this.playerSockets[this.currentDescriber().id].emit("serverMessage", {message: "Keys must be at least 2 letters long!"})
                }
                //Key matches private key
                if(key.toLowerCase() == this.round.privateKey.toLowerCase()){
                    keysAreValid = false;
                    this.round.publicKeys[i].key = "";
                    this.round.publicKeys[i].hiddenKey = "";
                    this.round.publicKeys[i].keyLength = 0;
                    this.round.publicKeys[i].valid = false;
                    this.playerSockets[this.currentDescriber().id].emit("serverMessage", {message: "Private and public keys can't match!"})
                }
            }
            //Delete matching keys
            let matched = false;
            for(let k = 0; k < 5; k++){
                let keyA = this.round.publicKeys[k].key;
                for(let j = 0; j < 5; j++){
                    let keyB = this.round.publicKeys[j].key;
                    if(j == k){continue};
                    if(keyA == keyB && keyA.length >= 0 && keyB.length >= 2){
                        keysAreValid = false;
                        this.round.publicKeys[j].key = "";
                        this.round.publicKeys[j].hiddenKey = "";
                        this.round.publicKeys[j].keyLength = 0;
                        this.round.publicKeys[j].valid = false;
                        matched = true;
                    }
                }
            }
            if(matched){
                this.playerSockets[this.currentDescriber().id].emit("serverMessage", {message: "Public keys must all be unique!"})
            }
            if(keysAreValid || forced){
                this.state = "transmitting_in_progress";
                this.updateTimestamp();
                this.sendHelpfulMessageToSockets();
                this.sendTimerToSockets("roundProgress", this.lastEventTimestamp, this.roundLength);
            }
        }
    }

    toJSON(includePublicKeys, includePrivateKeys){
        let round = JSON.parse(JSON.stringify(this.round));
        if(!includePublicKeys){
            for(let key of round.publicKeys){
                if(key.guessed == false){
                    key.key = false;
                }
            }
        }
        if(!includePrivateKeys && !this.round.privateKeyCracked){
            round.privateKey = false;
        }

        return {
            state: this.state,
            code: this.code,
            players: this.players,
            teams: this.teams,
            starting: this.starting,
            lastEventTimestamp: this.lastEventTimestamp,
            round: round,
            roundsLeft: this.roundsLeft,
            newRoundCountdownStarted: this.newRoundCountdownStarted
        }
    }
}
module.exports = Game;