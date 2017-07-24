const express   = require("express");
const app       = express();
const server    = require("http").createServer(app);
const path      = require("path");
const morgan    = require("morgan"); // express logger
const net       = require("net");
const WebSocket = require("ws");
const fs        = require("fs");


const yargs = require("yargs")
  .options({
    "layout": {
      alias: "l",
      describe: "path to layout file",
      required: true
    }
  })
  .help()
  .argv;


const createWebsocket = require("./createWebsocket.js");

// initialize WebSocket
createWebsocket(server);


const buildDirectory = path.resolve(__dirname, "../build");
const layoutDirectory = path.resolve(__dirname, "../../../layout");
const layoutFile = path.resolve(process.cwd(), yargs.layout);
const indexHtml = path.resolve(buildDirectory, "index.html");

app.use(morgan("dev"));     /* debugging: "default", "short", "tiny", "dev" */
// app.use(express.json());  // for parsing json
// app.use(express.favicon(__dirname + "/public/favicon.ico"));


// special url for the given layout.json file via --layout
app.get("/layout.json", function(req, res){
  res.sendFile(layoutFile);
});


// serve the layout directory
app.use("/layout", express.static(layoutDirectory));


// index.html
app.get("/", function(req, res){

  // check if index.html is there
  if (!fileExists(indexHtml)){
    res.status(500).send("<h2>index.html doesn't exist!!</h2> did you run <code>gulp simulator-build</code>?");
    return;
  }

  // check to see if the layout file exists
  if (!fileExists(layoutFile)){
    res.status(500).send(`<h2>layout file doesn't exist!!</h2> <code>${layoutFile}</code> did you run <code>gulp layout</code>?`);
    return;
  }

  // send index.html
  res.sendFile(indexHtml);

});


app.use(express.static(buildDirectory));


server.listen(3030, () => {
  // eslint-disable-next-line no-console
  console.log("Simulator listening on port 3030...");
});



/* socket to websocket! */
// create a socket server to listen to the OPC data
// it's a buffer, forward to the websocket server (port 3030)
net.createServer(function (socket) {

  // connect to the web server
  const ws = new WebSocket("ws://localhost:3030", { });

  ws.on("open", function open() {

    // forward socket messages from python to the browser
    socket.on("data", function (data) {
      ws.send(data);
    });

  });

}).listen(7890, () => {
  console.log("Forwarding OPC input from port 7890 to 3030");
});





// when there is an error, properly close all servers
process.on("uncaughtException", function(e){
  server.close(() => console.log("http://localhost:3030 closed"));
  net.close(() => console.log("http://localhost:7890 closed"));

  console.log("simulator server error: ", e);
});


/**
 * fileExists
 * @param  {String} filepath : path to the file
 * @return {Boolean} true if the filepath exists and is readable
 */
function fileExists(filepath) {
  try {
    fs.accessSync(filepath, fs.R_OK);
    return true;
  }
  catch(e) {
    return false;
  }
}

module.exports = app;
