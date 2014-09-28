// database objects
var Users = require('../models/users.js').Users;
var EventScript = require('../models/eventScript.js').EventScript;

// static gamestate variables
var NOT_STARTED = 0;
var LIVE = 1;
var PAUSED = 2;
var FINISHED = 3;
var ADMIN = 1;

// dynamic gameplay variables
var updateTimerFrequency = 150;
var gameState = NOT_STARTED;
var scriptRuntime = 460; // move to scenario default in db.
var timeRemaining = scriptRuntime; // move assignment to scenario default 
var currentEventScript = 0;
var currentTime = 0;
var previousTime = 0;
var elapsedTime = 0;
var elapsedTimeInSeconds = 0;
var connectedUsers = [];
var htmlUserList;
var latestMarketUpdate;
var currentNews;
var initialized = false;


// scenario defaults
var defaultFunds;

module.exports.initialize = function(io, socket) {


  /* test functions
  var nonAdmin = new Users();
  nonAdmin.findNonAdminUsers(function(err, users) {
    //console.log(users);
    //console.log( getGameStateString(gameState) );
  }); */

  if (!initialized) {
    // load scenario defaults
    loadScenarioDefaults();
    initialized = true;
  };

  // set default live broadcasts, even without the user logged in.
  broadcastConnectedUsers();
  broadcastGameState();

  // manage user authentication.
  socket.on('login', function(data) {
    // test if username exists in simDB under the 'users' collection.
    Users.find( {username: data.username}, function(err, user) {
        if (!user.length) {
          //username does not exist. ( !login failure... )
          console.log("username does not exist");
        } else {
          // username exists. verify the password.
          if (data.password != user[0].password) {
            // password is incorrect ( !login failure... )
            console.log('password is incorrect');
          } else {
            // password is correct, save user's details.
            var confirmedUsername = user[0].username;
            var userAccessLevel = user[0].access;
            console.log(confirmedUsername + ' logged on.');
            // save the username and socket information.
            connectedUsers.push({
              username: confirmedUsername,
              userSocketID: socket.id,
              userAccess: userAccessLevel
                // new elements for tracking and performance
                // userLoginTimeStamp
                // userLogoutTimeStamp
                // userLoginStatus
            });
            // send username & global instance variables back as login confirmation.
            socket.emit('loginConfirmation', {
              username: confirmedUsername,
              defaultFunds: defaultFunds
            });
            // display any active data.
            broadcastConnectedUsers();
            broadcastPortfolio(confirmedUsername, socket.id);
            if(elapsedTime>0){
              broadcastCurrentMarketUpdate(latestMarketUpdate, socket.id);
              rebroadcastNews(socket.id);
              rebroadcastTimer(socket.id);
            };

            // if user is admin, setup additional listeners for timer control.
            if (userAccessLevel == ADMIN) {
              initializeAdminListeners();
            };
          }
        }
      });
  });

  // manage product purchases.
  socket.on('purchase', function(data) {
    if(data.productCode == "GOOG") {
      Users.findOne( {username: data.username}, function (err, user) {
        var currentBuyPrice = data.buyPrice;
        var currentAccountTotal = user.cashbook.accountTotal;
        // check if user has enough funds to buy product.
        if ( (currentAccountTotal-currentBuyPrice) > 0 ) {
          // ... implement trade history ...

          // replace with findOneAndUpdate ...

          user.portfolio[0].averagePrice = data.newAvgPrice;
          user.portfolio[0].amount += data.newAmountPurchased;

          user.save(function(err, doc, numAffected) {
            if(err) console.log(err);
            else {
              broadcastPortfolio(data.username, socket.id);
            }
          });
        }
        else {
          console.log(data.username + ' would go below $0 if GOOG is purchased at' + currentBuyPrice);
        }
      });
    };
  });

  //manage user disconnections.
  socket.on('disconnect', function(data) {

    // remove user from connectedUsers collection
    for (var i = connectedUsers.length; i--;) {
      if (connectedUsers[i].userSocketID === socket.id) {
        console.log(connectedUsers[i].username + ' has logged off');
        connectedUsers.splice(i, 1);
      }
    };

    broadcastConnectedUsers();
  });

  function initializeAdminListeners() {
    // start a listener on the server for 'startTime' when admin clicks start button.
    socket.on('startTime', function(data) {
      currentTime = previousTime = Date.now();
      // initialize primary timer to broadcast game updates.
      UpdateData = setInterval(function() {
          // update timer calculation variables.
          previousTime = currentTime;
          currentTime = Date.now();
          elapsedTime += currentTime - previousTime;
          prevElapsedTimeInSeconds = elapsedTimeInSeconds;
          elapsedTimeInSeconds = Math.round(elapsedTime / 1000);
          var oneSecondHasPassed = elapsedTimeInSeconds - prevElapsedTimeInSeconds;
          // finish if we've reached the end of the scripted data.
          if (elapsedTimeInSeconds > scriptRuntime) {
            clearInterval(UpdateData);
          };
          timeRemaining = scriptRuntime - elapsedTimeInSeconds;
          // If 1 full step has passed, check for new events.
          if(oneSecondHasPassed) {
              EventScript.findCurrentScript(elapsedTimeInSeconds, function(err, script) {
                // if there's a script present at this time, check specifically for news and market updates.
                if(script[0] !== undefined) {
                  var events = script[0].eventType;
                  for (var i = events.length - 1; i >= 0; i--) {
                    if(events[i] == "MarketUpdate") {
                      latestMarketUpdate = script[0].marketUpdate;
                      broadcastNewMarketUpdate(latestMarketUpdate);

                    }
                    else if (events[i] == "News") {
                      currentNews = script[0].news[0];
                      broadcastNews(currentNews);
                    };
                  };
                };
              });
            // update all users' timers.
            broadcastTimer();
          };
        },
        updateTimerFrequency
      );
      gameState = LIVE;
      broadcastGameState();
    });

    // start a listener on the server for 'pauseTime' when admin clicks pause button.
    socket.on('pauseTime', function(data) {
      gameState = PAUSED;
      broadcastGameState();
      clearInterval(UpdateData);
      timeRemaining = scriptRuntime - elapsedTimeInSeconds;
      // Emit updated timer information to all users after pausing.
      EventScript.find(function(err, eventScript) {
       broadcastTimer();
      });
    });

    // start a listener on the server for 'resetTime' when admin clicks 'reset' button.
    socket.on('resetTime', function(data) {
      if (typeof UpdateData !== 'undefined') {
        clearInterval(UpdateData);
        gameState = PAUSED;
        broadcastGameState();
        currentTime = 0;
        previousTime = 0;
        elapsedTime = 0;
        elapsedTimeInSeconds = 0;
        currentEventScript = 0;
        timeRemaining = scriptRuntime - elapsedTimeInSeconds;
        // clear timer on client side
        EventScript.find(function(err, eventScript) {
          broadcastTimer();
        });
        // clear news on client side.
        broadcastNews({headline: "", article: ""});
        // clear marketUpdate display data on client side.
        broadcastNewMarketUpdate([{productCode: "", marketPrice: ""},
                                  {productCode: "", marketPrice: ""},
                                  {productCode: "", marketPrice: ""}]);
      }
    });
  };
  function getGameStateString(gameState) {
    var gameStateString="";
    switch (gameState) {
            case 0:
              gameStateString = "Hasn't Started Yet";
              break;
            case 1:
              gameStateString = "Started";
              break;
            case 2:
              gameStateString = "Paused";
              break;
            case 3:
              gameStateString = "Finished";
              break;
          };
    return gameStateString;
  };
  function broadcastGameState() {
    var updatedGameState = getGameStateString(gameState);
    io.sockets.emit('updatedGameState', {gameState: updatedGameState} );
  };
  function broadcastTimer() {
    io.sockets.emit('updatedTimer', {
      time: timeRemaining,
      elapsedTime: elapsedTimeInSeconds
    });
  };
  function rebroadcastTimer(socketID) {
    io.sockets.connected[socketID].emit('updatedTimer', {
      time: timeRemaining,
      elapsedTime: elapsedTimeInSeconds
    });
  };
  function broadcastConnectedUsers() {
    htmlUserList = "";
    for (var i = 0; i < connectedUsers.length; i++) {
      htmlUserList += (connectedUsers[i].username + ', ');
    };
    io.sockets.emit('updatedConnectedUsers', {
                connectedUsers: htmlUserList
              });
  };
  function broadcastNews(newsScript) {
    io.sockets.emit('updatedNews', {
      newsHeadline: newsScript.headline,
      newsArticle: newsScript.article
    });
  };
  function rebroadcastNews(socketID) {
    io.sockets.connected[socketID].emit('updatedNews', {
                                                         newsHeadline: currentNews.headline,
                                                         newsArticle: currentNews.article
                                                      });
  };
  function broadcastNewMarketUpdate(marketData) {
    io.sockets.emit('updatedMarketData', {
      marketData: marketData
    });
  };
  function broadcastCurrentMarketUpdate(latestMarketData, socketID) {
    io.sockets.connected[socketID].emit('updatedMarketData', {
      marketData: latestMarketData
    });
  };
  function broadcastPortfolio(username, socketID) {
    Users.findOne({username: username}, 'portfolio', function(err, user) {
                io.sockets.connected[socketID].emit('updatedPortfolio', {
                                                              portfolio: user.portfolio
                                                              });
              });
  };
  function loadScenarioDefaults() {
    EventScript.find( {toc:0}, function(err, eventScript) {
      defaultFunds = eventScript[0].startingFunds;
      console.log("loading default scenario variables:\nstartingFunds: " + defaultFunds);
    });
  };
  
}