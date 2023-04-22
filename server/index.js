const express = require('express');
const app = express();
const serv = require('http').Server(app);
const path = require('path')

const port = 3000;

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '/client/index.html'));
});
app.use(express.static(path.join(__dirname, '..', '/client')))

const cors = require('cors');
app.use(cors({
    origin: '*'
}));

serv.listen(port, (error)=>{
    if(error) {
        console.log('Something went wrong', error)
    }
    else {
        console.log('Server is listening on port ' + port)
    }
});
const io = require('socket.io')(serv, {'pingInterval': 2000, 'pingTimeout': 5000});
const Game = require("./game.js");
var gameRooms = {};

io.on("connection", (socket) => {
    console.log(socket.id + " connected");
    socket.data = {
        currentRoom: "-",
        inputsSent: [],
    }

    //Joining a room
    socket.on("join_room", function(data){
        data.name = data.name.trim();
        if(socket.data.currentRoom != "-"){
            socket.emit("serverMessage", {message: "You are already in a room!"});
            return;
        }
        if(data.name.length == 0 || data.name.length > 18){
            socket.emit("serverMessage", {message: "Choose a valid name!"});
            return;
        }
        if(containsSpecialChars(data.name)){
            socket.emit("serverMessage", {message: "You can't use special characters in your name!"});
            return;
        }
        if((getActiveRooms()).includes(data.room) == false || !gameRooms[data.room]){
            socket.emit("serverMessage", {message: "This room doesn't exist!"});
            return;
        }
        /*if(gameRooms[data.room].state != 'lobby'){ 
            socket.emit("serverMessage", {message: "This game has already started!"});
            return;
        }*/
        if(gameRooms[data.room].playerCount() >= 8){ 
            socket.emit("serverMessage", {message: "This game is already full!"});
            return;
        }

        socket.join(data.room);
        socket.data.currentRoom = data.room;
        console.log(data.name + " joined room " + data.room);
        gameRooms[data.room].addPlayer(socket.id, data.name, socket)
        socket.emit("roomJoined", {});
        sendGameUpdate(data.room);

        gameRooms[data.room].checkStart()
        sendGameUpdate(socket.data.currentRoom)
    })

    //Creating a room
    socket.on("create_room", function(data){
        if(socket.data.currentRoom != "-"){
            socket.emit("serverMessage", {message: "You are already in a room!"});
            return;
        }
        if(data.name.length == 0 || data.name.length > 18){
            socket.emit("serverMessage", {message: "Choose a valid name!"});
            return;
        }
        if(containsSpecialChars(data.name)){
            socket.emit("serverMessage", {message: "You can't use special characters in your name!"});
            return;
        }
        let newRoomId = generateNewRoomId();
        socket.join(newRoomId);
        socket.data.currentRoom = newRoomId;
        console.log(data.name + " created room " + newRoomId);
        gameRooms[newRoomId] = new Game(newRoomId);
        gameRooms[newRoomId].addPlayer(socket.id, data.name, socket)
        socket.emit("roomJoined", {});
        sendGameUpdate(newRoomId);

        gameRooms[newRoomId].checkStart()
        sendGameUpdate(socket.data.currentRoom)
    })

    //Switching teams
    socket.on("switch_teams", function(){
        if(isSpamming(socket)){return};
        let currentRoom = gameRooms[socket.data.currentRoom]
        if(!currentRoom){return};
        if(currentRoom.state != "lobby"){return};
        currentRoom.switchPlayerTeam(socket.id);
        sendGameUpdate(socket.data.currentRoom)
    })

    //Readying up
    socket.on("toggle_ready", function(){
        if(isSpamming(socket)){return};
        let currentRoom = gameRooms[socket.data.currentRoom]
        if(!currentRoom){return};
        if(currentRoom.state != "lobby"){return};
        currentRoom.toggleReady(socket.id);
        currentRoom.checkStart()
        sendGameUpdate(socket.data.currentRoom)
    })

    //Describer trying to start round
    socket.on("start_round", function(data){
        if(isSpamming(socket)){return};
        let currentRoom = gameRooms[socket.data.currentRoom];
        if(currentRoom.state != "transmitter_finding_keys" && currentRoom.state != "waiting_for_transmitter"){return};
        if(currentRoom.currentDescriber().id != socket.id){return};
        currentRoom.startRound(socket.id, data.publicKeys, data.force);
        sendGameUpdate(socket.data.currentRoom)
    })
    //Somone trying to submit guess
    socket.on("submitGuess", function(data){
        if(isSpamming(socket)){return};
        let currentRoom = gameRooms[socket.data.currentRoom];
        if(currentRoom.state != "transmitting_in_progress"){return};
        if(currentRoom.currentDescriber().id == socket.id){return};
        currentRoom.tryGuess(socket.id, data.guess)
    })
    //Somone trying to generate new key
    socket.on("generateNewKey", function(data){
        if(isSpamming(socket)){return};
        let currentRoom = gameRooms[socket.data.currentRoom];
        if(currentRoom.state != "transmitting_in_progress"){return};
        if(currentRoom.currentDescriber().id != socket.id){return};
        currentRoom.generateNewKey()
    })
    //Describer wants to go to next round
    socket.on("requestNextRound", function(data){
        if(isSpamming(socket)){return};
        let currentRoom = gameRooms[socket.data.currentRoom];
        if(currentRoom.state != "transmitting_in_progress" && currentRoom.state != "transition"){return};
        if(currentRoom.currentDescriber().id != socket.id){return};
        currentRoom.requestNextRound()
    })
    //Disconnect handling
    socket.on("disconnect", () => {
        if(socket.data.currentRoom != "-"){
            let currentGameRoom = gameRooms[socket.data.currentRoom];
            disconnectFromRoom(socket)
            if(currentGameRoom.teams.a.players.length == 0 || currentGameRoom.teams.b.players.length == 0 && currentGameRoom.state != "lobby"){
                //If 0 players left on one team kick everyone from lobby
                for(var socketId in currentGameRoom.playerSockets) {
                    if(currentGameRoom.playerSockets.hasOwnProperty(socketId)){
                        kickFromRoom(currentGameRoom.playerSockets[socketId], "Too many players left the lobby!");
                    }
                }
            }
            sendGameUpdate(currentGameRoom.code);
        }
    });
})

