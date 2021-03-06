const gulp = require("gulp");
const quench = require("../quench.js");
const path = require("path");
const spawn = require("child_process").spawn;
const runSequence = require("run-sequence");

const createCopyTask        = require("../tasks/createCopyTask.js");
const createCssTask         = require("../tasks/createCssTask.js");
const createJsTask          = require("../tasks/createJsTask.js");
const createNodemonTask     = require("../tasks/createNodemonTask.js");
const createBrowserSyncTask = require("../tasks/createBrowserSyncTask.js");


// task to read the layout file and run the simulator server with that file
module.exports = function simulatorTask(projectRoot) {

  const simulatorRoot = path.resolve(projectRoot, "./javascript/simulator/");
  const simulatorDest = path.resolve(projectRoot, "./javascript/simulator/build/");
  const serverDir = path.resolve(simulatorRoot, "./server/");


  const yargs = require("yargs").options({
    "layout": {
      default: undefined,
      type: "string"
    }
  }).argv;

  const layout = yargs.layout || "layout/hoeLayout.json";

  /**
   * main entry simulator task
   * use --watch and --env development/production
   */
  gulp.task("simulator-build", function(){

    createCopyTask("simulator-copy", {
      src: [
        `${simulatorRoot}/client/index.html`,
        `${simulatorRoot}/client/models/**`
      ],
      dest: simulatorDest,
      base: `${simulatorRoot}/client/`
    });


    createCssTask("simulator-css", {
      src: [
        `${simulatorRoot}/client/scss/**/*.scss`,
        `${simulatorRoot}/client/js/**/*.scss`
      ],
      dest: `${simulatorDest}/css/`,
      watch: [
        `${simulatorRoot}/client/scss/**/*.scss`,
        `${simulatorRoot}/client/js/**/*.scss`
      ],
      filename: "index.css"
    });


    createJsTask("simulator-js", {
      dest: `${simulatorDest}/js/`,
      files: [
        {
          gulpTaskId: "simulator-js-index",
          entry: `${simulatorRoot}/client/js/index.js`,
          filename: "index.js",
          watch: [
            `${simulatorRoot}/client/js/**/*.js`,
            `${simulatorRoot}/client/js/**/*.jsx`,
            `${projectRoot}/layout/**/*.json`
          ]
        }
      ]
    });


    createNodemonTask("simulator-nodemon", {
      script: path.resolve(serverDir, "server.js"),
      args: ["--layout", layout],
      watch: [ serverDir ]
    });


    createBrowserSyncTask("simulator-browser-sync", {
      files: simulatorDest + "/**",
      proxy: "http://localhost:3030"
    });


    const simulatorTasks = ["simulator-copy", "simulator-css", "simulator-js"];

    if (quench.isWatching()){
      return runSequence(
        simulatorTasks,
        "simulator-nodemon",
        "simulator-browser-sync"
      );
    }
    else {
      return runSequence(simulatorTasks);
    }


  });


  /**
   * run the simulator server (after it is already built)
   */
  gulp.task("simulator", function(cb){

    // run the node server
    // https://stackoverflow.com/questions/10232192/exec-display-stdout-live
    const server = spawn("node",
      ["javascript/simulator/server/server.js", "--layout", layout],
      { cwd: `${projectRoot}` }
    );

    server.stdout.pipe(process.stdout);

    server.stderr.pipe(process.stderr);

    server.on("exit", (code) => {
      const codeMsg = (code) ? `with code ${code.toString()}` : "";
      console.log(` Simulator server stopped ${codeMsg}`);
    });

    cb();

  });

};