function disconnectFromRoom(socket){
    gameRooms[socket.data.currentRoom].removePlayer(socket.id);
    socket.data.currentRoom = "-";
}

function kickFromRoom(socket, reason){
    socket.emit("backToLobby", {});
    socket.emit("serverMessage", {message: reason});
    gameRooms[socket.data.currentRoom].removePlayer(socket.id);
    socket.data.currentRoom = "-";
}

function sendGameUpdate(room){
    gameRooms[room].sendUpdateToSockets();
}

function isSpamming(socket){
    if(socket.data.inputsSent.length < 10){
        socket.data.inputsSent.push(Date.now());
        return false;
    }
    else if(Date.now() - socket.data.inputsSent[0] < 4000){
        socket.data.inputsSent[0] += 500;
        return true;
    }
    else {
        socket.data.inputsSent.shift();
        socket.data.inputsSent.push(Date.now());
        return false;
    }
}

function generateNewRoomId(){
    var length = 4;
    var roomId           = '';
    var characters       = 'BCDFGHJKLMNPQRSTVWXYZ';
    var activeRooms = getActiveRooms();
    do {
        characters       = 'BCDFGHJKLMNPQRSTVWXYZ';
        roomId = '';
        for ( var i = 0; i < length; i++ ) {
            charIndex = Math.floor(Math.random() * characters.length);
            roomId += characters.charAt(charIndex);
            characters = characters.substring(0, charIndex) + characters.substring(charIndex + 1, characters.length);
        }
    } while(activeRooms.includes(roomId));
    return roomId;
}

function getActiveRooms() {
    const arr = Array.from(io.sockets.adapter.rooms);
    const filtered = arr.filter(room => !room[1].has(room[0]))
    const res = filtered.map(i => i[0]);
    return res;
}

function containsSpecialChars(str) {
    const specialChars = /[`!@#$%^&*()+\-=\[\]{};':"\\|,.<>\/?~]/;
    return specialChars.test(str);
}

//Server tick
const Utility = require("./utility");
const utility = new Utility;
var tickRate = 200;
function serverTick() {
    setTimeout(() => {
        //Delete empty game lobbies
        let gameRoomCount = 0;
        for (const key in gameRooms) {
            if (gameRooms.hasOwnProperty(key)) {
                gameRoomCount++;
                if(utility.objLength(gameRooms[key].players) == 0){
                    delete gameRooms[key];
                }
                else {
                    gameRooms[key].update();
                }
            }
        }
        if(gameRoomCount == 0){
            //tickRate = 5000;
            tickRate = 300;
        }
        else {
            tickRate = 200;
        }
        serverTick(); 
    }, tickRate)
}
serverTick();